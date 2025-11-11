var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initializeExtension } from './core/ExtensionCore.js';
import { debugLog } from './logging/DebugLogger.js';
// jQuery is available globally
debugLog('Starting extension loading...', null, 'info', 'OutfitTracker');
$(document).ready(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield initializeExtension();
        debugLog('Extension loaded successfully', null, 'info', 'OutfitTracker');
    }
    catch (error) {
        debugLog('Extension initialization failed', error, 'error', 'OutfitTracker');
    }
}));
