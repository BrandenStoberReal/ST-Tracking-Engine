import { debugLog } from '../logging/DebugLogger';

// Define extension-specific events
export const EXTENSION_EVENTS = {
    CONTEXT_UPDATED: 'outfit-tracker-context-updated',
    OUTFIT_CHANGED: 'outfit-tracker-outfit-changed',
    PRESET_LOADED: 'outfit-tracker-preset-loaded',
    PRESET_SAVED: 'outfit-tracker-preset-saved',
    PRESET_DELETED: 'outfit-tracker-preset-deleted',
    PRESET_OVERWRITTEN: 'outfit-tracker-preset-overwritten',
    DEFAULT_OUTFIT_SET: 'outfit-tracker-default-outfit-set',
    DEFAULT_OUTFIT_CLEARED: 'outfit-tracker-default-outfit-cleared',
    DEFAULT_OUTFIT_LOADED: 'outfit-tracker-default-outfit-loaded',
    PANEL_VISIBILITY_CHANGED: 'outfit-tracker-panel-visibility-changed',
    CHAT_CLEARED: 'outfit-tracker-chat-cleared',
    OUTFIT_DATA_LOADED: 'outfit-tracker-data-loaded',
    SETTINGS_CHANGED: 'outfit-tracker-settings-changed',
    MIGRATION_COMPLETED: 'outfit-tracker-migration-completed',
    INSTANCE_CREATED: 'outfit-tracker-instance-created',
    INSTANCE_DELETED: 'outfit-tracker-instance-deleted',
    CHARACTER_OUTFIT_SYNCED: 'outfit-tracker-character-outfit-synced',
};

// Simple event bus implementation
class ExtensionEventBus {
    private listeners: { [key: string]: Array<(data?: unknown) => void> } = {};

    constructor() {
        this.listeners = {};
    }

    on(event: string, callback: (data?: unknown) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: (data?: unknown) => void) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((listener) => listener !== callback);
        }
    }

    emit(event: string, data?: unknown) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    debugLog(`Error in event listener for ${event}:`, error, 'error');
                }
            });
        }
    }
}

export const extensionEventBus = new ExtensionEventBus();
