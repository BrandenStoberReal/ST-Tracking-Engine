import {ALL_SLOTS} from '../config/constants';
import {debugLog} from '../logging/DebugLogger';
import {findCharacterById, getCharacterId} from './CharacterIdService';
import {outfitStore} from '../common/Store';
import {EXTENSION_EVENTS, extensionEventBus} from '../core/events';

/**
 * CharacterOutfitService - Handles embedding outfit presets in character card extensions
 */

interface CharacterOutfitData {
    defaultOutfit?: { [slot: string]: string };
    presets?: { [presetName: string]: { [slot: string]: string } };
    lastModified?: number;
}

interface CharacterCardExtensions {
    'st-outfits'?: CharacterOutfitData;

    [key: string]: any;
}

/**
 * Gets the SillyTavern context
 */
function getSTContext(): any {
    return window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
}

/**
 * Gets the outfit data from a character card's extensions
 * @param character - The character object
 * @returns The outfit data or null if not found
 */
export function getCharacterOutfitData(character: any): CharacterOutfitData | null {
    try {
        if (!character || !character.data || !character.data.extensions) {
            return null;
        }

        const extensions = character.data.extensions as CharacterCardExtensions;
        return extensions['st-outfits'] || null;
    } catch (error) {
        debugLog('[CharacterOutfitService] Error getting character outfit data:', error, 'error');
        return null;
    }
}

/**
 * Sets the outfit data in a character card's extensions
 * @param character - The character object
 * @param outfitData - The outfit data to embed
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterOutfitData(character: any, outfitData: CharacterOutfitData): Promise<boolean> {
    try {
        if (!character) {
            debugLog('[CharacterOutfitService] Character object is null or undefined', null, 'error');
            return false;
        }

        // Ensure character has data and extensions
        if (!character.data) {
            character.data = {};
        }
        if (!character.data.extensions) {
            character.data.extensions = {};
        }

        const extensions = character.data.extensions as CharacterCardExtensions;

        // Add timestamp for last modification
        outfitData.lastModified = Date.now();

        // Set the outfit data under our namespace
        extensions['st-outfits'] = outfitData;

        // Save to SillyTavern using writeExtensionField if available
        const context = getSTContext();
        if (context && context.writeExtensionField) {
            // Find the character index
            let characterIndex = -1;
            if (context.characters) {
                characterIndex = context.characters.findIndex((char: any) => char === character);
            }

            if (characterIndex !== -1) {
                await context.writeExtensionField(characterIndex, 'st-outfits', outfitData);
                debugLog(`[CharacterOutfitService] Saved outfit data to character card using writeExtensionField`, null, 'info');
                return true;
            }
        }

        // Fallback: direct assignment (data will be saved when character is saved)
        debugLog('[CharacterOutfitService] Using direct assignment for outfit data (will be saved with character)', null, 'info');
        return true;
    } catch (error) {
        debugLog('[CharacterOutfitService] Error setting character outfit data:', error, 'error');
        return false;
    }
}

/**
 * Gets the default outfit from a character card
 * @param character - The character object
 * @returns The default outfit data or null if not found
 */
export function getCharacterDefaultOutfit(character: any): { [slot: string]: string } | null {
    const outfitData = getCharacterOutfitData(character);
    return outfitData?.defaultOutfit || null;
}

/**
 * Sets the default outfit in a character card
 * @param character - The character object
 * @param defaultOutfit - The default outfit data
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterDefaultOutfit(character: any, defaultOutfit: {
    [slot: string]: string
}): Promise<boolean> {
    try {
        const outfitData = getCharacterOutfitData(character) || {};

        // Validate the outfit data
        const validatedOutfit: { [slot: string]: string } = {};
        for (const slot of ALL_SLOTS) {
            validatedOutfit[slot] = defaultOutfit[slot] || 'None';
        }

        outfitData.defaultOutfit = validatedOutfit;

        return await setCharacterOutfitData(character, outfitData);
    } catch (error) {
        debugLog('[CharacterOutfitService] Error setting character default outfit:', error, 'error');
        return false;
    }
}

/**
 * Gets all presets from a character card
 * @param character - The character object
 * @returns The presets data or empty object if not found
 */
export function getCharacterPresets(character: any): { [presetName: string]: { [slot: string]: string } } {
    const outfitData = getCharacterOutfitData(character);
    return outfitData?.presets || {};
}

/**
 * Sets a preset in a character card
 * @param character - The character object
 * @param presetName - The preset name
 * @param presetData - The preset outfit data
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterPreset(character: any, presetName: string, presetData: {
    [slot: string]: string
}): Promise<boolean> {
    try {
        const outfitData = getCharacterOutfitData(character) || {};
        if (!outfitData.presets) {
            outfitData.presets = {};
        }

        // Validate the preset data
        const validatedPreset: { [slot: string]: string } = {};
        for (const slot of ALL_SLOTS) {
            validatedPreset[slot] = presetData[slot] || 'None';
        }

        outfitData.presets[presetName] = validatedPreset;

        return await setCharacterOutfitData(character, outfitData);
    } catch (error) {
        debugLog('[CharacterOutfitService] Error setting character preset:', error, 'error');
        return false;
    }
}

/**
 * Deletes a preset from a character card
 * @param character - The character object
 * @param presetName - The preset name to delete
 * @returns Promise<boolean> - Success status
 */
