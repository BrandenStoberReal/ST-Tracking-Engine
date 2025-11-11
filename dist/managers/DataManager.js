var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { deepMerge } from '../utils/utilities.js';
import { DEFAULT_SETTINGS } from '../config/constants.js';
import { debugLog } from '../logging/DebugLogger.js';
const DATA_VERSION = '1.0.0';
class DataManager {
    constructor(storageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.data = (yield this.storageService.load());
            if (!this.data) {
                this.data = {
                    botInstances: {},
                    userInstances: {},
                    presets: { bot: {}, user: {} },
                    settings: Object.assign({}, DEFAULT_SETTINGS),
                    version: DATA_VERSION,
                    messageInstanceMap: {},
                };
            }
            this.migrateData();
        });
    }
    migrateData() {
        if (!this.data)
            return;
        if (!this.data.version || this.data.version < this.version) {
            debugLog(`[DataManager] Migrating data from version ${this.data.version} to ${this.version}`, null, 'info');
            // Migration: Convert 'default' presets to settings-based default preset names
            if (this.data.presets) {
                const settings = this.data.settings || Object.assign({}, DEFAULT_SETTINGS);
                // Migrate bot presets
                if (this.data.presets.bot) {
                    for (const [key, presetGroup] of Object.entries(this.data.presets.bot)) {
                        if (presetGroup && presetGroup['default']) {
                            // Extract character and instance from key
                            const parts = key.split('_');
                            if (parts.length >= 2) {
                                const characterId = parts.slice(0, -1).join('_');
                                const instanceId = parts[parts.length - 1];
                                if (!settings.defaultBotPresets) {
                                    settings.defaultBotPresets = {};
                                }
                                if (!settings.defaultBotPresets[characterId]) {
                                    settings.defaultBotPresets[characterId] = {};
                                }
                                settings.defaultBotPresets[characterId][instanceId] = 'default';
                            }
                        }
                    }
                }
                // Migrate user presets
                if (this.data.presets.user) {
                    for (const [instanceId, presetGroup] of Object.entries(this.data.presets.user)) {
                        if (presetGroup && presetGroup['default']) {
                            if (!settings.defaultUserPresets) {
                                settings.defaultUserPresets = {};
                            }
                            settings.defaultUserPresets[instanceId] = 'default';
                        }
                    }
                }
                this.data.settings = settings;
            }
            this.data.version = this.version;
        }
    }
    save(data) {
        if (this.data) {
            this.data = deepMerge(this.data, data);
            this.storageService.save(this.data);
        }
    }
    load() {
        return this.data || null;
    }
    saveOutfitData(outfitData) {
        this.save({
            botInstances: outfitData.botInstances || {},
            userInstances: outfitData.userInstances || {},
            presets: outfitData.presets || {},
            messageInstanceMap: outfitData.messageInstanceMap || {},
        });
    }
    // Direct method to save wiped outfit data that bypasses deepMerge for complete wipe operations
    saveWipedOutfitData() {
        if (this.data) {
            // Directly set the properties without using deepMerge
            this.data.botInstances = {};
            this.data.userInstances = {};
            this.data.presets = { bot: {}, user: {} };
            // Save the updated data to storage
            this.storageService.save(this.data);
        }
    }
    loadOutfitData() {
        const data = this.load();
        return {
            botInstances: (data === null || data === void 0 ? void 0 : data.botInstances) || {},
            userInstances: (data === null || data === void 0 ? void 0 : data.userInstances) || {},
            presets: (data === null || data === void 0 ? void 0 : data.presets) || { bot: {}, user: {} },
            messageInstanceMap: (data === null || data === void 0 ? void 0 : data.messageInstanceMap) || {},
        };
    }
    saveSettings(settings) {
        this.save({ settings });
    }
    loadSettings() {
        const data = this.load();
        return (data === null || data === void 0 ? void 0 : data.settings) || Object.assign({}, DEFAULT_SETTINGS);
    }
    flush() {
        // No flush operation needed as the save function doesn't support it
        // If needed, this could trigger a save operation
        if (this.data) {
            this.storageService.save(this.data);
        }
    }
}
export { DataManager };
