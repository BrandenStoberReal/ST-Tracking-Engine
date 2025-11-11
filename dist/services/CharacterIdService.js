var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { generateGUID } from '../utils/utilities.js';
import { debugLog } from '../logging/DebugLogger.js';
/**
 * CharacterIdService - Manages character ID generation and assignment
 */
/**
 * Gets or generates a character ID from the character's extensions object
 * @param character - The character object
 * @returns {Promise<string>} The character ID
 */
export function getOrCreateCharacterId(character) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!character) {
                debugLog('Character object is null or undefined', null, 'error', 'CharacterIdService');
                return generateGUID();
            }
            // Check if character has data and extensions
            if (character.data && character.data.extensions) {
                const characterId = character.data.extensions.character_id;
                if (characterId && typeof characterId === 'string' && characterId.trim() !== '') {
                    debugLog(`Found existing character ID: ${characterId}`, null, 'info', 'CharacterIdService');
                    return characterId;
                }
            }
            // Generate new character ID
            const newCharacterId = generateGUID();
            debugLog(`Generated new character ID: ${newCharacterId}`, null, 'info', 'CharacterIdService');
            // Get the context and use writeExtensionField to store the character ID
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;
            if (context && context.writeExtensionField) {
                // Find the character index in the characters array
                let characterIndex = -1;
                if (context.characters) {
                    characterIndex = context.characters.findIndex((char) => char === character);
                }
                if (characterIndex !== -1) {
                    yield context.writeExtensionField(characterIndex.toString(), 'character_id', newCharacterId);
                    debugLog(`[CharacterIdService] Stored character ID using writeExtensionField for character at index ${characterIndex}`, null, 'info');
                }
                else {
                    debugLog('[CharacterIdService] Could not find character index, falling back to direct assignment', null, 'warn');
                    // Fallback to direct assignment if character index not found
                    if (!character.data) {
                        character.data = {};
                    }
                    if (!character.data.extensions) {
                        character.data.extensions = {};
                    }
                    character.data.extensions.character_id = newCharacterId;
                }
            }
            else {
                debugLog('[CharacterIdService] writeExtensionField not available, falling back to direct assignment', null, 'warn');
                // Fallback to direct assignment if writeExtensionField not available
                if (!character.data) {
                    character.data = {};
                }
                if (!character.data.extensions) {
                    character.data.extensions = {};
                }
                character.data.extensions.character_id = newCharacterId;
            }
            return newCharacterId;
        }
        catch (error) {
            debugLog('Error getting or creating character ID:', error, 'error', 'CharacterIdService');
            return generateGUID();
        }
    });
}
/**
 * Gets the character ID from a character object without creating one
 * @param character - The character object
 * @returns {string|null} The character ID or null if not found
 */
export function getCharacterId(character) {
    try {
        if (!character) {
            return null;
        }
        if (character.data && character.data.extensions) {
            const characterId = character.data.extensions.character_id;
            if (characterId && typeof characterId === 'string' && characterId.trim() !== '') {
                return characterId;
            }
        }
        return null;
    }
    catch (error) {
        debugLog('Error getting character ID:', error, 'error', 'CharacterIdService');
        return null;
    }
}
/**
 * Finds a character by their character ID
 * @param characterId - The character ID to search for
 * @returns The character object or null if not found
 */
export function findCharacterById(characterId) {
    var _a;
    try {
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
            ? window.SillyTavern.getContext()
            : window.getContext
                ? window.getContext()
                : null;
        if (context && context.characters) {
            for (const character of context.characters) {
                const id = getCharacterId(character);
                if (id === characterId) {
                    return character;
                }
            }
        }
        return null;
    }
    catch (error) {
        debugLog('Error finding character by ID:', error, 'error', 'CharacterIdService');
        return null;
    }
}
/**
 * Gets the character ID for the current character
 * @returns {Promise<string|null>} The current character's ID or null if no character is selected
 */
export function getCurrentCharacterId() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;
            if (context && context.characterId !== undefined && context.characterId !== null) {
                const character = context.characters[context.characterId];
                if (character) {
                    return yield getOrCreateCharacterId(character);
                }
            }
            return null;
        }
        catch (error) {
            debugLog('Error getting current character ID:', error, 'error', 'CharacterIdService');
            return null;
        }
    });
}
/**
 * Migrates all characters to have character IDs
 * @returns {Promise<number>} Number of characters that were migrated
 */
export function migrateAllCharacters() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;
            if (!context || !context.characters) {
                debugLog('No characters found for migration', null, 'warn', 'CharacterIdService');
                return 0;
            }
            debugLog(`[CharacterIdService] Found ${context.characters.length} characters to check for migration`, null, 'info');
            debugLog(`[CharacterIdService] Found ${context.characters.length} characters to check for migration`, null, 'info');
            let migratedCount = 0;
            for (let i = 0; i < context.characters.length; i++) {
                const character = context.characters[i];
                const characterName = ('name' in character ? character.name : (_b = character.data) === null || _b === void 0 ? void 0 : _b.name) || 'Unnamed Character';
                const existingId = getCharacterId(character);
                debugLog(`Checking character "${characterName}" for existing ID...`, null, 'debug', 'CharacterIdService');
                if (!existingId) {
                    const newCharacterId = generateGUID();
                    debugLog(`[CharacterIdService] Generated new character ID for "${characterName}": ${newCharacterId}`, null, 'info');
                    if (context.writeExtensionField) {
                        yield context.writeExtensionField(i.toString(), 'character_id', newCharacterId);
                        debugLog(`[CharacterIdService] Successfully migrated character "${characterName}" using writeExtensionField`, null, 'info');
                    }
                    else {
                        debugLog('[CharacterIdService] writeExtensionField not available during migration, using fallback', null, 'warn');
                        // Fallback to direct assignment
                        if (!character.data) {
                            character.data = {};
                        }
                        const charData = character.data;
                        if (!charData.extensions) {
                            charData.extensions = {};
                        }
                        charData.extensions.character_id = newCharacterId;
                        debugLog(`[CharacterIdService] Successfully migrated character "${characterName}" using fallback method`, null, 'info');
                    }
                    migratedCount++;
                }
                else {
                    debugLog(`[CharacterIdService] Character "${characterName}" already has ID: ${existingId}`, null, 'debug');
                }
            }
            debugLog(`[CharacterIdService] Migration complete. ${migratedCount} characters migrated out of ${context.characters.length} total.`, null, 'info');
            return migratedCount;
        }
        catch (error) {
            debugLog('Error during character migration:', error, 'error', 'CharacterIdService');
            return 0;
        }
    });
}
