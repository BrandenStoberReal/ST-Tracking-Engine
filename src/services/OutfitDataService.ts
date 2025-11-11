import { ALL_SLOTS } from '../config/constants';
import { DataManager } from '../managers/DataManager';
import { outfitStore } from '../common/Store';
import { debugLog } from '../logging/DebugLogger';
import { FullOutfitData } from '../types';

class OutfitDataService {
    dataManager: DataManager;

    constructor(dataManager: DataManager) {
        this.dataManager = dataManager;
    }

    clearGlobalOutfitVariables(): void {
        try {
            const extensionSettings = this.dataManager.load() as FullOutfitData | null;

            if (extensionSettings?.variables && typeof extensionSettings.variables === 'object') {
                const variables = extensionSettings.variables as Record<string, unknown>;
                if (variables.global && typeof variables.global === 'object') {
                    const globalVars = variables.global as Record<string, unknown>;
                    const outfitVars = Object.keys(globalVars).filter((key) =>
                        ALL_SLOTS.some((slot) => key.endsWith(`_${slot}`))
                    );

                    outfitVars.forEach((key) => {
                        delete globalVars[key];
                    });

                    this.dataManager.save({ variables: { global: globalVars } });
                    debugLog(`Removed ${outfitVars.length} outfit-related global variables`, 'OutfitDataService');
                }
            }
        } catch (error) {
            debugLog('Error clearing global outfit variables:', error, 'error', 'OutfitDataService');
        }
    }

