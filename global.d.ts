interface TavernCardV1 {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
}

interface CharacterBookEntry {
    keys: string[];
    content: string;
    extensions: Record<string, any>;
    enabled: boolean;
    insertion_order: number;
    case_sensitive?: boolean;
    name?: string;
    priority?: number;
    id?: number;
    comment?: string;
    selective?: boolean;
    secondary_keys?: string[];
    constant?: boolean;
    position?: 'before_char' | 'after_char';
}

interface CharacterBook {
    name?: string;
    description?: string;
    scan_depth?: number;
    token_budget?: number;
    recursive_scanning?: boolean;
    extensions: Record<string, any>;
    entries: CharacterBookEntry[];
}

interface TavernCardV2 {
    spec: 'chara_card_v2';
    spec_version: '2.0';
    data: {
        name: string;
        description: string;
        personality: string;
        scenario: string;
        first_mes: string;
        mes_example: string;
        creator_notes: string;
        system_prompt: string;
        post_history_instructions: string;
        alternate_greetings: string[];
        character_book?: CharacterBook;
        tags: string[];
        creator: string;
        character_version: string;
        extensions: Record<string, any>;
    };
}

type TavernCard = TavernCardV1 | TavernCardV2;

interface ChatMessage {
    name: string;
    is_user: boolean;
    is_system: boolean;
    send_date: string;
    mes: string;
    extra: Record<string, any>;
    swipe_id?: number;
    swipes?: string[];
    swipe_info?: any[];
    continueHistory?: any[];
    continueSwipeId?: number;
    continueSwipe?: any;
}

interface SillyTavernContext {
    characterId: number;
    characters: TavernCard[];
    chat: ChatMessage[];
    eventSource: any;
    event_types: Record<string, string>;
    getContext: () => SillyTavernContext;
    addLocaleData: (locale: string, data: any) => void;
    generateQuietPrompt: (prompt: string) => Promise<string>;
    generateRaw: (prompt: string, options: any) => Promise<string>;
    registerMacro: (name: string, func: () => any) => void;
    unregisterMacro: (name: string) => void;
    getPresetManager: () => any;
    writeExtensionField: (extensionName: string, field: string, value: any) => void;
    chatMetadata: { chat_id_hash: number };
    saveMetadata: () => void;
    this_chid: number;
    getName: (type?: string) => string;
    accountStorage: Record<string, any>;
    groups: any[];
    name1: string;
    name2: string;
    groupId: string | null;
    onlineStatus: string;
    maxContext: number;
    streamingProcessor: any | null;
    tokenizers: Record<string, number>;
    extensionPrompts: Record<string, any>;
    ARGUMENT_TYPE: Record<string, string>;
    mainApi: string;
    extensionSettings: Record<string, any>;
    tags: Array<{ id: string; name: string; color: string }>;
    tagMap: Record<string, string[]>;
    menuType: string;
    createCharacterData: Record<string, any>;
    POPUP_TYPE: Record<string, number>;
    POPUP_RESULT: Record<string, number | null>;
    chatCompletionSettings: Record<string, any>;
    textCompletionSettings: Record<string, any>;
    powerUserSettings: Record<string, any>;
    CONNECT_API_MAP: Record<string, any>;
    symbols: Record<string, any>;
    ConnectionManagerRequestService?: {
        getSupportedProfiles: () => Promise<Array<any>>;
        sendRequest: (profileId: string, prompt: string | Array<{
            role: string,
            content: string
        }>, maxTokens: number, custom?: any, overridePayload?: any) => Promise<string>;
    };
}

declare global {
    interface Window {
        SillyTavern: {
            getContext: () => SillyTavernContext;
        };
        getContext: () => SillyTavernContext;
        customMacroSystem: any;
        outfitTracker: any;
        botOutfitPanel: any;
        userOutfitPanel: any;
        outfitStore: any;
        power_user: any;
        user_avatar: any;
        name1: string;
        name2: string;
        wipeAllOutfits: () => void;
        refreshOutfitMacros: () => void;
        outfitDebugPanel: any;
        outfitTrackerInterceptor: (chat: ChatMessage[]) => Promise<void>;
        saveSettingsDebounced: () => void;
        getOutfitExtensionStatus: () => {
            core: boolean;
            autoOutfit: any;
            botPanel: { isVisible: boolean };
            userPanel: { isVisible: boolean };
            events: boolean;
            managers: { bot: boolean; user: boolean };
        };
    }
}
