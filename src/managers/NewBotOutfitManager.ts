import { OutfitManager } from './OutfitManager';
import { outfitStore } from '../common/Store';
import { debugLog } from '../logging/DebugLogger';
import { getCharacterDefaultOutfitById, setCharacterDefaultOutfitById } from '../services/CharacterOutfitService';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events';

export class NewBotOutfitManager extends OutfitManager {
    constructor(slots: string[]) {
        super(slots);
    }

    setPromptInjectionEnabled(enabled: boolean, instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog(
                '[NewBotOutfitManager] Cannot set prompt injection - missing characterId or instanceId',
                null,
                'warn'
            );
            return;
        }

        if (!outfitStore.state.botInstances[this.characterId]) {
            outfitStore.state.botInstances[this.characterId] = {};
        }
        if (!outfitStore.state.botInstances[this.characterId][actualInstanceId]) {
            outfitStore.state.botInstances[this.characterId][actualInstanceId] = {
                bot: {},
                user: {},
                promptInjectionEnabled: true,
            };
        }

        const updatedInstanceData = {
            ...outfitStore.state.botInstances[this.characterId][actualInstanceId],
            promptInjectionEnabled: Boolean(enabled),
        };

        outfitStore.state.botInstances[this.characterId][actualInstanceId] = updatedInstanceData;

