import { debugLog } from '../logging/DebugLogger.js';
class StorageService {
    constructor(saveFn, loadFn) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }
    save(data) {
        if (typeof this.saveFn !== 'function') {
            debugLog('Save function is not configured.', null, 'error', 'StorageService');
            return;
        }
        try {
            this.saveFn(data);
        }
        catch (error) {
            debugLog('Error saving data:', error, 'error', 'StorageService');
        }
    }
    load() {
        if (typeof this.loadFn !== 'function') {
            debugLog('Load function is not configured.', null, 'error', 'StorageService');
            return null;
        }
        try {
            return this.loadFn();
        }
        catch (error) {
            debugLog('Error loading data:', error, 'error', 'StorageService');
            return null;
        }
    }
}
export { StorageService };
