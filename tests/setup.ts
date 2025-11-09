// Mock for browser globals that are available in SillyTavern but not in test environment
(global as any).$ = jest.fn();
(global as any).jQuery = (global as any).$;
(global as any).toastr = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
};

// Mock SillyTavern's global object
(global as any).SillyTavern = {
    getContext: jest.fn(),
    libs: {
        DOMPurify: {sanitize: jest.fn((text: string) => text)},
        moment: jest.fn(),
        showdown: {Converter: jest.fn()},
        lodash: {},
        localforage: {},
        Fuse: {}
    }
};

// Mock jQuery functions commonly used in the extension
(global as any).$.mockImplementation = (selector: any) => {
    return {
        ready: jest.fn((callback: () => void) => callback()),
        on: jest.fn(),
        append: jest.fn(),
        remove: jest.fn(),
        hide: jest.fn(),
        show: jest.fn(),
        css: jest.fn(),
        val: jest.fn(),
        text: jest.fn(),
        html: jest.fn(),
        find: jest.fn(() => (global as any).$()),
        trigger: jest.fn(),
        data: jest.fn(),
        attr: jest.fn(),
        addClass: jest.fn(),
        removeClass: jest.fn(),
        toggleClass: jest.fn(),
        prop: jest.fn(),
        click: jest.fn(),
        submit: jest.fn(),
        parent: jest.fn(() => (global as any).$()),
        siblings: jest.fn(() => (global as any).$()),
        closest: jest.fn(() => (global as any).$()),
        each: jest.fn((callback: () => void) => {
            if (callback) {
                callback();
            }
        }),
        length: 0
    };
};

// Mock common browser APIs
(global as any).localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

(global as any).sessionStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

(global as any).console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
};

// Mock fetch API
(global as any).fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        ok: true,
        status: 200,
        headers: new Map()
    })
);

// Mock DOM APIs
(global as any).document = {
    ...document,
    createElement: jest.fn((tagName: string) => {
        const element = {
            tagName: tagName.toUpperCase(),
            style: {},
            className: '',
            id: '',
            textContent: '',
            innerHTML: '',
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn(),
                contains: jest.fn(() => false)
            },
            parentNode: null,
            children: [],
            click: jest.fn(),
            focus: jest.fn(),
            blur: jest.fn()
        };
        return element;
    }),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        style: {}
    },
    head: {
        appendChild: jest.fn()
    },
    getElementById: jest.fn(() => null),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock window APIs
(global as any).window = {
    ...((global as any).window || {}),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setTimeout: jest.fn((fn: () => void) => fn()),
    clearTimeout: jest.fn(),
    setInterval: jest.fn((fn: () => void) => fn()),
    clearInterval: jest.fn(),
    requestAnimationFrame: jest.fn((fn: () => void) => fn()),
    cancelAnimationFrame: jest.fn(),
    getComputedStyle: jest.fn(() => ({})),
    innerWidth: 1920,
    innerHeight: 1080,
    scrollX: 0,
    scrollY: 0,
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        clipboard: {
            writeText: jest.fn(() => Promise.resolve()),
            readText: jest.fn(() => Promise.resolve(''))
        }
    },
    location: {
        href: 'http://localhost:8000',
        pathname: '/',
        search: '',
        hash: ''
    },
    history: {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn()
    }
};

// Mock performance API
(global as any).performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Mock URL API
(global as any).URL = class {
    static createObjectURL = jest.fn(() => 'blob:mock-url');
    static revokeObjectURL = jest.fn();
    href: string;

    constructor(url: string) {
        this.href = url;
    }
};

// Mock Blob API
(global as any).Blob = class {
    size: number;
    type: string;

    constructor(parts: any[], options?: any) {
        this.size = parts ? parts.join('').length : 0;
        this.type = options?.type || '';
    }
};

// Mock extension settings and context based on documentation
const mockContext = {
    // State objects
    chat: [], // Chat log - MUTABLE
    characters: [], // Character list
    characterId: null, // Index of the current character
    groups: [], // Group list
    groupId: null, // ID of the current group

    // Settings and persistence
    extensionSettings: {},
    saveSettingsDebounced: jest.fn(),

    // Chat metadata
    chatMetadata: {},
    saveMetadata: jest.fn(),

    // Events
    eventSource: {
        on: jest.fn(),
        emit: jest.fn()
    },
    event_types: {
        APP_READY: 'APP_READY',
        MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
        MESSAGE_SENT: 'MESSAGE_SENT',
        USER_MESSAGE_RENDERED: 'USER_MESSAGE_RENDERED',
        CHARACTER_MESSAGE_RENDERED: 'CHARACTER_MESSAGE_RENDERED',
        CHAT_CHANGED: 'CHAT_CHANGED',
        GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
        GENERATION_STOPPED: 'GENERATION_STOPPED',
        GENERATION_ENDED: 'GENERATION_ENDED',
        SETTINGS_UPDATED: 'SETTINGS_UPDATED'
    },

    // Character cards
    writeExtensionField: jest.fn(),

    // Text generation
    generateQuietPrompt: jest.fn(),
    generateRaw: jest.fn(),

    // Macros
    registerMacro: jest.fn(),
    unregisterMacro: jest.fn(),
    addLocaleData: jest.fn(),

    // Settings presets
    getPresetManager: jest.fn(() => ({
        writePresetExtensionField: jest.fn(),
        readPresetExtensionField: jest.fn()
    })),

    // Additional documented methods
    registerSlashCommand: jest.fn()
};

(global as any).SillyTavern.getContext.mockReturnValue(mockContext);

// Mock setTimeout for async operations
(global as any).setTimeout = (fn: () => void) => fn();
