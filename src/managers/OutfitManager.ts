import { ALL_SLOTS } from '../config/constants';
import { customMacroSystem } from '../services/CustomMacroService';
import { macroProcessor } from '../processors/MacroProcessor';
import { debugLog } from '../logging/DebugLogger';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events';

export abstract class OutfitManager {
    slots: string[];
    currentValues: { [key: string]: string };
    outfitInstanceId: string | null;
    character: string;
    characterId: string | null;

    constructor(slots: string[] = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';
        this.characterId = null;

        this.slots.forEach((slot) => {
            this.currentValues[slot] = 'None';
        });
    }

    setCharacter(name: string, characterId: string | null = null): void {
        if (name === this.character) {
            return;
        }

        if (!name || typeof name !== 'string') {
            debugLog(`[${this.constructor.name}] Invalid character name provided, using "Unknown"`, null, 'warn');
            name = 'Unknown';
        }

        this.character = name;
        this.characterId = characterId;

        this.loadOutfit();
    }

    setOutfitInstanceId(instanceId: string): void {
        // Save the current outfit data if we have a previous instance ID and character ID
        if (this.outfitInstanceId && this.characterId) {
            this.saveOutfit();
        }

        // Only update if the instance ID is actually different
        if (this.outfitInstanceId !== instanceId) {
            this.outfitInstanceId = instanceId;
            this.loadOutfit();
        }
    }

    getOutfitInstanceId(): string | null {
        return this.outfitInstanceId;
    }

    getCurrentOutfit(): { [key: string]: string } {
        return { ...this.currentValues };
    }

    setOutfit(outfitData: { [key: string]: string }): void {
        if (!outfitData || typeof outfitData !== 'object') {
            debugLog(`[${this.constructor.name}] Invalid outfit data provided to setOutfit`, null, 'warn');
            return;
        }

        let changed = false;

        for (const [slot, value] of Object.entries(outfitData)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                this.currentValues[slot] = value || 'None';
                changed = true;
            }
        }

        if (changed && this.characterId && this.outfitInstanceId) {
            this.saveOutfit();
        }
    }

    abstract getVarName(slot: string): string;

    loadOutfit(instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog(`[${this.constructor.name}] Cannot load outfit - missing characterId or instanceId`, null, 'warn');
            this.slots.forEach((slot) => {
                this.currentValues[slot] = 'None';
            });
            return;
        }

        const outfitData = this.loadOutfitFromInstanceId(actualInstanceId);

        this.setOutfit(outfitData);
    }

    abstract loadOutfitFromInstanceId(instanceId: string): { [key: string]: string };

    saveOutfit(instanceId: string | null = null): void {
        const actualInstanceId = instanceId || this.outfitInstanceId;

        if (!this.characterId || !actualInstanceId) {
            debugLog(`[${this.constructor.name}] Cannot save outfit - missing characterId or instanceId`, null, 'warn');
            return;
        }

        const outfitData: { [key: string]: string } = {};

        this.slots.forEach((slot) => {
            outfitData[slot] = this.currentValues[slot] || 'None';
        });

        this.saveOutfitToInstanceId(outfitData, actualInstanceId);
    }

    abstract saveOutfitToInstanceId(outfitData: { [key: string]: string }, instanceId: string): void;

    async setOutfitItem(slot: string, value: string): Promise<string | null> {
        if (!this.slots.includes(slot)) {
            debugLog(`[${this.constructor.name}] Invalid slot: ${slot}`, null, 'error');
            return null;
        }

        if (value === undefined || value === null || value === '') {
            value = 'None';
        }

        if (typeof value !== 'string') {
            value = String(value);
        }

        const MAX_VALUE_LENGTH = 1000;

        if (value.length > MAX_VALUE_LENGTH) {
            value = value.substring(0, MAX_VALUE_LENGTH);
            debugLog(
                `[${this.constructor.name}] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`,
                null,
                'warn'
            );
        }

        const previousValue = this.currentValues[slot];

        this.currentValues[slot] = value;

        if (this.characterId && this.outfitInstanceId) {
            this.saveOutfit();

            // Clear all macro caches when outfit changes to ensure freshness
            customMacroSystem.clearCache();
            macroProcessor.clearCache();

            // Emit outfit changed event
            extensionEventBus.emit(EXTENSION_EVENTS.OUTFIT_CHANGED, {
                characterId: this.characterId,
                instanceId: this.outfitInstanceId,
                slot: slot,
                previousValue: previousValue,
                newValue: value,
                characterName: this.character,
                managerType: this.constructor.name.includes('Bot') ? 'bot' : 'user',
            });
        }

        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        } else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        }
        return `${this.character} changed from ${previousValue} to ${value}.`;
    }

    async changeOutfitItem(slot: string): Promise<string | null> {
        if (!this.slots.includes(slot)) {
            debugLog(`[${this.constructor.name}] Invalid slot: ${slot}`, null, 'error');
            return null;
        }

        const currentValue = this.currentValues[slot];
        let newValue: string | null = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
            if (newValue === null) {
                return null;
            }
            if (newValue === '') {
                newValue = 'None';
            }
        } else {
            const choice = prompt(
                `${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ''
            );

            if (choice === null) {
                return null;
            }
            if (choice === '') {
                newValue = 'None';
            } else {
                newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
            }
        }

        if (newValue !== currentValue) {
            return this.setOutfitItem(slot, newValue);
        }
        return null;
    }

    getOutfitData(slots: string[]): { name: string; value: string; varName: string }[] {
        return slots.map((slot) => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot),
        }));
    }

    abstract savePreset(presetName: string, instanceId?: string | null): void;

    abstract loadPreset(presetName: string, instanceId?: string | null): Promise<string | null>;

    abstract deletePreset(presetName: string, instanceId?: string | null): string | null;

    abstract getPresets(instanceId?: string | null): string[];

    abstract getAllPresets(instanceId?: string | null): { [key: string]: { [key: string]: string } };

    abstract loadDefaultOutfit(instanceId?: string | null): Promise<string | null>;

    abstract overwritePreset(presetName: string, instanceId?: string | null): string | null;
}
