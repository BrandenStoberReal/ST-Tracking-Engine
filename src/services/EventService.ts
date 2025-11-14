import { EXTENSION_EVENTS, extensionEventBus } from '../core/events';
import { ALL_SLOTS } from '../config/constants';
import { customMacroSystem } from './CustomMacroService';
import { outfitStore } from '../common/Store';
import { generateMessageHash } from '../utils/utilities';
import { NewBotOutfitManager } from '../managers/NewBotOutfitManager';
import { NewUserOutfitManager } from '../managers/NewUserOutfitManager';
import { AutoOutfitSystemAPI, ChatMessage, EventCallback, OutfitPanelAPI, STContext } from '../types';
import { debugLog } from '../logging/DebugLogger';

declare const toastr: any;

interface EventServiceContext {
    botManager: NewBotOutfitManager;
    userManager: NewUserOutfitManager;
    botPanel: OutfitPanelAPI;
    userPanel: OutfitPanelAPI;
    autoOutfitSystem: AutoOutfitSystemAPI;
    updateForCurrentCharacter: () => void;
    processMacrosInFirstMessage: (context?: STContext) => Promise<void>;
    context?: STContext;
}

class EventService {
    botManager: NewBotOutfitManager;
    userManager: NewUserOutfitManager;
    botPanel: OutfitPanelAPI;
    userPanel: OutfitPanelAPI;
    autoOutfitSystem: AutoOutfitSystemAPI;
    updateForCurrentCharacter: () => void;
    processMacrosInFirstMessage: (context?: STContext) => Promise<void>;
    context: STContext | null;
    currentFirstMessageHash: string | null;
    isNewChat: boolean;

    constructor(context: EventServiceContext) {
        this.botManager = context.botManager;
        this.userManager = context.userManager;
        this.botPanel = context.botPanel;
        this.userPanel = context.userPanel;
        this.autoOutfitSystem = context.autoOutfitSystem;
        this.updateForCurrentCharacter = context.updateForCurrentCharacter;
        this.processMacrosInFirstMessage = context.processMacrosInFirstMessage;
        this.context = context.context || null;
        this.currentFirstMessageHash = null;
        this.isNewChat = false;
        this.initialize();
    }

    initialize(): void {
        this.context =
            this.context ||
            (window.SillyTavern?.getContext ? window.SillyTavern.getContext() : window.getContext()) ||
            null;

        if (!this.context || !this.context.eventSource || !this.context.event_types) {
            debugLog(
                '[OutfitTracker] Context not fully available for event listeners yet, trying again later',
                null,
                'warn'
            );
            setTimeout(() => this.initialize(), 1000);
            return;
        }

        this.setupSillyTavernEventListeners();
        this.setupExtensionEventListeners();

        this.updateForCurrentCharacter();
    }

    setupSillyTavernEventListeners(): void {
        if (!this.context) {
            debugLog('Context is null, cannot setup event listeners', null, 'warn', 'EventService');
            return;
        }
        const { eventSource, event_types } = this.context as any;

        eventSource.on(event_types.APP_READY, () => this.handleAppReady());
        eventSource.on(event_types.CHAT_CREATED, () => {
            this.isNewChat = true;
            this.handleChatReset();
        });
        eventSource.on(event_types.CHAT_CHANGED, () => this.handleChatChange());
        eventSource.on(event_types.MESSAGE_RECEIVED, (data: any) => this.handleMessageReceived(data));
        eventSource.on(event_types.MESSAGE_SWIPED, (index: number) => this.handleMessageSwiped(index));
    }

    setupExtensionEventListeners(): void {
        extensionEventBus.on(EXTENSION_EVENTS.OUTFIT_DATA_LOADED, () => this.handleOutfitDataLoaded());
        extensionEventBus.on(EXTENSION_EVENTS.PANEL_VISIBILITY_CHANGED, (data: any) =>
            this.handlePanelVisibilityChanged(data)
        );
        extensionEventBus.on(EXTENSION_EVENTS.OUTFIT_CHANGED, (data: any) => this.handleOutfitChanged(data));
        extensionEventBus.on(EXTENSION_EVENTS.INSTANCE_CREATED, (data: any) => this.handleInstanceCreated(data));
    }

    async handleChatReset(): Promise<void> {
        debugLog('Chat has been reset, applying default outfits.', null, 'info', 'EventService');

        // Wait a small delay to ensure context is established before loading default outfits
        await new Promise((resolve) => setTimeout(resolve, 100));

        const botOutfitInstanceId = this.botManager.getOutfitInstanceId();
        const userOutfitInstanceId = this.userManager.getOutfitInstanceId();

        // Clear macro cache to ensure fresh data after reset
        import('../services/CustomMacroService').then(({ customMacroSystem }) => {
            customMacroSystem.clearCache();
        });

        if (botOutfitInstanceId && this.botManager.characterId) {
            // Load the default outfit for the bot
            await this.botManager.loadDefaultOutfit();

            // Force refresh the bot panel UI
            if ((window as any).botOutfitPanel && typeof (window as any).botOutfitPanel.renderContent === 'function') {
                (window as any).botOutfitPanel.renderContent();
            }
        }

        if (userOutfitInstanceId) {
            // Load the default outfit for the user
            await this.userManager.loadDefaultOutfit();

            // Force refresh the user panel UI
            if (
                (window as any).userOutfitPanel &&
                typeof (window as any).userOutfitPanel.renderContent === 'function'
            ) {
                (window as any).userOutfitPanel.renderContent();
            }
        }
    }

