import { debugLog } from '../logging/DebugLogger.js';
/**
 * Gets a list of all loaded characters.
 * @returns The list of character objects or null if not found
 */
export function getCharacters() {
    var _a;
    const context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
        ? window.SillyTavern.getContext()
        : window.getContext
            ? window.getContext()
            : null;
    if (context && context.characters) {
        debugLog('Character array fetched successfully.', null, 'info');
        return context.characters;
    }
    debugLog('Resolving character array failed.', null, 'error');
    return null;
}
