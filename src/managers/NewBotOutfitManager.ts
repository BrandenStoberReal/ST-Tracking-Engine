import {OutfitManager} from './OutfitManager';
import {outfitStore} from '../common/Store';
import {debugLog} from '../logging/DebugLogger';

export class NewBotOutfitManager extends OutfitManager {

    constructor(slots: string[]) {
        super(slots);
    }

    setPromptInjectionEnabled(enabled: boolean, instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog('[NewBotOutfitManager] Cannot set prompt injection - missing characterId or instanceId', null, 'warn');
            return;
        }

        if (!outfitStore.state.botInstances[this.characterId]) {
            outfitStore.state.botInstances[this.characterId] = {};
        }
        if (!outfitStore.state.botInstances[this.characterId][actualInstanceId]) {
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = {
                bot: {},
                user: {},
                promptInjectionEnabled: true
            };
        }

        const updatedInstanceData = {
            ...outfitStore.state.botInstances[this.characterId][actualInstanceId],
            promptInjectionEnabled: Boolean(enabled)
        };

        outfitStore.state.botInstances[this.characterId][actualInstanceId] = updatedInstanceData;

        outfitStore.notifyListeners();
        outfitStore.saveState();
    }

    getPromptInjectionEnabled(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog('[NewBotOutfitManager] Cannot get prompt injection - missing characterId or instanceId', null, 'warn');
            return true;
        }

        const instanceData = outfitStore.state.botInstances[this.characterId]?.[actualInstanceId];

        return instanceData?.promptInjectionEnabled !== undefined ?
            instanceData.promptInjectionEnabled : true;
    }

    getVarName(slot: string): string {
        if (!this.characterId || !this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_temp_${slot}`;
        }

        return `OUTFIT_INST_${this.characterId}_${this.outfitInstanceId}_${slot}`;
    }

    loadOutfit(): void {
        if (!this.characterId || !this.outfitInstanceId) {
            debugLog('[NewBotOutfitManager] Cannot load outfit - missing characterId or outfitInstanceId', null, 'warn');
            this.slots.forEach(slot => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        const instanceOutfits = outfitStore.getBotOutfit(this.characterId, this.outfitInstanceId);

        this.slots.forEach(slot => {
            const value = instanceOutfits[slot] !== undefined ? instanceOutfits[slot] : 'None';
            this.currentValues[slot] = value;
        });
    }

    saveOutfit(): void {
        if (!this.characterId || !this.outfitInstanceId) {
            debugLog('[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId', null, 'warn');
            return;
        }

        const botOutfit: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            botOutfit[slot] = this.currentValues[slot] || 'None';
        });

        outfitStore.setBotOutfit(this.characterId, this.outfitInstanceId, botOutfit);
        outfitStore.saveState();
    }

    savePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('[NewBotOutfitManager] Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        if (!this.characterId) {
            return '[Outfit System] Character ID not available.';
        }
        outfitStore.savePreset(this.characterId, actualInstanceId, presetName, presetData, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Saved "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    async loadPreset(presetName: string, instanceId: string | null = null): Promise<string> {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }

        const preset = presets[presetName];
        let changed = false;

        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value as string);
                changed = true;
            }
        }

        if (changed) {
            return `${this.character} changed into the "${presetName}" outfit (instance: ${actualInstanceId}).`;
        }

        return `${this.character} was already wearing the "${presetName}" outfit (instance: ${actualInstanceId}).`;
    }

    deletePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string') {
            return `[Outfit System] Invalid preset name: ${presetName}`;
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }

        outfitStore.deletePreset(this.characterId, actualInstanceId, presetName, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }

        return '';
    }

    getPresets(instanceId: string | null = null): string[] {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character is defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(`[NewBotOutfitManager] getPresets called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`, null, 'warn');
            return [];
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets) {
            return [];
        }

        return Object.keys(presets);
    }

    async loadDefaultOutfit(instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};
        const defaultPresetName = defaultBotPresets[this.characterId]?.[actualInstanceId];

        if (!defaultPresetName) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[defaultPresetName]) {
            return `[Outfit System] Default preset "${defaultPresetName}" not found for ${this.character} (instance: ${actualInstanceId}).`;
        }

        const preset = presets[defaultPresetName];
        let changed = false;

        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value as string);
                changed = true;
            }
        }

        for (const slot of this.slots) {
            if (!Object.prototype.hasOwnProperty.call(preset, slot) && this.currentValues[slot] !== 'None') {
                await this.setOutfitItem(slot, 'None');
                changed = true;
            }
        }

        if (changed) {
            return `${this.character} changed into the default outfit (instance: ${actualInstanceId}).`;
        }

        return `${this.character} was already wearing the default outfit (instance: ${actualInstanceId}).`;
    }

    overwritePreset(presetName: string, instanceId: string | null = null): string {
        if (!presetName || typeof presetName !== 'string' || presetName.trim() === '') {
            debugLog('[NewBotOutfitManager] Invalid preset name provided', null, 'error');
            return '[Outfit System] Invalid preset name provided.';
        }

        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }

        const presetData: { [key: string]: string } = {};

        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });

        outfitStore.savePreset(this.characterId, actualInstanceId, presetName, presetData, 'bot');

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    getAllPresets(instanceId: string | null = null): { [key: string]: { [key: string]: string; }; } {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        if (!this.characterId) {
            return {};
        }
        return outfitStore.getAllPresets(this.characterId, actualInstanceId, 'bot');
    }

    hasDefaultOutfit(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(`[NewBotOutfitManager] hasDefaultOutfit called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`, null, 'warn');
            return false;
        }

        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};

        return Boolean(defaultBotPresets[this.characterId]?.[actualInstanceId]);
    }

    getDefaultPresetName(instanceId: string | null = null): string | null {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(`[NewBotOutfitManager] getDefaultPresetName called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`, null, 'warn');
            return null;
        }

        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};

        return defaultBotPresets[this.characterId]?.[actualInstanceId] || null;
    }

    async setPresetAsDefault(presetName: string, instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const {bot: presets} = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
        }

        // Store the default preset name in settings instead of creating a duplicate preset
        const state = outfitStore.getState();
        const defaultBotPresets = {...(state.settings.defaultBotPresets || {})};
        if (!defaultBotPresets[this.characterId]) {
            defaultBotPresets[this.characterId] = {};
        }
        defaultBotPresets[this.characterId][actualInstanceId] = presetName;
        outfitStore.setSetting('defaultBotPresets', defaultBotPresets);

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Set "${presetName}" as the default outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    async clearDefaultPreset(instanceId: string | null = null): Promise<string> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            return `[Outfit System] Invalid character or instance ID: characterId=${this.characterId}, instanceId=${actualInstanceId}`;
        }

        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};

        if (!defaultBotPresets[this.characterId]?.[actualInstanceId]) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        // Clear the default preset setting
        const state = outfitStore.getState();
        const updatedDefaultBotPresets = {...(state.settings.defaultBotPresets || {})};
        if (updatedDefaultBotPresets[this.characterId]) {
            delete updatedDefaultBotPresets[this.characterId][actualInstanceId];
            outfitStore.setSetting('defaultBotPresets', updatedDefaultBotPresets);
        }

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Default outfit cleared for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    loadOutfitFromInstanceId(instanceId: string): { [key: string]: string } {
        if (!this.characterId || !instanceId) {
            debugLog('[NewBotOutfitManager] Cannot load outfit - missing characterId or instanceId', null, 'warn');
            const defaultOutfit: { [key: string]: string } = {};
            this.slots.forEach(slot => {
                defaultOutfit[slot] = 'None';
            });
            return defaultOutfit;
        }

        return outfitStore.getBotOutfit(this.characterId, instanceId);
    }

    saveOutfitToInstanceId(outfitData: { [key: string]: string }, instanceId: string): void {
        if (!this.characterId || !instanceId) {
            debugLog('[NewBotOutfitManager] Cannot save outfit - missing characterId or instanceId', null, 'warn');
            return;
        }

        outfitStore.setBotOutfit(this.characterId, instanceId, outfitData);
        outfitStore.saveState();
    }

    async applyDefaultOutfitAfterReset(instanceId: string | null = null): Promise<boolean> {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        if (this.hasDefaultOutfit(actualInstanceId)) {
            await this.loadDefaultOutfit(actualInstanceId);
            return true;
        }

        if (actualInstanceId !== 'default' && this.hasDefaultOutfit('default')) {
            await this.loadDefaultOutfit('default');
            return true;
        }

        return false;
    }
}