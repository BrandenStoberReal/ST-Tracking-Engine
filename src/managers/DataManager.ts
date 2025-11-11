import { deepMerge } from '../utils/utilities';
import { StorageService } from '../services/StorageService';
import { DEFAULT_SETTINGS } from '../config/constants';
import { FullOutfitData, Settings } from '../types';
import { debugLog } from '../logging/DebugLogger';

const DATA_VERSION = '1.0.0';

class DataManager {
    storageService: StorageService;
    version: string;
    data: FullOutfitData | null;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }

    async initialize(): Promise<void> {
        this.data = (await this.storageService.load()) as FullOutfitData | null;
        if (!this.data) {
            this.data = {
                botInstances: {},
                userInstances: {},
                presets: { bot: {}, user: {} },
                settings: { ...DEFAULT_SETTINGS },
                version: DATA_VERSION,
            };
        }
        this.migrateData();
    }

    migrateData(): void {
        if (!this.data) return;

        if (!this.data.version || this.data.version < this.version) {
            debugLog(
                `Migrating data from version ${this.data.version} to ${this.version}`,
                null,
                'info',
                'DataManager'
            );

            // Migration: Convert 'default' presets to settings-based default preset names
            if (this.data.presets) {
                const settings = this.data.settings || { ...DEFAULT_SETTINGS };

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

    save(data: Partial<FullOutfitData>): void {
        if (this.data) {
            this.data = deepMerge(this.data, data);
            this.storageService.save(this.data);
        }
    }

    load(): FullOutfitData | null {
        return this.data || null;
    }

    saveOutfitData(outfitData: FullOutfitData): void {
        this.save({
            botInstances: outfitData.botInstances || {},
            userInstances: outfitData.userInstances || {},
            presets: outfitData.presets || {},
        });
    }

    // Direct method to save wiped outfit data that bypasses deepMerge for complete wipe operations
    saveWipedOutfitData(): void {
        if (this.data) {
            // Directly set the properties without using deepMerge
            this.data.botInstances = {};
            this.data.userInstances = {};
            this.data.presets = { bot: {}, user: {} };

            // Save the updated data to storage
            this.storageService.save(this.data);
        }
    }

    loadOutfitData(): FullOutfitData {
        const data = this.load();

        return {
            botInstances: data?.botInstances || {},
            userInstances: data?.userInstances || {},
            presets: data?.presets || { bot: {}, user: {} },
        };
    }

    saveSettings(settings: Settings): void {
        this.save({ settings });
    }

    loadSettings(): Settings {
        const data = this.load();

        return data?.settings || { ...DEFAULT_SETTINGS };
    }

    flush(): void {
        // No flush operation needed as the save function doesn't support it
        // If needed, this could trigger a save operation
        if (this.data) {
            this.storageService.save(this.data);
        }
    }
}

export { DataManager };
