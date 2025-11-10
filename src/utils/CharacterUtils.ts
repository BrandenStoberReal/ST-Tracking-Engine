import {debugLog} from '../logging/DebugLogger';
import {getCharacterId, getOrCreateCharacterId} from '../services/CharacterIdService';
import {Character} from '../types';

export const CharacterInfoType = {
    Name: 'CharName',
    Description: 'CharDesc',
    Personality: 'CharPersonality',
    Scenario: 'CharScenario',
    DefaultMessage: 'CharDefaultMessage',
    ExampleMessage: 'CharExampleMessage',
    CreatorComment: 'CharCreatorComment',
    Avatar: 'CharAvatar',
    Talkativeness: 'CharTalkativeness',
    Favorited: 'CharFavorited',
    Tags: 'CharTags',
    Spec: 'CharSpec',
    SpecVersion: 'CharSpecVersion',
    Data: 'CharData',
    CreationDate: 'CharCreationDate',
    JsonData: 'CharJsonData',
    DateAdded: 'CharDateAdded',
    ChatSize: 'CharChatSize',
    DateSinceLastChat: 'CharDateSinceLastChat',
    DataSize: 'CharDataSize',
    CharacterNotes: 'CharCharacterNotes',
    CharacterId: 'CharCharacterId',
} as const;

export type CharacterInfoType = (typeof CharacterInfoType)[keyof typeof CharacterInfoType];

/**
 * Get character information by character ID
 * @param charId - The character ID to look up
 * @param infoType - A field from the CharacterInfoType enum representing the desired data
 * @returns The character info or null if not found
 */
export function getCharacterInfoById(charId: string, infoType: CharacterInfoType): unknown | null {
    try {
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        if (context && context.characters) {
            const characterIndex = parseInt(charId, 10);
            const character = context.characters[characterIndex];

            if (character) {
                let infoBuffer: unknown;

                switch (infoType) {
                    case CharacterInfoType.Name:
                        infoBuffer = 'name' in character ? character.name : character.data?.name;
                        break;
                    case CharacterInfoType.Description:
                        infoBuffer = 'description' in character ? character.description : character.data?.description;
                        break;
                    case CharacterInfoType.Personality:
                        infoBuffer = 'personality' in character ? character.personality : character.data?.personality;
                        break;
                    case CharacterInfoType.Scenario:
                        infoBuffer = 'scenario' in character ? character.scenario : character.data?.scenario;
                        break;
                    case CharacterInfoType.DefaultMessage:
                        infoBuffer = 'first_mes' in character ? character.first_mes : character.data?.first_mes;
                        break;
                    case CharacterInfoType.ExampleMessage:
                        infoBuffer = 'mes_example' in character ? character.mes_example : character.data?.mes_example;
                        break;
                    case CharacterInfoType.CreatorComment:
                        infoBuffer = character.creatorcomment;
                        break;
                    case CharacterInfoType.Avatar:
                        infoBuffer = character.avatar;
                        break;
                    case CharacterInfoType.Talkativeness:
                        infoBuffer = character.talkativeness;
                        break;
                    case CharacterInfoType.Favorited:
                        infoBuffer = character.fav;
                        break;
                    case CharacterInfoType.Tags:
                        infoBuffer = character.tags;
                        break;
                    case CharacterInfoType.Spec:
                        infoBuffer = character.spec;
                        break;
                    case CharacterInfoType.SpecVersion:
                        infoBuffer = character.spec_version;
                        break;
                    case CharacterInfoType.Data:
                        infoBuffer = character.data;
                        break;
                    case CharacterInfoType.CreationDate:
                        infoBuffer = character.create_date;
                        break;
                    case CharacterInfoType.JsonData:
                        infoBuffer = character.json_data;
                        break;
                    case CharacterInfoType.DateAdded:
                        infoBuffer = character.date_added;
                        break;
                    case CharacterInfoType.ChatSize:
                        infoBuffer = character.chat_size;
                        break;
                    case CharacterInfoType.DateSinceLastChat:
                        infoBuffer = character.date_last_chat;
                        break;
                    case CharacterInfoType.DataSize:
                        infoBuffer = character.data_size;
                        break;
                    case CharacterInfoType.CharacterNotes:
                        infoBuffer = (character.data as any).extensions.depth_prompt.prompt;
                        break;
                    case CharacterInfoType.CharacterId:
                        infoBuffer = getCharacterId(character);
                        break;
                    default:
                        infoBuffer = null;
                        break;
                }

                debugLog(`Character info field "${infoType}" successfully fetched from ID ${charId}`, null, 'info');
                return infoBuffer;
            }
        }

        debugLog(
            `Resolving character information (${infoType}) from ID failed. Returning null. Faulty ID: ${charId}`,
            null,
            'error'
        );
        return null;
    } catch (error) {
        debugLog('Error getting character info by ID:', error, 'error');
        return null;
    }
}

