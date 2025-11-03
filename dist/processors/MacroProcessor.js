var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { generateInstanceIdFromText } from '../utils/utilities.js';
import { outfitStore } from '../common/Store.js';
import { ALL_SLOTS } from '../config/constants.js';
import { findCharacterById } from '../services/CharacterIdService.js';
import { debugLog } from '../logging/DebugLogger.js';
class MacroProcessor {
    constructor() {
        this.allSlots = ALL_SLOTS;
        this.outfitValuesCache = new Map();
        this.textProcessingCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000;
    }
    clearCache() {
        this.outfitValuesCache.clear();
        this.textProcessingCache.clear();
    }
    processMacrosInFirstMessage(context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null));
                if (!ctx || !ctx.chat) {
                    return;
                }
                const firstBotMessage = ctx.chat.find((message) => !message.is_user && !message.is_system);
                if (firstBotMessage) {
                    // Try to get characterId using the new character ID system first
                    let characterId = null;
                    let characterIndex = null;
                    // Try to get character ID from the current bot manager first
                    const botOutfitManager = (_c = (_b = window.outfitTracker) === null || _b === void 0 ? void 0 : _b.botOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager;
                    if (botOutfitManager === null || botOutfitManager === void 0 ? void 0 : botOutfitManager.characterId) {
                        const character = findCharacterById(botOutfitManager.characterId);
                        if (character) {
                            characterIndex = (_d = ctx.characters) === null || _d === void 0 ? void 0 : _d.indexOf(character);
                            characterId = characterIndex;
                        }
                    }
                    // Fallback to old system if needed
                    if (characterId === null && ctx.characterId !== undefined && ctx.characterId !== null) {
                        characterId = ctx.characterId;
                    }
                    // Additional fallback: try to find character by name
                    if (characterId === null && firstBotMessage.name) {
                        if (ctx.characters && Array.isArray(ctx.characters)) {
                            const characterIndex = ctx.characters.findIndex((char) => (char === null || char === void 0 ? void 0 : char.name) === firstBotMessage.name);
                            if (characterIndex !== -1) {
                                characterId = characterIndex;
                            }
                        }
                    }
                    // Get all outfit values for the character to remove from the message during ID calculation
                    // Only proceed if we have a valid characterId
                    let outfitValues = [];
                    if (characterId !== undefined && characterId !== null) {
                        outfitValues = this.getAllOutfitValuesForCharacter(characterId);
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
                    debugLog('[OutfitTracker] Processed message text (macros and outfit values cleaned):', processedMessage);
                    // Show both the old character index and new unique character ID for debugging
                    const botManager = (_f = (_e = window.outfitTracker) === null || _e === void 0 ? void 0 : _e.botOutfitPanel) === null || _f === void 0 ? void 0 : _f.outfitManager;
                    const uniqueCharacterId = (botManager === null || botManager === void 0 ? void 0 : botManager.characterId) || 'Not available';
                    debugLog('[OutfitTracker] Character index used:', characterId);
                    debugLog('[OutfitTracker] Unique character ID:', uniqueCharacterId);
                    debugLog('[OutfitTracker] Outfit values removed:', outfitValues);
                    // Generate instance ID from the processed message with outfit values removed for consistent ID calculation
                    const instanceId = yield generateInstanceIdFromText(processedMessage, []);
                    debugLog('[OutfitTracker] Generated instance ID:', instanceId);
                    // Only update the instance ID if it's different from the current one
                    // This prevents unnecessary updates that could cause flip-flopping
                    const currentInstanceId = outfitStore.getCurrentInstanceId();
                    debugLog('[OutfitTracker] Current instance ID:', currentInstanceId);
                    if (currentInstanceId !== instanceId) {
                        debugLog('[OutfitTracker] Instance ID changed from', {
                            from: currentInstanceId,
                            to: instanceId
                        }, 'log');
                        outfitStore.setCurrentInstanceId(instanceId);
                        if ((_g = window.botOutfitPanel) === null || _g === void 0 ? void 0 : _g.outfitManager) {
                            window.botOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                        }
                        if ((_h = window.userOutfitPanel) === null || _h === void 0 ? void 0 : _h.outfitManager) {
                            window.userOutfitPanel.outfitManager.setOutfitInstanceId(instanceId);
                        }
                    }
                    else {
                        debugLog('[OutfitTracker] Instance ID unchanged - no update needed');
                    }
                }
            }
            catch (error) {
                debugLog('[OutfitTracker] Error processing macros in first message:', error, 'error');
            }
        });
    }
    getAllOutfitValuesForCharacter(characterId) {
        var _a, _b, _c, _d;
        if (!characterId) {
            debugLog('[OutfitTracker] getAllOutfitValuesForCharacter called with no characterId');
            return [];
        }
        // Get the unique character ID from the bot manager if available
        let uniqueCharacterId = null;
        const botOutfitManager = (_b = (_a = window.outfitTracker) === null || _a === void 0 ? void 0 : _a.botOutfitPanel) === null || _b === void 0 ? void 0 : _b.outfitManager;
        if (botOutfitManager === null || botOutfitManager === void 0 ? void 0 : botOutfitManager.characterId) {
            uniqueCharacterId = botOutfitManager.characterId;
        }
        // If we have a unique character ID, use that; otherwise use the old system
        const actualCharacterId = uniqueCharacterId || characterId.toString();
        const state = outfitStore.getState();
        const outfitValues = new Set();
        debugLog('[OutfitTracker] Collecting outfit values for character:', actualCharacterId);
        debugLog('[OutfitTracker] Current state instance ID:', state.currentOutfitInstanceId);
        // Get all outfit values from all bot instances for this character (including "None")
        if (state.botInstances && state.botInstances[actualCharacterId]) {
            debugLog('[OutfitTracker] Found bot instances for character:', Object.keys(state.botInstances[actualCharacterId]));
            Object.values(state.botInstances[actualCharacterId]).forEach(instanceData => {
                if (instanceData && instanceData.bot) {
                    Object.values(instanceData.bot).forEach(value => {
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
            Object.keys(state.presets.bot).forEach(key => {
                if (key.startsWith(actualCharacterId + '_')) {
                    const presets = state.presets.bot[key];
                    if (presets) {
                        Object.values(presets).forEach(preset => {
                            if (preset) {
                                Object.values(preset).forEach(value => {
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
        if (currentInstanceId && ((_d = (_c = state.botInstances[actualCharacterId]) === null || _c === void 0 ? void 0 : _c[currentInstanceId]) === null || _d === void 0 ? void 0 : _d.bot)) {
            const currentOutfit = state.botInstances[actualCharacterId][currentInstanceId].bot;
            Object.values(currentOutfit).forEach(value => {
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
    isAlphaNumericWithUnderscores(str) {
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
    isLowerAlphaNumericWithUnderscoresAndHyphens(str) {
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
    cleanOutfitMacrosFromText(text) {
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
                const isPrefixValid = prefix === 'char' || prefix === 'user' || this.isAlphaNumericWithUnderscores(prefix);
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
        resultText = resultText.replace(/\bNone\b/g, "");
        // Clean up any double spaces that might result from the removal
        resultText = resultText.replace(/\s+/g, " ").trim();
        return resultText;
    }
}
export const macroProcessor = new MacroProcessor();
