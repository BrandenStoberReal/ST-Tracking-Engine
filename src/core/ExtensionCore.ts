import { updateForCurrentCharacter } from '../services/CharacterService';
import { generateOutfitFromLLM, importOutfitFromCharacterCard } from '../services/LLMService';
import { customMacroSystem } from '../services/CustomMacroService';
import { extension_api } from '../common/shared';
import { outfitStore } from '../common/Store';
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager';
import { BotOutfitPanel } from '../panels/BotOutfitPanel';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager';
import { UserOutfitPanel } from '../panels/UserOutfitPanel';
import { DebugPanel } from '../panels/DebugPanel';
import { setupEventListeners } from '../services/EventService';
import {
    AutoOutfitSystemAPI,
    AutoOutfitSystemConstructor,
    ChatMessage,
    EventService,
    OutfitManager,
    OutfitPanelAPI,
    STContext,
} from '../types';
import { createSettingsUI } from '../settings/SettingsUI';
import { initSettings } from '../settings/settings';
import { ACCESSORY_SLOTS, ALL_SLOTS, CLOTHING_SLOTS } from '../config/constants';
import { StorageService } from '../services/StorageService';
import { DataManager } from '../managers/DataManager';
import { OutfitDataService } from '../services/OutfitDataService';
import { macroProcessor } from '../processors/MacroProcessor';
import { debugLog } from '../logging/DebugLogger';

let AutoOutfitSystem: AutoOutfitSystemConstructor;

/**
 * Loads the AutoOutfitSystem module dynamically.
 * This function attempts to import the AutoOutfitSystem module and assigns it to the AutoOutfitSystem variable.
 * If loading fails, it creates a dummy class to prevent errors.
 * @returns {Promise<void>} A promise that resolves when the module is loaded
 */
async function loadAutoOutfitSystem(): Promise<void> {
    try {
        debugLog('Attempting to load AutoOutfitSystem module', null, 'debug', 'ExtensionCore');
        const autoOutfitModule = await import('../services/AutoOutfitService');

        AutoOutfitSystem = autoOutfitModule.AutoOutfitService;
        debugLog('AutoOutfitSystem module loaded successfully', null, 'info', 'ExtensionCore');
    } catch (error) {
        debugLog('Failed to load AutoOutfitSystem:', error, 'error', 'ExtensionCore');
        debugLog('Failed to load AutoOutfitSystem, using dummy class', error, 'error', 'ExtensionCore');
        AutoOutfitSystem = class DummyAutoOutfitSystem implements AutoOutfitSystemAPI {
            isEnabled = false;
            systemPrompt = '';
            enable(): string {
                return 'Dummy auto outfit system - not available';
            }
            disable(): string {
                return 'Dummy auto outfit system - not available';
            }
            setPrompt(): void {}
            getPrompt(): string {
                return '';
            }
            setConnectionProfile(): void {}
            getConnectionProfile(): string | null {
                return null;
            }
            getStatus() {
                return {
                    enabled: false,
                    hasPrompt: false,
                    promptLength: 0,
                    isProcessing: false,
                    consecutiveFailures: 0,
                    currentRetryCount: 0,
                    maxRetries: 0,
                };
            }
            resetToDefaultPrompt(): void {}
            manualTrigger(): Promise<string> {
                return Promise.resolve('Dummy auto outfit system - not available');
            }
            markAppInitialized(): void {}
        };
    }
}

/**
 * Checks if a user agent string contains mobile device indicators.
 * This helper function is used to determine if the current device is a mobile device.
 * @param {string} userAgent - The user agent string to check
 * @returns {boolean} True if the user agent indicates a mobile device, false otherwise
 */
function isMobileUserAgent(userAgent: string): boolean {
    const mobileIndicators = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'iemobile', 'opera mini'];

    const lowerUserAgent = userAgent.toLowerCase();

    for (let i = 0; i < mobileIndicators.length; i++) {
        if (lowerUserAgent.includes(mobileIndicators[i])) {
            return true;
        }
    }

    return false;
}

/**
 * Sets up the global API for the outfit extension.
 * This function registers the panel and system references in the global API,
 * and registers character-specific macros when the system initializes.
 * @param botManager - The bot outfit manager instance
 * @param userManager - The user outfit manager instance
 * @param botPanel - The bot outfit panel instance
 * @param userPanel - The user outfit panel instance
 * @param autoOutfitSystem - The auto outfit system instance
 * @param outfitDataService - The outfit data service instance
 * @param storageService - The storage service instance
 * @param dataManager - The data manager instance
 * @param eventService - The event service instance
 * @returns {void}
 */
