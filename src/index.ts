import { initializeExtension } from './core/ExtensionCore';
import { debugLog } from './logging/DebugLogger';

// jQuery is available globally

debugLog('Starting extension loading...', null, 'info', 'OutfitTracker');

$(document).ready(async () => {
    try {
        await initializeExtension();
        debugLog('Extension loaded successfully', null, 'info', 'OutfitTracker');
    } catch (error) {
        debugLog('Extension initialization failed', error, 'error', 'OutfitTracker');
    }
});
