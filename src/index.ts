import {initializeExtension} from './core/ExtensionCore';
import {debugLog} from './logging/DebugLogger';

declare const $: any;

debugLog('[OutfitTracker] Starting extension loading...');
debugLog('Starting extension loading...', null, 'info');

$(document).ready(async () => {
    try {
        await initializeExtension();
        debugLog('[OutfitTracker] Extension loaded successfully');
        debugLog('Extension loaded successfully', null, 'info');
    } catch (error) {
        debugLog('[OutfitTracker] Initialization failed', error, 'error');
        debugLog('Extension initialization failed', error, 'error');
    }
});
