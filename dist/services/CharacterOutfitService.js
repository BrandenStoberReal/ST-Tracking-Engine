var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ALL_SLOTS } from '../config/constants.js';
import { debugLog } from '../logging/DebugLogger.js';
import { findCharacterById, getCharacterId } from './CharacterIdService.js';
import { outfitStore } from '../common/Store.js';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events.js';
/**
 * Gets the SillyTavern context
 */
function getSTContext() {
    var _a;
    return ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
        ? window.SillyTavern.getContext()
        : window.getContext
            ? window.getContext()
            : null;
}
/**
 * Gets the outfit data from a character card's extensions
 * @param character - The character object
 * @returns The outfit data or null if not found
 */
export function getCharacterOutfitData(character) {
    try {
        if (!character || !character.data || !character.data.extensions) {
            return null;
        }
        const extensions = character.data.extensions;
        return extensions['st-outfits'] || null;
    }
    catch (error) {
        debugLog('Error getting character outfit data:', error, 'error', 'CharacterOutfitService');
        return null;
    }
}
/**
 * Sets the outfit data in a character card's extensions
 * @param character - The character object
 * @param outfitData - The outfit data to embed
 * @returns Promise<boolean> - Success status
 */
export function setCharacterOutfitData(character, outfitData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!character) {
                debugLog('Character object is null or undefined', null, 'error', 'CharacterOutfitService');
                return false;
            }
            // Ensure character has data and extensions
            if (!character.data) {
                character.data = {};
            }
            if (!character.data.extensions) {
                character.data.extensions = {};
            }
            const extensions = character.data.extensions;
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
                    characterIndex = context.characters.findIndex((char) => char === character);
                }
                if (characterIndex !== -1) {
                    yield context.writeExtensionField(characterIndex, 'st-outfits', outfitData);
                    debugLog(`[CharacterOutfitService] Saved outfit data to character card using writeExtensionField`, null, 'info');
                    return true;
                }
            }
            // Fallback: direct assignment (data will be saved when character is saved)
            debugLog('[CharacterOutfitService] Using direct assignment for outfit data (will be saved with character)', null, 'info');
            return true;
        }
        catch (error) {
            debugLog('Error setting character outfit data:', error, 'error', 'CharacterOutfitService');
            return false;
        }
    });
}
/**
 * Gets the default outfit from a character card
 * @param character - The character object
 * @returns The default outfit data or null if not found
 */
export function getCharacterDefaultOutfit(character) {
    const outfitData = getCharacterOutfitData(character);
    return (outfitData === null || outfitData === void 0 ? void 0 : outfitData.defaultOutfit) || null;
}
/**
 * Sets the default outfit in a character card
 * @param character - The character object
 * @param defaultOutfit - The default outfit data
 * @returns Promise<boolean> - Success status
 */
export function setCharacterDefaultOutfit(character, defaultOutfit) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const outfitData = getCharacterOutfitData(character) || {};
            // Validate the outfit data
            const validatedOutfit = {};
            for (const slot of ALL_SLOTS) {
                validatedOutfit[slot] = defaultOutfit[slot] || 'None';
            }
            outfitData.defaultOutfit = validatedOutfit;
            return yield setCharacterOutfitData(character, outfitData);
        }
        catch (error) {
            debugLog('Error setting character default outfit:', error, 'error', 'CharacterOutfitService');
            return false;
        }
    });
}
/**
 * Gets all presets from a character card
 * @param character - The character object
 * @returns The presets data or empty object if not found
 */
export function getCharacterPresets(character) {
    const outfitData = getCharacterOutfitData(character);
    return (outfitData === null || outfitData === void 0 ? void 0 : outfitData.presets) || {};
}
/**
 * Sets a preset in a character card
 * @param character - The character object
 * @param presetName - The preset name
 * @param presetData - The preset outfit data
 * @returns Promise<boolean> - Success status
 */
export function setCharacterPreset(character, presetName, presetData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const outfitData = getCharacterOutfitData(character) || {};
            if (!outfitData.presets) {
                outfitData.presets = {};
            }
            // Validate the preset data
            const validatedPreset = {};
            for (const slot of ALL_SLOTS) {
                validatedPreset[slot] = presetData[slot] || 'None';
            }
            outfitData.presets[presetName] = validatedPreset;
            return yield setCharacterOutfitData(character, outfitData);
        }
        catch (error) {
            debugLog('Error setting character preset:', error, 'error', 'CharacterOutfitService');
            return false;
        }
    });
}
/**
 * Deletes a preset from a character card
 * @param character - The character object
 * @param presetName - The preset name to delete
 * @returns Promise<boolean> - Success status
 */
