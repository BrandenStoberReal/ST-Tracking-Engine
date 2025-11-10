import {generateInstanceIdFromText} from '../utils/utilities';
import {outfitStore} from '../common/Store';
import {ALL_SLOTS} from '../config/constants';
import {debugLog} from '../logging/DebugLogger';
import type {Character, ChatMessage, InstanceData, STContext} from '../types';

class MacroProcessor {
    allSlots: string[];
    outfitValuesCache: Map<string, { value: string[]; timestamp: number }>;
    textProcessingCache: Map<string, { value: string; timestamp: number }>;
    cacheExpiryTime: number;

    constructor() {
        this.allSlots = ALL_SLOTS;
        this.outfitValuesCache = new Map();
        this.textProcessingCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000;
    }

    clearCache(): void {
        this.outfitValuesCache.clear();
        this.textProcessingCache.clear();
    }

    async processMacrosInFirstMessage(context?: STContext): Promise<void> {
        try {
            const ctx =
                context ||
                (window.SillyTavern?.getContext
                    ? window.SillyTavern.getContext()
                    : window.getContext
                      ? window.getContext()
                      : null);

            if (!ctx || !ctx.chat) {
                return;
            }

            const firstBotMessage = ctx.chat.find((message: ChatMessage) => !message.is_user && !message.is_system);

            if (firstBotMessage) {
                // Get the unique character ID for outfit lookups
                let uniqueCharacterId = null;

                // Try to get character ID from the current bot manager first
                const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
                if (botOutfitManager?.characterId) {
                    uniqueCharacterId = botOutfitManager.characterId;
                }

                // Fallback: try to find character by name and get their unique ID
                if (!uniqueCharacterId && firstBotMessage.name) {
                    if (ctx.characters && Array.isArray(ctx.characters)) {
                        const character = ctx.characters.find((char: Character) => char?.name === firstBotMessage.name);
                        if (character) {
                            // Get the unique ID from the character's extensions
                            uniqueCharacterId = (character.data as any)?.extensions?.character_id;
                        }
                    }
                }

                // Additional fallback: try to get unique ID from current character index
                if (!uniqueCharacterId && ctx.characterId !== undefined && ctx.characterId !== null && ctx.characters) {
                    const character = ctx.characters[ctx.characterId];
                    if (character) {
                        uniqueCharacterId = (character.data as any)?.extensions?.character_id;
                    }
                }

                // Get all outfit values for the character to remove from the message during ID calculation
                // Only proceed if we have a valid unique character ID
                let outfitValues: string[] = [];
                if (uniqueCharacterId) {
                    outfitValues = this.getAllOutfitValuesForCharacter(uniqueCharacterId);
                }

                // Start with the original message text
                let processedMessage = firstBotMessage.mes;

                // Clean outfit macros from the text (replace {{char_topwear}} with {{}})
                processedMessage = this.cleanOutfitMacrosFromText(processedMessage);

                // Remove all outfit values (including "None" and actual outfit names) from the message text
                // This prevents the instance ID from changing when outfit values change
                for (const value of outfitValues) {
                    if (value && typeof value === 'string' && value.trim() !== '') {
                        // Use a global case-insensitive replace to remove the value
                        // Escape special regex characters in the value
                        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedValue, 'gi');
                        processedMessage = processedMessage.replace(regex, '');
                    }
                }

                // Clean up extra whitespace that might result from replacements
                processedMessage = processedMessage.replace(/\s+/g, ' ').trim();

                debugLog('[OutfitTracker] Instance ID generation debug:');
                debugLog('[OutfitTracker] Original message text:', firstBotMessage.mes);
                debugLog(
                    '[OutfitTracker] Processed message text (macros and outfit values cleaned):',
                    processedMessage
                );
                // Show the unique character ID being used for debugging
                debugLog('[OutfitTracker] Unique character ID used for instance calculation:', uniqueCharacterId);
                debugLog('[OutfitTracker] Outfit values removed:', outfitValues);

                // Generate instance ID from the processed message with outfit values removed for consistent ID calculation
                const instanceId = await generateInstanceIdFromText(processedMessage, []);

                debugLog('[OutfitTracker] Generated instance ID:', instanceId);

                // Only update the instance ID if it's different from the current one
                // This prevents unnecessary updates that could cause flip-flopping
                const currentInstanceId = outfitStore.getCurrentInstanceId();
                debugLog('[OutfitTracker] Current instance ID:', currentInstanceId);

                if (currentInstanceId !== instanceId) {
                    debugLog(
                        '[OutfitTracker] Instance ID changed from',
                        {
                            from: currentInstanceId,
                            to: instanceId,
                        },
                        'log'
                    );
                    outfitStore.setCurrentInstanceId(instanceId);

                    if (window.botOutfitPanel?.outfitManager) {
                        window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                    if (window.userOutfitPanel?.outfitManager) {
                        window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                    }
                } else {
                    debugLog('[OutfitTracker] Instance ID unchanged - no update needed');
                }
            }
        } catch (error) {
            debugLog('[OutfitTracker] Error processing macros in first message:', error, 'error');
        }
    }

