import { outfitStore } from '../common/Store';

interface LogEntry {
    timestamp: string;
    message: string;
    data: any;
    level: string;
    formattedMessage: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

function addLogToStorage(message: string, data: any, level: string = 'log'): void {
    const timestamp = new Date().toISOString();

    logs.push({
        timestamp,
        message,
        data,
        level,
        formattedMessage: `[OutfitTracker Debug - ${timestamp}] ${message}`,
    });

    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
}

export function debugLog(message: string, data?: any, level: string = 'log'): void {
    const storeState = outfitStore.getState();
    const debugMode = storeState?.settings?.debugMode;

    if (debugMode) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;

        switch (level) {
            case 'warn':
                console.warn(formattedMessage, data !== undefined ? data : '');
                break;
            case 'error':
                console.error(formattedMessage, data !== undefined ? data : '');
                break;
            case 'info':
                console.info(formattedMessage, data !== undefined ? data : '');
                break;
            case 'debug':
                console.debug(formattedMessage, data !== undefined ? data : '');
                break;
            case 'log':
            default:
                console.log(formattedMessage, data !== undefined ? data : '');
                break;
        }

        addLogToStorage(message, data, level);
    }
}

export function forceDebugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[OutfitTracker Debug - ${timestamp}] ${message}`;

    console.log(formattedMessage, data !== undefined ? data : '');

    addLogToStorage(message, data, 'log');
}

export function getLogs(): LogEntry[] {
    return [...logs];
}

export function clearLogs(): void {
    logs.length = 0;
}

export const debugLogger = {
    log: debugLog,
    forceLog: forceDebugLog,
    getLogs: getLogs,
    clearLogs: clearLogs,
};