function setupApi(
    botManager: OutfitManager,
    userManager: OutfitManager,
    botPanel: OutfitPanelAPI,
    userPanel: OutfitPanelAPI,
    autoOutfitSystem: AutoOutfitSystemAPI,
    outfitDataService: OutfitDataService,
    storageService?: StorageService,
    dataManager?: DataManager,
    eventService?: EventService
): void {
    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;
    extension_api.wipeAllOutfits = async () => {
        await outfitDataService.wipeAllOutfits();
    };
    window.wipeAllOutfits = async () => {
        await outfitDataService.wipeAllOutfits();
    }; // Make it directly accessible globally

    // Attach services to window for debug panel
    window.characterService = { updateForCurrentCharacter };
    window.llmService = { generateOutfitFromLLM, importOutfitFromCharacterCard };
    window.eventService = eventService as any;
    if (storageService) window.storageService = storageService as any;
    if (dataManager) window.dataManager = dataManager as any;
    window.outfitDataService = outfitDataService as any;
    window.macroProcessor = macroProcessor;

    extension_api.getOutfitExtensionStatus = () => ({
        core: true,
        autoOutfit: autoOutfitSystem?.getStatus?.() ?? false,
        botPanel: { isVisible: botPanel?.isVisible },
        userPanel: { isVisible: userPanel?.isVisible },
        events: true,
        managers: { bot: Boolean(botManager), user: Boolean(userManager) },
    });

    // Register character-specific macros and instance macros when the API is set up
    if (typeof window.SillyTavern?.getContext !== 'undefined') {
        const STContext = window.SillyTavern.getContext();

        if (STContext) {
            // Macro registration is handled by EventService.handleAppReady() when the app is fully ready
        }
    }

    // Also register a global function that can refresh macros when needed
    window.refreshOutfitMacros = function () {
        const STContext = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext();

        if (STContext) {
            // Character-specific macros removed - only universal macros (char_*, user_*) are used
            debugLog('Macros refreshed manually', null, 'info', 'ExtensionCore');
        }
    };

    // Create and set up the debug panel
    const debugPanel = new DebugPanel();

    window.outfitDebugPanel = debugPanel;
    extension_api.debugPanel = debugPanel;

    (globalThis as any).outfitTracker = extension_api;
}

/**
 * Updates the styles of the outfit panels.
 * This function applies color settings to both bot and user outfit panels.
 * @returns {void}
 */
function updatePanelStyles(): void {
    if (window.botOutfitPanel?.applyPanelColors) {
        window.botOutfitPanel.applyPanelColors();
    }
    if (window.userOutfitPanel?.applyPanelColors) {
        window.userOutfitPanel.applyPanelColors();
    }
}

/**
 * Checks if the current device is a mobile device.
 * This function combines user agent checks, screen size, and touch capabilities to determine
 * if the current device should be treated as mobile.
 * @returns {boolean} True if the device is a mobile device, false otherwise
 */
function isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();

    return (
        isMobileUserAgent(userAgent) ||
        window.innerWidth <= 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 1
    );
}

/**
 * The interceptor function to inject outfit information into the conversation context.
 * This function is called by SillyTavern during generation to inject outfit information
 * into the AI's context, making it aware of the current character and user outfits.
 * @param chat - The chat array that will be passed to the AI
 * @returns {Promise<void>} A promise that resolves when the injection is complete
 */