    getAllOutfitValuesForCharacter(uniqueCharacterId: string): string[] {
        if (!uniqueCharacterId) {
            debugLog('[OutfitTracker] getAllOutfitValuesForCharacter called with no uniqueCharacterId');
            return [];
        }

        const state = outfitStore.getState();
        const outfitValues = new Set<string>();

        debugLog('[OutfitTracker] Collecting outfit values for character:', uniqueCharacterId);
        debugLog('[OutfitTracker] Current state instance ID:', state.currentOutfitInstanceId);

        // Get all outfit values from all bot instances for this character (including "None")
        if (state.botInstances && state.botInstances[uniqueCharacterId]) {
            debugLog(
                '[OutfitTracker] Found bot instances for character:',
                Object.keys(state.botInstances[uniqueCharacterId])
            );
            Object.values(state.botInstances[uniqueCharacterId]).forEach((instanceData: InstanceData) => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach((value) => {
                        if (value !== undefined && value !== null && typeof value === 'string') {
                            outfitValues.add(value);
                            debugLog('[OutfitTracker] Added outfit value from instance:', value);
                        }
                    });
                }
            });
        }

        // Get all preset values for this character (including "None")
        if (state.presets && state.presets.bot) {
            Object.keys(state.presets.bot).forEach((key) => {
                if (key.startsWith(uniqueCharacterId + '_')) {
                    const presets = state.presets.bot[key];

                    if (presets) {
                        Object.values(presets).forEach((preset) => {
                            if (preset) {
                                Object.values(preset).forEach((value) => {
                                    if (value !== undefined && value !== null && typeof value === 'string') {
                                        outfitValues.add(value);
                                        debugLog('[OutfitTracker] Added preset value:', value);
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }

        // Also include current outfit values for this character if available
        const currentInstanceId = state.currentOutfitInstanceId;
        if (currentInstanceId && state.botInstances[uniqueCharacterId]?.[currentInstanceId]?.bot) {
            const currentOutfit = state.botInstances[uniqueCharacterId][currentInstanceId].bot;
            Object.values(currentOutfit).forEach((value) => {
                if (value !== undefined && value !== null && typeof value === 'string') {
                    outfitValues.add(value);
                    debugLog('[OutfitTracker] Added current outfit value:', value);
                }
            });
        }

        const allValues = Array.from(outfitValues);
        debugLog('[OutfitTracker] All collected outfit values:', allValues);
        return allValues;
    }

    isAlphaNumericWithUnderscores(str: string): boolean {
        if (!str || typeof str !== 'string') {
            return false;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);

            if (code >= 65 && code <= 90) {
                continue;
            }
            if (code >= 97 && code <= 122) {
                continue;
            }
            if (code >= 48 && code <= 57) {
                continue;
            }
            if (code === 95) {
                continue;
            }

            return false;
        }

        return true;
    }

    isLowerAlphaNumericWithUnderscoresAndHyphens(str: string): boolean {
        if (!str || typeof str !== 'string') {
            return false;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);

            if (code >= 97 && code <= 122) {
                continue;
            }
            if (code >= 48 && code <= 57) {
                continue;
            }
            if (code === 95) {
                continue;
            }
            if (code === 45) {
                continue;
            }

            return false;
        }

        return true;
    }

    cleanOutfitMacrosFromText(text: string): string {
        if (!text || typeof text !== 'string') {
            return text || '';
        }

        let resultText = text;
        let startIndex = 0;

        // First, clean outfit macro patterns like {{char_topwear}} -> {{}}
        while (startIndex < resultText.length) {
            const openIdx = resultText.indexOf('{{', startIndex);

            if (openIdx === -1) {
                break;
            }

            const endIdx = resultText.indexOf('}}', openIdx);

            if (endIdx === -1) {
                break;
            }

            const macroContent = resultText.substring(openIdx + 2, endIdx);
            const underscoreIndex = macroContent.indexOf('_');

            if (underscoreIndex !== -1) {
                const prefix = macroContent.substring(0, underscoreIndex);
                const suffix = macroContent.substring(underscoreIndex + 1);

                const isPrefixValid =
                    prefix === 'char' || prefix === 'user' || this.isAlphaNumericWithUnderscores(prefix);
                const isSuffixValid = this.isLowerAlphaNumericWithUnderscoresAndHyphens(suffix);

                if (isPrefixValid && isSuffixValid) {
                    resultText = resultText.substring(0, openIdx) + '{{}}' + resultText.substring(endIdx + 2);
                    startIndex = openIdx + 2;
                    continue;
                }
            }

            startIndex = endIdx + 2;
        }

        // Additional cleaning: Remove "None" text that might be the result of macro replacement
        // This handles cases where "{{char_topwear}}" was replaced with "None" in the message
        resultText = resultText.replace(/\bNone\b/g, '');

        // Clean up any double spaces that might result from the removal
        resultText = resultText.replace(/\s+/g, ' ').trim();

        return resultText;
    }
}

export const macroProcessor = new MacroProcessor();
