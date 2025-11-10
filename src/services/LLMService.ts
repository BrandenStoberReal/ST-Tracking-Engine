import {LLMUtility} from '../utils/LLMUtility';
import {extractCommands} from '../processors/StringProcessor';
import {findCharacterById} from './CharacterIdService';
import {debugLog} from '../logging/DebugLogger';
import {Character, LLMGenerationOptions, LLMImportResult, OutfitManager, STContext} from '../types';

// Window is available globally

/**
 * Process a single outfit command
 * @param command - The command string to process
 * @param botManager - The bot outfit manager
 * @returns {Promise<void>}
 */
async function processSingleCommand(command: string, botManager: OutfitManager): Promise<void> {
    try {
        const commandRegex = /^outfit-system_(wear|remove|change|replace|unequip)_([a-zA-Z0-9_-]+)\(?:"([^"]*\)"|)\)$/;
        const match = command.match(commandRegex);

        if (!match) {
            throw new Error(`Invalid command format: ${command}`);
        }

        const [, action, slot, value] = match;
        const cleanValue = value || '';

        debugLog(`[LLMService] Processing: ${action} ${slot} "${cleanValue}"`);

        let finalAction = action;

        if (action === 'replace') {
            finalAction = 'change';
        } else if (action === 'unequip') {
            finalAction = 'remove';
        }

        // Apply the outfit change to the bot manager
        if (botManager && typeof botManager.setOutfitItem === 'function') {
            await botManager.setOutfitItem(slot, finalAction === 'remove' ? 'None' : cleanValue);
        }
    } catch (error) {
        debugLog('Error processing single command:', error, 'error');
        throw error;
    }
}

/**
 * Generates outfit from LLM based on provided options
 * @param options - Generation options containing the prompt
 * @returns The LLM response containing outfit commands
 */
export async function generateOutfitFromLLM(options: LLMGenerationOptions): Promise<string> {
    try {
        const prompt = options?.prompt || '';

        if (!prompt) {
            throw new Error('Prompt is required for LLM generation');
        }

        // Use LLMUtility to generate with retry logic
        const context: STContext | null = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        const response = await LLMUtility.generateWithRetry(
            prompt,
            "You are an outfit generation system. Based on the character information provided, output outfit commands to set the character's clothing and accessories.",
            context
        );

        return response;
    } catch (error) {
        debugLog('Error generating outfit from LLM:', error, 'error');
        throw error;
    }
}

/**
 * Imports outfit from character card using LLM analysis
 * @returns Result with message and any extracted outfit information
 */
export async function importOutfitFromCharacterCard(): Promise<LLMImportResult> {
    try {
        const context: STContext | null = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
              ? window.getContext()
              : null;

        // Try to get character using the new character ID system first
        let character: Character | null = null;
        const botOutfitManager = window.outfitTracker?.botOutfitPanel?.outfitManager;
        if (botOutfitManager?.characterId) {
            character = findCharacterById(botOutfitManager.characterId);
        }

        // Fallback to old system if needed
        if (
            !character &&
            context &&
            context.characterId !== undefined &&
            context.characterId !== null &&
            context.characters
        ) {
            character = context.characters[context.characterId];
        }

        if (!character) {
            throw new Error('No character selected or context not ready');
        }

        const characterName = character.name || 'Unknown';
        const characterDescription = character.description || '';
        const characterPersonality = character.personality || '';
        const characterScenario = character.scenario || '';
        const characterFirstMessage = character.first_mes || '';
        const characterNotes = character.character_notes || '';

        // Construct a prompt to extract outfit information from character card
        const prompt = `Analyze the character card below and extract any clothing or accessory items mentioned. 
        Output only outfit-system commands in this format:
        outfit-system_wear_headwear("item name")
        outfit-system_wear_topwear("item name")
        outfit-system_remove_headwear()
        
        CHARACTER CARD:
        Name: ${characterName}
        Description: ${characterDescription}
        Personality: ${characterPersonality}
        Scenario: ${characterScenario}
        First Message: ${characterFirstMessage}
        Notes: ${characterNotes}
        
        OUTPUT ONLY OUTFIT COMMANDS, NO EXPLANATIONS:`;

        // Generate response from LLM
        const response = await LLMUtility.generateWithRetry(
            prompt,
            'You are an outfit extraction system. Extract clothing and accessory items from character descriptions and output outfit commands.',
            context
        );

        // Extract commands from response
        const commands = extractCommands(response);

        // Process the commands to update the current bot outfit
        if (commands && commands.length > 0) {
            debugLog(`[LLMService] Found ${commands.length} outfit commands to process:`, commands);

            // Get the global bot outfit manager from window if available
            if (window.botOutfitPanel && window.botOutfitPanel.outfitManager) {
                const botManager = window.botOutfitPanel.outfitManager;

                // Process each command
                for (const command of commands) {
                    try {
                        await processSingleCommand(command, botManager);
                    } catch (cmdError) {
                        debugLog(`Error processing command "${command}":`, cmdError, 'error');
                    }
                }

                // Save the updated outfit
                const outfitInstanceId = botManager.getOutfitInstanceId();

                await botManager.saveOutfit(outfitInstanceId);

                // Update the UI
                if (window.botOutfitPanel.isVisible) {
                    window.botOutfitPanel.renderContent();
                }
            } else {
                debugLog('[LLMService] Bot outfit manager not available to apply imported outfits', null, 'warn');
            }
        } else {
            debugLog('[LLMService] No outfit commands found in response');
        }

        return {
            message: `Imported outfit information from ${characterName || 'the character'}. Found and applied ${commands.length} outfit items.`, // Corrected escaping for \'
            commands: commands,
            characterName: characterName,
        };
    } catch (error: unknown) {
        debugLog('Error importing outfit from character card:', error, 'error');

        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            message: `Error importing outfit: ${errorMessage}`,
            commands: [],
            error: errorMessage,
        };
    }
}