export async function deleteCharacterPreset(character: any, presetName: string): Promise<boolean> {
    try {
        const outfitData = getCharacterOutfitData(character);
        if (!outfitData || !outfitData.presets || !outfitData.presets[presetName]) {
            return true; // Preset doesn't exist, consider it successfully "deleted"
        }

        delete outfitData.presets[presetName];

        return await setCharacterOutfitData(character, outfitData);
    } catch (error) {
        debugLog('[CharacterOutfitService] Error deleting character preset:', error, 'error');
        return false;
    }
}

/**
 * Gets outfit data for a character by character ID
 * @param characterId - The character ID
 * @returns The outfit data or null if not found
 */
export function getCharacterOutfitDataById(characterId: string): CharacterOutfitData | null {
    const character = findCharacterById(characterId);
    return character ? getCharacterOutfitData(character) : null;
}

/**
 * Sets outfit data for a character by character ID
 * @param characterId - The character ID
 * @param outfitData - The outfit data to set
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterOutfitDataById(characterId: string, outfitData: CharacterOutfitData): Promise<boolean> {
    const character = findCharacterById(characterId);
    return character ? await setCharacterOutfitData(character, outfitData) : false;
}

/**
 * Gets the default outfit for a character by character ID
 * @param characterId - The character ID
 * @returns The default outfit data or null if not found
 */
export function getCharacterDefaultOutfitById(characterId: string): { [slot: string]: string } | null {
    const character = findCharacterById(characterId);
    return character ? getCharacterDefaultOutfit(character) : null;
}

/**
 * Sets the default outfit for a character by character ID
 * @param characterId - The character ID
 * @param defaultOutfit - The default outfit data
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterDefaultOutfitById(characterId: string, defaultOutfit: {
    [slot: string]: string
}): Promise<boolean> {
    const character = findCharacterById(characterId);
    return character ? await setCharacterDefaultOutfit(character, defaultOutfit) : false;
}

/**
 * Gets all presets for a character by character ID
 * @param characterId - The character ID
 * @returns The presets data or empty object if not found
 */
export function getCharacterPresetsById(characterId: string): { [presetName: string]: { [slot: string]: string } } {
    const character = findCharacterById(characterId);
    return character ? getCharacterPresets(character) : {};
}

/**
 * Sets a preset for a character by character ID
 * @param characterId - The character ID
 * @param presetName - The preset name
 * @param presetData - The preset outfit data
 * @returns Promise<boolean> - Success status
 */
export async function setCharacterPresetById(characterId: string, presetName: string, presetData: {
    [slot: string]: string
}): Promise<boolean> {
    const character = findCharacterById(characterId);
    return character ? await setCharacterPreset(character, presetName, presetData) : false;
}

/**
 * Deletes a preset for a character by character ID
 * @param characterId - The character ID
 * @param presetName - The preset name to delete
 * @returns Promise<boolean> - Success status
 */
export async function deleteCharacterPresetById(characterId: string, presetName: string): Promise<boolean> {
    const character = findCharacterById(characterId);
    return character ? await deleteCharacterPreset(character, presetName) : false;
}

/**
 * Migrates existing default outfits from extension settings to character cards
 * @returns Promise<number> - Number of characters migrated
 */
export async function migrateDefaultOutfitsToCharacterCards(): Promise<number> {
    try {
        const context = getSTContext();
        if (!context || !context.characters) {
            debugLog('[CharacterOutfitService] No characters available for migration', null, 'warn');
            return 0;
        }

        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};
        let migratedCount = 0;

        debugLog(`[CharacterOutfitService] Starting migration of default outfits to character cards`, null, 'info');

        for (let i = 0; i < context.characters.length; i++) {
            const character = context.characters[i];
            const characterId = getCharacterId(character);

            if (!characterId || !defaultBotPresets[characterId]) {
                continue;
            }

            const characterDefaultPresets = defaultBotPresets[characterId];
            let hasEmbeddedDefault = false;

            // Check each instance ID for default presets
            for (const [instanceId, presetName] of Object.entries(characterDefaultPresets)) {
                if (typeof presetName !== 'string') continue;

                // Get the preset data from extension storage
                const {bot: presets} = outfitStore.getPresets(characterId, instanceId);
                if (!presets || !presets[presetName]) {
                    debugLog(`[CharacterOutfitService] Preset "${presetName}" not found for character ${characterId}, instance ${instanceId}`, null, 'warn');
                    continue;
                }

                // Embed the default outfit in the character card
                const success = await setCharacterDefaultOutfit(character, presets[presetName]);
                if (success) {
                    debugLog(`[CharacterOutfitService] Migrated default outfit "${presetName}" for character ${characterId}, instance ${instanceId}`, null, 'info');
                    hasEmbeddedDefault = true;
                } else {
                    debugLog(`[CharacterOutfitService] Failed to migrate default outfit for character ${characterId}, instance ${instanceId}`, null, 'error');
                }
            }

            if (hasEmbeddedDefault) {
                migratedCount++;
            }
        }

        debugLog(`[CharacterOutfitService] Migration complete. ${migratedCount} characters had default outfits migrated.`, null, 'info');

        // Emit migration completed event
        extensionEventBus.emit(EXTENSION_EVENTS.MIGRATION_COMPLETED, {
            migrationType: 'default-outfits-to-cards',
            charactersMigrated: migratedCount,
            totalCharacters: context.characters.length
        });

        return migratedCount;
    } catch (error) {
        debugLog('[CharacterOutfitService] Error during default outfit migration:', error, 'error');
        return 0;
    }
}

