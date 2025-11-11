import { debugLog } from '../logging/DebugLogger';
import { Character } from '../types';

/**
 * Gets a list of all loaded characters.
 * @returns The list of character objects or null if not found
 */
export function getCharacters(): Character[] | null {
    const context = window.SillyTavern?.getContext
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
