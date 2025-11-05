import {BaseOutfitPanel} from './BaseOutfitPanel';
import {debugLog} from '../logging/DebugLogger';

declare const window: any;

export class UserOutfitPanel extends BaseOutfitPanel {
    constructor(outfitManager: any, clothingSlots: string[], accessorySlots: string[], saveSettingsDebounced: any) {
        super(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced, 'user-outfit-panel', 'user');
    }

    getPanelTitle(): string {
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        return `Your Outfit${hashDisplay}`;
    }

    renderFillOutfitButton(container: HTMLElement): void {
        const fillButton = document.createElement('button');
        fillButton.className = 'fill-outfit-btn';
        fillButton.textContent = 'Fill Outfit with LLM';
        fillButton.disabled = true; // Disabled for user panel
        fillButton.title = 'This feature is only available for bot outfits.';
        container.appendChild(fillButton);
    }

    setupDynamicRefresh(): void {
        super.setupDynamicRefresh();
        const context = window.SillyTavern?.getContext?.() || window.getContext?.();
        if (context?.eventSource && context.event_types) {
            const {eventSource, event_types} = context;
            const refresh = () => {
                if (this.isVisible) {
                    this.outfitManager.loadOutfit(this.outfitManager.getOutfitInstanceId());
                    this.updateHeader();
                    this.renderContent();
                }
            };
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CHANGED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.MESSAGE_RECEIVED, () => this.isVisible && this.renderContent()));
        }
    }

    private getFirstMessageText(): string {
        try {
            const context = window.SillyTavern?.getContext?.() || window.getContext?.();
            if (context?.chat) {
                const firstAiMessage = context.chat.find((msg: any) => !msg.is_user && !msg.is_system);
                return firstAiMessage?.mes || '';
            }
            return '';
        } catch (error) {
            debugLog('Could not get first message text for hash generation:', error, 'warn');
            return '';
        }
    }
}