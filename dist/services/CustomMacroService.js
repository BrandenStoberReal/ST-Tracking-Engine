import { outfitStore } from '../common/Store.js';
import { ACCESSORY_SLOTS, CLOTHING_SLOTS } from '../config/constants.js';
import { getCharacters } from '../utils/CharacterUtils.js';
import { getCharacterId } from './CharacterIdService.js';
import { debugLog } from '../logging/DebugLogger.js';
class CustomMacroService {
    constructor() {
        this.clothingSlots = CLOTHING_SLOTS;
        this.accessorySlots = ACCESSORY_SLOTS;
        this.allSlots = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
        this.macroValueCache = new Map();
        this.cacheExpiryTime = 5 * 60 * 1000;
        this.registeredMacros = new Set();
    }
    registerMacros(context) {
        var _a;
        const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext());
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
    registerUserInstanceMacros(context, instanceId) {
        var _a;
        const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext());
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
                debugLog(`[CustomMacroService] Registered user instance macro: ${instanceMacro} = ${value}`, null, 'debug');
            }
        });
    }
    /**
     * Updates user instance-specific macros when outfit data changes
     */
    /**
     * Gets the slot value using instance-aware resolution (for direct text replacement)
     */
    getInstanceAwareSlotValue(macroType, slotName, charNameParam = null) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }
        debugLog(`[CustomMacroService] getInstanceAwareSlotValue called for ${macroType}_${slotName}`, null, 'debug');
        // Try to get instance ID from current context or message mapping
        const instanceId = this.getInstanceIdForCurrentContext();
        if (!instanceId) {
            debugLog('[CustomMacroService] No instance ID found for text replacement, falling back to direct lookup', null, 'debug');
            return this.getCurrentSlotValue(macroType, slotName, charNameParam);
        }
        // Get the value directly from the outfit store using the resolved instance ID
        try {
            if (macroType === 'char') {
                const outfitData = outfitStore.getBotOutfit(outfitStore.getState().currentCharacterId || '', instanceId);
                return outfitData[slotName] || 'None';
            }
            else if (macroType === 'user') {
                const outfitData = outfitStore.getUserOutfit(instanceId);
                return outfitData[slotName] || 'None';
            }
        }
        catch (error) {
            debugLog(`[CustomMacroService] Error getting outfit data for ${macroType}_${slotName}_${instanceId}:`, error, 'error');
        }
        debugLog(`[CustomMacroService] No outfit data found for ${macroType}_${slotName}_${instanceId}, falling back to direct lookup`, null, 'debug');
        // Fallback to direct lookup if data not available
        return this.getCurrentSlotValue(macroType, slotName, charNameParam);
    }
    /**
     * Gets the value from the appropriate instance-specific macro
     */
    getPointerMacroValue(macroType, slotName) {
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }
        // Try to get instance ID from current context or message mapping
        const instanceId = this.getInstanceIdForCurrentContext();
        if (!instanceId) {
            debugLog('[CustomMacroService] No instance ID found for pointer macro', null, 'debug');
            return 'None';
        }
        // Get the value directly from the outfit store using the resolved instance ID
        try {
            if (macroType === 'char') {
                const outfitData = outfitStore.getBotOutfit(outfitStore.getState().currentCharacterId || '', instanceId);
                return outfitData[slotName] || 'None';
            }
            else if (macroType === 'user') {
                const outfitData = outfitStore.getUserOutfit(instanceId);
                return outfitData[slotName] || 'None';
            }
        }
        catch (error) {
            debugLog(`[CustomMacroService] Error getting outfit data for ${macroType}_${slotName}_${instanceId}:`, error, 'error');
        }
        debugLog(`[CustomMacroService] No outfit data found for ${macroType}_${slotName}_${instanceId}, falling back to direct lookup`, null, 'debug');
        // Fallback to direct lookup if data not available
        return this.getCurrentSlotValue(macroType, slotName);
    }
    /**
     * Gets the appropriate instance ID for the current context
     */
    getInstanceIdForCurrentContext() {
        var _a, _b;
        // First priority: Check if we already have a current instance ID
        const currentInstanceId = outfitStore.getCurrentInstanceId();
        if (currentInstanceId) {
            return currentInstanceId;
        }
        // Calculate instance ID directly from current chat context and cache it
        try {
            const ctx = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext();
            if (ctx && ctx.chat && ctx.chat.length > 0) {
                // Find the first bot message
                const firstBotMessage = ctx.chat.find((msg) => !msg.is_user && !msg.is_system);
                if (firstBotMessage) {
                    // Calculate instance ID directly from the message content
                    const instanceId = this.calculateInstanceIdFromMessage(firstBotMessage.mes);
                    if (instanceId) {
                        // Cache the calculated instance ID globally for other macros
                        outfitStore.setCurrentInstanceId(instanceId);
                        debugLog(`[CustomMacroService] Calculated and cached instance ID ${instanceId} from first message`, null, 'debug');
                        return instanceId;
                    }
                }
            }
        }
        catch (error) {
            debugLog('[CustomMacroService] Error calculating instance ID from chat:', error, 'debug');
        }
        // Last resort: Try to get instance ID from managers
        try {
            if ((_b = window.eventService) === null || _b === void 0 ? void 0 : _b.botManager) {
                const managerInstanceId = window.eventService.botManager.getOutfitInstanceId();
                if (managerInstanceId) {
                    debugLog(`[CustomMacroService] Using manager instance ID ${managerInstanceId} as last resort`, null, 'debug');
                    return managerInstanceId;
                }
            }
        }
        catch (error) {
            debugLog('[CustomMacroService] Error getting instance ID from manager:', error, 'debug');
        }
        debugLog('[CustomMacroService] Could not determine instance ID from any source', null, 'debug');
        return null;
    }
    /**
     * Calculates instance ID directly from a message by replicating the MacroProcessor logic
     */
    calculateInstanceIdFromMessage(message) {
        try {
            // Process the message the same way MacroProcessor does
            const processedMessage = this.processMessageForInstanceId(message);
            // Use the simple synchronous hash function for consistency
            return this.generateInstanceIdFromTextSimple(processedMessage);
        }
        catch (error) {
            debugLog('[CustomMacroService] Error calculating instance ID from message:', error, 'error');
            return null;
        }
    }
    /**
     * Simple synchronous instance ID generation (fallback from utilities.ts)
     */
    generateInstanceIdFromTextSimple(text) {
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
     * Processes a message for instance ID calculation (removes outfit macros)
     */
    processMessageForInstanceId(message) {
        let processedMessage = message;
        // Remove outfit macros from the message (similar to MacroProcessor logic)
        // This ensures instance IDs are consistent regardless of outfit values
        const outfitMacroRegex = /\{\{char_([^}]+)\}\}|\{\{user_([^}]+)\}\}/g;
        processedMessage = processedMessage.replace(outfitMacroRegex, '[OUTFIT_REMOVED]');
        return processedMessage;
    }
    deregisterMacros(context) {
        var _a;
        const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext());
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
    registerCharacterSpecificMacros(context) {
        var _a;
        const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext());
        const characters = getCharacters();
        if (ctx && ctx.registerMacro && characters) {
            for (const character of characters) {
                if (character && character.name) {
                    const characterName = character.name;
                    const characterId = getCharacterId(character);
                    if (!this.registeredMacros.has(characterName)) {
                        ctx.registerMacro(characterName, () => characterName);
                        this.registeredMacros.add(characterName);
                    }
                    // Register pointer macros for character-specific access
                    if (characterId) {
                        this.allSlots.forEach((slot) => {
                            const macroName = `${characterName}_${slot}`;
                            if (!this.registeredMacros.has(macroName)) {
                                ctx.registerMacro(macroName, () => {
                                    return this.getCharacterPointerMacroValue(characterId, slot);
                                });
                                this.registeredMacros.add(macroName);
                            }
                        });
                    }
                    // Instance macros are no longer needed - pointer macros access data directly from store
                }
            }
        }
        // User instance macros are no longer needed - pointer macros access data directly from store
    }
    deregisterCharacterSpecificMacros(context) {
        var _a;
        const ctx = context || (((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext());
        const characters = getCharacters();
        if (ctx && ctx.unregisterMacro && characters) {
            for (const character of characters) {
                if (character && character.name) {
                    const characterName = character.name;
                    const characterId = getCharacterId(character);
                    if (this.registeredMacros.has(characterName)) {
                        ctx.unregisterMacro(characterName);
                        this.registeredMacros.delete(characterName);
                    }
                    this.allSlots.forEach((slot) => {
                        const macroName = `${characterName}_${slot}`;
                        if (this.registeredMacros.has(macroName)) {
                            ctx.unregisterMacro(macroName);
                            this.registeredMacros.delete(macroName);
                        }
                        // Deregister instance-specific macros for this character
                        if (characterId) {
                            const instances = outfitStore.getCharacterInstances(characterId);
                            instances.forEach((instanceId) => {
                                const instanceMacro = `char_${slot}_${instanceId}`;
                                if (this.registeredMacros.has(instanceMacro)) {
                                    ctx.unregisterMacro(instanceMacro);
                                    this.registeredMacros.delete(instanceMacro);
                                }
                            });
                        }
                    });
                }
            }
            // Deregister user instance macros
            const userInstances = Object.keys(outfitStore.getState().userInstances || {});
            userInstances.forEach((instanceId) => {
                this.allSlots.forEach((slot) => {
                    const instanceMacro = `user_${slot}_${instanceId}`;
                    if (this.registeredMacros.has(instanceMacro)) {
                        ctx.unregisterMacro(instanceMacro);
                        this.registeredMacros.delete(instanceMacro);
                    }
                });
            });
        }
    }
    getCurrentCharName() {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
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
        }
        catch (error) {
            debugLog('Error getting character name:', error, 'error');
            return 'Character';
        }
    }
    getCurrentSlotValue(macroType, slotName, charNameParam = null) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!this.allSlots.includes(slotName)) {
            return 'None';
        }
        // First check if the outfit system is fully initialized
        if (!this._isSystemReady()) {
            debugLog('[CustomMacroService] System not ready, deferring macro value', null, 'debug');
            return 'None';
        }
        const cacheKey = this._generateCacheKey(macroType, slotName, charNameParam);
        const cachedValue = this.macroValueCache.get(cacheKey);
        // Only use cache if we're confident the data is still valid
        if (cachedValue && Date.now() - cachedValue.timestamp < this.cacheExpiryTime && cachedValue.value !== 'None') {
            return cachedValue.value;
        }
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;
            const characters = getCharacters();
            let charId = null;
            if (charNameParam) {
                if (context && characters) {
                    const character = characters.find((c) => c.name === charNameParam);
                    if (character) {
                        // Use the new GUID system - get the character ID from extensions
                        charId = getCharacterId(character);
                        if (!charId) {
                            // Fallback to array index if no GUID found
                            charId = characters.indexOf(character);
                        }
                    }
                    else if (context.characterId && context.getName) {
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
            }
            else if (macroType === 'char' || macroType === 'bot') {
                // Try to get character ID from the current bot manager first
                const botOutfitManager = (_c = (_b = window.outfitTracker) === null || _b === void 0 ? void 0 : _b.botOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager;
                if (botOutfitManager === null || botOutfitManager === void 0 ? void 0 : botOutfitManager.characterId) {
                    // Use the new character ID system - characterId is already the GUID
                    charId = botOutfitManager.characterId;
                }
                // Fallback to old system - convert array index to GUID
                if (charId === null && (context === null || context === void 0 ? void 0 : context.characterId) !== null && (context === null || context === void 0 ? void 0 : context.characterId) !== undefined) {
                    const character = context.characters[context.characterId];
                    if (character) {
                        charId = getCharacterId(character);
                        if (!charId) {
                            // If no GUID, fall back to array index as string for backward compatibility
                            charId = context.characterId.toString();
                        }
                    }
                }
            }
            else if (['user'].includes(macroType)) {
                charId = null;
            }
            else if (context && context.characterId && context.getName) {
                const currentCharName = context.getName();
                if (currentCharName === macroType) {
                    charId = context.characterId;
                }
            }
            // Ensure outfit data is loaded before accessing it
            if (charId !== null &&
                (macroType === 'char' ||
                    macroType === 'bot' ||
                    charNameParam ||
                    (this.isValidCharacterName(macroType) && !['user'].includes(macroType)))) {
                const botOutfitManager = (_e = (_d = window.outfitTracker) === null || _d === void 0 ? void 0 : _d.botOutfitPanel) === null || _e === void 0 ? void 0 : _e.outfitManager;
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
            }
            else if (macroType === 'user') {
                const userOutfitManager = (_g = (_f = window.outfitTracker) === null || _f === void 0 ? void 0 : _f.userOutfitPanel) === null || _g === void 0 ? void 0 : _g.outfitManager;
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
        }
        catch (error) {
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
    hasOutfitData(macroType, slotName, charNameParam = null) {
        var _a, _b, _c;
        try {
            if (!this._isSystemReady()) {
                return false;
            }
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;
            let charId = null;
            if (charNameParam) {
                const characters = getCharacters();
                if (context && characters) {
                    const character = characters.find((c) => c.name === charNameParam);
                    if (character) {
                        charId = getCharacterId(character) || characters.indexOf(character);
                    }
                }
            }
            else if (macroType === 'char' || macroType === 'bot') {
                const botOutfitManager = (_c = (_b = window.outfitTracker) === null || _b === void 0 ? void 0 : _b.botOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager;
                if (botOutfitManager === null || botOutfitManager === void 0 ? void 0 : botOutfitManager.characterId) {
                    charId = botOutfitManager.characterId;
                }
                else if ((context === null || context === void 0 ? void 0 : context.characterId) !== null && (context === null || context === void 0 ? void 0 : context.characterId) !== undefined) {
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
                return (outfitData &&
                    Object.keys(outfitData).length > 0 &&
                    outfitData[slotName] !== undefined &&
                    outfitData[slotName] !== 'None');
            }
            else if (macroType === 'user') {
                const state = outfitStore.getState();
                const currentInstanceId = state.currentOutfitInstanceId;
                if (!currentInstanceId) {
                    return false;
                }
                const userOutfitData = outfitStore.getUserOutfit(currentInstanceId);
                return (userOutfitData &&
                    Object.keys(userOutfitData).length > 0 &&
                    userOutfitData[slotName] !== undefined &&
                    userOutfitData[slotName] !== 'None');
            }
            return false;
        }
        catch (error) {
            debugLog('[CustomMacroService] Error checking outfit data availability:', error, 'error');
            return false;
        }
    }
    clearCache() {
        this.macroValueCache.clear();
        debugLog('[CustomMacroService] Macro cache cleared', null, 'debug');
        // Note: We don't clear registeredMacros here as they should persist across cache clears
        // Only clear when explicitly deregistering
    }
    isValidCharacterName(name) {
        return !['char', 'bot', 'user'].includes(name);
    }
    /**
     * Gets the value from the appropriate character instance-specific macro
     */
    getCharacterPointerMacroValue(characterId, slotName) {
        var _a;
        if (!this.allSlots.includes(slotName) || !characterId) {
            return 'None';
        }
        // Get the current instance ID
        const currentInstanceId = outfitStore.getCurrentInstanceId();
        if (!currentInstanceId) {
            debugLog('[CustomMacroService] No current instance ID for character pointer macro', null, 'debug');
            return 'None';
        }
        // Construct the instance-specific macro name
        const instanceMacroName = `char_${slotName}_${currentInstanceId}`;
        // Try to get the value from the registered macro
        const ctx = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : window.getContext();
        if (ctx && ctx.getMacro && ctx.getMacro[instanceMacroName]) {
            try {
                return ctx.getMacro[instanceMacroName]() || 'None';
            }
            catch (error) {
                debugLog(`[CustomMacroService] Error getting character instance macro value for ${instanceMacroName}:`, error, 'error');
                return 'None';
            }
        }
        debugLog(`[CustomMacroService] Character instance macro ${instanceMacroName} not found, falling back to direct lookup`, null, 'debug');
        // Fallback to direct lookup if macro not available
        return this.getCurrentSlotValue('char', slotName);
    }
    getCurrentUserName() {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
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
            if (typeof window.power_user !== 'undefined' &&
                window.power_user &&
                typeof window.user_avatar !== 'undefined' &&
                window.user_avatar) {
                const personaName = window.power_user.personas[window.user_avatar];
                return personaName || 'User';
            }
            return typeof window.name1 !== 'undefined' ? window.name1 : 'User';
        }
        catch (error) {
            debugLog('Error getting user name:', error, 'error');
            return 'User';
        }
    }
    extractCustomMacros(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        const macros = [];
        let index = 0;
        while (index < text.length) {
            const openIdx = text.indexOf('{{', index);
            if (openIdx === -1)
                break;
            const closeIdx = text.indexOf('}}', openIdx);
            if (closeIdx === -1)
                break;
            const macroContent = text.substring(openIdx + 2, closeIdx);
            const fullMatch = `{{${macroContent}}}`;
            const parts = macroContent.split('_');
            let macroType = '';
            let slot = null;
            if (parts.length === 1) {
                const singlePart = parts[0];
                if (this.allSlots.includes(singlePart)) {
                    macroType = 'char';
                    slot = singlePart;
                }
                else if (['user', 'char', 'bot'].includes(singlePart)) {
                    macroType = singlePart;
                    slot = null;
                }
                else {
                    index = closeIdx + 2;
                    continue;
                }
            }
            else {
                const potentialCharacterName = parts[0];
                const potentialSlot = parts.slice(1).join('_');
                if (this.allSlots.includes(potentialSlot)) {
                    macroType = potentialCharacterName;
                    slot = potentialSlot;
                }
                else {
                    slot = null; // Ensure slot is initialized
                    for (let i = 1; i < parts.length; i++) {
                        const prefix = parts.slice(0, i).join('_');
                        const suffix = parts.slice(i).join('_');
                        if (this.allSlots.includes(suffix)) {
                            macroType = prefix;
                            slot = suffix;
                            break;
                        }
                    }
                    if (slot === null || !this.allSlots.includes(slot)) {
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
    generateOutfitInfoString(botManager, userManager) {
        try {
            const botOutfitData = (botManager === null || botManager === void 0 ? void 0 : botManager.getOutfitData(this.allSlots)) || [];
            const userOutfitData = (userManager === null || userManager === void 0 ? void 0 : userManager.getOutfitData(this.allSlots)) || [];
            let outfitInfo = '';
            outfitInfo += this._formatOutfitSection('{{char}}', 'Outfit', this.clothingSlots, botOutfitData, 'char');
            outfitInfo += this._formatOutfitSection('{{char}}', 'Accessories', this.accessorySlots, botOutfitData, 'char');
            outfitInfo += this._formatOutfitSection('{{user}}', 'Outfit', this.clothingSlots, userOutfitData, 'user');
            outfitInfo += this._formatOutfitSection('{{user}}', 'Accessories', this.accessorySlots, userOutfitData, 'user');
            return outfitInfo;
        }
        catch (error) {
            debugLog('[CustomMacroSystem] Error generating outfit info string:', error, 'error');
            return '';
        }
    }
    replaceMacrosInText(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }
        const macros = this.extractCustomMacros(text);
        let result = text;
        for (let i = macros.length - 1; i >= 0; i--) {
            const macro = macros[i];
            if (macro.slot) {
                // Check if we have actual outfit data before replacing
                const hasData = this.hasOutfitData(macro.type, macro.slot, ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type);
                if (hasData) {
                    // Only replace if we have actual data (not just "None")
                    const replacement = this.getInstanceAwareSlotValue(macro.type, macro.slot, ['char', 'bot', 'user'].includes(macro.type) ? null : macro.type);
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
    _generateCacheKey(macroType, slotName, characterName) {
        var _a, _b, _c, _d;
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
            ? window.SillyTavern.getContext()
            : window.getContext
                ? window.getContext()
                : null;
        // Use the bot manager's character ID (unique GUID) instead of context characterId (array index)
        // This ensures cache consistency when switching characters
        let currentCharacterId = 'unknown';
        if ((_d = (_c = (_b = window.outfitTracker) === null || _b === void 0 ? void 0 : _b.botOutfitPanel) === null || _c === void 0 ? void 0 : _c.outfitManager) === null || _d === void 0 ? void 0 : _d.characterId) {
            currentCharacterId = window.outfitTracker.botOutfitPanel.outfitManager.characterId;
        }
        else if ((context === null || context === void 0 ? void 0 : context.characterId) !== undefined && (context === null || context === void 0 ? void 0 : context.characterId) !== null) {
            // Fallback to array index if bot manager characterId is not available
            currentCharacterId = context.characterId.toString();
        }
        const currentInstanceId = outfitStore.getCurrentInstanceId() || 'unknown';
        return `${macroType}_${slotName}_${characterName || 'null'}_${currentCharacterId}_${currentInstanceId}`;
    }
    _isSystemReady() {
        var _a, _b, _c, _d, _e;
        // Check if the core components are available
        if (!((_b = (_a = window.outfitTracker) === null || _a === void 0 ? void 0 : _a.botOutfitPanel) === null || _b === void 0 ? void 0 : _b.outfitManager) ||
            !((_d = (_c = window.outfitTracker) === null || _c === void 0 ? void 0 : _c.userOutfitPanel) === null || _d === void 0 ? void 0 : _d.outfitManager)) {
            return false;
        }
        // Check if the store has a current instance ID
        const state = outfitStore.getState();
        if (!state.currentOutfitInstanceId) {
            return false;
        }
        // Check if we have character data
        const context = ((_e = window.SillyTavern) === null || _e === void 0 ? void 0 : _e.getContext) ? window.SillyTavern.getContext() : window.getContext();
        if (!context || !context.characters || context.characters.length === 0) {
            return false;
        }
        return true;
    }
    _setCache(cacheKey, value) {
        this.macroValueCache.set(cacheKey, {
            value: value,
            timestamp: Date.now(),
        });
    }
    _cleanupExpiredCache() {
        for (const [key, entry] of this.macroValueCache.entries()) {
            if (Date.now() - entry.timestamp >= this.cacheExpiryTime) {
                this.macroValueCache.delete(key);
            }
        }
    }
    _formatOutfitSection(entity, sectionTitle, slots, outfitData, macroPrefix) {
        const hasItems = outfitData.some((data) => slots.includes(data.name) && data.value !== 'None' && data.value !== '');
        if (!hasItems) {
            return '';
        }
        let section = `
**${entity}'s Current ${sectionTitle}**
`;
        slots.forEach((slot) => {
            const slotData = outfitData.find((data) => data.name === slot);
            if (slotData && slotData.value !== 'None' && slotData.value !== '') {
                const formattedSlotName = this._formatSlotName(slot);
                section += `**${formattedSlotName}:** {{${macroPrefix}_${slotData.name}}}
`;
            }
        });
        return section;
    }
    _formatSlotName(slot) {
        let result = '';
        for (let i = 0; i < slot.length; i++) {
            if (i > 0 && slot[i] >= 'A' && slot[i] <= 'Z' && slot[i - 1] !== ' ') {
                result += ' ' + slot[i];
            }
            else {
                result += slot[i];
            }
        }
        result = result.charAt(0).toUpperCase() + result.slice(1);
        result = result.split('-').join(' ');
        return result;
    }
}
export const customMacroSystem = new CustomMacroService();
export const updateMacroCacheOnOutfitChange = (_outfitType, _characterId, _instanceId, _slotName) => {
    customMacroSystem.clearCache();
};
export const invalidateSpecificMacroCaches = (outfitType, characterId, instanceId, slotName) => {
    for (const [key] of customMacroSystem.macroValueCache.entries()) {
        if (key.includes(characterId) && key.includes(instanceId) && key.includes(slotName)) {
            customMacroSystem.macroValueCache.delete(key);
        }
    }
};
export const invalidateMacroCachesForCharacter = (characterId, instanceId) => {
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
    debugLog(`[CustomMacroService] Invalidated macro caches for character ${characterId}, instance ${instanceId}`, null, 'debug');
};
