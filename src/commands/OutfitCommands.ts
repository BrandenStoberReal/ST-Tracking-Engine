import {importOutfitFromCharacterCard} from '../services/LLMService';
import {ACCESSORY_SLOTS, CLOTHING_SLOTS} from '../config/constants';
import {areSystemMessagesEnabled} from '../utils/SettingsUtil';
import {debugLog} from '../logging/DebugLogger';
import {AutoOutfitSystemAPI, CommandArgs, OutfitManager} from '../types';

declare const window: any;
declare const toastr: any;
declare const SlashCommandParser: any;
declare const SlashCommand: any;
declare const SlashCommandArgument: any;
declare const SlashCommandNamedArgument: any;
declare const ARGUMENT_TYPE: any;
declare const $: any;

/**
 * Registers all outfit-related slash commands with SillyTavern's command system.
 * This function sets up commands for outfit management, auto outfit system control,
 * preset management, and mobile-friendly outfit commands.
 * @param botManager - The bot outfit manager instance
 * @param userManager - The user outfit manager instance
 * @param autoOutfitSystem - The auto outfit system instance
 * @returns A promise that resolves when all commands are registered
 */
export async function registerOutfitCommands(
    botManager: OutfitManager,
    userManager: OutfitManager,
    autoOutfitSystem: AutoOutfitSystemAPI | null
): Promise<void> {
    // Check if new slash command system is available in SillyTavern
    const hasSlashCommands =
        typeof window.SlashCommandParser !== 'undefined' &&
        typeof window.SlashCommand !== 'undefined' &&
        typeof window.SlashCommandArgument !== 'undefined' &&
        typeof window.SlashCommandNamedArgument !== 'undefined' &&
        typeof window.ARGUMENT_TYPE !== 'undefined';

    if (hasSlashCommands) {
        // Use new slash command system
        window.SlashCommandParser.addCommandObject(
            window.SlashCommand.fromProps({
                name: 'outfit-bot',
                callback: async function (args: CommandArgs) {
                    debugLog('Bot Outfit command triggered');
                    if (window.botOutfitPanel) {
                        window.botOutfitPanel.toggle();
                    } else {
                        debugLog('[OutfitTracker] Bot outfit panel not available', null, 'error');
                        if (!args?.quiet) {
                            toastr.error('Bot outfit panel not available', 'Outfit System');
                        }
                        return '[Outfit System] Bot outfit panel not available';
                    }
                    const isQuiet = args?.quiet === true;

                    if (!isQuiet) {
                        toastr.info('Toggled character outfit panel', 'Outfit System');
                    }
                    return '';
                },
                returns: 'toggles the character outfit panel',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [],
                helpString: `
            <div>
                Toggles the character outfit tracker panel.
            </div>
            <div>
                <strong>Options:</strong>
                <ul>
                    <li><code>-quiet</code> - Suppress the toast message</li>
                </ul>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-bot</code></pre>
                        Toggles the character outfit panel
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-bot -quiet</code></pre>
                        Toggles the character outfit panel without notification
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-user',
                callback: async function (args: CommandArgs) {
                    debugLog('User Outfit command triggered');
                    if (window.userOutfitPanel) {
                        window.userOutfitPanel.toggle();
                    } else {
                        debugLog('[OutfitTracker] User outfit panel not available', null, 'error');
                        if (!args?.quiet) {
                            toastr.error('User outfit panel not available', 'Outfit System');
                        }
                        return '[Outfit System] User outfit panel not available';
                    }
                    const isQuiet = args?.quiet === true;

                    if (!isQuiet) {
                        toastr.info('Toggled user outfit panel', 'Outfit System');
                    }
                    return '';
                },
                returns: 'toggles the user outfit panel',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [],
                helpString: `
            <div>
                Toggles the user outfit tracker panel.
            </div>
            <div>
                <strong>Options:</strong>
                <ul>
                    <li><code>-quiet</code> - Suppress the toast message</li>
                </ul>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-user</code></pre>
                        Toggles the user outfit panel
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-user -quiet</code></pre>
                        Toggles the user outfit panel without notification
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // Only register auto commands if AutoOutfitSystem loaded successfully
        if (autoOutfitSystem !== null) {
            const system = autoOutfitSystem;
            SlashCommandParser.addCommandObject(
                SlashCommand.fromProps({
                    name: 'outfit-auto',
                    callback: async function (args: CommandArgs, value: unknown) {
                        const arg = value?.toString().toLowerCase() || '';
                        const isQuiet = args?.quiet === true;

                        if (window.autoOutfitSystem) {
                            if (arg === 'on') {
                                const message = system.enable();

                                if (!isQuiet) {
                                    toastr.info(message, 'Outfit System');
                                }
                                return message;
                            } else if (arg === 'off') {
                                const message = system.disable();

                                if (!isQuiet) {
                                    toastr.info(message, 'Outfit System');
                                }
                                return message;
                            }
                            const status = system.getStatus();
                            const statusMessage = `Auto outfit: ${status.enabled ? 'ON' : 'OFF'}\nPrompt: ${status.hasPrompt ? 'SET' : 'NOT SET'}`;

                            if (!isQuiet) {
                                toastr.info(statusMessage);
                            }
                            return statusMessage;
                        }
                        const message = 'Auto outfit system not available';

                        if (!isQuiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    },
                    returns: 'toggles auto outfit updates',
                    namedArgumentList: [
                        SlashCommandNamedArgument.fromProps({
                            name: 'quiet',
                            description: 'Suppress the toast message',
                            typeList: [ARGUMENT_TYPE.BOOLEAN],
                            defaultValue: 'false',
                        }),
                    ],
                    unnamedArgumentList: [
                        SlashCommandArgument.fromProps({
                            description: 'whether to enable or disable auto outfit updates',
                            typeList: [ARGUMENT_TYPE.STRING],
                            isRequired: false,
                            enumList: ['on', 'off'],
                        }),
                    ],
                    helpString: `
                <div>
                    Toggle auto outfit updates (on/off).
                </div>
                <div>
                    <strong>Options:</strong>
                    <ul>
                        <li><code>-quiet</code> - Suppress the toast message</li>
                    </ul>
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-auto on</code></pre>
                            Enables auto outfit updates
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-auto off</code></pre>
                            Disables auto outfit updates
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-auto</code></pre>
                            Shows current status
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-auto on -quiet</code></pre>
                            Enables auto outfit updates without notification
                        </li>
                    </ul>
                </div>
            `,
                })
            );

            SlashCommandParser.addCommandObject(
                SlashCommand.fromProps({
                    name: 'outfit-prompt',
                    callback: async function (args: CommandArgs, value: unknown) {
                        if (window.autoOutfitSystem) {
                            const prompt = value?.toString() || '';

                            if (prompt) {
                                const message = system.setPrompt(prompt);

                                if (areSystemMessagesEnabled()) {
                                    window.botOutfitPanel.sendSystemMessage(message);
                                }
                                return message;
                            }
                            const length = system.systemPrompt?.length || 0;

                            toastr.info(`Current prompt length: ${length}`);
                            return `Current prompt length: ${length}`;
                        }
                        const message = 'Auto outfit system not available';

                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    },
                    returns: 'sets or shows the auto outfit system prompt',
                    namedArgumentList: [],
                    unnamedArgumentList: [
                        SlashCommandArgument.fromProps({
                            description: 'the new system prompt for auto outfit detection',
                            typeList: [ARGUMENT_TYPE.STRING],
                            isRequired: false,
                        }),
                    ],
                    helpString: `
                <div>
                    Set auto outfit system prompt.
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-prompt Detect changes in clothing based on dialogue and narrative</code></pre>
                            Sets the auto outfit system prompt
                        </li>
                        <li>
                            <pre><code class="language-stscript">/outfit-prompt</code></pre>
                            Shows current prompt length
                        </li>
                    </ul>
                </div>
            `,
                })
            );

            SlashCommandParser.addCommandObject(
                SlashCommand.fromProps({
                    name: 'outfit-prompt-reset',
                    callback: async function (args: CommandArgs) {
                        if (window.autoOutfitSystem) {
                            const message = system.resetToDefaultPrompt();

                            if (areSystemMessagesEnabled()) {
                                window.botOutfitPanel.sendSystemMessage(message);
                            }
                            // Update the textarea in settings
                            $('#outfit-prompt-input').val(system.systemPrompt);
                            // Use the store's save method which uses the new persistence service
                            if (typeof window.outfitStore !== 'undefined') {
                                window.outfitStore.saveState();
                            } else {
                                window.saveSettingsDebounced();
                            }
                            return message;
                        }
                        const message = 'Auto outfit system not available';

                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    },
                    returns: 'resets to default system prompt',
                    namedArgumentList: [],
                    unnamedArgumentList: [],
                    helpString: `
                <div>
                    Reset to default system prompt.
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-prompt-reset</code></pre>
                            Resets to default system prompt
                        </li>
                    </ul>
                </div>
            `,
                })
            );

            SlashCommandParser.addCommandObject(
                SlashCommand.fromProps({
                    name: 'outfit-prompt-view',
                    callback: async function (args: CommandArgs) {
                        if (window.autoOutfitSystem) {
                            const status = system.getStatus();
                            const preview =
                                system.systemPrompt.length > 100
                                    ? system.systemPrompt.substring(0, 100) + '...'
                                    : system.systemPrompt;

                            const message = `Prompt preview: ${preview}\n                    \nFull length: ${status.promptLength} chars`;

                            toastr.info(message, 'Current System Prompt', {
                                timeOut: 10000,
                                extendedTimeOut: 20000,
                            });
                            return message;
                        }
                        const message = 'Auto outfit system not available';

                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    },
                    returns: 'shows current system prompt',
                    namedArgumentList: [],
                    unnamedArgumentList: [],
                    helpString: `
                <div>
                    View current system prompt.
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-prompt-view</code></pre>
                            Shows current system prompt
                        </li>
                    </ul>
                </div>
            `,
                })
            );

            SlashCommandParser.addCommandObject(
                SlashCommand.fromProps({
                    name: 'outfit-auto-trigger',
                    callback: async function (args: CommandArgs) {
                        if (window.autoOutfitSystem) {
                            const result = await system.manualTrigger();

                            toastr.info(result, 'Manual Outfit Check');
                            return result;
                        }
                        const message = 'Auto outfit system not available';

                        if (!args?.quiet) {
                            toastr.error(message, 'Outfit System');
                        }
                        return message;
                    },
                    returns: 'manually trigger auto outfit check',
                    namedArgumentList: [],
                    unnamedArgumentList: [],
                    helpString: `
                <div>
                    Manually trigger auto outfit check.
                </div>
                <div>
                    <strong>Example:</strong>
                    <ul>
                        <li>
                            <pre><code class="language-stscript">/outfit-auto-trigger</code></pre>
                            Manually triggers auto outfit check
                        </li>
                    </ul>
                </div>
            `,
                })
            );
        }

        // Register the switch-outfit command
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'switch-outfit',
                callback: async function (args: any, value: any) {
                    const outfitName = value?.toString().trim() || '';
                    const isQuiet = args?.quiet === true;

                    if (!outfitName) {
                        const warning = 'Please specify an outfit name. Usage: /switch-outfit <outfit-name>';

                        if (!isQuiet) {
                            toastr.warning(warning, 'Outfit System');
                        }
                        return warning;
                    }

                    try {
                        // First try to load the outfit for the bot character
                        let message = await botManager.loadPreset(outfitName);

                        if (message && message.includes('not found')) {
                            // If not found for bot, try loading default outfit if requested
                            if (outfitName.toLowerCase() === 'default') {
                                const defaultMessage = await botManager.loadDefaultOutfit();
                                if (defaultMessage) {
                                    message = defaultMessage;
                                }
                            }
                        }

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }

                        // Also try to load the outfit for the user if it exists
                        let userMessage = await userManager.loadPreset(outfitName);

                        if (userMessage && userMessage.includes('not found')) {
                            // If not found for user, try loading default outfit if requested
                            if (outfitName.toLowerCase() === 'default') {
                                const defaultUserMessage = await userManager.loadDefaultOutfit();
                                if (defaultUserMessage) {
                                    userMessage = defaultUserMessage;
                                }
                            }
                        }

                        if (areSystemMessagesEnabled() && userMessage && !userMessage.includes('not found')) {
                            window.userOutfitPanel.sendSystemMessage(userMessage);
                        }

                        if (message.includes('not found') && userMessage && userMessage.includes('not found')) {
                            const error = `Outfit "${outfitName}" not found for either character or user.`;

                            if (!isQuiet) {
                                toastr.error(error, 'Outfit System');
                            }
                            return error;
                        }
                        const success = `Switched to "${outfitName}" outfit.`;

                        if (!isQuiet) {
                            toastr.info(success, 'Outfit System');
                        }
                        return success;
                    } catch (error) {
                        debugLog('Error switching outfit:', error, 'error');
                        const error_msg = `Error switching to "${outfitName}" outfit.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'switches to a saved outfit by name',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'the name of the outfit to switch to',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Switch to a saved outfit by name. Usage: /switch-outfit <outfit-name>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/switch-outfit casual</code></pre>
                        Switches to "casual" outfit
                    </li>
                    <li>
                        <pre><code class="language-stscript">/switch-outfit formal</code></pre>
                        Switches to "formal" outfit
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // Register the import-outfit command
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'import-outfit',
                callback: async function (args: CommandArgs) {
                    const isQuiet = args?.quiet === true;

                    try {
                        const result = await importOutfitFromCharacterCard();

                        if (!isQuiet) {
                            toastr.info(result.message, 'Outfit Import');
                        }
                        return result.message;
                    } catch (error: unknown) {
                        debugLog('Error importing outfit from character card:', error, 'error');
                        const errorMessage = `Error importing outfit: ${error instanceof Error ? error.message : String(error)}`;

                        if (!isQuiet) {
                            toastr.error(errorMessage, 'Outfit Import');
                        }
                        return errorMessage;
                    }
                },
                returns: 'imports outfit from character card and updates character description',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [],
                helpString: `
            <div>
                Imports outfit information from the character card and updates both the outfit tracker and character description.
                This command will:
                1. Extract clothing items from character description, personality, scenario, and character notes
                2. Populate the outfit tracker with these items
                3. Remove clothing references from the character card
                4. Fix grammar/spelling outside quotes while preserving quoted text
            </div>
            <div>
                <strong>Options:</strong>
                <ul>
                    <li><code>-quiet</code> - Suppress the toast message</li>
                </ul>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/import-outfit</code></pre>
                        Imports outfit from character card
                    </li>
                    <li>
                        <pre><code class="language-stscript">/import-outfit -quiet</code></pre>
                        Imports outfit from character card without notification
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // Register mobile-friendly slash commands for outfit operations
        // Character outfit commands
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-wear',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    // Parse slot and item from value
                    const params = value?.toString().trim() || '';
                    const parts = params.split(' ');

                    if (parts.length < 2) {
                        const error =
                            'Usage: /outfit-wear <slot> <item>. Example: /outfit-wear headwear "Red Baseball Cap"';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    const slot = parts[0];
                    const item = parts.slice(1).join(' ');

                    if (!botManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.setOutfitItem(slot, item);

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error setting outfit item:', error, 'error');
                        const error_msg = `Error setting ${slot} to ${item}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'sets a character outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot and item to wear',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Sets a character outfit item. Usage: /outfit-wear <slot> <item>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-wear headwear "Red Baseball Cap"</code></pre>
                        Sets the character's headwear to "Red Baseball Cap"
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-wear topwear "Blue T-Shirt"</code></pre>
                        Sets the character's topwear to "Blue T-Shirt"
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-remove',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const slot = value?.toString().trim() || '';

                    if (!botManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.setOutfitItem(slot, 'None');

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error removing outfit item:', error, 'error');
                        const error_msg = `Error removing ${slot}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'removes a character outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot to remove item from',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Removes a character outfit item. Usage: /outfit-remove <slot>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-remove headwear</code></pre>
                        Removes the character's headwear
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-remove topwear</code></pre>
                        Removes the character's topwear
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-change',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    // Parse slot and item from value
                    const params = value?.toString().trim() || '';
                    const parts = params.split(' ');

                    if (parts.length < 2) {
                        const error =
                            'Usage: /outfit-change <slot> <item>. Example: /outfit-change headwear "Black Hat"';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    const slot = parts[0];
                    const item = parts.slice(1).join(' ');

                    if (!botManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${botManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.setOutfitItem(slot, item);

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error changing outfit item:', error, 'error');
                        const error_msg = `Error changing ${slot} to ${item}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'changes a character outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot and new item',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Changes a character outfit item. Usage: /outfit-change <slot> <item>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-change headwear "Black Hat"</code></pre>
                        Changes the character's headwear to "Black Hat"
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-change topwear "Green Shirt"</code></pre>
                        Changes the character's topwear to "Green Shirt"
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // User outfit commands
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-wear',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    // Parse slot and item from value
                    const params = value?.toString().trim() || '';
                    const parts = params.split(' ');

                    if (parts.length < 2) {
                        const error =
                            'Usage: /user-outfit-wear <slot> <item>. Example: /user-outfit-wear headwear "Red Baseball Cap"';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    const slot = parts[0];
                    const item = parts.slice(1).join(' ');

                    if (!userManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.setOutfitItem(slot, item);

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error setting user outfit item:', error, 'error');
                        const error_msg = `Error setting user ${slot} to ${item}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'sets a user outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot and item to wear',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Sets a user outfit item. Usage: /user-outfit-wear <slot> <item>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-wear headwear "Red Baseball Cap"</code></pre>
                        Sets the user's headwear to "Red Baseball Cap"
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-wear topwear "Blue T-Shirt"</code></pre>
                        Sets the user's topwear to "Blue T-Shirt"
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-remove',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const slot = value?.toString().trim() || '';

                    if (!userManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.setOutfitItem(slot, 'None');

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error removing user outfit item:', error, 'error');
                        const error_msg = `Error removing user ${slot}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'removes a user outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot to remove item from',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Removes a user outfit item. Usage: /user-outfit-remove <slot>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-remove headwear</code></pre>
                        Removes the user's headwear
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-remove topwear</code></pre>
                        Removes the user's topwear
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-change',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    // Parse slot and item from value
                    const params = value?.toString().trim() || '';
                    const parts = params.split(' ');

                    if (parts.length < 2) {
                        const error =
                            'Usage: /user-outfit-change <slot> <item>. Example: /user-outfit-change headwear "Black Hat"';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    const slot = parts[0];
                    const item = parts.slice(1).join(' ');

                    if (!userManager.slots.includes(slot)) {
                        const error = `Invalid slot: ${slot}. Valid slots: ${userManager.slots.join(', ')}`;

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.setOutfitItem(slot, item);

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error changing user outfit item:', error, 'error');
                        const error_msg = `Error changing user ${slot} to ${item}.`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'changes a user outfit item',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'slot and new item',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Changes a user outfit item. Usage: /user-outfit-change <slot> <item>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-change headwear "Black Hat"</code></pre>
                        Changes the user's headwear to "Black Hat"
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-change topwear "Green Shirt"</code></pre>
                        Changes the user's topwear to "Green Shirt"
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // Outfit preset commands
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-save',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /outfit-save <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.savePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error saving outfit preset:', error, 'error');
                        const error_msg = `Error saving outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'saves character outfit as a preset',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to save',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Saves character outfit as a preset. Usage: /outfit-save <name>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-save casual</code></pre>
                        Saves the character's current outfit as the "casual" preset
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-save formal</code></pre>
                        Saves the character's current outfit as the "formal" preset
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-delete',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /outfit-delete <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.deletePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error deleting outfit preset:', error, 'error');
                        const error_msg = `Error deleting outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'deletes character outfit preset',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to delete',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Deletes character outfit preset. Usage: /outfit-delete <name>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-delete casual</code></pre>
                        Deletes the "casual" outfit preset
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-delete formal</code></pre>
                        Deletes the "formal" outfit preset
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-save',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /user-outfit-save <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.savePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error saving user outfit preset:', error, 'error');
                        const error_msg = `Error saving user outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'saves user outfit as a preset',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to save',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Saves user outfit as a preset. Usage: /user-outfit-save <name>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-save casual</code></pre>
                        Saves the user's current outfit as the "casual" preset
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-save formal</code></pre>
                        Saves the user's current outfit as the "formal" preset
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-delete',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /user-outfit-delete <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.deletePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error deleting user outfit preset:', error, 'error');
                        const error_msg = `Error deleting user outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'deletes user outfit preset',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to delete',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Deletes user outfit preset. Usage: /user-outfit-delete <name>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-delete casual</code></pre>
                        Deletes the "casual" user outfit preset
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-delete formal</code></pre>
                        Deletes the "formal" user outfit preset
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // List all available outfits and presets
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-list',
                callback: async function (args: CommandArgs) {
                    const isQuiet = args?.quiet === true;

                    try {
                        // Get character presets
                        const botPresets = botManager.getPresets();
                        // Get user presets
                        const userPresets = userManager.getPresets();

                        // Get current outfit data for both character and user
                        const botOutfitData = botManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);
                        const userOutfitData = userManager.getOutfitData([...CLOTHING_SLOTS, ...ACCESSORY_SLOTS]);

                        let message = `Available character presets: ${botPresets.length > 0 ? botPresets.join(', ') : 'None'}`;

                        message += `\nAvailable user presets: ${userPresets.length > 0 ? userPresets.join(', ') : 'None'}`;

                        // Add current outfit information
                        message += `\nCurrent ${botManager.character} outfit:`;
                        for (const item of botOutfitData) {
                            message += `\n  ${item.name}: ${item.value}`;
                        }

                        message += '\nCurrent user outfit:';
                        for (const item of userOutfitData) {
                            message += `\n  ${item.name}: ${item.value}`;
                        }

                        if (!isQuiet) {
                            toastr.info('Outfit information retrieved', 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error listing outfits:', error, 'error');
                        const error_msg = 'Error listing outfit information.';

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'lists all available outfit presets and current outfits',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [],
                helpString: `
            <div>
                Lists all available outfit presets and current outfits. Usage: /outfit-list
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-list</code></pre>
                        Lists all available presets and current outfits
                    </li>
                </ul>
            </div>
        `,
            })
        );

        // Outfit overwrite commands
        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'outfit-overwrite',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /outfit-overwrite <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await botManager.overwritePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.botOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error overwriting outfit preset:', error, 'error');
                        const error_msg = `Error overwriting outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'overwrites character outfit preset with current outfit',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to overwrite',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Overwrites character outfit preset with current outfit. Usage: /outfit-overwrite <name>
            </div>
            <div>
                <strong>Options:</strong>
                <ul>
                    <li><code>-quiet</code> - Suppress the toast message</li>
                </ul>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/outfit-overwrite casual</code></pre>
                        Overwrites the "casual" character outfit preset with the current outfit
                    </li>
                    <li>
                        <pre><code class="language-stscript">/outfit-overwrite formal</code></pre>
                        Overwrites the "formal" character outfit preset with the current outfit
                    </li>
                </ul>
            </div>
        `,
            })
        );

        SlashCommandParser.addCommandObject(
            SlashCommand.fromProps({
                name: 'user-outfit-overwrite',
                callback: async function (args: any, value: any) {
                    const isQuiet = args?.quiet === true;
                    const presetName = value?.toString().trim() || '';

                    if (!presetName) {
                        const error = 'Please specify a preset name. Usage: /user-outfit-overwrite <name>';

                        if (!isQuiet) {
                            toastr.error(error, 'Outfit System');
                        }
                        return error;
                    }

                    try {
                        const message = await userManager.overwritePreset(presetName);

                        if (areSystemMessagesEnabled()) {
                            window.userOutfitPanel.sendSystemMessage(message);
                        }
                        if (!isQuiet) {
                            toastr.info(message, 'Outfit System');
                        }
                        return message;
                    } catch (error) {
                        debugLog('Error overwriting user outfit preset:', error, 'error');
                        const error_msg = `Error overwriting user outfit preset "${presetName}".`;

                        if (!isQuiet) {
                            toastr.error(error_msg, 'Outfit System');
                        }
                        return error_msg;
                    }
                },
                returns: 'overwrites user outfit preset with current outfit',
                namedArgumentList: [
                    SlashCommandNamedArgument.fromProps({
                        name: 'quiet',
                        description: 'Suppress the toast message',
                        typeList: [ARGUMENT_TYPE.BOOLEAN],
                        defaultValue: 'false',
                    }),
                ],
                unnamedArgumentList: [
                    SlashCommandArgument.fromProps({
                        description: 'preset name to overwrite',
                        typeList: [ARGUMENT_TYPE.STRING],
                        isRequired: true,
                    }),
                ],
                helpString: `
            <div>
                Overwrites user outfit preset with current outfit. Usage: /user-outfit-overwrite <name>
            </div>
            <div>
                <strong>Options:</strong>
                <ul>
                    <li><code>-quiet</code> - Suppress the toast message</li>
                </ul>
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-overwrite casual</code></pre>
                        Overwrites the "casual" user outfit preset with the current outfit
                    </li>
                    <li>
                        <pre><code class="language-stscript">/user-outfit-overwrite formal</code></pre>
                        Overwrites the "formal" user outfit preset with the current outfit
                    </li>
                </ul>
            </div>
        `,
            })
        );
    }

    // Close the main function
}