window.outfitTrackerInterceptor = async function (chat: ChatMessage[]): Promise<void> {
    try {
        // Create a temporary reference to the managers using the panel references
        const botPanel = window.botOutfitPanel;
        const userPanel = window.userOutfitPanel;

        if (!botPanel || !userPanel) {
            // If panels aren't available yet, store the reference and try later
            debugLog(
                'Panels not available for interceptor, deferring injection',
                {
                    botPanel: Boolean(botPanel),
                    userPanel: Boolean(userPanel),
                },
                'warn'
            );
            return;
        }

        const botManager = botPanel.outfitManager;
        const userManager = userPanel.outfitManager;

        if (!botManager || !userManager) {
            debugLog(
                'Managers not available for interceptor',
                {
                    botManager: Boolean(botManager),
                    userManager: Boolean(userManager),
                },
                'warn'
            );
            return;
        }

        // If both bot and user have prompt injection disabled, skip entirely
        if (!botManager.getPromptInjectionEnabled() && !userManager.getPromptInjectionEnabled()) {
            debugLog('Prompt injection is disabled for both bot and user', null, 'info', 'ExtensionCore');
            return;
        }

        // Check if prompt injection is disabled for this bot instance
        if (!botManager.getPromptInjectionEnabled()) {
            debugLog('Prompt injection is disabled for this bot instance', null, 'info', 'ExtensionCore');
        }

        // Generate outfit information string using the custom macro system
        const outfitInfoString = customMacroSystem.generateOutfitInfoString(botManager, userManager);

        // Only inject if there's actual outfit information to add
        if (outfitInfoString && outfitInfoString.trim()) {
            // Create a new message object for the outfit information
            const outfitInjection = {
                is_user: false,
                is_system: true,
                name: 'Outfit Info',
                send_date: new Date().toISOString(),
                mes: outfitInfoString,
                extra: { outfit_injection: true },
            };

            debugLog('Injecting outfit information into chat', { outfitInfoString }, 'info', 'ExtensionCore');

            // Insert the outfit information before the last message in the chat
            // This ensures it's included in the context without disrupting the conversation flow
            chat.splice(chat.length - 1, 0, outfitInjection);
        } else {
            debugLog('No outfit information to inject', null, 'debug', 'ExtensionCore');
        }
    } catch (error) {
        debugLog('Error in interceptor:', error, 'error', 'ExtensionCore');
        debugLog('Error in interceptor', error, 'error', 'ExtensionCore');
    }
};

/**
 * Initializes the outfit extension.
 * This is the main initialization function that loads all components of the system,
 * including managers, panels, settings, and event listeners.
 * @returns {Promise<void>} A promise that resolves when the extension is fully initialized
 * @throws {Error} If SillyTavern context is not available
 */
export async function initializeExtension(): Promise<void> {
    await loadAutoOutfitSystem();
    debugLog('Starting extension initialization', null, 'info', 'ExtensionCore');

    const stContext: STContext | null = window.SillyTavern?.getContext?.() || window.getContext?.();

    if (!stContext) {
        debugLog('Required SillyTavern context is not available.', null, 'error', 'ExtensionCore');
        throw new Error('Missing required SillyTavern globals.');
    }

    const storageService = new StorageService(
        (data: unknown) => {
            if (stContext.extensionSettings) {
                stContext.extensionSettings.outfit_tracker = data as any;
                stContext.saveSettingsDebounced?.();
            }
        },
        () => stContext.extensionSettings?.outfit_tracker
    );

    const dataManager = new DataManager(storageService);

    await dataManager.initialize();
    outfitStore.setDataManager(dataManager);

    // Load the stored state into the outfit store after initialization
    outfitStore.loadState();
    debugLog('Data manager and outfit store initialized', null, 'info', 'ExtensionCore');

    const outfitDataService = new OutfitDataService(dataManager);

    const settings = dataManager.loadSettings();

    debugLog('Settings loaded', settings, 'info', 'ExtensionCore');

    const botManager = new NewBotOutfitManager(ALL_SLOTS);
    const userManager = new NewUserOutfitManager(ALL_SLOTS);

    debugLog('Outfit managers created', { botManager, userManager }, 'info', 'ExtensionCore');

    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS);
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS);

    debugLog('Outfit panels created', { botPanel, userPanel }, 'info', 'ExtensionCore');

    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    debugLog('Auto outfit system created', { autoOutfitSystem }, 'info', 'ExtensionCore');

    // Set global references for the interceptor function to access
    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;

    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);
    debugLog('Global references set', null, 'info', 'ExtensionCore');

    const eventService = setupEventListeners({
        botManager,
        userManager,
        botPanel,
        userPanel,
        autoOutfitSystem,
        updateForCurrentCharacter: () => updateForCurrentCharacter(botManager, userManager, botPanel, userPanel),
        processMacrosInFirstMessage: () => macroProcessor.processMacrosInFirstMessage(stContext),
        context: stContext,
    });

    setupApi(
        botManager,
        userManager,
        botPanel,
        userPanel,
        autoOutfitSystem,
        outfitDataService,
        storageService,
        dataManager,
        eventService
    );
    initSettings(autoOutfitSystem, AutoOutfitSystem, stContext);
    customMacroSystem.registerMacros(stContext);
    createSettingsUI(AutoOutfitSystem, autoOutfitSystem, stContext);
    debugLog('Extension components initialized', null, 'info', 'ExtensionCore');

    debugLog('Event listeners set up', null, 'info', 'ExtensionCore');

    updatePanelStyles();
    debugLog('Panel styles updated', null, 'info', 'ExtensionCore');

    if (settings.autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }
    if (settings.autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }
    setTimeout(updatePanelStyles, 1500);

    debugLog('Extension initialization completed', null, 'info', 'ExtensionCore');
}
