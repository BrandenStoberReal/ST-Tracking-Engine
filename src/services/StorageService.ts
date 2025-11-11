import { debugLog } from '../logging/DebugLogger';

class StorageService {
    saveFn: (data: unknown) => void;
    loadFn: () => unknown;

    constructor(saveFn: (data: unknown) => void, loadFn: () => unknown) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }

    save(data: unknown): void {
        if (typeof this.saveFn !== 'function') {
            debugLog('Save function is not configured.', null, 'error', 'StorageService');
            return;
        }
        try {
            this.saveFn(data);
        } catch (error) {
            debugLog('Error saving data:', error, 'error', 'StorageService');
        }
    }

    load(): unknown {
        if (typeof this.loadFn !== 'function') {
            debugLog('Load function is not configured.', null, 'error', 'StorageService');
            return null;
        }
        try {
            return this.loadFn();
        } catch (error) {
            debugLog('Error loading data:', error, 'error', 'StorageService');
            return null;
        }
    }
}

export { StorageService };
