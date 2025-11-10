import {debugLog} from '../logging/DebugLogger';

class StorageService {
    saveFn: (data: any) => void;
    loadFn: () => any;

    constructor(saveFn: (data: any) => void, loadFn: () => any) {
        this.saveFn = saveFn;
        this.loadFn = loadFn;
    }

    save(data: any): void {
        if (typeof this.saveFn !== 'function') {
            debugLog('[StorageService] Save function is not configured.', null, 'error');
            return;
        }
        this.saveFn(data);
    }

    load(): any {
        if (typeof this.loadFn !== 'function') {
            debugLog('[StorageService] Load function is not configured.', null, 'error');
            return null;
        }
        return this.loadFn();
    }
}

export { StorageService };
