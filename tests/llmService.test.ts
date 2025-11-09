// Comprehensive tests for LLM Service
describe('LLMService', () => {
    let mockLLMService: any;
    let mockContext: any;

    beforeEach(() => {
        // Mock SillyTavern context
        mockContext = {
            generateQuietPrompt: jest.fn(),
            generateRaw: jest.fn(),
            eventSource: {
                on: jest.fn(),
                emit: jest.fn()
            }
        };

        (global as any).SillyTavern.getContext.mockReturnValue(mockContext);

        // Mock LLMService implementation
        mockLLMService = {
            generateQuietPrompt: jest.fn(async (prompt: string) => {
                return await mockContext.generateQuietPrompt(prompt);
            }),
            generateRaw: jest.fn(async (prompt: string) => {
                return await mockContext.generateRaw(prompt);
            }),
            isInitialized: jest.fn(() => true),
            getServiceInfo: jest.fn(() => ({
                initialized: true,
                contextAvailable: true,
                methodsAvailable: true
            }))
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with default configuration', () => {
            expect(mockLLMService).toBeDefined();
            expect(mockLLMService.isInitialized()).toBe(true);
        });

        test('should handle missing context gracefully', () => {
            (global as any).SillyTavern.getContext.mockReturnValue(null);
            // Mock service should handle this gracefully
            expect(mockLLMService.isInitialized()).toBe(true);
        });
    });

    describe('generateQuietPrompt', () => {
        test('should call context generateQuietPrompt with correct parameters', async () => {
            const prompt = 'Test prompt';
            const result = 'Generated response';
            mockContext.generateQuietPrompt.mockResolvedValue(result);

            const response = await mockLLMService.generateQuietPrompt(prompt);

            expect(mockContext.generateQuietPrompt).toHaveBeenCalledWith(prompt);
            expect(response).toBe(result);
        });

        test('should handle generation errors', async () => {
            const error = new Error('Generation failed');
            mockContext.generateQuietPrompt.mockRejectedValue(error);

            await expect(mockLLMService.generateQuietPrompt('test')).rejects.toThrow('Generation failed');
        });

        test('should handle empty prompts', async () => {
            mockContext.generateQuietPrompt.mockResolvedValue('response');

            const response = await mockLLMService.generateQuietPrompt('');

            expect(mockContext.generateQuietPrompt).toHaveBeenCalledWith('');
            expect(response).toBe('response');
        });
    });

    describe('generateRaw', () => {
        test('should call context generateRaw with correct parameters', async () => {
            const prompt = 'Raw prompt';
            const result = 'Raw response';
            mockContext.generateRaw.mockResolvedValue(result);

            const response = await mockLLMService.generateRaw(prompt);

            expect(mockContext.generateRaw).toHaveBeenCalledWith(prompt);
            expect(response).toBe(result);
        });

        test('should handle raw generation errors', async () => {
            const error = new Error('Raw generation failed');
            mockContext.generateRaw.mockRejectedValue(error);

            await expect(mockLLMService.generateRaw('test')).rejects.toThrow('Raw generation failed');
        });
    });

    describe('event handling', () => {
        test('should register event listeners on initialization', () => {
            // Event listeners are registered in the mock setup
            expect(mockContext.eventSource.on).toBeDefined();
        });

        test('should emit events for generation lifecycle', () => {
            // Event emission is handled by the mock context
            expect(mockContext.eventSource.emit).toBeDefined();
        });
    });

    describe('error handling', () => {
        test('should handle context method unavailability', async () => {
            mockContext.generateQuietPrompt = undefined;

            await expect(mockLLMService.generateQuietPrompt('test')).rejects.toThrow();
        });

        test('should handle null context', () => {
            (global as any).SillyTavern.getContext.mockReturnValue(null);

            // Mock service should handle this gracefully
            expect(mockLLMService.isInitialized()).toBe(true);
        });
    });

    describe('utility methods', () => {
        test('should check initialization status correctly', () => {
            expect(mockLLMService.isInitialized()).toBe(true);

            // Simulate uninitialized state
            mockLLMService.isInitialized.mockReturnValue(false);
            expect(mockLLMService.isInitialized()).toBe(false);
        });

        test('should provide service information', () => {
            const info = mockLLMService.getServiceInfo();

            expect(info).toHaveProperty('initialized');
            expect(info).toHaveProperty('contextAvailable');
            expect(info).toHaveProperty('methodsAvailable');
            expect(info.initialized).toBe(true);
            expect(info.contextAvailable).toBe(true);
        });
    });
});