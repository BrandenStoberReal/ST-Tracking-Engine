import {dragElementWithSave, resizeElement} from '../common/shared';
import {extractCommands} from '../processors/StringProcessor';
import {LLMUtility} from '../utils/LLMUtility';
import {formatSlotName as utilsFormatSlotName} from '../utils/utilities';
import {areSystemMessagesEnabled} from '../utils/SettingsUtil';
import {outfitStore} from '../common/Store';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';
import {findCharacterById} from '../services/CharacterIdService';
import {debugLog} from '../logging/DebugLogger';
import {EXTENSION_EVENTS, extensionEventBus} from '../core/events';

declare const window: any;
declare const toastr: any;
declare const $: any;

/**
 * BotOutfitPanel - Manages the UI for the bot character's outfit tracking
 * This class creates and manages a draggable panel for viewing and modifying
 * the bot character's outfit, including clothing, accessories, and saved presets
 */
export class BotOutfitPanel {
    outfitManager: any;
    clothingSlots: string[];
    accessorySlots: string[];
    isVisible: boolean;
    domElement: HTMLElement | null;
    currentTab: string;
    currentPresetCategory: string;
    presetCategories: string[];
    eventListeners: any[];
    outfitSubscription: any;
    saveSettingsDebounced: any;

    /**
     * Creates a new BotOutfitPanel instance
     * @param {object} outfitManager - The outfit manager for the bot character
     * @param {Array<string>} clothingSlots - Array of clothing slot names
     * @param {Array<string>} accessorySlots - Array of accessory slot names
     * @param {Function} saveSettingsDebounced - Debounced function to save settings
     */
    constructor(outfitManager: any, clothingSlots: string[], accessorySlots: string[], saveSettingsDebounced: any) {
        this.outfitManager = outfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
        this.currentPresetCategory = 'all'; // Change to show all presets
        this.presetCategories = ['All']; // Simplified to just show all presets
        this.eventListeners = [];
        this.outfitSubscription = null;
        this.saveSettingsDebounced = saveSettingsDebounced;
    }

