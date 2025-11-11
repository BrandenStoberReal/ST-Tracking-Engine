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
            debugLog('[StorageService] Save function is not configured.', null, 'error');
            return;
        }
        this.saveFn(data);
    }

    load(): unknown {
        if (typeof this.loadFn !== 'function') {
            debugLog('[StorageService] Load function is not configured.', null, 'error');
            return null;
        }
        return this.loadFn();
    }
}

export { StorageService };
