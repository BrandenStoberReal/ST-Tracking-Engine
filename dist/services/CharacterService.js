var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { outfitStore } from '../common/Store.js';
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
import { debugLog } from '../logging/DebugLogger.js';
import { findCharacterById, getOrCreateCharacterId } from './CharacterIdService.js';
import { getCharacterOutfitData } from './CharacterOutfitService.js';
/**
 * CharacterService - Handles character updates for the Outfit Tracker extension
 */
/**
 * Refresh macro processing after character changes
 */
function refreshMacroProcessing() {
    var _a;
    try {
        if (window.customMacroSystem && typeof window.customMacroSystem.replaceMacrosInText === 'function') {
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            if (context && context.chat) {
                const visibleMessages = Array.from(document.querySelectorAll('#chat .mes'));
                visibleMessages.forEach(messageElement => {
                    // Add null check for parentElement
                    if (!messageElement.parentElement)
                        return;
                    const messageIndex = Array.from(messageElement.parentElement.children).indexOf(messageElement);
                    const message = context.chat[messageIndex];
                    if (message && message.mes && typeof message.mes === 'string') {
                        const originalMes = message.mes;
                        message.mes = window.customMacroSystem.replaceMacrosInText(message.mes);
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
    }
    catch (error) {
        debugLog('[OutfitTracker] Error refreshing macro processing:', error, 'error');
    }
}
/**
 * Syncs embedded outfit data from character card to extension storage
 * @param {string} characterId - The character ID
 * @returns {Promise<void>}
 */
function syncEmbeddedOutfitData(characterId) {
    return __awaiter(this, void 0, void 0, function* () {
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
        }
        catch (error) {
            debugLog('[CharacterService] Error syncing embedded outfit data:', error, 'error');
        }
    });
}
/**
 * Updates outfit managers and panels for the current character
 * @param {object} botManager - Bot outfit manager instance
 * @param {object} userManager - User outfit manager instance
 * @param {object} botPanel - Bot outfit panel instance
 * @param {object} userPanel - User outfit panel instance
 * @returns {Promise<void>}
 */
export function updateForCurrentCharacter(botManager, userManager, botPanel, userPanel) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Before changing anything, save the current outfit instances with their current instance IDs
            const oldBotInstanceId = botManager.getOutfitInstanceId();
            const oldUserInstanceId = userManager.getOutfitInstanceId();
            // Save the current outfits to their current instances before changing character
            if (oldBotInstanceId && botManager.characterId) {
                const oldBotOutfitData = Object.assign({}, botManager.getCurrentOutfit());
                outfitStore.setBotOutfit(botManager.characterId, oldBotInstanceId, oldBotOutfitData);
            }
            if (oldUserInstanceId) {
                const oldUserOutfitData = Object.assign({}, userManager.getCurrentOutfit());
                outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
            }
            // Update the bot manager with the current character info
            const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            const charIndex = context.characterId;
            let characterUniqueId = null;
            if (charIndex !== undefined && charIndex !== null) {
                const character = context.characters[charIndex];
                if (character) {
                    characterUniqueId = yield getOrCreateCharacterId(character);
                    const characterName = getCharacterInfoById(charIndex, CharacterInfoType.Name);
                    if (characterName) {
                        botManager.setCharacter(characterName, characterUniqueId);
                        // Sync any embedded outfit data from the character card
                        yield syncEmbeddedOutfitData(characterUniqueId);
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
            if (window.outfitStore) {
                window.outfitStore.setCurrentCharacter(characterUniqueId || null);
                window.outfitStore.setCurrentChat((context === null || context === void 0 ? void 0 : context.chatId) || null);
                outfitStore.saveState();
            }
            // Optionally trigger a refresh of macro processing after character change
            refreshMacroProcessing();
            debugLog('[OutfitTracker] Updated outfit managers for current character');
        }
        catch (error) {
            debugLog('[OutfitTracker] Error updating for current character:', error, 'error');
            throw error;
        }
    });
}
