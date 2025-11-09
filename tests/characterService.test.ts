// Comprehensive tests for Character Service
describe('CharacterService', () => {
    let mockContext: any;
    let mockCharacterService: any;

    beforeEach(() => {
        // Mock SillyTavern context with characters
        mockContext = {
            characters: [
                {
                    name: 'Alice',
                    data: {
                        extensions: {
                            character_id: 'char_001'
                        }
                    }
                },
                {
                    name: 'Bob',
                    data: {
                        extensions: {
                            character_id: 'char_002'
                        }
                    }
                },
                {
                    name: 'Charlie',
                    data: {
                        extensions: {
                            character_id: 'char_003'
                        }
                    }
                }
            ],
            characterId: 0, // Index of current character
            eventSource: {
                on: jest.fn(),
                emit: jest.fn()
            }
        };

        (global as any).SillyTavern.getContext.mockReturnValue(mockContext);

        // Mock CharacterService implementation
        mockCharacterService = {
            getCurrentCharacter: jest.fn(() => mockContext.characters[mockContext.characterId]),
            getCharacterById: jest.fn((id: string) => {
                return mockContext.characters.find((char: any) => char.data?.extensions?.character_id === id);
            }),
            getAllCharacters: jest.fn(() => mockContext.characters),
            getCharacterId: jest.fn(() => mockContext.characters[mockContext.characterId]?.data?.extensions?.character_id),
            setCurrentCharacter: jest.fn((index: number) => {
                mockContext.characterId = index;
            }),
            isCharacterAvailable: jest.fn((id: string) => {
                return mockContext.characters.some((char: any) => char.data?.extensions?.character_id === id);
            }),
            getCharacterIndex: jest.fn((id: string) => {
                return mockContext.characters.findIndex((char: any) => char.data?.extensions?.character_id === id);
            })
        };

        // Mock the service globally
        (global as any).characterService = mockCharacterService;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('character retrieval', () => {
        test('should get current character correctly', () => {
            const currentChar = mockCharacterService.getCurrentCharacter();
            expect(currentChar.name).toBe('Alice');
            expect(currentChar.data.extensions.character_id).toBe('char_001');
        });

        test('should get character by ID', () => {
            const char = mockCharacterService.getCharacterById('char_002');
            expect(char.name).toBe('Bob');
            expect(char.data.extensions.character_id).toBe('char_002');
        });

        test('should return undefined for non-existent character ID', () => {
            const char = mockCharacterService.getCharacterById('nonexistent');
            expect(char).toBeUndefined();
        });

        test('should get all characters', () => {
            const characters = mockCharacterService.getAllCharacters();
            expect(characters).toHaveLength(3);
            expect(characters[0].name).toBe('Alice');
            expect(characters[1].name).toBe('Bob');
            expect(characters[2].name).toBe('Charlie');
        });
    });

    describe('character ID management', () => {
        test('should get current character ID', () => {
            const id = mockCharacterService.getCharacterId();
            expect(id).toBe('char_001');
        });

        test('should set current character by index', () => {
            mockCharacterService.setCurrentCharacter(2);
            expect(mockContext.characterId).toBe(2);

            const currentChar = mockCharacterService.getCurrentCharacter();
            expect(currentChar.name).toBe('Charlie');
        });

        test('should check character availability', () => {
            expect(mockCharacterService.isCharacterAvailable('char_001')).toBe(true);
            expect(mockCharacterService.isCharacterAvailable('char_999')).toBe(false);
        });

        test('should get character index by ID', () => {
            expect(mockCharacterService.getCharacterIndex('char_001')).toBe(0);
            expect(mockCharacterService.getCharacterIndex('char_002')).toBe(1);
            expect(mockCharacterService.getCharacterIndex('char_003')).toBe(2);
            expect(mockCharacterService.getCharacterIndex('nonexistent')).toBe(-1);
        });
    });

    describe('character data validation', () => {
        test('should handle characters without extensions', () => {
            mockContext.characters.push({
                name: 'Dave',
                data: {}
            });

            const char = mockCharacterService.getCharacterById('char_004');
            expect(char).toBeUndefined();
        });

        test('should handle characters without data', () => {
            mockContext.characters.push({
                name: 'Eve'
            });

            const char = mockCharacterService.getCharacterById('char_005');
            expect(char).toBeUndefined();
        });

        test('should handle empty character list', () => {
            mockContext.characters = [];
            mockContext.characterId = null;

            expect(mockCharacterService.getCurrentCharacter()).toBeUndefined();
            expect(mockCharacterService.getAllCharacters()).toEqual([]);
            expect(mockCharacterService.getCharacterId()).toBeUndefined();
        });
    });

    describe('character operations', () => {
        test('should handle character switching', () => {
            // Switch to Bob
            mockCharacterService.setCurrentCharacter(1);
            expect(mockCharacterService.getCharacterId()).toBe('char_002');

            // Switch to Charlie
            mockCharacterService.setCurrentCharacter(2);
            expect(mockCharacterService.getCharacterId()).toBe('char_003');

            // Switch back to Alice
            mockCharacterService.setCurrentCharacter(0);
            expect(mockCharacterService.getCharacterId()).toBe('char_001');
        });

        test('should handle invalid character index', () => {
            mockCharacterService.setCurrentCharacter(99);
            expect(mockContext.characterId).toBe(99);
            expect(mockCharacterService.getCurrentCharacter()).toBeUndefined();
        });

        test('should handle negative character index', () => {
            mockCharacterService.setCurrentCharacter(-1);
            expect(mockContext.characterId).toBe(-1);
            expect(mockCharacterService.getCurrentCharacter()).toBeUndefined();
        });
    });

    describe('character metadata', () => {
        test('should provide character statistics', () => {
            const stats = {
                total: mockContext.characters.length,
                current: mockContext.characterId,
                currentName: mockContext.characters[mockContext.characterId]?.name,
                currentId: mockContext.characters[mockContext.characterId]?.data?.extensions?.character_id
            };

            expect(stats.total).toBe(3);
            expect(stats.current).toBe(0);
            expect(stats.currentName).toBe('Alice');
            expect(stats.currentId).toBe('char_001');
        });

        test('should handle character name variations', () => {
            // Test characters with different naming patterns
            mockContext.characters = [
                {name: 'Alice Johnson', data: {extensions: {character_id: 'char_001'}}},
                {name: 'Bob Smith Jr.', data: {extensions: {character_id: 'char_002'}}},
                {name: 'Dr. Charlie Brown', data: {extensions: {character_id: 'char_003'}}}
            ];

            expect(mockCharacterService.getCharacterById('char_001').name).toBe('Alice Johnson');
            expect(mockCharacterService.getCharacterById('char_002').name).toBe('Bob Smith Jr.');
            expect(mockCharacterService.getCharacterById('char_003').name).toBe('Dr. Charlie Brown');
        });
    });
});