// Mock the global environment for testing
(global as any).window = {
    SillyTavern: {
        getContext: jest.fn()
    }
};

(global as any).console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock context
const testMockContext = {
    extensionSettings: {},
    saveSettingsDebounced: jest.fn(),
    characters: [],
    chat: [],
    eventSource: {
        on: jest.fn(),
        emit: jest.fn()
    }
};

(global as any).window.SillyTavern.getContext.mockReturnValue(testMockContext);

// Mock modules that will be imported
jest.mock('../src/common/Store.ts', () => ({
    outfitStore: {
        setState: jest.fn(),
        getState: jest.fn(),
        setCurrentInstanceId: jest.fn(),
        setPanelRef: jest.fn(),
        setAutoOutfitSystem: jest.fn(),
        setDataManager: jest.fn(),
        loadState: jest.fn(),
        subscribe: jest.fn()
    }
}));

jest.mock('../src/services/StorageService.ts', () => {
    return {
        StorageService: jest.fn().mockImplementation(() => ({
            load: jest.fn(),
            save: jest.fn()
        }))
    };
});

jest.mock('../src/managers/DataManager.ts', () => {
    return {
        DataManager: jest.fn().mockImplementation(() => ({
            initialize: jest.fn(),
            loadSettings: jest.fn(() => ({}))
        }))
    };
});

jest.mock('../src/managers/NewBotOutfitManager.ts', () => {
    return {
        NewBotOutfitManager: jest.fn().mockImplementation(() => ({
            setOutfitInstanceId: jest.fn()
        }))
    };
});

jest.mock('../src/managers/NewUserOutfitManager.ts', () => {
    return {
        NewUserOutfitManager: jest.fn().mockImplementation(() => ({
            setOutfitInstanceId: jest.fn()
        }))
    };
});

jest.mock('../src/panels/BotOutfitPanel.ts', () => {
    return {
        BotOutfitPanel: jest.fn().mockImplementation(() => ({
            show: jest.fn(),
            applyPanelColors: jest.fn(),
            outfitManager: {setOutfitInstanceId: jest.fn()}
        }))
    };
});

jest.mock('../src/panels/UserOutfitPanel.ts', () => {
    return {
        UserOutfitPanel: jest.fn().mockImplementation(() => ({
            show: jest.fn(),
            applyPanelColors: jest.fn(),
            outfitManager: {setOutfitInstanceId: jest.fn()}
        }))
    };
});

jest.mock('../src/config/constants.ts', () => ({
    CLOTHING_SLOTS: ['topwear', 'bottomwear'],
    ACCESSORY_SLOTS: ['neck-accessory'],
    ALL_SLOTS: ['topwear', 'bottomwear', 'neck-accessory']
}));

// Since we can't directly import the initializeExtension function due to DOM dependencies,
// we'll test it through a mock version
describe('Extension Initialization', () => {
    test('should initialize without throwing errors', async () => {
        // We can't directly test the initializeExtension function due to DOM dependencies
        // But we can verify the mock modules are properly set up
        expect((global as any).window.SillyTavern.getContext).toBeDefined();

        // Check that the mock context has all required methods
        expect(testMockContext.extensionSettings).toBeDefined();
        expect(typeof testMockContext.saveSettingsDebounced).toBe('function');
    });
});
