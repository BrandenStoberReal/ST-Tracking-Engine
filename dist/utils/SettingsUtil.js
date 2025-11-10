import { debugLog } from '../logging/DebugLogger.js';
/**
 * Utility functions for safely accessing extension settings
 */
/**
 * Safely get a setting value from various possible sources
 * @param {string} key - The setting key to retrieve
 * @param {*} defaultValue - The default value to return if the setting is not found
 * @returns {*} The value of the setting or the default value
 */
export function getSettingValue(key, defaultValue = undefined) {
    var _a, _b, _c, _d, _e;
    try {
        // First try to get settings from the store
        if (window.outfitStore && typeof window.outfitStore.getSetting === 'function') {
            return window.outfitStore.getSetting(key);
        }
        // Fallback to the extension settings through context
        const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
            ? window.SillyTavern.getContext()
            : window.getContext
                ? window.getContext()
                : null;
        if (context && typeof context === 'function') {
            const settings = context().extensionSettings;
            return (_b = settings === null || settings === void 0 ? void 0 : settings.outfit_tracker) === null || _b === void 0 ? void 0 : _b[key];
        }
        else if (context && context.extensionSettings) {
            return (_c = context.extensionSettings.outfit_tracker) === null || _c === void 0 ? void 0 : _c[key];
        }
        // Ultimate fallback to window.extension_settings
        return (_e = (_d = window.extension_settings) === null || _d === void 0 ? void 0 : _d.outfit_tracker) === null || _e === void 0 ? void 0 : _e[key];
    }
    catch (error) {
        // If all methods fail, return a safe default
        debugLog('Could not access outfit tracker settings, using default behavior:', error, 'warn');
        return defaultValue;
    }
}
/**
 * Check if system messages are enabled
 * @returns {boolean} True if system messages are enabled, false otherwise
 */
export function areSystemMessagesEnabled() {
    return getSettingValue('enableSysMessages', false);
}
