import { BaseOutfitPanel } from './BaseOutfitPanel.js';
import { debugLog } from '../logging/DebugLogger.js';
export class UserOutfitPanel extends BaseOutfitPanel {
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced) {
        super(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced, 'user-outfit-panel', 'user');
    }
    getPanelTitle() {
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        return `Your Outfit${hashDisplay}`;
    }
    renderFillOutfitButton(container) {
        const fillButton = document.createElement('button');
        fillButton.className = 'fill-outfit-btn';
        fillButton.textContent = 'Fill Outfit with LLM';
        fillButton.disabled = true; // Disabled for user panel
        fillButton.title = 'This feature is only available for bot outfits.';
        container.appendChild(fillButton);
    }
    getFirstMessageText() {
        var _a, _b, _c;
        try {
            const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
            if (context === null || context === void 0 ? void 0 : context.chat) {
                const firstAiMessage = context.chat.find((msg) => !msg.is_user && !msg.is_system);
                return (firstAiMessage === null || firstAiMessage === void 0 ? void 0 : firstAiMessage.mes) || '';
            }
            return '';
        }
        catch (error) {
            debugLog('Could not get first message text for hash generation:', error, 'warn');
            return '';
        }
    }
    setupDynamicRefresh() {
        var _a, _b, _c;
        super.setupDynamicRefresh();
        const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
        if ((context === null || context === void 0 ? void 0 : context.eventSource) && context.event_types) {
            const { eventSource, event_types } = context;
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
}
