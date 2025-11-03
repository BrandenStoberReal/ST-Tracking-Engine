import {generateGUID} from '../utils/utilities';
import {debugLog} from '../logging/DebugLogger';

/**
 * CharacterIdService - Manages character ID generation and assignment
 */

/**
 * Gets or generates a character ID from the character's extensions object
 * @param {any} character - The character object
 * @returns {Promise<string>} The character ID
 */
export async function getOrCreateCharacterId(character: any): Promise<string> {
    try {
        if (!character) {
            debugLog('[CharacterIdService] Character object is null or undefined', null, 'error');
            return generateGUID();
        }

        // Check if character has data and extensions
        if (character.data && character.data.extensions) {
            let characterId = character.data.extensions.character_id;

            if (characterId && typeof characterId === 'string' && characterId.trim() !== '') {
                debugLog(`[CharacterIdService] Found existing character ID: ${characterId}`, null, 'info');
                return characterId;
            }
        }

        // Generate new character ID
        const newCharacterId = generateGUID();
        debugLog(`[CharacterIdService] Generated new character ID: ${newCharacterId}`, null, 'info');

        // Get the context and use writeExtensionField to store the character ID
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.writeExtensionField) {
            // Find the character index in the characters array
            let characterIndex = -1;
            if (context.characters) {
                characterIndex = context.characters.findIndex((char: any) => char === character);
            }

            if (characterIndex !== -1) {
                await context.writeExtensionField(characterIndex, 'character_id', newCharacterId);
                debugLog(`[CharacterIdService] Stored character ID using writeExtensionField for character at index ${characterIndex}`, null, 'info');
            } else {
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
        } else {
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
    } catch (error) {
        debugLog('[CharacterIdService] Error getting or creating character ID:', error, 'error');
        return generateGUID();
    }
}

/**
 * Gets the character ID from a character object without creating one
 * @param {any} character - The character object
 * @returns {string|null} The character ID or null if not found
 */
export function getCharacterId(character: any): string | null {
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
    } catch (error) {
        debugLog('[CharacterIdService] Error getting character ID:', error, 'error');
        return null;
    }
}

/**
 * Finds a character by their character ID
 * @param {string} characterId - The character ID to search for
 * @returns {any|null} The character object or null if not found
 */
export function findCharacterById(characterId: string): any | null {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.characters) {
            for (const character of context.characters) {
                const id = getCharacterId(character);
                if (id === characterId) {
                    return character;
                }
            }
        }

        return null;
    } catch (error) {
        debugLog('[CharacterIdService] Error finding character by ID:', error, 'error');
        return null;
    }
}

/**
 * Gets the character ID for the current character
 * @returns {Promise<string|null>} The current character's ID or null if no character is selected
 */
export async function getCurrentCharacterId(): Promise<string | null> {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.characterId !== undefined && context.characterId !== null) {
            const character = context.characters[context.characterId];
            if (character) {
                return await getOrCreateCharacterId(character);
            }
        }

        return null;
    } catch (error) {
        debugLog('[CharacterIdService] Error getting current character ID:', error, 'error');
        return null;
    }
}

/**
 * Migrates all characters to have character IDs
 * @returns {Promise<number>} Number of characters that were migrated
 */
export async function migrateAllCharacters(): Promise<number> {
    try {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (!context || !context.characters) {
            debugLog('[CharacterIdService] No characters found for migration', null, 'warn');
            return 0;
        }

        let migratedCount = 0;

        for (let i = 0; i < context.characters.length; i++) {
            const character = context.characters[i];
            const existingId = getCharacterId(character);
            if (!existingId) {
                const newCharacterId = generateGUID();
                debugLog(`[CharacterIdService] Generated new character ID for migration: ${newCharacterId}`, null, 'info');

                if (context.writeExtensionField) {
                    await context.writeExtensionField(i, 'character_id', newCharacterId);
                    debugLog(`[CharacterIdService] Migrated character "${character.name}" using writeExtensionField`, null, 'info');
                } else {
                    debugLog('[CharacterIdService] writeExtensionField not available during migration, using fallback', null, 'warn');
                    // Fallback to direct assignment
                    if (!character.data) {
                        character.data = {};
                    }
                    if (!character.data.extensions) {
                        character.data.extensions = {};
                    }
                    character.data.extensions.character_id = newCharacterId;
                }

                migratedCount++;
                debugLog(`[CharacterIdService] Migrated character "${character.name}" with new ID`, null, 'info');
            }
        }

        debugLog(`[CharacterIdService] Migration complete. ${migratedCount} characters migrated.`, null, 'info');
        return migratedCount;
    } catch (error) {
        debugLog('[CharacterIdService] Error during character migration:', error, 'error');
        return 0;
    }
}