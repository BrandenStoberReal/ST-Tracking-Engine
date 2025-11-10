import {dragElementWithSave, resizeElement} from '../common/shared';
import {formatSlotName as utilsFormatSlotName} from '../utils/utilities';
import {areSystemMessagesEnabled} from '../utils/SettingsUtil';
import {outfitStore} from '../common/Store';
import {debugLog} from '../logging/DebugLogger';
import {EXTENSION_EVENTS, extensionEventBus} from '../core/events';

declare const window: any;
declare const toastr: any;
declare const $: any;

/**
 * UserOutfitPanel - Manages the UI for the user character's outfit tracking
 * This class creates and manages a draggable panel for viewing and modifying
 * the user character's outfit, including clothing, accessories, and saved presets
 */
export class UserOutfitPanel {
    outfitManager: any;
    clothingSlots: string[];
    accessorySlots: string[];
    isVisible: boolean;
    domElement: HTMLElement | null;
    currentTab: string;
    currentPresetCategory: string;
    presetCategories: string[];
    saveSettingsDebounced: any;
    eventListeners: any[];
    outfitSubscription: any;

    /**
     * Creates a new UserOutfitPanel instance
     * @param {object} outfitManager - The outfit manager for the user character
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
        this.saveSettingsDebounced = saveSettingsDebounced;
        this.eventListeners = [];
        this.outfitSubscription = null;
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

        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';

        // Get the first message hash for display in the header (instance ID)
        const messageHash = this.generateMessageHash(
            this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || ''
        );
        const hashDisplay = messageHash ? ` (${messageHash})` : '';

        panel.innerHTML = `
            <div class="outfit-header">
                <h3>Your Outfit${hashDisplay}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="user-outfit-refresh">↻</span>
                    <span class="outfit-action" id="user-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab${this.currentTab === 'clothing' ? ' active' : ''}" data-tab="clothing">Clothing</button>
                <button class="outfit-tab${this.currentTab === 'accessories' ? ' active' : ''}" data-tab="accessories">Accessories</button>
                <button class="outfit-tab${this.currentTab === 'outfits' ? ' active' : ''}" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="user-outfit-tab-content"></div>
        `;

        document.body.appendChild(panel);

        const tabs = panel.querySelectorAll('.outfit-tab');

        tabs.forEach((tab) => {
            tab.addEventListener('click', (event) => {
                const tabName = (event.target as HTMLElement).dataset.tab;

                this.currentTab = tabName!;
                this.renderContent();

                tabs.forEach((t) => t.classList.remove('active'));
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
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                    ? window.getContext()
                    : null;

            if (context && context.chat && Array.isArray(context.chat)) {
                // Get the first AI message from the character (instance identifier)
                const aiMessages = context.chat.filter((msg: any) => !msg.is_user && !msg.is_system);

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
                this.renderPromptInjectionToggle(contentArea as HTMLElement);
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

    renderPromptInjectionToggle(container: HTMLElement): void {
        const isPromptInjectionEnabled = this.outfitManager.getPromptInjectionEnabled();

        const toggleContainer = document.createElement('div');

        toggleContainer.className = 'prompt-injection-container';
        toggleContainer.innerHTML = `
            <label class="switch-label" for="user-outfit-prompt-injection">Prompt Injection</label>
            <label class="switch">
                <input type="checkbox" id="user-outfit-prompt-injection" ${isPromptInjectionEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <div class="tooltip">?<span class="tooltiptext">When enabled, your current outfit is injected into the prompt, allowing the LLM to be aware of what you are wearing.</span></div>
        `;

        container.appendChild(toggleContainer);

        const promptInjectionToggle = toggleContainer.querySelector('#user-outfit-prompt-injection');

        if (promptInjectionToggle) {
            promptInjectionToggle.addEventListener('change', (event) => {
                const isChecked = (event.target as HTMLInputElement).checked;

                this.outfitManager.setPromptInjectionEnabled(isChecked);
                this.saveSettingsDebounced();
            });
        }
    }

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

    renderPresets(container: HTMLElement): void {
        const presets = this.outfitManager.getPresets();

        // Get the name of the preset that is currently set as default
        const defaultPresetName = this.outfitManager.getDefaultPresetName();

        if (presets.length === 0) {
            container.innerHTML += '<div>No saved outfits for this instance.</div>';
        } else {
            // Show all presets including the default one
            presets.forEach((preset: string) => {
                const isDefault = defaultPresetName === preset;
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
                alert(
                    'Please save this outfit with a different name, then use the "Set Default" button on that outfit.'
                );
            }
        });

        container.appendChild(saveButton);
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
                extendedTimeOut: 8000,
            });
        }
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

        fillOutfitButton.addEventListener('click', () => {
            alert('Fill Outfit with LLM is only available for character outfits, not user outfits.');
        });

        container.appendChild(fillOutfitButton);
    }

    formatSlotName(name: string): string {
        return utilsFormatSlotName(name);
    }

    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }

        // Update the header to ensure it has the latest instance ID
        this.updateHeader();

        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors(); // Apply colors after showing
        this.isVisible = true;

        // Emit panel visibility changed event
        extensionEventBus.emit(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelType: 'user',
            visible: true,
            characterId: 'user',
            characterName: 'User',
        });

        // Set up dynamic refresh when panel becomes visible
        this.setupDynamicRefresh();

        if (this.domElement) {
            dragElementWithSave(this.domElement, 'user-outfit-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                resizeElement($(this.domElement), 'user-outfit-panel', {
                    minWidth: 250,
                    minHeight: 200,
                    maxWidth: 600,
                    maxHeight: 800,
                });
            }, 10); // Small delay to ensure panel is rendered first

            this.domElement.querySelector('#user-outfit-refresh')?.addEventListener('click', () => {
                const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                this.outfitManager.loadOutfit(outfitInstanceId);
                this.renderContent();
            });

            this.domElement.querySelector('#user-outfit-close')?.addEventListener('click', () => this.hide());
        }
    }

    /**
     * Applies panel colors based on saved preferences
     * @returns {void}
     */
    applyPanelColors(): void {
        if (this.domElement) {
            const storeState = outfitStore.getState();
            const colors = storeState.panelSettings?.userPanelColors;

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
            panelType: 'user',
            visible: false,
            characterId: 'user',
            characterName: 'User',
        });