/**
 * Gets a list of all loaded characters.
 * @returns The list of character objects or null if not found
 */
export function getCharacters(): Character[] | null {
    const context = window.SillyTavern?.getContext
        ? window.SillyTavern.getContext()
        : window.getContext
          ? window.getContext()
          : null;

    if (context && context.characters) {
        debugLog('Character array fetched successfully.', null, 'info');
        return context.characters;
    }

    debugLog('Resolving character array failed.', null, 'error');
    return null;
}

/**
 * Gets the character ID by the character object.
 * @param char_object The character object from the master array
 * @returns The character ID or null if not found
 */
export function getCharacterIdByObject(char_object: Character): number | null {
    const characters = getCharacters();

    if (char_object && characters) {
        debugLog('Character ID via object fetched successfully.', null, 'info');
        return characters.indexOf(char_object);
    }

    debugLog('Resolving character id via object failed.', null, 'error');
    return null;
}

/**
 * Gets the character ID for a character by their array index
 * @param {string} charId - The character array index
 * @returns {Promise<string|null>} The character's unique ID or null if not found
 */
export async function getCharacterUniqueIdByIndex(charId: string): Promise<string | null> {
    try {
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        if (context && context.characters) {
            const characterIndex = parseInt(charId, 10);
            const character = context.characters[characterIndex];
            if (character) {
                return await getOrCreateCharacterId(character);
            }
        }

        debugLog(`Resolving character unique ID from index failed. Faulty index: ${charId}`, null, 'error');
        return null;
    } catch (error) {
        debugLog('Error getting character unique ID by index:', error, 'error');
        return null;
    }
}

/**
 * Gets the current character's unique ID
 * @returns {Promise<string|null>} The current character's unique ID or null if no character is selected
 */
export async function getCurrentCharacterUniqueId(): Promise<string | null> {
    try {
        // Try to get character ID from the current bot manager first
        const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
        if (botOutfitManager?.characterId) {
            return botOutfitManager.characterId;
        }

        // Fallback to old system
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        if (context && context.characterId !== undefined && context.characterId !== null) {
            return await getCharacterUniqueIdByIndex(context.characterId.toString());
        }

        return null;
    } catch (error) {
        debugLog('Error getting current character unique ID:', error, 'error');
        return null;
    }
}

/**
 * Finds a character's array index by their unique ID
 * @param {string} uniqueId - The character's unique ID
 * @returns {number|null} The character's array index or null if not found
 */
export function getCharacterIndexByUniqueId(uniqueId: string): number | null {
    try {
        const characters = getCharacters();

        if (characters && uniqueId) {
            for (let i = 0; i < characters.length; i++) {
                const characterId = getCharacterId(characters[i]);
                if (characterId === uniqueId) {
                    return i;
                }
            }
        }

        debugLog(`Resolving character index by unique ID failed. Faulty unique ID: ${uniqueId}`, null, 'error');
        return null;
    } catch (error) {
        debugLog('Error getting character index by unique ID:', error, 'error');
        return null;
    }
}