        outfitStore.notifyListeners();
        outfitStore.saveState();
    }

    getPromptInjectionEnabled(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog(
                '[NewBotOutfitManager] Cannot get prompt injection - missing characterId or instanceId',
                null,
                'warn'
            );
            return true;
        }

        const instanceData = outfitStore.state.botInstances[this.characterId]?.[actualInstanceId];

        return instanceData?.promptInjectionEnabled !== undefined ? instanceData.promptInjectionEnabled : true;
    }

    getVarName(slot: string): string {
        if (!this.characterId || !this.outfitInstanceId) {
            return `OUTFIT_INST_${this.characterId || 'unknown'}_temp_${slot}`;
        }

        return `OUTFIT_INST_${this.characterId}_${this.outfitInstanceId}_${slot}`;
    }

    loadOutfit(): void {
        if (!this.characterId || !this.outfitInstanceId) {
            debugLog(
                '[NewBotOutfitManager] Cannot load outfit - missing characterId or outfitInstanceId',
                null,
                'debug'
            );
            this.slots.forEach((slot) => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        const instanceOutfits = outfitStore.getBotOutfit(this.characterId, this.outfitInstanceId);

        this.slots.forEach((slot) => {
            const value = instanceOutfits[slot] !== undefined ? instanceOutfits[slot] : 'None';
            this.currentValues[slot] = value;
        });

        // Invalidate macro caches for this character/instance after loading new outfit data
        if (this.characterId && this.outfitInstanceId) {
            import('../services/CustomMacroService').then(({ invalidateMacroCachesForCharacter }) => {
                invalidateMacroCachesForCharacter(this.characterId, this.outfitInstanceId);
            });
        }
    }

    saveOutfit(): void {
        if (!this.characterId || !this.outfitInstanceId) {
            debugLog(
                '[NewBotOutfitManager] Cannot save outfit - missing characterId or outfitInstanceId',
                null,
                'warn'
            );
            return;
        }

        const botOutfit: { [key: string]: string } = {};

        this.slots.forEach((slot) => {
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

        this.slots.forEach((slot) => {
            presetData[slot] = this.currentValues[slot];
        });

        if (!this.characterId) {
            return '[Outfit System] Character ID not available.';
        }

        // Save to extension storage
        outfitStore.savePreset(this.characterId, actualInstanceId, presetName, presetData, 'bot');

        // Emit preset saved event
        extensionEventBus.emit(EXTENSION_EVENTS.PRESET_SAVED, {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            presetName: presetName,
            characterName: this.character,
            managerType: 'bot',
            presetData: presetData,
        });

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

        // Load from extension storage only
        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);
        const preset = presets && presets[presetName] ? presets[presetName] : null;

        if (!preset) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }

        let changed = false;

        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                await this.setOutfitItem(slot, value as string);
                changed = true;
            }
        }

        if (changed) {
            // Emit preset loaded event
            extensionEventBus.emit(EXTENSION_EVENTS.PRESET_LOADED, {
                characterId: this.characterId,
                instanceId: actualInstanceId,
                presetName: presetName,
                characterName: this.character,
                changed: true,
            });
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

        // Check if preset exists in extension storage
        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found for instance ${actualInstanceId}.`;
        }

        // Delete from extension storage only
        outfitStore.deletePreset(this.characterId, actualInstanceId, presetName, 'bot');

        // Emit preset deleted event
        extensionEventBus.emit(EXTENSION_EVENTS.PRESET_DELETED, {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            presetName: presetName,
            characterName: this.character,
            managerType: 'bot',
        });

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Deleted "${presetName}" outfit for instance ${actualInstanceId}.`;
        }

        return '';
    }

    getPresets(instanceId: string | null = null): string[] {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character is defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(
                `[NewBotOutfitManager] getPresets called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`,
                null,
                'warn'
            );
            return [];
        }

        // Get presets from extension storage only
        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);

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

        // First, try to load from character card embedded data
        const embeddedDefaultOutfit = getCharacterDefaultOutfitById(this.characterId);
        if (embeddedDefaultOutfit) {
            debugLog(
                `[NewBotOutfitManager] Loading default outfit from character card for ${this.character}`,
                null,
                'info'
            );
            let changed = false;

            for (const [slot, value] of Object.entries(embeddedDefaultOutfit)) {
                if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                    await this.setOutfitItem(slot, value as string);
                    changed = true;
                }
            }

            for (const slot of this.slots) {
                if (
                    !Object.prototype.hasOwnProperty.call(embeddedDefaultOutfit, slot) &&
                    this.currentValues[slot] !== 'None'
                ) {
                    await this.setOutfitItem(slot, 'None');
                    changed = true;
                }
            }

            if (changed) {
                // Emit default outfit loaded event
                extensionEventBus.emit(EXTENSION_EVENTS.DEFAULT_OUTFIT_LOADED, {
                    characterId: this.characterId,
                    instanceId: actualInstanceId,
                    characterName: this.character,
                    managerType: 'bot',
                    source: 'embedded',
                    changed: true,
                });
                return `${this.character} changed into the default outfit (instance: ${actualInstanceId}).`;
            }

            return `${this.character} was already wearing the default outfit (instance: ${actualInstanceId}).`;
        }

        // Fallback to legacy behavior: check settings for default preset name
        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};
        const defaultPresetName = defaultBotPresets[this.characterId]?.[actualInstanceId];

        if (!defaultPresetName) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);

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
            // Emit default outfit loaded event
            extensionEventBus.emit(EXTENSION_EVENTS.DEFAULT_OUTFIT_LOADED, {
                characterId: this.characterId,
                instanceId: actualInstanceId,
                characterName: this.character,
                managerType: 'bot',
                source: 'legacy',
                changed: true,
            });
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

        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot overwrite.`;
        }

        const presetData: { [key: string]: string } = {};

        this.slots.forEach((slot) => {
            presetData[slot] = this.currentValues[slot];
        });

        outfitStore.savePreset(this.characterId, actualInstanceId, presetName, presetData, 'bot');

        // Emit preset overwritten event
        extensionEventBus.emit(EXTENSION_EVENTS.PRESET_OVERWRITTEN, {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            presetName: presetName,
            characterName: this.character,
            managerType: 'bot',
            presetData: presetData,
        });

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Overwrote "${presetName}" outfit for ${this.character} (instance: ${actualInstanceId}).`;
        }

        return '';
    }

    getAllPresets(instanceId: string | null = null): { [key: string]: { [key: string]: string } } {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';
        if (!this.characterId) {
            return {};
        }

        // Get presets from extension storage only
        return outfitStore.getAllPresets(this.characterId, actualInstanceId, 'bot');
    }

    hasDefaultOutfit(instanceId: string | null = null): boolean {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(
                `[NewBotOutfitManager] hasDefaultOutfit called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`,
                null,
                'warn'
            );
            return false;
        }

        // Check if default outfit is embedded in character card
        const embeddedDefaultOutfit = getCharacterDefaultOutfitById(this.characterId);
        if (embeddedDefaultOutfit && Object.keys(embeddedDefaultOutfit).length > 0) {
            return true;
        }

        // Fallback to legacy settings check
        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};

        return Boolean(defaultBotPresets[this.characterId]?.[actualInstanceId]);
    }

    getDefaultPresetName(instanceId: string | null = null): string | null {
        const actualInstanceId = instanceId || this.outfitInstanceId || 'default';

        // Ensure character and instanceId are defined before attempting to get presets
        if (!this.characterId || !actualInstanceId) {
            debugLog(
                `[NewBotOutfitManager] getDefaultPresetName called with invalid parameters: characterId=${this.characterId}, instanceId=${actualInstanceId}`,
                null,
                'warn'
            );
            return null;
        }

        // If default outfit is embedded in character card, return a special indicator
        const embeddedDefaultOutfit = getCharacterDefaultOutfitById(this.characterId);
        if (embeddedDefaultOutfit && Object.keys(embeddedDefaultOutfit).length > 0) {
            return '__embedded_default__';
        }

        // Fallback to legacy settings
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

        const { bot: presets } = outfitStore.getPresets(this.characterId, actualInstanceId);

        if (!presets || !presets[presetName]) {
            return `[Outfit System] Preset "${presetName}" does not exist for instance ${actualInstanceId}. Cannot set as default.`;
        }

        const presetData = presets[presetName];

        // Embed the default outfit directly in the character card
        const success = await setCharacterDefaultOutfitById(this.characterId, presetData);
        if (!success) {
            debugLog(
                `[NewBotOutfitManager] Failed to embed default outfit in character card for ${this.character}`,
                null,
                'error'
            );
            // Fallback to legacy behavior
            const state = outfitStore.getState();
            const defaultBotPresets = { ...(state.settings.defaultBotPresets || {}) };
            if (!defaultBotPresets[this.characterId]) {
                defaultBotPresets[this.characterId] = {};
            }
            defaultBotPresets[this.characterId][actualInstanceId] = presetName;
            outfitStore.setSetting('defaultBotPresets', defaultBotPresets);
        } else {
            debugLog(
                `[NewBotOutfitManager] Successfully embedded default outfit in character card for ${this.character}`,
                null,
                'info'
            );
        }

        // Emit default outfit set event
        extensionEventBus.emit(EXTENSION_EVENTS.DEFAULT_OUTFIT_SET, {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            presetName: presetName,
            characterName: this.character,
            managerType: 'bot',
            embedded: success,
        });

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

        // Clear embedded default outfit from character card
        const success = await setCharacterDefaultOutfitById(this.characterId, {});
        if (!success) {
            debugLog(
                `[NewBotOutfitManager] Failed to clear embedded default outfit from character card for ${this.character}`,
                null,
                'error'
            );
        }

        // Also clear legacy setting for backward compatibility
        const settings = outfitStore.getState().settings;
        const defaultBotPresets = settings.defaultBotPresets || {};

        if (!defaultBotPresets[this.characterId]?.[actualInstanceId]) {
            return `[Outfit System] No default outfit set for ${this.character} (instance: ${actualInstanceId}).`;
        }

        // Clear the default preset setting
        const state = outfitStore.getState();
        const updatedDefaultBotPresets = { ...(state.settings.defaultBotPresets || {}) };
        if (updatedDefaultBotPresets[this.characterId]) {
            delete updatedDefaultBotPresets[this.characterId][actualInstanceId];
            outfitStore.setSetting('defaultBotPresets', updatedDefaultBotPresets);
        }

        // Emit default outfit cleared event
        extensionEventBus.emit(EXTENSION_EVENTS.DEFAULT_OUTFIT_CLEARED, {
            characterId: this.characterId,
            instanceId: actualInstanceId,
            characterName: this.character,
            managerType: 'bot',
        });

        if (outfitStore.getSetting('enableSysMessages')) {
            return `Default outfit cleared for ${this.character} (instance: ${actualInstanceId}).`;
        }
        return '';
    }

    loadOutfitFromInstanceId(instanceId: string): { [key: string]: string } {
        if (!this.characterId || !instanceId) {
            debugLog('[NewBotOutfitManager] Cannot load outfit - missing characterId or instanceId', null, 'warn');
            const defaultOutfit: { [key: string]: string } = {};
            this.slots.forEach((slot) => {
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
