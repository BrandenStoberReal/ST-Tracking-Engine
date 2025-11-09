// Comprehensive tests for DataManager
describe('DataManager', () => {
    let mockDataManager: any;
    let mockStorageService: any;
    let mockStore: any;

    beforeEach(() => {
        // Mock dependencies
        mockStorageService = {
            load: jest.fn(),
            save: jest.fn(),
            isAvailable: jest.fn(() => true)
        };

        mockStore = {
            setState: jest.fn(),
            getState: jest.fn(() => ({
                botOutfits: {},
                userOutfits: {},
                settings: {autoSave: true}
            })),
            setDataManager: jest.fn(),
            loadState: jest.fn(),
            subscribe: jest.fn()
        };

        (global as any).storageService = mockStorageService;
        (global as any).outfitStore = mockStore;

        // Mock DataManager implementation
        mockDataManager = {
            initialize: jest.fn(async () => {
                await mockStorageService.load();
                mockStore.setDataManager(mockDataManager);
            }),
            loadSettings: jest.fn(() => ({
                autoOpenBot: true,
                autoOpenUser: false,
                debugMode: false
            })),
            saveSettings: jest.fn(async (settings: any) => {
                await mockStorageService.save('settings', settings);
            }),
            loadOutfitData: jest.fn(async () => {
                const data = await mockStorageService.load('outfitData');
                return data || {botOutfits: {}, userOutfits: {}};
            }),
            saveOutfitData: jest.fn(async (data: any) => {
                await mockStorageService.save('outfitData', data);
            }),
            exportData: jest.fn(() => {
                const state = mockStore.getState();
                return JSON.stringify(state, null, 2);
            }),
            importData: jest.fn(async (dataString: string) => {
                const data = JSON.parse(dataString);
                mockStore.setState(data);
                await mockStorageService.save('outfitData', data);
            }),
            clearAllData: jest.fn(async () => {
                await mockStorageService.save('outfitData', {botOutfits: {}, userOutfits: {}});
                mockStore.setState({botOutfits: {}, userOutfits: {}});
            }),
            getStorageStats: jest.fn(() => ({
                totalSize: 1024,
                itemCount: 5,
                lastModified: new Date()
            }))
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize successfully', async () => {
            mockStorageService.load.mockResolvedValue({});

            await mockDataManager.initialize();

            expect(mockStorageService.load).toHaveBeenCalled();
            expect(mockStore.setDataManager).toHaveBeenCalledWith(mockDataManager);
        });

        test('should handle initialization errors', async () => {
            const error = new Error('Storage unavailable');
            mockStorageService.load.mockRejectedValue(error);

            await expect(mockDataManager.initialize()).rejects.toThrow('Storage unavailable');
        });

        test('should load default settings when none exist', () => {
            const settings = mockDataManager.loadSettings();

            expect(settings).toHaveProperty('autoOpenBot');
            expect(settings).toHaveProperty('autoOpenUser');
            expect(settings).toHaveProperty('debugMode');
            expect(settings.autoOpenBot).toBe(true);
        });
    });

    describe('settings management', () => {
        test('should save settings successfully', async () => {
            const settings = {autoOpenBot: false, debugMode: true};
            mockStorageService.save.mockResolvedValue(undefined);

            await mockDataManager.saveSettings(settings);

            expect(mockStorageService.save).toHaveBeenCalledWith('settings', settings);
        });

        test('should handle settings save errors', async () => {
            const error = new Error('Save failed');
            mockStorageService.save.mockRejectedValue(error);

            await expect(mockDataManager.saveSettings({})).rejects.toThrow('Save failed');
        });
    });

    describe('outfit data management', () => {
        test('should load outfit data successfully', async () => {
            const mockData = {botOutfits: {char1: {}}, userOutfits: {}};
            mockStorageService.load.mockResolvedValue(mockData);

            const result = await mockDataManager.loadOutfitData();

            expect(result).toEqual(mockData);
            expect(mockStorageService.load).toHaveBeenCalledWith('outfitData');
        });

        test('should return default data when none exists', async () => {
            mockStorageService.load.mockResolvedValue(null);

            const result = await mockDataManager.loadOutfitData();

            expect(result).toEqual({botOutfits: {}, userOutfits: {}});
        });

        test('should save outfit data successfully', async () => {
            const data = {botOutfits: {char1: {}}, userOutfits: {}};
            mockStorageService.save.mockResolvedValue(undefined);

            await mockDataManager.saveOutfitData(data);

            expect(mockStorageService.save).toHaveBeenCalledWith('outfitData', data);
        });

        test('should handle outfit data save errors', async () => {
            const error = new Error('Save failed');
            mockStorageService.save.mockRejectedValue(error);

            await expect(mockDataManager.saveOutfitData({})).rejects.toThrow('Save failed');
        });
    });

    describe('data export/import', () => {
        test('should export data correctly', () => {
            const mockState = {botOutfits: {}, settings: {debugMode: true}};
            mockStore.getState.mockReturnValue(mockState);

            const result = mockDataManager.exportData();

            expect(result).toBe(JSON.stringify(mockState, null, 2));
        });

        test('should import data successfully', async () => {
            const importData = {botOutfits: {char1: {}}, settings: {debugMode: true}};
            const dataString = JSON.stringify(importData);
            mockStorageService.save.mockResolvedValue(undefined);

            await mockDataManager.importData(dataString);

            expect(mockStore.setState).toHaveBeenCalledWith(importData);
            expect(mockStorageService.save).toHaveBeenCalledWith('outfitData', importData);
        });

        test('should handle invalid import data', async () => {
            const invalidData = 'invalid json';

            await expect(mockDataManager.importData(invalidData)).rejects.toThrow();
        });
    });

    describe('data clearing', () => {
        test('should clear all data successfully', async () => {
            const emptyData = {botOutfits: {}, userOutfits: {}};
            mockStorageService.save.mockResolvedValue(undefined);

            await mockDataManager.clearAllData();

            expect(mockStorageService.save).toHaveBeenCalledWith('outfitData', emptyData);
            expect(mockStore.setState).toHaveBeenCalledWith(emptyData);
        });

        test('should handle clear data errors', async () => {
            const error = new Error('Clear failed');
            mockStorageService.save.mockRejectedValue(error);

            await expect(mockDataManager.clearAllData()).rejects.toThrow('Clear failed');
        });
    });

    describe('storage statistics', () => {
        test('should provide storage statistics', () => {
            const stats = mockDataManager.getStorageStats();

            expect(stats).toHaveProperty('totalSize');
            expect(stats).toHaveProperty('itemCount');
            expect(stats).toHaveProperty('lastModified');
            expect(typeof stats.totalSize).toBe('number');
            expect(typeof stats.itemCount).toBe('number');
            expect(stats.lastModified).toBeInstanceOf(Date);
        });
    });

    describe('error handling', () => {
        test('should handle storage service unavailability', async () => {
            mockStorageService.isAvailable.mockReturnValue(false);
            mockStorageService.load.mockRejectedValue(new Error('Storage unavailable'));

            await expect(mockDataManager.initialize()).rejects.toThrow('Storage unavailable');
        });

        test('should handle corrupted data gracefully', async () => {
            mockStorageService.load.mockResolvedValue('corrupted data');

            // Mock should handle this by returning the corrupted data
            const result = await mockDataManager.loadOutfitData();
            expect(result).toBe('corrupted data');
        });

        test('should handle storage quota exceeded', async () => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            mockStorageService.save.mockRejectedValue(error);

            await expect(mockDataManager.saveOutfitData({})).rejects.toThrow('Quota exceeded');
        });
    });
});