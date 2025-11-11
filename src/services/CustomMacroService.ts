import { outfitStore } from '../common/Store';
import { ACCESSORY_SLOTS, CLOTHING_SLOTS } from '../config/constants';
import { getCharacters } from '../utils/CharacterUtils';
import { getCharacterId } from './CharacterIdService';
import { debugLog } from '../logging/DebugLogger';
import { macroProcessor } from '../processors/MacroProcessor';
import type { ChatMessage } from '../types';

declare const window: any;

interface MacroCacheEntry {
    value: string;
    timestamp: number;
}

interface CustomMacro {
    fullMatch: string;
    type: string;
    slot: string | null;
    startIndex: number;
}

class CustomMacroService {
    public macroValueCache: Map<string, MacroCacheEntry>;
    private clothingSlots: string[];
    private accessorySlots: string[];
    private allSlots: string[];
    private cacheExpiryTime: number;
    private registeredMacros: Set<string>;

    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
        this.macroValueCache = new Map<string, MacroCacheEntry>();
        this.cacheExpiryTime = 5 * 60 * 1000;
        this.registeredMacros = new Set<string>();
        (this as any).lastCacheCleanup = Date.now();

        debugLog(
            `[CustomMacroService] Initialized with ${this.allSlots.length} slots: ${this.allSlots.join(', ')}`,
            null,
            'debug'
        );
    }

    registerMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.registerMacro) {
            // Register pointer macros that fetch from instance-specific macros
            this.allSlots.forEach((slot) => {
                const charMacro = `char_${slot}`;
                const userMacro = `user_${slot}`;

                if (!this.registeredMacros.has(charMacro)) {
                    ctx.registerMacro(charMacro, () => {
                        return this.getPointerMacroValue('char', slot);
                    });
                    this.registeredMacros.add(charMacro);
                }

                if (!this.registeredMacros.has(userMacro)) {
                    ctx.registerMacro(userMacro, () => {
                        return this.getPointerMacroValue('user', slot);
                    });
                    this.registeredMacros.add(userMacro);
                }
            });
        }
    }

    /**
     * Registers user instance-specific macros
     */
    registerUserInstanceMacros(context: any, instanceId: string): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (!ctx || !ctx.registerMacro || !instanceId) {
            return;
        }

        // Get current user outfit data for this instance
        const outfitData = outfitStore.getUserOutfit(instanceId);

        this.allSlots.forEach((slot) => {
            const instanceMacro = `user_${slot}_${instanceId}`;

            if (!this.registeredMacros.has(instanceMacro)) {
                const value = outfitData[slot] || 'None';
                ctx.registerMacro(instanceMacro, () => value);
                this.registeredMacros.add(instanceMacro);
                debugLog(
                    `[CustomMacroService] Registered user instance macro: ${instanceMacro} = ${value}`,
                    null,
                    'debug'
                );
            }
        });
    }

    /**
     * Updates user instance-specific macros when outfit data changes
     */

    /**
     * Gets the slot value using instance-aware resolution (for direct text replacement)
     */
    getInstanceAwareSlotValue(macroType: string, slotName: string, charNameParam: string | null = null): string {
        debugLog(`[CustomMacroService] getInstanceAwareSlotValue called for ${macroType}_${slotName}`, null, 'debug');

        if (!this.allSlots.includes(slotName)) {
            debugLog(`[CustomMacroService] Invalid slot name: ${slotName}`, null, 'debug');
            return 'None';
        }

        // Try to get instance ID from current context or message mapping
        const instanceId = this.getInstanceIdForCurrentContext();

        if (!instanceId) {
            debugLog(
                `[CustomMacroService] No instance ID found for ${macroType}_${slotName}, falling back to direct lookup`,
                null,
                'debug'
            );
            const fallbackValue = this.getCurrentSlotValue(macroType, slotName, charNameParam);
            debugLog(
                `[CustomMacroService] Fallback value for ${macroType}_${slotName} = '${fallbackValue}'`,
                null,
                'debug'
            );
            return fallbackValue;
        }

        debugLog(`[CustomMacroService] Using instance ID ${instanceId} for ${macroType}_${slotName}`, null, 'debug');

        // Get the value directly from the outfit store using the resolved instance ID
        try {
            if (macroType === 'char') {
                // Use the outfit manager's character ID instead of the store's currentCharacterId
                const characterId = window.outfitTracker?.botOutfitPanel?.outfitManager?.characterId || '';
                debugLog(
                    `[CustomMacroService] Looking up bot outfit for character ${characterId}, instance ${instanceId}`,
                    null,
                    'debug'
                );
                const outfitData = outfitStore.getBotOutfit(characterId, instanceId);
                const value = outfitData[slotName] || 'None';
                debugLog(`[CustomMacroService] Retrieved ${macroType}_${slotName} = '${value}'`, null, 'debug');
                return value;
            } else if (macroType === 'user') {
                debugLog(`[CustomMacroService] Looking up user outfit for instance ${instanceId}`, null, 'debug');
                const outfitData = outfitStore.getUserOutfit(instanceId);
                const value = outfitData[slotName] || 'None';
                debugLog(`[CustomMacroService] Retrieved ${macroType}_${slotName} = '${value}'`, null, 'debug');
                return value;
            }
        } catch (error) {
            debugLog(
                `[CustomMacroService] Error getting outfit data for ${macroType}_${slotName}_${instanceId}:`,
                error,
                'error'
            );
        }

        debugLog(
            `[CustomMacroService] No outfit data found for ${macroType}_${slotName}_${instanceId}, falling back to direct lookup`,
            null,
            'debug'
        );

        // Fallback to direct lookup if data not available
        const fallbackValue = this.getCurrentSlotValue(macroType, slotName, charNameParam);
        debugLog(
            `[CustomMacroService] Fallback value for ${macroType}_${slotName} = '${fallbackValue}'`,
            null,
            'debug'
        );
        return fallbackValue;
    }

    /**
     * Gets the value from the appropriate instance-specific macro
     */
    getPointerMacroValue(macroType: string, slotName: string): string {
        debugLog(`[CustomMacroService] getPointerMacroValue called for ${macroType}_${slotName}`, null, 'debug');

        if (!this.allSlots.includes(slotName)) {
            debugLog(`[CustomMacroService] Invalid slot name: ${slotName}`, null, 'debug');
            return 'None';
        }

        // Try to get instance ID from current context or message mapping
        const instanceId = this.getInstanceIdForCurrentContext();

        if (!instanceId) {
            debugLog(
                `[CustomMacroService] No instance ID found for ${macroType}_${slotName}, returning 'None'`,
                null,
                'debug'
            );
            return 'None';
        }

        debugLog(`[CustomMacroService] Using instance ID ${instanceId} for ${macroType}_${slotName}`, null, 'debug');

        // Get the value directly from the outfit store using the resolved instance ID
        try {
            if (macroType === 'char') {
                // Use the outfit manager's character ID instead of the store's currentCharacterId
                const characterId = window.outfitTracker?.botOutfitPanel?.outfitManager?.characterId || '';
                debugLog(
                    `[CustomMacroService] Looking up bot outfit for character ${characterId}, instance ${instanceId}`,
                    null,
                    'debug'
                );
                const outfitData = outfitStore.getBotOutfit(characterId, instanceId);
                const value = outfitData[slotName] || 'None';
                debugLog(`[CustomMacroService] Retrieved ${macroType}_${slotName} = '${value}'`, null, 'debug');
                return value;
            } else if (macroType === 'user') {
                debugLog(`[CustomMacroService] Looking up user outfit for instance ${instanceId}`, null, 'debug');
                const outfitData = outfitStore.getUserOutfit(instanceId);
                const value = outfitData[slotName] || 'None';
                debugLog(`[CustomMacroService] Retrieved ${macroType}_${slotName} = '${value}'`, null, 'debug');
                return value;
            }
        } catch (error) {
            debugLog(
                `[CustomMacroService] Error getting outfit data for ${macroType}_${slotName}_${instanceId}:`,
                error,
                'error'
            );
        }

        debugLog(
            `[CustomMacroService] No outfit data found for ${macroType}_${slotName}_${instanceId}, falling back to direct lookup`,
            null,
            'debug'
        );

        // Fallback to direct lookup if data not available
        const fallbackValue = this.getCurrentSlotValue(macroType, slotName);
        debugLog(
            `[CustomMacroService] Fallback value for ${macroType}_${slotName} = '${fallbackValue}'`,
            null,
            'debug'
        );
        return fallbackValue;
    }

    /**
     * Gets the appropriate instance ID for the current context
     */
    getInstanceIdForCurrentContext(): string | null {
        debugLog('[CustomMacroService] getInstanceIdForCurrentContext called', null, 'debug');

        // First priority: Check if we already have a current instance ID from the store
        const currentInstanceId = outfitStore.getCurrentInstanceId();
        if (currentInstanceId) {
            debugLog(`[CustomMacroService] Using existing current instance ID: ${currentInstanceId}`, null, 'debug');
            return currentInstanceId;
        }

        debugLog('[CustomMacroService] No existing current instance ID, calculating from chat', null, 'debug');

        // Calculate instance ID directly from current chat context and cache it
        // Use the same logic as OutfitTracker to ensure consistency
        try {
            const ctx = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
            if (ctx && ctx.chat && ctx.chat.length > 0) {
                // Find the first bot message
                const firstBotMessage = ctx.chat.find((msg: ChatMessage) => !msg.is_user && !msg.is_system);
                if (firstBotMessage) {
                    debugLog(`[CustomMacroService] Found first bot message for instance ID calculation`, null, 'debug');
                    // Calculate instance ID directly from the message content
                    const instanceId = this.calculateInstanceIdFromMessage(firstBotMessage.mes);
                    if (instanceId) {
                        // Cache the calculated instance ID globally for other macros
                        // But don't override if OutfitTracker has already set one
                        if (!outfitStore.getCurrentInstanceId()) {
                            outfitStore.setCurrentInstanceId(instanceId);
                            debugLog(
                                `[CustomMacroService] Calculated and cached instance ID ${instanceId} from first message`,
                                null,
                                'debug'
                            );
                        }
                        return instanceId;
                    } else {
                        debugLog('[CustomMacroService] Failed to calculate instance ID from message', null, 'debug');
                    }
                } else {
                    debugLog('[CustomMacroService] No first bot message found in chat', null, 'debug');
                }
            } else {
                debugLog('[CustomMacroService] No chat context available for instance ID calculation', null, 'debug');
            }
        } catch (error) {
            debugLog('[CustomMacroService] Error calculating instance ID from chat:', error, 'debug');
        }

        debugLog('[CustomMacroService] Could not determine instance ID from any source', null, 'debug');
        return null;
    }

    /**
     * Calculates instance ID directly from a message by replicating the MacroProcessor logic
     */
    private calculateInstanceIdFromMessage(message: string): string | null {
        debugLog(
            `[CustomMacroService] calculateInstanceIdFromMessage called with message length: ${message.length}`,
            null,
            'debug'
        );

        try {
            // Process the message the same way MacroProcessor does
            const processedMessage = this.processMessageForInstanceId(message);
            debugLog(
                `[CustomMacroService] Processed message for instance ID: '${processedMessage.substring(0, 50)}${processedMessage.length > 50 ? '...' : ''}'`,
                null,
                'debug'
            );

            // Use the simple synchronous hash function for consistency
            const instanceId = this.generateInstanceIdFromTextSimple(processedMessage);
            debugLog(`[CustomMacroService] Generated instance ID: ${instanceId}`, null, 'debug');

            return instanceId;
        } catch (error) {
            debugLog('[CustomMacroService] Error calculating instance ID from message:', error, 'error');
            return null;
        }
    }

    /**
     * Simple synchronous instance ID generation (fallback from utilities.ts)
     */
    private generateInstanceIdFromTextSimple(text: string): string {
        // Normalize the text (same as utilities.ts)
        const normalizedText = text.toLowerCase().trim();

        // FNV-1a hash
        const FNV_PRIME = 16777619;
        const FNV_OFFSET_BASIS = 2166136261;

        let hash = FNV_OFFSET_BASIS;
        for (let i = 0; i < normalizedText.length; i++) {
            hash ^= normalizedText.charCodeAt(i);
            hash *= FNV_PRIME;
            hash = hash >>> 0; // Convert to unsigned 32-bit
        }

        // Convert to hex string (same format as crypto version)
        return hash.toString(16).padStart(8, '0').substring(0, 16);
    }

    /**
     * Processes a message for instance ID calculation using MacroProcessor's logic
     */
    private processMessageForInstanceId(message: string): string {
        // Use MacroProcessor's cleanOutfitMacrosFromText method for consistency
        return (macroProcessor as any).cleanOutfitMacrosFromText(message);
    }

    deregisterMacros(context: any): void {
        const ctx = context || (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext());

        if (ctx && ctx.unregisterMacro) {
            // Don't deregister {{char}} and {{user}} macros as they weren't registered globally
            this.allSlots.forEach((slot) => {
                const charMacro = `char_${slot}`;
                const userMacro = `user_${slot}`;

                if (this.registeredMacros.has(charMacro)) {
                    ctx.unregisterMacro(charMacro);
                    this.registeredMacros.delete(charMacro);
                }

                if (this.registeredMacros.has(userMacro)) {
                    ctx.unregisterMacro(userMacro);
                    this.registeredMacros.delete(userMacro);
                }
            });
        }
    }

    getCurrentCharName(): string {
        try {
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                  ? window.getContext()
                  : null;

            if (context && context.chat) {
                for (let i = context.chat.length - 1; i >= 0; i--) {
                    const message = context.chat[i];
                    if (!message.is_user && !message.is_system && message.name) {
                        return message.name;
                    }
                }
            }

            return typeof window.name2 !== 'undefined' ? window.name2 : 'Character';
        } catch (error) {
            debugLog('Error getting character name:', error, 'error');
            return 'Character';
        }
    }

    getCurrentSlotValue(macroType: string, slotName: string, charNameParam: string | null = null): string {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }

        // First check if the outfit system is fully initialized
        if (!this._isSystemReady()) {
            debugLog('[CustomMacroService] System not ready, deferring macro value', null, 'debug');
            return 'None';
        }

        // Periodic cache cleanup to prevent memory leaks
        this._periodicCacheCleanup();

        const cacheKey = this._generateCacheKey(macroType, slotName, charNameParam);
        const cachedValue = this.macroValueCache.get(cacheKey);

        // Only use cache if we're confident the data is still valid
        if (cachedValue && Date.now() - cachedValue.timestamp < this.cacheExpiryTime && cachedValue.value !== 'None') {
            return cachedValue.value;
        }

        try {
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                  ? window.getContext()
                  : null;
            const characters = getCharacters();
            let charId: any = null;

            if (charNameParam) {
                if (context && characters) {
                    const character = characters.find((c: any) => c.name === charNameParam);
                    if (character) {
                        // Use the new GUID system - get the character ID from extensions
                        charId = getCharacterId(character);
                        if (!charId) {
                            // Fallback to array index if no GUID found
                            charId = characters.indexOf(character);
                        }
                    } else if (context.characterId && context.getName) {
                        const currentCharName = context.getName();
                        if (currentCharName === charNameParam) {
                            charId = context.characterId;
                        }
                    }
                    if (charId === null) {
                        this._setCache(cacheKey, 'None');
                        return 'None';
                    }
                }
            } else if (macroType === 'char' || macroType === 'bot') {
                // Try to get character ID from the current bot manager first
                const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
                if (botOutfitManager?.characterId) {
                    // Use the new character ID system - characterId is already the GUID
                    charId = botOutfitManager.characterId;
                }

                // Fallback to old system - convert array index to GUID
                if (charId === null && context?.characterId !== null && context?.characterId !== undefined) {
                    const character = context.characters[context.characterId];
                    if (character) {
                        charId = getCharacterId(character);
                        if (!charId) {
                            // If no GUID, fall back to array index as string for backward compatibility
                            charId = context.characterId.toString();
                        }
                    }
                }
            } else if (['user'].includes(macroType)) {
                charId = null;
            } else if (context && context.characterId && context.getName) {
                const currentCharName = context.getName();
                if (currentCharName === macroType) {
                    charId = context.characterId;
                }
            }

            // Ensure outfit data is loaded before accessing it
            if (
                charId !== null &&
                (macroType === 'char' ||
                    macroType === 'bot' ||
                    charNameParam ||
                    (this.isValidCharacterName(macroType) && !['user'].includes(macroType)))
            ) {
                const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
                if (!botOutfitManager) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                if (!botOutfitManager.getPromptInjectionEnabled()) {
                    return 'None';
                }

                // Ensure instance data exists before trying to access it
                const state = outfitStore.getState();
                const currentInstanceId = state.currentOutfitInstanceId;

                if (!currentInstanceId) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                // Verify that outfit data exists for this character and instance
                const outfitData = outfitStore.getBotOutfit(charId.toString(), currentInstanceId);

                // Only return a value if we have actual data (not just default "None" values)
                if (!outfitData || Object.keys(outfitData).length === 0) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                const result = outfitData[slotName] || 'None';

                // Only cache non-"None" values to prevent stale "None" values
                if (result !== 'None') {
                    this._setCache(cacheKey, result);
                }
                return result;
            } else if (macroType === 'user') {
                const userOutfitManager = window.outfitTracker?.userOutfitPanel?.outfitManager;
                if (!userOutfitManager) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                if (!userOutfitManager.getPromptInjectionEnabled()) {
                    return 'None';
                }

                // Check if user outfit data exists for the current instance
                const state = outfitStore.getState();
                const currentInstanceId = state.currentOutfitInstanceId;

                if (!currentInstanceId) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                const userOutfitData = outfitStore.getUserOutfit(currentInstanceId);

                // Only return a value if we have actual data
                if (!userOutfitData || Object.keys(userOutfitData).length === 0) {
                    this._setCache(cacheKey, 'None');
                    return 'None';
                }

                const result = userOutfitData[slotName] || 'None';

                // Only cache non-"None" values
                if (result !== 'None') {
                    this._setCache(cacheKey, result);
                }
                return result;
            }
        } catch (error) {
            debugLog('Error getting slot value:', error, 'error');
        }

        const result = 'None';
        this._setCache(cacheKey, result);
        return result;
    }

    /**
     * Checks if outfit data is available for the given macro type and slot
     * @param macroType - The macro type (char, user, etc.)
     * @param slotName - The slot name
     * @param charNameParam - Optional character name parameter
     * @returns True if outfit data is available, false otherwise
     */
    hasOutfitData(macroType: string, slotName: string, charNameParam: string | null = null): boolean {
        try {
            if (!this._isSystemReady()) {
                return false;
            }

            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                  ? window.getContext()
                  : null;

            let charId: any = null;

            if (charNameParam) {
                const characters = getCharacters();
                if (context && characters) {
                    const character = characters.find((c: any) => c.name === charNameParam);
                    if (character) {
                        charId = getCharacterId(character) || characters.indexOf(character);
                    }
                }
            } else if (macroType === 'char' || macroType === 'bot') {
                const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
                if (botOutfitManager?.characterId) {
                    charId = botOutfitManager.characterId;
                } else if (context?.characterId !== null && context?.characterId !== undefined) {
                    const character = context.characters[context.characterId];
                    if (character) {
                        charId = getCharacterId(character) || context.characterId.toString();
                    }
                }
            }

            if (charId !== null && (macroType === 'char' || macroType === 'bot' || charNameParam)) {
                const state = outfitStore.getState();
                const currentInstanceId = state.currentOutfitInstanceId;

                if (!currentInstanceId) {
                    return false;
                }

                const outfitData = outfitStore.getBotOutfit(charId.toString(), currentInstanceId);
                return (
                    outfitData &&
                    Object.keys(outfitData).length > 0 &&
                    outfitData[slotName] !== undefined &&
                    outfitData[slotName] !== 'None'
                );
            } else if (macroType === 'user') {
                const state = outfitStore.getState();
                const currentInstanceId = state.currentOutfitInstanceId;

                if (!currentInstanceId) {
                    return false;
                }

                const userOutfitData = outfitStore.getUserOutfit(currentInstanceId);
                return (
                    userOutfitData &&
                    Object.keys(userOutfitData).length > 0 &&
                    userOutfitData[slotName] !== undefined &&
                    userOutfitData[slotName] !== 'None'
                );
            }

            return false;
        } catch (error) {
            debugLog('[CustomMacroService] Error checking outfit data availability:', error, 'error');
            return false;
        }
    }

    clearCache(): void {
        this.macroValueCache.clear();
        debugLog('[CustomMacroService] Macro cache cleared', null, 'debug');
        // Note: We don't clear registeredMacros here as they should persist across cache clears
        // Only clear when explicitly deregistering
    }

    isValidCharacterName(name: string): boolean {
        return !['char', 'bot', 'user'].includes(name);
    }

    /**
     * Gets the value from the appropriate character instance-specific macro
     */

    getCurrentUserName(): string {
        try {
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                  ? window.getContext()
                  : null;

            if (context && context.chat) {
                for (let i = context.chat.length - 1; i >= 0; i--) {
                    const message = context.chat[i];
                    if (message.is_user && message.name) {
                        return message.name;
                    }
                }
            }

            if (
                typeof window.power_user !== 'undefined' &&
                window.power_user &&
                typeof window.user_avatar !== 'undefined' &&
                window.user_avatar
            ) {
                const personaName = window.power_user.personas[window.user_avatar];
                return personaName || 'User';
            }

            return typeof window.name1 !== 'undefined' ? window.name1 : 'User';
        } catch (error) {
            debugLog('Error getting user name:', error, 'error');
            return 'User';
        }
    }

    extractCustomMacros(text: string): CustomMacro[] {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const macros: CustomMacro[] = [];
        let index = 0;

        while (index < text.length) {
            const openIdx = text.indexOf('{{', index);
            if (openIdx === -1) break;

            const closeIdx = text.indexOf('}}', openIdx);
            if (closeIdx === -1) break;

            const macroContent = text.substring(openIdx + 2, closeIdx);
            const fullMatch = `{{${macroContent}}}`;

            debugLog(`[CustomMacroService] Parsing macro: ${fullMatch}`, null, 'debug');

            const parts = macroContent.split('_');
            let macroType: string = '';
            let slot: string | null = null;

            if (parts.length === 1) {
                const singlePart = parts[0];
                if (this.allSlots.includes(singlePart)) {
                    macroType = 'char';
                    slot = singlePart;
                    debugLog(
                        `[CustomMacroService] Single-part macro: ${singlePart} -> type: ${macroType}, slot: ${slot}`,
                        null,
                        'debug'
                    );
                } else if (['user', 'char', 'bot'].includes(singlePart)) {
                    macroType = singlePart;
                    slot = null;
                    debugLog(
                        `[CustomMacroService] Single-part macro: ${singlePart} -> type: ${macroType}, slot: null`,
                        null,
                        'debug'
                    );
                } else {
                    debugLog(
                        `[CustomMacroService] Skipping unrecognized single-part macro: ${singlePart}`,
                        null,
                        'debug'
                    );
                    index = closeIdx + 2;
                    continue;
                }
            } else {
                const potentialCharacterName = parts[0];
                const potentialSlot = parts.slice(1).join('_');

                debugLog(
                    `[CustomMacroService] Multi-part macro: potential char: ${potentialCharacterName}, potential slot: ${potentialSlot}`,
                    null,
                    'debug'
                );

                if (this.allSlots.includes(potentialSlot)) {
                    macroType = potentialCharacterName;
                    slot = potentialSlot;
                    debugLog(
                        `[CustomMacroService] Direct match found: type: ${macroType}, slot: ${slot}`,
                        null,
                        'debug'
                    );
                } else {
                    slot = null; // Ensure slot is initialized
                    for (let i = 1; i < parts.length; i++) {
                        const prefix = parts.slice(0, i).join('_');
                        const suffix = parts.slice(i).join('_');
                        debugLog(
                            `[CustomMacroService] Trying split: prefix='${prefix}', suffix='${suffix}'`,
                            null,
                            'debug'
                        );
                        if (this.allSlots.includes(suffix)) {
                            macroType = prefix;
                            slot = suffix;
                            debugLog(
                                `[CustomMacroService] Split match found: type: ${macroType}, slot: ${slot}`,
                                null,
                                'debug'
                            );
                            break;
                        }
                    }

                    if (slot === null || !this.allSlots.includes(slot)) {
                        debugLog(
                            `[CustomMacroService] No valid slot found for macro: ${fullMatch}, skipping`,
                            null,
                            'debug'
                        );
                        index = closeIdx + 2;
                        continue;
                    }
                }
            }

            if (slot !== null) {
                macros.push({
                    fullMatch: fullMatch,
                    type: macroType,
                    slot: slot,
                    startIndex: openIdx,
                });
            }

            index = closeIdx + 2;
        }

        return macros;
    }

    generateOutfitInfoString(botManager: any, userManager: any): string {
        try {
            const botOutfitData = botManager?.getOutfitData(this.allSlots) || [];
            const userOutfitData = userManager?.getOutfitData(this.allSlots) || [];

            let outfitInfo = '';

            outfitInfo += this._formatOutfitSection('{{char}}', 'Outfit', this.clothingSlots, botOutfitData, 'char');
            outfitInfo += this._formatOutfitSection(
                '{{char}}',
                'Accessories',
                this.accessorySlots,
                botOutfitData,
                'char'
            );
            outfitInfo += this._formatOutfitSection('{{user}}', 'Outfit', this.clothingSlots, userOutfitData, 'user');
            outfitInfo += this._formatOutfitSection(
                '{{user}}',
                'Accessories',
                this.accessorySlots,
                userOutfitData,
                'user'
            );

            return outfitInfo;
        } catch (error) {
            debugLog('[CustomMacroSystem] Error generating outfit info string:', error, 'error');
            return '';
        }
    }

    replaceMacrosInText(text: string): string {
        debugLog(
            `[CustomMacroService] replaceMacrosInText called with text length: ${text?.length || 0}`,
            null,
            'debug'
        );

        if (!text || typeof text !== 'string') {
            debugLog('[CustomMacroService] replaceMacrosInText: invalid input, returning as-is', null, 'debug');
            return text;
        }

        const macros = this.extractCustomMacros(text);
        debugLog(`[CustomMacroService] Found ${macros.length} macros in text`, null, 'debug');

        let result = text;

        for (let i = macros.length - 1; i >= 0; i--) {
            const macro = macros[i];
            debugLog(
                `[CustomMacroService] Processing macro: ${macro.fullMatch} (type: ${macro.type}, slot: ${macro.slot})`,
                null,
                'debug'
            );

            if (macro.slot) {
                // Check if we have actual outfit data before replacing
                const hasData = this.hasOutfitData(
                    macro.type,
                    macro.slot,
                    ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type
                );

                debugLog(`[CustomMacroService] Macro ${macro.fullMatch} has data: ${hasData}`, null, 'debug');

                if (hasData) {
                    // Only replace if we have actual data (not just "None")
                    const replacement = this.getInstanceAwareSlotValue(
                        macro.type,
                        macro.slot,
                        ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type
                    );

                    debugLog(`[CustomMacroService] Replacing ${macro.fullMatch} with '${replacement}'`, null, 'debug');

                    result =
                        result.substring(0, macro.startIndex) +
                        replacement +
                        result.substring(macro.startIndex + macro.fullMatch.length);
                }
                // If no data available, leave the macro unreplaced so it can be processed later
            }
            // Skip non-slot macros like {{char}} and {{user}} as they should be handled manually in prompt injection only
        }

        return result;
    }

    private _generateCacheKey(macroType: string, slotName: string, characterName: string | null): string {
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        // Use the bot manager's character ID (unique GUID) instead of context characterId (array index)
        // This ensures cache consistency when switching characters
        let currentCharacterId = 'unknown';
        if (window.outfitTracker?.botOutfitPanel?.outfitManager?.characterId) {
            currentCharacterId = window.outfitTracker.botOutfitPanel.outfitManager.characterId;
        } else if (context?.characterId !== undefined && context?.characterId !== null) {
            // Fallback to array index if bot manager characterId is not available
            currentCharacterId = context.characterId.toString();
        }

        const currentInstanceId = outfitStore.getCurrentInstanceId() || 'unknown';
        return `${macroType}_${slotName}_${characterName || 'null'}_${currentCharacterId}_${currentInstanceId}`;
    }

    _isSystemReady(): boolean {
        // Check if the core components are available
        if (
            !window.outfitTracker?.botOutfitPanel?.outfitManager ||
            !window.outfitTracker?.userOutfitPanel?.outfitManager
        ) {
            return false;
        }

        // Check if the store has a current instance ID
        const state = outfitStore.getState();
        if (!state.currentOutfitInstanceId) {
            return false;
        }

        // Check if we have character data
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();
        if (!context || !context.characters || context.characters.length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Clean up expired cache entries periodically
     */
    private _periodicCacheCleanup(): void {
        const now = Date.now();
        // Only run cleanup every 5 minutes to avoid performance impact
        if (now - (this as any).lastCacheCleanup > 5 * 60 * 1000) {
            this._cleanupExpiredCache();
            (this as any).lastCacheCleanup = now;
        }
    }

    private _setCache(cacheKey: string, value: string): void {
        this.macroValueCache.set(cacheKey, {
            value: value,
            timestamp: Date.now(),
        });
    }

    private _cleanupExpiredCache(): void {
        for (const [key, entry] of this.macroValueCache.entries()) {
            if (Date.now() - entry.timestamp >= this.cacheExpiryTime) {
                this.macroValueCache.delete(key);
            }
        }
    }

    private _formatOutfitSection(
        entity: string,
        sectionTitle: string,
        slots: string[],
        outfitData: any[],
        macroPrefix: string
    ): string {
        const hasItems = outfitData.some(
            (data) => slots.includes(data.name) && data.value !== 'None' && data.value !== ''
        );

        if (!hasItems) {
            return '';
        }

        let section = `
**${entity}'s Current ${sectionTitle}**
`;

        slots.forEach((slot) => {
            const slotData = outfitData.find((data: any) => data.name === slot);

            if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                const formattedSlotName = this._formatSlotName(slot);
                section += `**${formattedSlotName}:** {{${macroPrefix}_${slotData.name}}}
`;
            }
        });
        return section;
    }

    private _formatSlotName(slot: string): string {
        let result = '';

        for (let i = 0; i < slot.length; i++) {
            if (i > 0 && slot[i] >= 'A' && slot[i] <= 'Z' && slot[i - 1] !== ' ') {
                result += ' ' + slot[i];
            } else {
                result += slot[i];
            }
        }

        result = result.charAt(0).toUpperCase() + result.slice(1);
        result = result.split('-').join(' ');

        return result;
    }
}

export const customMacroSystem = new CustomMacroService();

export const updateMacroCacheOnOutfitChange = (
    _outfitType: string,
    _characterId: string,
    _instanceId: string,
    _slotName: string
): void => {
    customMacroSystem.clearCache();
};

export const invalidateSpecificMacroCaches = (
    outfitType: string,
    characterId: string,
    instanceId: string,
    slotName: string
): void => {
    for (const [key] of customMacroSystem.macroValueCache.entries()) {
        if (key.includes(characterId) && key.includes(instanceId) && key.includes(slotName)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }
};

export const invalidateMacroCachesForCharacter = (characterId: string | null, instanceId: string | null): void => {
    if (!characterId || !instanceId) {
        return;
    }

    for (const [key] of customMacroSystem.macroValueCache.entries()) {
        if (key.includes(characterId) && key.includes(instanceId)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }

    // Also invalidate pointer macro caches that might reference this instance
    for (const [key] of customMacroSystem.macroValueCache.entries()) {
        if (key.includes(instanceId)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }

    debugLog(
        `[CustomMacroService] Invalidated macro caches for character ${characterId}, instance ${instanceId}`,
        null,
        'debug'
    );
};