        // Clean up dynamic refresh when panel is hidden
        this.cleanupDynamicRefresh();
    }

    /**
     * Updates the header to reflect changes (like new instance ID)
     * @returns {void}
     */
    updateHeader(): void {
        // Create the panel if it doesn't exist yet, so we can update the header
        if (!this.domElement) {
            this.createPanel();
        }

        if (this.domElement) {
            const header = this.domElement.querySelector('.outfit-header h3');

            if (header) {
                // Get the first message hash for display in the header (instance ID)
                const messageHash = this.generateMessageHash(
                    this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || ''
                );
                const hashDisplay = messageHash ? ` (${messageHash})` : '';

                header.textContent = `Your Outfit${hashDisplay}`;
            }
        }
    }

    /**
     * Sets up dynamic refresh listeners when the panel is shown
     * @returns {void}
     */
    setupDynamicRefresh(): void {
        // Clean up any existing listeners first
        this.cleanupDynamicRefresh();

        // Subscribe to store changes if we have access to the store
        if (window.outfitStore) {
            // Listen for changes in user outfit data
            this.outfitSubscription = window.outfitStore.subscribe((state: any) => {
                // Check if this panel's outfit instance has changed
                if (this.outfitManager.outfitInstanceId) {
                    const currentUserOutfit = state.userInstances[this.outfitManager.outfitInstanceId];

                    if (currentUserOutfit) {
                        // Only refresh if the outfit data has actually changed
                        let hasChanged = false;

                        for (const [slot, value] of Object.entries(currentUserOutfit)) {
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
        const context = window.SillyTavern?.getContext
            ? window.SillyTavern.getContext()
            : window.getContext
                ? window.getContext()
                : null;

        if (context && context.eventSource && context.event_types) {
            const {eventSource, event_types} = context;

            // Listen for chat-related events that might affect outfit data
            this.eventListeners.push(() =>
                eventSource.on(event_types.CHAT_CHANGED, () => {
                    if (this.isVisible) {
                        const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                        this.outfitManager.loadOutfit(outfitInstanceId);
                        this.updateHeader();
                        this.renderContent();
                    }
                })
            );

            this.eventListeners.push(() =>
                eventSource.on(event_types.CHAT_ID_CHANGED, () => {
                    if (this.isVisible) {
                        const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                        this.outfitManager.loadOutfit(outfitInstanceId);
                        this.updateHeader();
                        this.renderContent();
                    }
                })
            );

            this.eventListeners.push(() =>
                eventSource.on(event_types.CHAT_CREATED, () => {
                    if (this.isVisible) {
                        const outfitInstanceId = this.outfitManager.getOutfitInstanceId();

                        this.outfitManager.loadOutfit(outfitInstanceId);
                        this.updateHeader();
                        this.renderContent();
                    }
                })
            );

            this.eventListeners.push(() =>
                eventSource.on(event_types.MESSAGE_RECEIVED, () => {
                    if (this.isVisible) {
                        this.renderContent();
                    }
                })
            );
        }
    }

    /**
     * Cleans up dynamic refresh listeners when the panel is hidden
     * @returns {void}
     */
    cleanupDynamicRefresh(): void {
        // Unsubscribe from store changes
        if (this.outfitSubscription) {
            this.outfitSubscription();
            this.outfitSubscription = null;
        }

        // Remove event listeners
        this.eventListeners.forEach((unsubscribe) => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventListeners = [];
    }

    /**
     * Generates a short identifier from the instance ID
     * @param {string} instanceId - The instance ID to generate a short ID from
     * @returns {string} A short identifier based on the instance ID
     */
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

    /**
     * Generates an 8-character hash from a text string
     * @param {string} text - The text to generate a hash from
     * @returns {string} An 8-character hash string representation of the text
     */
    generateMessageHash(text: string): string {
        if (!text) {
            return '';
        }

        let hash = 0;
        const str = text.substring(0, 100); // Only use first 100 chars to keep ID manageable

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = (hash << 5) - hash + char;
            hash &= hash; // Convert to 32-bit integer
        }

        // Convert to positive and return 8-character string representation
        return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
    }
}