    /**
     * Creates the panel DOM element and sets up its basic functionality
     * @returns {HTMLElement} The created panel element
     */
    createPanel(): HTMLElement {
        if (this.domElement) {
            return this.domElement;
        }

        const panel = document.createElement('div');

        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';

        // Get the first message hash for display in the header (instance ID)
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';

        // Replace placeholder "{{char}}" with the actual character name
        const characterName = this.outfitManager.character || 'Unknown';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${characterName}'s Outfit${hashDisplay}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="bot-outfit-tab-content"></div>
        `;

        document.body.appendChild(panel);

        const tabs = panel.querySelectorAll('.outfit-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = (event.target as HTMLElement).dataset.tab;

                this.currentTab = tabName!;
                this.renderContent();

                tabs.forEach(t => t.classList.remove('active'));
                (event.target as HTMLElement).classList.add('active');
            });
        });

        return panel;
    }

    /**
     * Gets the first character message text to generate hash from (instance ID)
     * @returns {string} The text of the first AI message from the character
     */
    getFirstMessageText(): string {
        try {
            const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
            let characterName = null;

            // Try to get character name using the new character ID system first
            if (this.outfitManager.characterId) {
                const character = findCharacterById(this.outfitManager.characterId);
                if (character) {
                    characterName = character.name;
                }
            }

            // Fallback to old system if needed
            if (!characterName && context.characterId !== undefined && context.characterId !== null) {
                characterName = getCharacterInfoById(context.characterId, CharacterInfoType.Name);
            }

            if (context && context.chat && Array.isArray(context.chat)) {
                // Get the first AI message from the character (instance identifier)
                const aiMessages = context.chat.filter((msg: any) =>
                    !msg.is_user && !msg.is_system &&
                    (msg.name === this.outfitManager.character || (characterName && msg.name === characterName)));

                if (aiMessages.length > 0) {
                    const firstMessage = aiMessages[0];

                    return firstMessage.mes || '';
                }
            }
            return '';
        } catch (error) {
            debugLog('Could not get first message text for hash generation:', error, 'warn');
            return '';
        }
    }

    /**
     * Renders the content of the currently selected tab
     * @returns {void}
     */
    renderContent(): void {
        if (!this.domElement) {
            return;
        }

        const contentArea = this.domElement.querySelector('.outfit-content');

        if (!contentArea) {
            return;
        }

        contentArea.innerHTML = '';

        switch (this.currentTab) {
            case 'clothing':
                this.renderPromptInjectionToggle(contentArea as HTMLElement); // Add this line
                this.renderSlots(this.clothingSlots, contentArea as HTMLElement);
                this.renderFillOutfitButton(contentArea as HTMLElement);
                break;
            case 'accessories':
                this.renderSlots(this.accessorySlots, contentArea as HTMLElement);
                break;
            case 'outfits':
                this.renderPresets(contentArea as HTMLElement);
                break;
        }
    }

    /**
     * Renders the prompt injection toggle switch in the clothing tab
     * @param {HTMLElement} container - The container to render the toggle in
     */
    renderPromptInjectionToggle(container: HTMLElement): void {
        const isPromptInjectionEnabled = this.outfitManager.getPromptInjectionEnabled();

        const toggleContainer = document.createElement('div');

        toggleContainer.className = 'prompt-injection-container';
        toggleContainer.innerHTML = `
            <label class="switch-label" for="bot-outfit-prompt-injection">Prompt Injection</label>
            <label class="switch">
                <input type="checkbox" id="bot-outfit-prompt-injection" ${isPromptInjectionEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <div class="tooltip">?<span class="tooltiptext">When enabled, the bot's current outfit is injected into the prompt, allowing the LLM to be aware of what the bot is wearing.</span></div>
        `;

        container.appendChild(toggleContainer);

        const promptInjectionToggle = toggleContainer.querySelector('#bot-outfit-prompt-injection');

        if (promptInjectionToggle) {
            promptInjectionToggle.addEventListener('change', (event) => {
                const isChecked = (event.target as HTMLInputElement).checked;

                this.outfitManager.setPromptInjectionEnabled(isChecked);
                this.saveSettingsDebounced();
            });
        }
    }

    /**
     * Renders the outfit slots UI elements for the specified slots
     * @param {Array<string>} slots - Array of slot names to render
     * @param {HTMLElement} container - The container element to render slots in
     * @returns {void}
     */
    renderSlots(slots: string[], container: HTMLElement): void {
        const outfitData = this.outfitManager.getOutfitData(slots);

        outfitData.forEach((slot: any) => {
            const slotElement = document.createElement('div');

            slotElement.className = 'outfit-slot';
            slotElement.dataset.slot = slot.name;

            slotElement.innerHTML = `
                <div class="slot-label">${this.formatSlotName(slot.name)}</div>
                <div class="slot-value" title="${slot.value}">${slot.value}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;

            slotElement.querySelector('.slot-change')!.addEventListener('click', async () => {
                const message = await this.outfitManager.changeOutfitItem(slot.name);

                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            });

            container.appendChild(slotElement);
        });
    }

    /**
     * Renders the presets UI elements for saved outfits
     * @param {HTMLElement} container - The container element to render presets in
     * @returns {void}
     */
    renderPresets(container: HTMLElement): void {
        const presets = this.outfitManager.getPresets();

        // Get the name of the preset that is currently set as default
        const defaultPresetName = this.outfitManager.getDefaultPresetName();

        if (presets.length === 0) {
            container.innerHTML += '<div>No saved outfits for this character instance.</div>';
        } else {
            // Show all presets including the default one
            presets.forEach((preset: string) => {
                const isDefault = (defaultPresetName === preset);
                const presetElement = document.createElement('div');

                presetElement.className = `outfit-preset ${isDefault ? 'default-preset-highlight' : ''}`;
                presetElement.innerHTML = `
                    <div class="preset-name">${preset}${isDefault ? ' (Default)' : ''}</div>
                    <div class="preset-actions">
                        <button class="load-preset" data-preset="${preset}">Wear</button>
                        <button class="set-default-preset" data-preset="${preset}" ${isDefault ? 'style="display:none;"' : ''}>Set Default</button>
                        <button class="overwrite-preset" data-preset="${preset}">Overwrite</button>
                        <button class="delete-preset" data-preset="${preset}">×</button>
                    </div>
                `;

                presetElement.querySelector('.load-preset')!.addEventListener('click', async () => {
                    const message = await this.outfitManager.loadPreset(preset);

                    if (message && areSystemMessagesEnabled()) {
                        this.sendSystemMessage(message);
                    }
                    this.saveSettingsDebounced();
                    this.renderContent();
                });

                presetElement.querySelector('.set-default-preset')!.addEventListener('click', async () => {
                    const message = await this.outfitManager.setPresetAsDefault(preset);

                    if (message && areSystemMessagesEnabled()) {
                        this.sendSystemMessage(message);
                    }
                    this.saveSettingsDebounced();
                    this.renderContent();
                });

                presetElement.querySelector('.delete-preset')!.addEventListener('click', () => {
                    if (confirm(`Delete "${preset}" outfit?`)) {
                        const message = this.outfitManager.deletePreset(preset);

                        if (message && areSystemMessagesEnabled()) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    }
                });

                presetElement.querySelector('.overwrite-preset')!.addEventListener('click', () => {
                    // Confirmation dialog to confirm overwriting the preset
                    if (confirm(`Overwrite "${preset}" with current outfit?`)) {
                        const message = this.outfitManager.overwritePreset(preset);

                        if (message && areSystemMessagesEnabled()) {
                            this.sendSystemMessage(message);
                        }
                        this.saveSettingsDebounced();
                        this.renderContent();
                    }
                });

                container.appendChild(presetElement);
            });
        }

        // Add save regular outfit button
        const saveButton = document.createElement('button');

        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save as Preset';
        saveButton.style.marginTop = '5px';
        saveButton.addEventListener('click', async () => {
            const presetName = prompt('Name this outfit:');

            if (presetName && presetName.toLowerCase() !== 'default') {
                const message = await this.outfitManager.savePreset(presetName.trim());

                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            } else if (presetName && presetName.toLowerCase() === 'default') {
                alert('Please save this outfit with a different name, then use the "Set Default" button on that outfit.');
            }
        });

        container.appendChild(saveButton);
    }

    /**
     * Renders the button to fill the outfit with LLM-generated items
     * @param {HTMLElement} container - The container element to render the button in
     * @returns {void}
     */
    renderFillOutfitButton(container: HTMLElement): void {
        const fillOutfitButton = document.createElement('button');

        fillOutfitButton.className = 'fill-outfit-btn';
        fillOutfitButton.textContent = 'Fill Outfit with LLM';
        fillOutfitButton.style.marginTop = '5px';
        fillOutfitButton.style.marginBottom = '10px';
        fillOutfitButton.style.width = '100%';

        fillOutfitButton.addEventListener('click', async () => {
            await this.generateOutfitFromCharacterInfo();
        });

        container.appendChild(fillOutfitButton);
    }

    /**
     * Generates an outfit for the character based on character information using an LLM
     * @returns {Promise<void>} A promise that resolves when the outfit generation is complete
     */
    async generateOutfitFromCharacterInfo(): Promise<void> {
        try {
            // Show a notification that the process has started
            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage('Generating outfit based on character info...');
            }

            // Get character data
            const characterInfo = await this.getCharacterData();

            if (characterInfo.error) {
                debugLog('Error getting character data:', characterInfo.error, 'error');
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage(`Error: ${characterInfo.error}`);
                }
                return;
            }

            // Generate outfit from LLM
            const response = await this.generateOutfitFromLLM(characterInfo);

            // Parse and apply the outfit commands
            await this.parseAndApplyOutfitCommands(response);

            // Success message
            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage('Outfit generated and applied successfully!');
            }
        } catch (error: any) {
            debugLog('Error in generateOutfitFromCharacterInfo:', error, 'error');
            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage(`Error generating outfit: ${error.message}`);
            }
        }
    }

    /**
     * Sends a system message to the UI
     * @param {string} message - The message to display
     * @returns {void}
     */
    sendSystemMessage(message: string): void {
        // Use toastr popup instead of /sys command
        if (areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', {
                timeOut: 4000,
                extendedTimeOut: 8000
            });
        }
    }


    /**
     * Formats a slot name for display
     * @param {string} name - The slot name to format
     * @returns {string} The formatted slot name
     */
    formatSlotName(name: string): string {
        return utilsFormatSlotName(name);
    }

    /**
     * Gets character data from the current context
     * @returns {Promise<any>} An object containing character information or an error
     */
    async getCharacterData(): Promise<any> {
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        // Try to get character using the new character ID system first
        let character = null;
        if (this.outfitManager.characterId) {
            character = findCharacterById(this.outfitManager.characterId);
        }

        // Fallback to old system if needed
        if (!character && context && context.characterId !== undefined && context.characterId !== null) {
            character = context.characters[context.characterId];
        }

        if (!character) {
            return {
                error: 'No character selected or context not ready'
            };
        }

        // Get character information
        const characterInfo = {
            name: character.name || 'Unknown',
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            firstMessage: character.first_mes || '',
            characterNotes: character.character_notes || '',
        };

        // Get the first message from the current chat if it's different from the character's first_message
        if (context.chat && context.chat.length > 0) {
            const firstChatMessage = context.chat.find((msg: any) => !msg.is_user && !msg.is_system);

            if (firstChatMessage && firstChatMessage.mes) {
                characterInfo.firstMessage = firstChatMessage.mes;
            }
        }

        return characterInfo;
    }

    getDefaultOutfitPrompt(): string {
        return `Based on the character's description, personality, scenario, notes, and first message, generate appropriate outfit commands.\n\nCHARACTER INFO:\nName: <CHARACTER_NAME>\nDescription: <CHARACTER_DESCRIPTION>\nPersonality: <CHARACTER_PERSONALITY>\nScenario: <CHARACTER_SCENARIO>\nNotes: <CHARACTER_NOTES>\nFirst Message: <CHARACTER_FIRST_MESSAGE>\n\nOUTPUT FORMAT (one command per line):\noutfit-system_wear_headwear(\"item name\")\noutfit-system_wear_topwear(\"item name\")\noutfit-system_remove_headwear()  // for items not applicable\n\nSLOTS:\nClothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear\nAccessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory\n\nINSTRUCTIONS:\n- Only output outfit commands based on character details\n- Use \"remove\" for items that don't fit the character\n- If uncertain about an item, omit the command\n- Output only commands, no explanations`;
    }

    async generateOutfitFromLLM(characterInfo: any): Promise<string> {
        try {
            // Get the current system prompt or use the default
            let prompt = this.getDefaultOutfitPrompt();

            // Replace placeholders with actual character info
            prompt = prompt
                .replace('<CHARACTER_NAME>', characterInfo.name)
                .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
                .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
                .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
                .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
                .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);

            // Check if there is a connection profile set for the auto outfit system
            let connectionProfile = null;

            if (window.autoOutfitSystem && typeof window.autoOutfitSystem.getConnectionProfile === 'function') {
                connectionProfile = window.autoOutfitSystem.getConnectionProfile();
            }

            // Use the unified LLM utility with profile if available
            return await LLMUtility.generateWithProfile(
                prompt,
                'You are an outfit generation system. Based on the character information provided, output outfit commands to set the character\'s clothing and accessories.',
                window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null),
                connectionProfile
            );
        } catch (error) {
            debugLog('Error generating outfit from LLM:', error, 'error');
            throw error;
        }
    }

    async parseAndApplyOutfitCommands(response: string): Promise<void> {
        // Use the imported extractCommands function to extract outfit commands
        const commands = extractCommands(response);

        if (!commands || commands.length === 0) {
            debugLog('[BotOutfitPanel] No outfit commands found in response');
            return;
        }

        debugLog(`[BotOutfitPanel] Found ${commands.length} commands to process:`, commands);

        // Process each command
        for (const command of commands) {
            try {
                await this.processSingleCommand(command);
            } catch (error) {
                debugLog(`Error processing command "${command}":`, error, 'error');
            }
        }

        // Update the outfit panel UI
        this.renderContent();

        // Save the settings
        this.saveSettingsDebounced();
    }

    async processSingleCommand(command: string): Promise<void> {
        try {
            // Non-regex approach to parse command - similar to AutoOutfitSystem
            if (!command.startsWith('outfit-system_')) {
                throw new Error(`Invalid command format: ${command}`);
            }

            // Extract the action part
            const actionStart = 'outfit-system_'.length;
            const actionEnd = command.indexOf('_', actionStart);

            if (actionEnd === -1) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const action = command.substring(actionStart, actionEnd);

            if (!['wear', 'remove', 'change'].includes(action)) {
                throw new Error(`Invalid action: ${action}. Valid actions: wear, remove, change`);
            }

            // Extract the slot part
            const slotStart = actionEnd + 1;
            const slotEnd = command.indexOf('(', slotStart);

            if (slotEnd === -1) {
                throw new Error(`Invalid command format: ${command}`);
            }

            const slot = command.substring(slotStart, slotEnd);

            // Extract the value part
            const valueStart = slotEnd + 1;
            let value = '';

            if (command.charAt(valueStart) === '"') { // If value is quoted
                const quoteStart = valueStart + 1;
                let i = quoteStart;
                let escaped = false;

                while (i < command.length - 1) {
                    const char = command.charAt(i);

                    if (escaped) {
                        value += char;
                        escaped = false;
                    } else if (char === '\\') {
                        escaped = true;
                    } else if (char === '"') {
                        break; // Found closing quote
                    } else {
                        value += char;
                    }

                    i++;
                }
            } else {
                // Value is not quoted, extract until closing parenthesis
                const closingParen = command.indexOf(')', valueStart);

                if (closingParen !== -1) {
                    value = command.substring(valueStart, closingParen);
                }
            }

            const cleanValue = value.split('"').join('').trim();

            debugLog(`[BotOutfitPanel] Processing: ${action} ${slot} "${cleanValue}"`);

            // Apply the outfit change to the bot manager
            const message = await this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);

            // Show system message if enabled
            if (message && areSystemMessagesEnabled()) {
                this.sendSystemMessage(message);
            }

        } catch (error) {
            debugLog('Error processing single command:', error, 'error');
            throw error;
        }
    }

    /**
     * Toggles the visibility of the panel
     * @returns {void}
     */
    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Shows the panel UI
     * @returns {void}
     */
    show(): void {
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }

        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors(); // Apply colors after showing
        this.isVisible = true;

        // Emit panel visibility changed event
        extensionEventBus.emit(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelType: 'bot',
            visible: true,
            characterId: this.outfitManager.characterId,
            characterName: this.outfitManager.character
        });

        // Set up dynamic refresh when panel becomes visible
        this.setupDynamicRefresh();

        if (this.domElement) {
            dragElementWithSave(this.domElement, 'bot-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'bot-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800
                });
            }, 10); // Small delay to ensure panel is rendered first

            this.domElement.querySelector('#bot-outfit-refresh')?.addEventListener('click', () => {
                const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                this.outfitManager.loadOutfit(outfitInstanceId);
                this.renderContent();
            });

            this.domElement.querySelector('#bot-outfit-close')?.addEventListener('click', () => this.hide());

            // Add event listener for the prompt injection toggle
            const promptInjectionToggle = this.domElement.querySelector('#bot-outfit-prompt-injection');

            if (promptInjectionToggle) {
                promptInjectionToggle.addEventListener('change', (event) => {
                    const isChecked = (event.target as HTMLInputElement).checked;

                    this.outfitManager.setPromptInjectionEnabled(isChecked);

                    // Save the settings after changing
                    this.saveSettingsDebounced();
                });
            }
        }
    }

    // Apply panel colors based on saved preferences
    applyPanelColors(): void {
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = storeState.panelSettings?.botPanelColors;

            if (colors) {
                this.domElement.style.background = colors.primary;
                this.domElement.style.border = `1px solid ${colors.border}`;
                this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
            }
        }
    }

    /**
     * Hides the panel UI
     * @returns {void}
     */
    hide(): void {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;

        // Emit panel visibility changed event
        extensionEventBus.emit(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelType: 'bot',
            visible: false,
            characterId: this.outfitManager.characterId,
            characterName: this.outfitManager.character
        });

        // Clean up dynamic refresh when panel is hidden
        this.cleanupDynamicRefresh();
    }

    updateCharacter(name: string): void {
        this.outfitManager.setCharacter(name);
        // Create the panel if it doesn't exist yet, so we can update the header
        if (!this.domElement) {
            this.createPanel();
        }

        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');

            if (header) {
                // Get the first message hash for display in the header (instance ID)
                const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
                const hashDisplay = messageHash ? ` (${messageHash})` : '';

                // Use the name parameter or the manager's character property
                const formattedName = name || this.outfitManager.character || 'Unknown';

                header.textContent = `${formattedName}'s Outfit${hashDisplay}`;
            }
        }
        this.renderContent();
    }

    // Set up dynamic refresh listeners when the panel is shown
    setupDynamicRefresh(): void {
        // Clean up any existing listeners first
        this.cleanupDynamicRefresh();

        // Subscribe to store changes if we have access to the store
        if (window.outfitStore) {
            // Listen for changes in bot outfit data
            this.outfitSubscription = window.outfitStore.subscribe((state: any) => {
                // Check if this panel's character/outfit instance has changed
                if (this.outfitManager.characterId && this.outfitManager.outfitInstanceId) {
                    const currentOutfit = state.botInstances[this.outfitManager.characterId]?.[this.outfitManager.outfitInstanceId]?.bot;

                    if (currentOutfit) {
                        // Only refresh if the outfit data has actually changed
                        let hasChanged = false;

                        for (const [slot, value] of Object.entries(currentOutfit)) {
                            if (this.outfitManager.currentValues[slot] !== value) {
                                hasChanged = true;
                                break;
                            }
                        }

                        if (hasChanged && this.isVisible) {
                            this.renderContent();
                        }
                    }
                }
            });
        }

        // Get context to set up event listeners
        const context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);

        if (context && context.eventSource && context.event_types) {
            const {eventSource, event_types} = context;

            // Listen for chat-related events that might affect outfit data
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CHANGED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));

            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));

            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                    this.outfitManager.loadOutfit(outfitInstanceId);
                    this.renderContent();
                }
            }));

            this.eventListeners.push(() => eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                if (this.isVisible) {
                    this.renderContent();
                }
            }));
        }
    }

    // Clean up dynamic refresh listeners when the panel is hidden
    cleanupDynamicRefresh(): void {
        // Unsubscribe from store changes
        if (this.outfitSubscription) {
            this.outfitSubscription();
            this.outfitSubscription = null;
        }

        // Remove event listeners
        this.eventListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventListeners = [];
    }

    // Generate a short identifier from the instance ID
    generateShortId(instanceId: string): string {
        if (!instanceId) {
            return '';
        }

        // If the instance ID is already a short identifier, return it
        if (instanceId.startsWith('temp_')) {
            return 'temp';
        }

        // Create a simple short identifier by taking up to 6 characters of the instance ID
        // but only alphanumeric characters for better readability
        let cleanId = '';

        for (let i = 0; i < instanceId.length; i++) {
            const char = instanceId[i];
            const code = char.charCodeAt(0);

            // Check if character is digit (0-9)
            if (code >= 48 && code <= 57) {
                cleanId += char;
                continue;
            }
            // Check if character is uppercase letter A-Z
            if (code >= 65 && code <= 90) {
                cleanId += char;
                continue;
            }
            // Check if character is lowercase letter a-z
            if (code >= 97 && code <= 122) {
                cleanId += char;

            }
            // Otherwise, skip non-alphanumeric characters
        }

        return cleanId.substring(0, 6);
    }

    // Generate an 8-character hash from a text string
    generateMessageHash(text: string): string {
        if (!text) {
            return '';
        }

        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash << 5) - hash) + char;
            hash &= hash; // Convert to 32-bit integer
        }

        // Convert to positive and return 8-character string representation
        return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
    }
}
