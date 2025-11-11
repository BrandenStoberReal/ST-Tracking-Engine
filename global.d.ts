

/// <reference path="./src/types/index.ts" />

declare global {
    const $: import('./src/types').JQueryStatic;
    const toastr: import('./src/types').ToastrStatic;
    interface Window extends import('./src/types').WindowExtensions {
        SillyTavern: {
            getContext: () => SillyTavernContext;
        };
        getContext: () => SillyTavernContext;
        customMacroSystem: CustomMacroSystem;
        outfitTracker?: import('./src/types').ExtensionAPI;
        botOutfitPanel: OutfitPanelAPI;
        userOutfitPanel: OutfitPanelAPI;
        outfitStore: OutfitStoreState;
        power_user: unknown;
        user_avatar: unknown;
        name1: string;
        name2: string;
        wipeAllOutfits: () => Promise<void>;
        refreshOutfitMacros: () => void;
        updateInstanceMacros: (characterId: string, instanceId: string, isUser?: boolean) => void;
        outfitDebugPanel: {
            toggle: () => void;
        };
        outfitTrackerInterceptor: (chat: ChatMessage[]) => Promise<void>;
        saveSettingsDebounced: () => void;
        getOutfitExtensionStatus: () => {
            core: boolean;
            autoOutfit: IAutoOutfitSystemStatus;
            botPanel: { isVisible: boolean };
            userPanel: { isVisible: boolean };
            events: boolean;
            managers: { bot: boolean; user: boolean };
        };
        characterService: {
            updateForCurrentCharacter: (
                botManager: any,
                userManager: any,
                botPanel: any,
                userPanel: any
            ) => Promise<void>;
        };
        llmService: {
            generateOutfitFromLLM: (options: { prompt: string }) => Promise<string>;
            importOutfitFromCharacterCard: () => Promise<{
                message: string;
                commands: string[];
                characterName?: string;
                error?: string;
            }>;
        };
        eventService: EventService;
        storageService?: StorageService;
        dataManager?: DataManager;
        outfitDataService: OutfitDataService;
        macroProcessor: import('./src/processors/MacroProcessor').MacroProcessor;
        autoOutfitSystem: import('./src/types').AutoOutfitSystemAPI;
        connectionManager: {
            getSupportedProfiles: () => Promise<Array<any>>;
            sendRequest: (
                profileId: string,
                prompt:
                    | string
                    | Array<{
                          role: string;
                          content: string;
                      }>,
                maxTokens: number,
                custom?: any,
                overridePayload?: any
            ) => Promise<string>;
            applyProfile?: (profile: any) => Promise<void>;
            getCurrentProfileId?: () => string;
            getProfileById?: (profileId: string) => any;
            getAllProfiles?: () => Array<any>;
        };
        SlashCommandParser: {
            parse: (input: string) => any;
            addCommand: (command: string, handler: Function) => void;
            commands: Record<string, { callback: Function; [key: string]: any }>;
        };
        extension_settings: Record<string, any>;
    }
}

export {};