export function deleteCharacterPreset(character, presetName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const outfitData = getCharacterOutfitData(character);
            if (!outfitData || !outfitData.presets || !outfitData.presets[presetName]) {
                return true; // Preset doesn't exist, consider it successfully "deleted"
            }
            delete outfitData.presets[presetName];
            return yield setCharacterOutfitData(character, outfitData);
        }
        catch (error) {
            debugLog('Error deleting character preset:', error, 'error', 'CharacterOutfitService');
            return false;
        }
    });
}
/**
 * Gets outfit data for a character by character ID
 * @param characterId - The character ID
 * @returns The outfit data or null if not found
 */
export function getCharacterOutfitDataById(characterId) {
    const character = findCharacterById(characterId);
    return character ? getCharacterOutfitData(character) : null;
}
/**
 * Sets outfit data for a character by character ID
 * @param characterId - The character ID
 * @param outfitData - The outfit data to set
 * @returns Promise<boolean> - Success status
 */
export function setCharacterOutfitDataById(characterId, outfitData) {
    return __awaiter(this, void 0, void 0, function* () {
        const character = findCharacterById(characterId);
        return character ? yield setCharacterOutfitData(character, outfitData) : false;
    });
}
/**
 * Gets the default outfit for a character by character ID
 * @param characterId - The character ID
 * @returns The default outfit data or null if not found
 */
export function getCharacterDefaultOutfitById(characterId) {
    const character = findCharacterById(characterId);
    return character ? getCharacterDefaultOutfit(character) : null;
}
/**
 * Sets the default outfit for a character by character ID
 * @param characterId - The character ID
 * @param defaultOutfit - The default outfit data
 * @returns Promise<boolean> - Success status
 */
export function setCharacterDefaultOutfitById(characterId, defaultOutfit) {
    return __awaiter(this, void 0, void 0, function* () {
        const character = findCharacterById(characterId);
        return character ? yield setCharacterDefaultOutfit(character, defaultOutfit) : false;
    });
}
/**
 * Gets all presets for a character by character ID
 * @param characterId - The character ID
 * @returns The presets data or empty object if not found
 */
export function getCharacterPresetsById(characterId) {
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
export function setCharacterPresetById(characterId, presetName, presetData) {
    return __awaiter(this, void 0, void 0, function* () {
        const character = findCharacterById(characterId);
        return character ? yield setCharacterPreset(character, presetName, presetData) : false;
    });
}
/**
 * Deletes a preset for a character by character ID
 * @param characterId - The character ID
 * @param presetName - The preset name to delete
 * @returns Promise<boolean> - Success status
 */
export function deleteCharacterPresetById(characterId, presetName) {
    return __awaiter(this, void 0, void 0, function* () {
        const character = findCharacterById(characterId);
        return character ? yield deleteCharacterPreset(character, presetName) : false;
    });
}
/**
 * Migrates existing default outfits from extension settings to character cards
 * @returns Promise<number> - Number of characters migrated
 */
export function migrateDefaultOutfitsToCharacterCards() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const context = getSTContext();
            if (!context || !context.characters) {
                debugLog('No characters available for migration', null, 'warn', 'CharacterOutfitService');
                return 0;
            }
            const settings = outfitStore.getState().settings;
            const defaultBotPresets = settings.defaultBotPresets || {};
            let migratedCount = 0;
            debugLog(`Starting migration of default outfits to character cards`, null, 'info', 'CharacterOutfitService');
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
                    if (typeof presetName !== 'string')
                        continue;
                    // Get the preset data from extension storage
                    const { bot: presets } = outfitStore.getPresets(characterId, instanceId);
                    if (!presets || !presets[presetName]) {
                        debugLog(`[CharacterOutfitService] Preset "${presetName}" not found for character ${characterId}, instance ${instanceId}`, null, 'warn');
                        continue;
                    }
                    // Embed the default outfit in the character card
                    const success = yield setCharacterDefaultOutfit(character, presets[presetName]);
                    if (success) {
                        debugLog(`[CharacterOutfitService] Migrated default outfit "${presetName}" for character ${characterId}, instance ${instanceId}`, null, 'info');
                        hasEmbeddedDefault = true;
                    }
                    else {
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
                totalCharacters: context.characters.length,
            });
            return migratedCount;
        }
        catch (error) {
            debugLog('Error during default outfit migration:', error, 'error', 'CharacterOutfitService');
            return 0;
        }
    });
}