    handleAppReady(): void {
        debugLog('App ready, marking auto outfit system as initialized', null, 'info', 'EventService');
        if (this.autoOutfitSystem) {
            this.autoOutfitSystem.markAppInitialized();
        }
        this.updateForCurrentCharacter();
        customMacroSystem.clearCache();

        // Show toast notification when outfit system initializes on app startup
        if (typeof toastr !== 'undefined') {
            toastr.success('Outfit system initialized!', 'Outfit System');
        }
    }

    async handleChatChange(): Promise<void> {
        if (!this.context || !this.context.chat) {
            return;
        }

        if (this.context.chat.length > 0) {
            const firstBotMessage = this.context.chat.find((msg: ChatMessage) => !msg.is_user && !msg.is_system);

            if (firstBotMessage) {
                const firstMessageHash = this.generateMessageHash(firstBotMessage.mes);

                if (this.currentFirstMessageHash !== firstMessageHash) {
                    debugLog(
                        '[OutfitTracker] CHAT_CHANGED event fired and first message has changed - updating for new conversation context'
                    );
                    this.currentFirstMessageHash = firstMessageHash;
                    this.updateForCurrentCharacter();
                    customMacroSystem.clearCache();
                    // Note: Macro registration is handled by handleAppReady on startup and handleInstanceCreated for new instances
                } else {
                    debugLog(
                        'CHAT_CHANGED event fired but first message unchanged - skipping update',
                        null,
                        'info',
                        'EventService'
                    );
                }
            } else {
                this.currentFirstMessageHash = null;
                debugLog(
                    '[OutfitTracker] CHAT_CHANGED event fired with no first bot message - updating for character switch'
                );
                this.updateForCurrentCharacter();
                // Note: Macro registration is handled by handleAppReady on startup and handleInstanceCreated for new instances
            }

            // Pre-populate macro cache after all character updates are complete
            // Use a delay to ensure the system is fully ready
            setTimeout(() => {
                this._prepopulateMacroCache();
            }, 500);
        }
    }

