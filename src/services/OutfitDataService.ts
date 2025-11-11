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
                    debugLog(`[OutfitTracker] Removed ${outfitVars.length} outfit-related global variables`);
                }
            }
        } catch (error) {
            debugLog('[OutfitTracker] Error clearing global outfit variables:', error, 'error');
        }
    }

    async wipeAllOutfits(): Promise<string> {
        debugLog('[OutfitDataService] Starting wipeAllOutfits process');

        try {
            // Log initial state before wiping
            const initialStoreState = outfitStore.getState();
            debugLog('[OutfitDataService] Initial store state:', {
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
            });

            const initialDataManagerState = this.dataManager.load();
            debugLog('[OutfitDataService] Initial data manager state:', {
                botInstancesCount: initialDataManagerState?.botInstances
                    ? Object.keys(initialDataManagerState.botInstances).length
                    : 0,
                userInstancesCount: initialDataManagerState?.userInstances
                    ? Object.keys(initialDataManagerState.userInstances).length
                    : 0,
                presetsCount: initialDataManagerState?.presets
                    ? Object.keys(initialDataManagerState.presets).length
                    : 0,
            });

            // Clear the store in memory first
            debugLog('[OutfitDataService] Clearing store in memory');
            outfitStore.wipeAllOutfitData();

            // Verify the store has been cleared
            const storeAfterWipe = outfitStore.getState();
            debugLog('[OutfitDataService] Store state after wiping in memory:', {
                botInstancesCount: Object.keys(storeAfterWipe.botInstances).length,
                userInstancesCount: Object.keys(storeAfterWipe.userInstances).length,
                botPresetsCount: Object.keys(storeAfterWipe.presets.bot).length,
                userPresetsCount: Object.keys(storeAfterWipe.presets.user).length,
            });

            // Update the data manager with wiped data using the direct wipe method
            debugLog('[OutfitDataService] Saving wiped data to data manager using direct wipe method');
            this.dataManager.saveWipedOutfitData();

            // Update settings too
            this.dataManager.saveSettings(outfitStore.getState().settings);

            // Check data manager state after the direct save operation
            const dataManagerAfterDirectSave = this.dataManager.load();
            debugLog('[OutfitDataService] Data manager state after direct saveOutfitData:', {
                botInstancesCount: dataManagerAfterDirectSave?.botInstances
                    ? Object.keys(dataManagerAfterDirectSave.botInstances).length
                    : 0,
                userInstancesCount: dataManagerAfterDirectSave?.userInstances
                    ? Object.keys(dataManagerAfterDirectSave.userInstances).length
                    : 0,
                presetsCount: dataManagerAfterDirectSave?.presets
                    ? Object.keys(dataManagerAfterDirectSave.presets).length
                    : 0,
            });

            // Now sync the store with the wiped data in the data manager
            debugLog('[OutfitDataService] Loading wiped data from data manager to store');
            outfitStore.loadState(); // This should load the wiped data from the data manager to the store

            // Verify the store now has the wiped data
            const storeAfterLoadState = outfitStore.getState();
            debugLog('[OutfitDataService] Store state after loading from data manager:', {
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
            });

            // IMPORTANT: Access the SillyTavern context directly to ensure immediate save with empty data
            const STContext = window.SillyTavern?.getContext?.() || window.getContext?.();

            if (STContext) {
                debugLog('[OutfitDataService] Using direct SillyTavern save to ensure immediate persistence');

                // Create a complete outfit tracker object with empty data in the format expected by SillyTavern
                const emptyOutfitTrackerData = {
                    instances: {},
                    user_instances: {},
                    presets: {},
                    settings: outfitStore.getState().settings || {},
                    version: '1.0.0',
                    variables: {},
                };

                debugLog('[OutfitDataService] Attempting immediate save with completely empty data:', {
                    instancesCount: Object.keys(emptyOutfitTrackerData.instances).length,
                    userInstancesCount: Object.keys(emptyOutfitTrackerData.user_instances).length,
                    presetsCount: Object.keys(emptyOutfitTrackerData.presets).length,
                });

                // Try to save the data using the proper SillyTavern extension settings API
                if (STContext.extensionSettings) {
                    debugLog('[OutfitDataService] Saving to extensionSettings');
                    STContext.extensionSettings.outfit_tracker = emptyOutfitTrackerData;
                    if (typeof STContext.saveSettingsDebounced === 'function') {
                        STContext.saveSettingsDebounced();
                    } else if (typeof STContext.saveSettings === 'function') {
                        STContext.saveSettings();
                    }
                } else {
                    debugLog('[OutfitDataService] extensionSettings not available, using fallback', null, 'error');
                    // Fallback: try to use the direct storage service save
                    if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                        debugLog('[OutfitDataService] Using fallback direct save');
                        this.dataManager.storageService.saveFn(emptyOutfitTrackerData);
                    }
                }

                // Force a short delay to ensure the save operation completes
                await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
                debugLog('[OutfitDataService] Could not access SillyTavern context for immediate save', null, 'error');

                // Fallback: try to use the direct storage service save (original approach)
                if (this.dataManager.storageService && this.dataManager.storageService.saveFn) {
                    debugLog('[OutfitDataService] Using fallback direct save');

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
            debugLog('[OutfitDataService] Loading wiped data from data manager to store after save');
            outfitStore.loadState(); // This ensures the store reflects the saved wiped state

            // Update the UI to reflect the cleared state
            if (window.botOutfitPanel) {
                window.botOutfitPanel.renderContent(); // Refresh bot panel to show cleared state
            }

            if (window.userOutfitPanel) {
                window.userOutfitPanel.renderContent(); // Refresh user panel to show cleared state
            }

            debugLog('[OutfitTracker] All outfit data wiped successfully');
            return '[Outfit System] All outfit data has been wiped.';
        } catch (error) {
            debugLog('[OutfitTracker] Error wiping outfit data:', error, 'error');
            throw error;
        }
    }
}

export { OutfitDataService };
