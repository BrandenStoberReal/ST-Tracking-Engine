var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { updateForCurrentCharacter } from '../services/CharacterService.js';
import { customMacroSystem } from '../services/CustomMacroService.js';
import { extension_api } from '../common/shared.js';
import { outfitStore } from '../common/Store.js';
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager.js';
import { BotOutfitPanel } from '../panels/BotOutfitPanel.js';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager.js';
import { UserOutfitPanel } from '../panels/UserOutfitPanel.js';
import { DebugPanel } from '../panels/DebugPanel.js';
import { setupEventListeners } from '../services/EventService.js';
import { registerOutfitCommands } from '../commands/OutfitCommands.js';
import { createSettingsUI } from '../settings/SettingsUI.js';
import { initSettings } from '../settings/settings.js';
import { ACCESSORY_SLOTS, ALL_SLOTS, CLOTHING_SLOTS } from '../config/constants.js';
import { StorageService } from '../services/StorageService.js';
import { DataManager } from '../managers/DataManager.js';
import { OutfitDataService } from '../services/OutfitDataService.js';
import { macroProcessor } from '../processors/MacroProcessor.js';
import { debugLog } from '../logging/DebugLogger.js';
let AutoOutfitSystem;
function loadAutoOutfitSystem() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const autoOutfitModule = yield import('../services/AutoOutfitService.js');
            AutoOutfitSystem = autoOutfitModule.AutoOutfitService;
        }
        catch (error) {
            debugLog('Failed to load AutoOutfitSystem, using dummy class', error, 'error');
            AutoOutfitSystem = class DummyAutoOutfitSystem {
            };
        }
    });
}
function setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService) {
    extension_api.botOutfitPanel = botPanel;
    extension_api.userOutfitPanel = userPanel;
    extension_api.autoOutfitSystem = autoOutfitSystem;
    extension_api.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();
    window.wipeAllOutfits = () => outfitDataService.wipeAllOutfits();
    extension_api.getOutfitExtensionStatus = () => {
        var _a, _b;
        return ({
            core: true,
            autoOutfit: (_b = (_a = autoOutfitSystem === null || autoOutfitSystem === void 0 ? void 0 : autoOutfitSystem.getStatus) === null || _a === void 0 ? void 0 : _a.call(autoOutfitSystem)) !== null && _b !== void 0 ? _b : false,
            botPanel: { isVisible: botPanel === null || botPanel === void 0 ? void 0 : botPanel.isVisible },
            userPanel: { isVisible: userPanel === null || userPanel === void 0 ? void 0 : userPanel.isVisible },
        });
    };
    const debugPanel = new DebugPanel();
    window.outfitDebugPanel = debugPanel;
    extension_api.debugPanel = debugPanel;
    globalThis.outfitTracker = extension_api;
}
function updatePanelStyles() {
    var _a, _b;
    (_a = window.botOutfitPanel) === null || _a === void 0 ? void 0 : _a.applyPanelColors();
    (_b = window.userOutfitPanel) === null || _b === void 0 ? void 0 : _b.applyPanelColors();
}
function isMobileDevice() {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()) || window.innerWidth <= 768;
}
globalThis.outfitTrackerInterceptor = function (chat) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const botPanel = window.botOutfitPanel;
            const userPanel = window.userOutfitPanel;
            if (!botPanel || !userPanel)
                return;
            const botManager = botPanel.outfitManager;
            const userManager = userPanel.outfitManager;
            if (!botManager || !userManager)
                return;
            if (!botManager.getPromptInjectionEnabled() && !userManager.getPromptInjectionEnabled())
                return;
            const outfitInfoString = customMacroSystem.generateOutfitInfoString(botManager, userManager);
            if (outfitInfoString && outfitInfoString.trim()) {
                chat.splice(chat.length - 1, 0, {
                    is_user: false,
                    is_system: true,
                    name: 'Outfit Info',
                    send_date: new Date().toISOString(),
                    mes: outfitInfoString,
                    extra: { outfit_injection: true }
                });
            }
        }
        catch (error) {
            debugLog('Error in interceptor', error, 'error');
        }
    });
};
export function initializeExtension() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        yield loadAutoOutfitSystem();
        const STContext = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
        if (!STContext) {
            throw new Error('Missing required SillyTavern globals.');
        }
        const storageService = new StorageService((data) => STContext.saveSettingsDebounced({ outfit_tracker: data }), () => STContext.extensionSettings.outfit_tracker);
        const dataManager = new DataManager(storageService);
        yield dataManager.initialize();
        outfitStore.setDataManager(dataManager);
        outfitStore.loadState();
        const outfitDataService = new OutfitDataService(dataManager);
        const settings = dataManager.loadSettings();
        const botManager = new NewBotOutfitManager(ALL_SLOTS);
        const userManager = new NewUserOutfitManager(ALL_SLOTS);
        const botPanel = new BotOutfitPanel(botManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({ outfit_tracker: data }));
        const userPanel = new UserOutfitPanel(userManager, CLOTHING_SLOTS, ACCESSORY_SLOTS, (data) => STContext.saveSettingsDebounced({ outfit_tracker: data }));
        const autoOutfitSystem = new AutoOutfitSystem(botManager);
        window.botOutfitPanel = botPanel;
        window.userOutfitPanel = userPanel;
        outfitStore.setPanelRef('bot', botPanel);
        outfitStore.setPanelRef('user', userPanel);
        outfitStore.setAutoOutfitSystem(autoOutfitSystem);
        setupApi(botManager, userManager, botPanel, userPanel, autoOutfitSystem, outfitDataService);
        initSettings(autoOutfitSystem, AutoOutfitSystem, STContext);
        yield registerOutfitCommands(botManager, userManager, autoOutfitSystem);
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
    });
}