    async handleMessageReceived(data: any): Promise<void> {
        if (!this.context) {
            return;
        }
        const chat = this.context.chat;
        if (!chat) return;
        const aiMessages = chat.filter((msg: ChatMessage) => !msg.is_user && !msg.is_system);

        if (aiMessages.length === 1 && !data.is_user) {
            debugLog('First AI message received, updating outfit instance.', null, 'info', 'EventService');
            const firstBotMessage = aiMessages[0];
            this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);

            const currentBotInstanceId = this.botManager.getOutfitInstanceId();
            const currentUserInstanceId = this.userManager.getOutfitInstanceId();

            if (currentBotInstanceId && this.botManager.characterId) {
                const botOutfitData = { ...this.botManager.getCurrentOutfit() };
                outfitStore.setBotOutfit(this.botManager.characterId, currentBotInstanceId, botOutfitData);
            }
            if (currentUserInstanceId) {
                const userOutfitData = { ...this.userManager.getCurrentOutfit() };
                outfitStore.setUserOutfit(currentUserInstanceId, userOutfitData);
            }

            await this.processMacrosInFirstMessage(this.context);
            await this.updateForCurrentCharacter();
        }
    }

    async handleMessageSwiped(index: number): Promise<void> {
        if (!this.context) {
            return;
        }
        debugLog(`MESSAGE_SWIPED event fired with index: ${index}`, null, 'info', 'EventService');
        const chat = this.context.chat;

        if (!chat || index < 0 || index >= chat.length) {
            return;
        }

        // Clear macro cache on any message swipe to prevent stale cached values
        customMacroSystem.clearCache();

        const aiMessages = chat.filter((msg: ChatMessage) => !msg.is_user && !msg.is_system);

        if (aiMessages.length > 0 && chat.indexOf(aiMessages[0]) === index) {
            debugLog('First message was swiped, updating outfit instance.', null, 'info', 'EventService');

            const firstBotMessage = aiMessages[0];
            if (firstBotMessage) {
                this.currentFirstMessageHash = this.generateMessageHash(firstBotMessage.mes);
            }

            const oldBotCharacterId = this.botManager.characterId;
            const oldBotInstanceId = this.botManager.getOutfitInstanceId();
            const oldUserInstanceId = this.userManager.getOutfitInstanceId();

            if (oldBotInstanceId && oldBotCharacterId) {
                const oldBotOutfitData = { ...this.botManager.getCurrentOutfit() };
                outfitStore.setBotOutfit(oldBotCharacterId, oldBotInstanceId, oldBotOutfitData);
            }
            if (oldUserInstanceId) {
                const oldUserOutfitData = { ...this.userManager.getCurrentOutfit() };
                outfitStore.setUserOutfit(oldUserInstanceId, oldUserOutfitData);
            }

            outfitStore.saveState();

            await this.processMacrosInFirstMessage(this.context);
            await this.updateForCurrentCharacter();

            // Trigger outfit data loaded event to refresh UI and macros
            extensionEventBus.emit(EXTENSION_EVENTS.OUTFIT_DATA_LOADED);
        }
    }

    handleContextUpdate(): void {
        this.updateForCurrentCharacter();
        customMacroSystem.clearCache();
        // Note: Macro registration is handled by handleAppReady on startup and handleInstanceCreated for new instances
    }

    handleOutfitDataLoaded(): void {
        debugLog('Outfit data loaded, refreshing macros and UI', null, 'info', 'EventService');

        // Clear macro cache to ensure fresh data
        customMacroSystem.clearCache();

        // Refresh the macro system to ensure it has the latest data
        // Character-specific macros removed - only universal macros are used

        // Refresh all outfit panels to show updated values
        if (window.botOutfitPanel && typeof window.botOutfitPanel.renderContent === 'function') {
            window.botOutfitPanel.renderContent();
        }
        if (window.userOutfitPanel && typeof window.userOutfitPanel.renderContent === 'function') {
            window.userOutfitPanel.renderContent();
        }

        // Try to force a UI refresh of the chat if possible
        // This is the most important part to address the original issue
        try {
            if (window.SillyTavern && typeof (window.SillyTavern as any).redrawCurrentChat === 'function') {
                (window.SillyTavern as any).redrawCurrentChat();
            } else if (typeof (window as any).redrawCurrentChat === 'function') {
                (window as any).redrawCurrentChat();
            } else {
                // Alternative: trigger a small change that might cause refresh
                // This might require accessing the chat container directly
                debugLog(
                    'Could not find redrawCurrentChat function, UI may need manual refresh',
                    null,
                    'info',
                    'EventService'
                );
            }
        } catch (error) {
            debugLog('Error trying to refresh UI:', error, 'error', 'EventService');
        }
    }

    handlePanelVisibilityChanged(data: any): void {
        if (data && data.panelType && typeof data.visible === 'boolean') {
            debugLog(
                `[OutfitTracker] Panel visibility changed: ${data.panelType} panel is now ${data.visible ? 'visible' : 'hidden'}`
            );
            outfitStore.setPanelVisibility(data.panelType, data.visible);
        }
    }

    handleOutfitChanged(data: any): void {
        if (!data) return;

        const { characterId, instanceId, outfitType, slotName } = data;

        debugLog(
            `[EventService] Outfit changed: ${outfitType} ${characterId || 'user'} instance ${instanceId} slot ${slotName}`,
            null,
            'debug'
        );

        // Instance macros no longer needed - direct store access is used instead
    }

    handleInstanceCreated(data: any): void {
        if (!data) return;

        const { instanceId, instanceType, characterId } = data;

        debugLog(
            `[EventService] Instance created: ${instanceType} ${characterId} instance ${instanceId}`,
            null,
            'debug'
        );

        // Instance macros are no longer registered - pointer macros access data directly from store
        // Show toast notification when new instance is created
        if (typeof (window as any).toastr !== 'undefined') {
            (window as any).toastr.success(`New ${instanceType} instance created!`, 'Outfit System');
        }
    }

    generateMessageHash(text: string): string {
        return generateMessageHash(text);
    }

    private _prepopulateMacroCache(): void {
        if (!window.customMacroSystem || !this.botManager?.characterId) {
            return;
        }

        try {
            // Pre-populate bot macros for the current character
            ALL_SLOTS.forEach((slot) => {
                // This will trigger the getCurrentSlotValue and populate the cache
                window.customMacroSystem.getCurrentSlotValue('char', slot);
            });

            // Pre-populate user macros
            ALL_SLOTS.forEach((slot) => {
                window.customMacroSystem.getCurrentSlotValue('user', slot);
            });

            debugLog('Pre-populated macro cache after character change', null, 'info', 'EventService');
        } catch (error) {
            debugLog('Error pre-populating macro cache:', error, 'error', 'EventService');
        }
    }

    // EventService interface implementation
    registerEvent(event: string, handler: EventCallback): void {
        extensionEventBus.on(event, handler);
    }

    unregisterEvent(event: string, handler: EventCallback): void {
        extensionEventBus.off(event, handler);
    }

    emitEvent(event: string, ...args: unknown[]): void {
        extensionEventBus.emit(event, ...args);
    }
}

export function setupEventListeners(context: EventServiceContext): EventService {
    return new EventService(context);
}
