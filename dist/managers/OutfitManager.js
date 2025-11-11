var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ALL_SLOTS } from '../config/constants.js';
import { customMacroSystem } from '../services/CustomMacroService.js';
import { macroProcessor } from '../processors/MacroProcessor.js';
import { debugLog } from '../logging/DebugLogger.js';
import { EXTENSION_EVENTS, extensionEventBus } from '../core/events.js';
export class OutfitManager {
    constructor(slots = ALL_SLOTS) {
        this.slots = slots;
        this.currentValues = {};
        this.outfitInstanceId = null;
        this.character = 'Unknown';
        this.characterId = null;
        this.slots.forEach((slot) => {
            this.currentValues[slot] = 'None';
        });
    }
    setCharacter(name, characterId = null) {
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
    setOutfitInstanceId(instanceId) {
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
    getOutfitInstanceId() {
        return this.outfitInstanceId;
    }
    getCurrentOutfit() {
        return Object.assign({}, this.currentValues);
    }
    setOutfit(outfitData) {
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
    loadOutfit(instanceId = null) {
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
    saveOutfit(instanceId = null) {
        const actualInstanceId = instanceId || this.outfitInstanceId;
        if (!this.characterId || !actualInstanceId) {
            debugLog(`[${this.constructor.name}] Cannot save outfit - missing characterId or instanceId`, null, 'warn');
            return;
        }
        const outfitData = {};
        this.slots.forEach((slot) => {
            outfitData[slot] = this.currentValues[slot] || 'None';
        });
        this.saveOutfitToInstanceId(outfitData, actualInstanceId);
    }
    setOutfitItem(slot, value) {
        return __awaiter(this, void 0, void 0, function* () {
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
                debugLog(`[${this.constructor.name}] Value truncated to ${MAX_VALUE_LENGTH} characters for slot ${slot}`, null, 'warn');
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
            }
            else if (value === 'None') {
                return `${this.character} removed ${previousValue}.`;
            }
            return `${this.character} changed from ${previousValue} to ${value}.`;
        });
    }
    changeOutfitItem(slot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.slots.includes(slot)) {
                debugLog(`[${this.constructor.name}] Invalid slot: ${slot}`, null, 'error');
                return null;
            }
            const currentValue = this.currentValues[slot];
            let newValue = currentValue;
            if (currentValue === 'None') {
                newValue = prompt(`What is ${this.character} wearing on their ${slot}?`, '');
                if (newValue === null) {
                    return null;
                }
                if (newValue === '') {
                    newValue = 'None';
                }
            }
            else {
                const choice = prompt(`${this.character}'s ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`, '');
                if (choice === null) {
                    return null;
                }
                if (choice === '') {
                    newValue = 'None';
                }
                else {
                    newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
                }
            }
            if (newValue !== currentValue) {
                return this.setOutfitItem(slot, newValue);
            }
            return null;
        });
    }
    getOutfitData(slots) {
        return slots.map((slot) => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot),
        }));
    }
}
