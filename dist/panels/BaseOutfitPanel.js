var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { formatSlotName as utilsFormatSlotName } from '../utils/utilities.js';
import { areSystemMessagesEnabled } from '../utils/SettingsUtil.js';
import { outfitStore } from '../common/Store.js';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events.js';
export class BaseOutfitPanel {
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced, panelId, panelType) {
        this.outfitManager = outfitManager;
        this.clothingSlots = clothingSlots;
        this.accessorySlots = accessorySlots;
        this.saveSettingsDebounced = saveSettingsDebounced;
        this.panelId = panelId;
        this.panelType = panelType;
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'clothing';
        this.eventListeners = [];
        this.outfitSubscription = null;
    }
    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }
        const panel = document.createElement('div');
        panel.id = this.panelId;
        panel.className = 'outfit-panel';
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${this.getPanelTitle()}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action" id="${this.panelId}-refresh">↻</span>
                    <span class="outfit-action" id="${this.panelId}-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs">
                <button class="outfit-tab active" data-tab="clothing">Clothing</button>
                <button class="outfit-tab" data-tab="accessories">Accessories</button>
                <button class="outfit-tab" data-tab="outfits">Outfits</button>
            </div>
            <div class="outfit-content" id="${this.panelId}-tab-content"></div>
        `;
        document.body.appendChild(panel);
        const tabs = panel.querySelectorAll('.outfit-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                if (tabName) {
                    this.currentTab = tabName;
                    this.renderContent();
                    tabs.forEach(t => t.classList.remove('active'));
                    event.target.classList.add('active');
                }
            });
        });
        this.domElement = panel;
        this.setupInitialEventListeners();
        return panel;
    }
    setupInitialEventListeners() {
        var _a, _b, _c, _d;
        (_b = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector(`#${this.panelId}-refresh`)) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
            this.outfitManager.loadOutfit(this.outfitManager.getOutfitInstanceId());
            this.renderContent();
        });
        (_d = (_c = this.domElement) === null || _c === void 0 ? void 0 : _c.querySelector(`#${this.panelId}-close`)) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => this.hide());
    }
    renderContent() {
        if (!this.domElement)
            return;
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea)
            return;
        contentArea.innerHTML = '';
        switch (this.currentTab) {
            case 'clothing':
                this.renderPromptInjectionToggle(contentArea);
                this.renderSlots(this.clothingSlots, contentArea);
                this.renderFillOutfitButton(contentArea);
                break;
            case 'accessories':
                this.renderSlots(this.accessorySlots, contentArea);
                break;
            case 'outfits':
                this.renderPresets(contentArea);
                break;
        }
    }
    renderPromptInjectionToggle(container) {
        var _a;
        const isEnabled = this.outfitManager.getPromptInjectionEnabled();
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'prompt-injection-container';
        toggleContainer.innerHTML = `
            <label class="switch-label" for="${this.panelId}-prompt-injection">Prompt Injection</label>
            <label class="switch">
                <input type="checkbox" id="${this.panelId}-prompt-injection" ${isEnabled ? 'checked' : ''}>
                <span class="slider round"></span>
            </label>
            <div class="tooltip">?
                <span class="tooltiptext">When enabled, the outfit is injected into the prompt, making the LLM aware of it.</span>
            </div>
        `;
        container.appendChild(toggleContainer);
        (_a = toggleContainer.querySelector(`#${this.panelId}-prompt-injection`)) === null || _a === void 0 ? void 0 : _a.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            this.outfitManager.setPromptInjectionEnabled(isChecked);
            this.saveSettingsDebounced();
        });
    }
    renderSlots(slots, container) {
        this.outfitManager.getOutfitData(slots).forEach((slot) => {
            var _a;
            const slotElement = document.createElement('div');
            slotElement.className = 'outfit-slot';
            slotElement.innerHTML = `
                <div class="slot-label">${utilsFormatSlotName(slot.name)}</div>
                <div class="slot-value" title="${slot.value}">${slot.value}</div>
                <div class="slot-actions">
                    <button class="slot-change">Change</button>
                </div>
            `;
            (_a = slotElement.querySelector('.slot-change')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                const message = yield this.outfitManager.changeOutfitItem(slot.name);
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            }));
            container.appendChild(slotElement);
        });
    }
    renderPresets(container) {
        const presets = this.outfitManager.getPresets();
        const defaultPresetName = this.outfitManager.getDefaultPresetName();
        if (presets.length === 0) {
            container.innerHTML = '<div>No saved outfits.</div>';
        }
        else {
            presets.forEach((preset) => {
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
                this.addPresetButtonListeners(presetElement, preset);
                container.appendChild(presetElement);
            });
        }
        const saveButton = document.createElement('button');
        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save as Preset';
        saveButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const presetName = prompt('Name this outfit:');
            if (presetName && presetName.trim().toLowerCase() !== 'default') {
                const message = yield this.outfitManager.savePreset(presetName.trim());
                if (message && areSystemMessagesEnabled()) {
                    this.sendSystemMessage(message);
                }
                this.saveSettingsDebounced();
                this.renderContent();
            }
            else if (presetName) {
                alert('Please use a name other than "Default". You can set an outfit as default using the "Set Default" button.');
            }
        }));
        container.appendChild(saveButton);
    }
    addPresetButtonListeners(element, presetName) {
        var _a, _b, _c, _d;
        (_a = element.querySelector('.load-preset')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const message = yield this.outfitManager.loadPreset(presetName);
            if (message && areSystemMessagesEnabled())
                this.sendSystemMessage(message);
            this.saveSettingsDebounced();
            this.renderContent();
        }));
        (_b = element.querySelector('.set-default-preset')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
            const message = yield this.outfitManager.setPresetAsDefault(presetName);
            if (message && areSystemMessagesEnabled())
                this.sendSystemMessage(message);
            this.saveSettingsDebounced();
            this.renderContent();
        }));
        (_c = element.querySelector('.overwrite-preset')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
            if (confirm(`Overwrite "${presetName}" with the current outfit?`)) {
                const message = this.outfitManager.overwritePreset(presetName);
                if (message && areSystemMessagesEnabled())
                    this.sendSystemMessage(message);
                this.saveSettingsDebounced();
                this.renderContent();
            }
        });
        (_d = element.querySelector('.delete-preset')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
            if (confirm(`Delete the "${presetName}" outfit?`)) {
                const message = this.outfitManager.deletePreset(presetName);
                if (message && areSystemMessagesEnabled())
                    this.sendSystemMessage(message);
                this.saveSettingsDebounced();
                this.renderContent();
            }
        });
    }
    sendSystemMessage(message) {
        if (areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', { timeOut: 4000, extendedTimeOut: 8000 });
        }
    }
    toggle() {
        this.isVisible ? this.hide() : this.show();
    }
    show() {
        if (!this.domElement) {
            this.createPanel();
        }
        this.updateHeader();
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.applyPanelColors();
        this.isVisible = true;
        extensionEventBus.emit(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelType: this.panelType,
            visible: true,
            characterId: this.outfitManager.characterId,
            characterName: this.outfitManager.character
        });
        this.setupDynamicRefresh();
        dragElementWithSave(this.domElement, this.panelId);
        resizeElement($(this.domElement), this.panelId, { minWidth: 320, minHeight: 300, maxWidth: 700, maxHeight: 900 });
    }
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        extensionEventBus.emit(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelType: this.panelType,
            visible: false,
            characterId: this.outfitManager.characterId,
            characterName: this.outfitManager.character
        });
        this.cleanupDynamicRefresh();
    }
    applyPanelColors() {
        var _a;
        if (!this.domElement)
            return;
        const colors = (_a = outfitStore.getState().panelSettings) === null || _a === void 0 ? void 0 : _a[`${this.panelType}PanelColors`];
        if (colors) {
            this.domElement.style.background = colors.primary;
            this.domElement.style.border = `1px solid ${colors.border}`;
            this.domElement.style.boxShadow = `0 8px 32px ${colors.shadow}`;
        }
    }
    updateHeader() {
        var _a;
        if (!this.domElement)
            this.createPanel();
        const header = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-header h3');
        if (header) {
            header.textContent = this.getPanelTitle();
        }
    }
    setupDynamicRefresh() {
        this.cleanupDynamicRefresh();
        // Specific subscription logic will be in child classes
    }
    cleanupDynamicRefresh() {
        if (this.outfitSubscription) {
            this.outfitSubscription();
            this.outfitSubscription = null;
        }
        this.eventListeners.forEach(unsubscribe => unsubscribe());
        this.eventListeners = [];
    }
    generateMessageHash(text) {
        if (!text)
            return '';
        let hash = 0;
        const str = text.substring(0, 100);
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash &= hash;
        }
        return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
    }
}
