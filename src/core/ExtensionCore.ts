import {updateForCurrentCharacter} from '../services/CharacterService';
import {customMacroSystem} from '../services/CustomMacroService';
import {extension_api} from '../common/shared';
import {outfitStore} from '../common/Store';
import {NewBotOutfitManager} from '../managers/NewBotOutfitManager';
import {BotOutfitPanel} from '../panels/BotOutfitPanel';
import {NewUserOutfitManager} from '../managers/NewUserOutfitManager';
import {UserOutfitPanel} from '../panels/UserOutfitPanel';
import {DebugPanel} from '../panels/DebugPanel';
import {setupEventListeners} from '../services/EventService';
import {registerOutfitCommands} from '../commands/OutfitCommands';
import {createSettingsUI} from '../settings/SettingsUI';
import {initSettings} from '../settings/settings';
import {ACCESSORY_SLOTS, ALL_SLOTS, CLOTHING_SLOTS} from '../config/constants';
import {StorageService} from '../services/StorageService';
import {DataManager} from '../managers/DataManager';
import {OutfitDataService} from '../services/OutfitDataService';
import {macroProcessor} from '../processors/MacroProcessor';
import {debugLog} from '../logging/DebugLogger';

declare const window: any;

let AutoOutfitSystem: any;

async function loadAutoOutfitSystem(): Promise<void> {
    try {
        const autoOutfitModule = await import('../services/AutoOutfitService');
        AutoOutfitSystem = autoOutfitModule.AutoOutfitService;
    } catch (error) {
        debugLog('Failed to load AutoOutfitSystem, using dummy class', error, 'error');
        AutoOutfitSystem = class DummyAutoOutfitSystem {
        };
    }
}

function setupApi(botManager: any, userManager: any, botPanel: any, userPanel: any, autoOutfitSystem: any, outfitDataService: any): void {
    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;
    extension_api.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();
    window.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();

    extension_api.getOutfitExtensionStatus = () => ({
        core: true,
        autoOutfit: autoOutfitSystem?.getStatus?.() ?? false,
        botPanel: {isVisible: botPanel?.isVisible},
        userPanel: {isVisible: userPanel?.isVisible},
    });

    const debugPanel = new DebugPanel();
    window.outfitDebugPanel = debugPanel;
    extension_api.debugPanel = debugPanel;
    (globalThis as any).outfitTracker = extension_api;
}

function updatePanelStyles(): void {
    window.botOutfitPanel?.applyPanelColors();
    window.userOutfitPanel?.applyPanelColors();
}

function isMobileDevice(): boolean {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) || window.innerWidth <= 768;
}

(globalThis as any).outfitTrackerInterceptor = async function (chat: any[]): Promise<void> {
    try {
        const botPanel = window.botOutfitPanel;
        const userPanel = window.userOutfitPanel;
        if (!botPanel || !userPanel) return;

        const botManager = botPanel.outfitManager;
        const userManager = userPanel.outfitManager;
        if (!botManager || !userManager) return;

        if (!botManager.getPromptInjectionEnabled() && !userManager.getPromptInjectionEnabled()) return;

        const outfitInfoString = customMacroSystem.generateOutfitInfoString(botManager, userManager);
        if (outfitInfoString && outfitInfoString.trim()) {
            chat.splice(chat.length - 1, 0, {
                is_user: false,
                is_system: true,
                name: 'Outfit Info',
                send_date: new Date().toISOString(),
                mes: outfitInfoString,
                extra: {outfit_injection: true}
            });
        }
    } catch (error) {
        debugLog('Error in interceptor', error, 'error');
    }
};

export async function initializeExtension(): Promise<void> {
    await loadAutoOutfitSystem();
    const STContext = window.SillyTavern?.getContext?.() || window.getContext?.();
    if (!STContext) {
        throw new Error('Missing required SillyTavern globals.');
    }

    const storageService = new StorageService(
        (data: any) => STContext.saveSettingsDebounced({outfit_tracker: data}),
        () => STContext.extensionSettings.outfit_tracker
    );

    const dataManager = new DataManager(storageService);
    await dataManager.initialize();
    outfitStore.setDataManager(dataManager);
    outfitStore.loadState();

    const outfitDataService = new OutfitDataService(dataManager);
    const settings = dataManager.loadSettings();

    const botManager = new NewBotOutfitManager(ALL_SLOTS);
    const userManager = new NewUserOutfitManager(ALL_SLOTS);

    const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data: any) => STContext.saveSettingsDebounced({outfit_tracker: data}));
    const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data: any) => STContext.saveSettingsDebounced({outfit_tracker: data}));

    const autoOutfitSystem = new AutoOutfitSystem(botManager);

    window.botOutfitPanel = botPanel;
    window.userOutfitPanel = userPanel;

    outfitStore.setPanelRef('bot', botPanel);
    outfitStore.setPanelRef('user', userPanel);
    outfitStore.setAutoOutfitSystem(autoOutfitSystem);

    setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService);
    initSettings(autoOutfitSystem, AutoOutfitSystem, STContext);
    await registerOutfitCommands(botManager, userManager, autoOutfitSystem);
    customMacroSystem.registerMacros(STContext);
    createSettingsUI(AutoOutfitSystem, autoOutfitSystem, STContext);

    setupEventListeners({
        botManager, userManager, botPanel, userPanel, autoOutfitSystem,
        updateForCurrentCharacter: () => updateForCurrentCharacter(botManager, userManager, botPanel, userPanel),
        processMacrosInFirstMessage: () => macroProcessor.processMacrosInFirstMessage(STContext),
        context: STContext
    });

    updatePanelStyles();

    if (settings.autoOpenBot && !isMobileDevice()) {
        setTimeout(() => botPanel.show(), 1000);
    }
    if (settings.autoOpenUser && !isMobileDevice()) {
        setTimeout(() => userPanel.show(), 1000);
    }
    setTimeout(updatePanelStyles, 1500);

    debugLog('Extension initialization completed', null, 'info');
}