import {outfitStore} from '../common/Store';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';
import {debugLog} from '../logging/DebugLogger';
import {findCharacterById, getOrCreateCharacterId} from './CharacterIdService';
import {getCharacterOutfitData} from './CharacterOutfitService';
import {EXTENSION_EVENTS, extensionEventBus} from '../core/events';

/**
 * CharacterService - Handles character updates for the Outfit Tracker extension
 */

/**
 * Refresh macro processing after character changes
 */
function refreshMacroProcessing() {
    try {
        if (
            (window as any).customMacroSystem &&
            typeof (window as any).customMacroSystem.replaceMacrosInText === 'function'
        ) {
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;

            if (context && context.chat) {
                const visibleMessages = Array.from(document.querySelectorAll('#chat .mes'));

                visibleMessages.forEach((messageElement) => {
                    // Add null check for parentElement
                    if (!messageElement.parentElement) return;

                    const messageIndex = Array.from(messageElement.parentElement.children).indexOf(messageElement);
                    const message = context.chat[messageIndex];

                    if (message && message.mes && typeof message.mes === 'string') {
                        const originalMes = message.mes;

                        message.mes = (window as any).customMacroSystem!.replaceMacrosInText(message.mes);
                        if (originalMes !== message.mes) {
                            const textElement = messageElement.querySelector('.mes_text');

                            if (textElement) {
                                textElement.innerHTML = message.mes;
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        debugLog('[OutfitTracker] Error refreshing macro processing:', error, 'error');
    }
}

/**
 * Syncs embedded outfit data from character card to extension storage
 * @param {string} characterId - The character ID
 * @returns {Promise<void>}
 */
async function syncEmbeddedOutfitData(characterId: string): Promise<void> {
    try {
        const embeddedData = getCharacterOutfitData(findCharacterById(characterId));
        if (!embeddedData) {
            return;
        }

        // Sync default outfit
        if (embeddedData.defaultOutfit) {
            debugLog(`[CharacterService] Syncing embedded default outfit for character ${characterId}`, null, 'info');
            // The default outfit is now embedded, so we don't need to sync it to settings
            // But we could potentially migrate old settings here if needed
        }

        // Sync presets
        if (embeddedData.presets) {
            debugLog(`[CharacterService] Syncing embedded presets for character ${characterId}`, null, 'info');
            // For now, presets are loaded on-demand from character cards
            // We could sync them to extension storage if needed for performance
        }

        // Emit character outfit synced event
        extensionEventBus.emit(EXTENSION_EVENTS.CHARACTER_OUTFIT_SYNCED, {
            characterId: characterId,
            hasDefaultOutfit: !!embeddedData.defaultOutfit,
            presetCount: embeddedData.presets ? Object.keys(embeddedData.presets).length : 0,
            lastModified: embeddedData.lastModified,
        });
    } catch (error) {
        debugLog('[CharacterService] Error syncing embedded outfit data:', error, 'error');
    }
}

let isUpdating = false;

/**
 * Updates outfit managers and panels for the current character
 * @param {object} botManager - Bot outfit manager instance
 * @param {object} userManager - User outfit manager instance
 * @param {object} botPanel - Bot outfit panel instance
 * @param {object} userPanel - User outfit panel instance
 * @returns {Promise<void>}
 */
export async function updateForCurrentCharacter(botManager: any, userManager: any, botPanel: any, userPanel: any) {
    if (isUpdating) {
        debugLog('[OutfitTracker] Already updating for current character, skipping.', null, 'warn');
        return;
    }
    isUpdating = true;

    try {
        // Before changing anything, save the current outfit instances with their current instance IDs
        const oldBotInstanceId = botManager.getOutfitInstanceId();
        const oldUserInstanceId = userManager.getOutfitInstanceId();

        // Save the current outfits to their current instances before changing character
        if (oldBotInstanceId && botManager.characterId) {
            const oldBotOutfitData = {...botManager.getCurrentOutfit()};

            outfitStore.setBotOutfit(botManager.characterId, oldBotInstanceId, oldBotOutfitData);
        }
        if (oldUserInstanceId) {
            const oldUserOutfitData = {...userManager.getCurrentOutfit()};

            outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
        }

        // Update the bot manager with the current character info
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
                ? window.getContext()
                : null;
        const charIndex = context.characterId;
        let characterUniqueId = null;
        let characterName = null;

        if (charIndex !== undefined && charIndex !== null) {
            const character = context.characters[charIndex];
            if (character) {
                characterUniqueId = await getOrCreateCharacterId(character);
                characterName = getCharacterInfoById(charIndex, CharacterInfoType.Name);

                if (characterName) {
                    botManager.setCharacter(characterName, characterUniqueId);

                    // Sync any embedded outfit data from the character card
                    await syncEmbeddedOutfitData(characterUniqueId);
                }
            }
        }

        // Reload the bot outfit for the new character/instance
        const botOutfitInstanceId = botManager.getOutfitInstanceId();

        botManager.loadOutfit(botOutfitInstanceId);

        // Update the bot panel character name
        if (botPanel) {
            botPanel.updateCharacter(botManager.character);
        }

        // Update the user manager and panel
        // (User manager uses a standard instance ID and doesn't change based on character)
        userManager.setCharacter('User');
        const userOutfitInstanceId = userManager.getOutfitInstanceId();

        userManager.loadOutfit(userOutfitInstanceId);

        if (userPanel) {
            // Update the header to reflect any changes (like new instance ID)
            userPanel.updateHeader();
        }

        // Update the outfit store with current context and save settings
        if ((window as any).outfitStore) {
            (window as any).outfitStore.setCurrentCharacter(characterUniqueId || null);
            (window as any).outfitStore.setCurrentChat(context?.chatId || null);
            outfitStore.saveState();
        }

        // Optionally trigger a refresh of macro processing after character change
        refreshMacroProcessing();

        // Emit context updated event
        extensionEventBus.emit(EXTENSION_EVENTS.CONTEXT_UPDATED, {
            characterId: characterUniqueId,
            characterName: characterName,
            chatId: context?.chatId || null,
        });

        debugLog('[OutfitTracker] Updated outfit managers for current character');
    } catch (error) {
        debugLog('[OutfitTracker] Error updating for current character:', error, 'error');
        throw error;
    } finally {
        isUpdating = false;
    }
}