    async wipeAllOutfits(): Promise<string> {
        debugLog('Starting wipeAllOutfits process', 'OutfitDataService');

        try {
            // Log initial state before wiping
            const initialStoreState = outfitStore.getState();
            debugLog(
                'Initial store state:',
                {
                    botInstancesCount: initialStoreState.botInstances
                        ? Object.keys(initialStoreState.botInstances).length
                        : 0,
                    userInstancesCount: initialStoreState.userInstances
                        ? Object.keys(initialStoreState.userInstances).length
                        : 0,
                    botPresetsCount:
                        initialStoreState.presets && initialStoreState.presets.bot
                            ? Object.keys(initialStoreState.presets.bot).length
                            : 0,
                    userPresetsCount:
                        initialStoreState.presets && initialStoreState.presets.user
                            ? Object.keys(initialStoreState.presets.user).length
                            : 0,
                },
                'log',
                'OutfitDataService'
            );

            const initialDataManagerState = this.dataManager.load();
            debugLog(
                'Initial data manager state:',
                {
                    botInstancesCount: initialDataManagerState?.botInstances
                        ? Object.keys(initialDataManagerState.botInstances).length
                        : 0,
                    userInstancesCount: initialDataManagerState?.userInstances
                        ? Object.keys(initialDataManagerState.userInstances).length
                        : 0,
                    presetsCount: initialDataManagerState?.presets
                        ? Object.keys(initialDataManagerState.presets).length
                        : 0,
                },
                'log',
                'OutfitDataService'
            );

            // Clear the store in memory first
            debugLog('Clearing store in memory', 'OutfitDataService');
            outfitStore.wipeAllOutfitData();

            // Verify the store has been cleared
            const storeAfterWipe = outfitStore.getState();
            debugLog(
                'Store state after wiping in memory:',
                {
                    botInstancesCount: Object.keys(storeAfterWipe.botInstances).length,
                    userInstancesCount: Object.keys(storeAfterWipe.userInstances).length,
                    botPresetsCount: Object.keys(storeAfterWipe.presets.bot).length,
                    userPresetsCount: Object.keys(storeAfterWipe.presets.user).length,
                },
                'log',
                'OutfitDataService'
            );

            // Update the data manager with wiped data using the direct wipe method
            debugLog('Saving wiped data to data manager using direct wipe method', 'OutfitDataService');
            this.dataManager.saveWipedOutfitData();

            // Update settings too
            this.dataManager.saveSettings(outfitStore.getState().settings);

            // Check data manager state after the direct save operation
            const dataManagerAfterDirectSave = this.dataManager.load();
            debugLog(
                'Data manager state after direct saveOutfitData:',
                {
                    botInstancesCount: dataManagerAfterDirectSave?.botInstances
                        ? Object.keys(dataManagerAfterDirectSave.botInstances).length
                        : 0,
                    userInstancesCount: dataManagerAfterDirectSave?.userInstances
                        ? Object.keys(dataManagerAfterDirectSave.userInstances).length
                        : 0,
                    presetsCount: dataManagerAfterDirectSave?.presets
                        ? Object.keys(dataManagerAfterDirectSave.presets).length
                        : 0,
                },
                'log',
                'OutfitDataService'
            );

            // Now sync the store with the wiped data in the data manager
            debugLog('Loading wiped data from data manager to store', 'OutfitDataService');
            outfitStore.loadState(); // This should load the wiped data from the data manager to the store

            // Verify the store now has the wiped data
            const storeAfterLoadState = outfitStore.getState();
            debugLog(
                'Store state after loading from data manager:',
                {
                    botInstancesCount: storeAfterLoadState.botInstances
                        ? Object.keys(storeAfterLoadState.botInstances).length
                        : 0,
                    userInstancesCount: storeAfterLoadState.userInstances
                        ? Object.keys(storeAfterLoadState.userInstances).length
                        : 0,
                    botPresetsCount:
                        storeAfterLoadState.presets && storeAfterLoadState.presets.bot
                            ? Object.keys(storeAfterLoadState.presets.bot).length
                            : 0,
                    userPresetsCount:
                        storeAfterLoadState.presets && storeAfterLoadState.presets.user
                            ? Object.keys(storeAfterLoadState.presets.user).length
                            : 0,
                },
                'log',
                'OutfitDataService'
            );

            // IMPORTANT: Access the SillyTavern context directly to ensure immediate save with empty data
            const STContext = window.SillyTavern?.getContext?.() || window.getContext?.();

            if (STContext) {
                debugLog('Using direct SillyTavern save to ensure immediate persistence', 'OutfitDataService');

                // Create a complete outfit tracker object with empty data in the format expected by SillyTavern
                const emptyOutfitTrackerData = {
                    instances: {},
                    user_instances: {},
                    presets: {},
                    settings: outfitStore.getState().settings || {},
                    version: '1.0.0',
                    variables: {},
                };

                debugLog(
                    'Attempting immediate save with completely empty data:',
                    {
                        instancesCount: Object.keys(emptyOutfitTrackerData.instances).length,
                        userInstancesCount: Object.keys(emptyOutfitTrackerData.user_instances).length,
                        presetsCount: Object.keys(emptyOutfitTrackerData.presets).length,
                    },
                    'log',
                    'OutfitDataService'
                );

                // Try to save the data using the proper SillyTavern extension settings API
                if (STContext.extensionSettings) {
                    debugLog('Saving to extensionSettings', 'OutfitDataService');
                    STContext.extensionSettings.outfit_tracker = emptyOutfitTrackerData;
                    if (typeof STContext.saveSettingsDebounced === 'function') {
                        STContext.saveSettingsDebounced();
                    } else if (typeof STContext.saveSettings === 'function') {
                        STContext.saveSettings();
                    }
                } else {
                    debugLog('extensionSettings not available, using fallback', null, 'error', 'OutfitDataService');
                    // Fallback: try to use the direct storage service save
                    if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                        debugLog('Using fallback direct save', 'OutfitDataService');
                        this.dataManager.storageService.saveFn(emptyOutfitTrackerData);
                    }
                }

                // Force a short delay to ensure the save operation completes
                await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
                debugLog('Could not access SillyTavern context for immediate save', null, 'error', 'OutfitDataService');

                // Fallback: try to use the direct storage service save (original approach)
                if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                    debugLog('Using fallback direct save', 'OutfitDataService');

                    // Create empty data structure to save
                    const emptyData = {
                        instances: {},
                        user_instances: {},
                        presets: {},
                        settings: outfitStore.getState().settings,
                        version: '1.0.0',
                        variables: {},
                    };

                    // Call the save function directly
                    this.dataManager.storageService.saveFn(emptyData);
                }
            }

            this.clearGlobalOutfitVariables();

            // Reload the state after wipe to ensure the store is in sync with saved data
            debugLog('Loading wiped data from data manager to store after save', 'OutfitDataService');
            outfitStore.loadState(); // This ensures the store reflects the saved wiped state

            // Update the UI to reflect the cleared state
            if (window.botOutfitPanel) {
                window.botOutfitPanel.renderContent(); // Refresh bot panel to show cleared state
            }

            if (window.userOutfitPanel) {
                window.userOutfitPanel.renderContent(); // Refresh user panel to show cleared state
            }

            debugLog('All outfit data wiped successfully', 'OutfitDataService');
            return '[Outfit System] All outfit data has been wiped.';
        } catch (error) {
            debugLog('Error wiping outfit data:', error, 'error', 'OutfitDataService');
            throw error;
        }
    }
}

export { OutfitDataService };
