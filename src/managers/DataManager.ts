import {deepMerge} from '../utils/utilities';
import {StorageService} from '../services/StorageService';

const DATA_VERSION = '1.0.0';

interface OutfitData {
    botInstances: any;
    userInstances: any;
    presets: any;
}

class DataManager {
    storageService: StorageService;
    version: string;
    data: any;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
        this.version = DATA_VERSION;
        this.data = null;
    }

    async initialize(): Promise<void> {
        this.data = await this.storageService.load();
        if (!this.data) {
            this.data = {};
        }
        this.migrateData();
    }

    migrateData(): void {
        if (!this.data.version || this.data.version < this.version) {
            console.log(`[DataManager] Migrating data from version ${this.data.version} to ${this.version}`);

            // Migration: Convert 'default' presets to settings-based default preset names
            if (this.data.presets) {
                const settings = this.data.settings || {};

                // Migrate bot presets
                if (this.data.presets.bot) {
                    for (const [key, presetGroup] of Object.entries(this.data.presets.bot as any)) {
                        if (presetGroup && (presetGroup as any)['default']) {
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
                    for (const [instanceId, presetGroup] of Object.entries(this.data.presets.user as any)) {
                        if (presetGroup && (presetGroup as any)['default']) {
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

    save(data: any): void {
        this.data = deepMerge(this.data, data);
        this.storageService.save(this.data);
    }

    load(): any {
        return this.data;
    }

    saveOutfitData(outfitData: OutfitData): void {
        this.save({
            instances: outfitData.botInstances || {},
            user_instances: outfitData.userInstances || {},
            presets: outfitData.presets || {},
        });
    }

    // Direct method to save wiped outfit data that bypasses deepMerge for complete wipe operations
    saveWipedOutfitData(): void {
        // Directly set the properties without using deepMerge
        this.data.instances = {};
        this.data.user_instances = {};
        this.data.presets = {};

        // Save the updated data to storage
        this.storageService.save(this.data);
    }

    loadOutfitData(): OutfitData {
        const data = this.load();

        return {
            botInstances: data.instances || {},
            userInstances: data.user_instances || {},
            presets: data.presets || {},
        };
    }

    saveSettings(settings: any): void {
        this.save({ settings });
    }

    loadSettings(): any {
        const data = this.load();

        return data.settings || {};
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
