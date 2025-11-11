// Outfit Tracker Extension Types

export interface SlotOutfitData {
    [slotName: string]: string;
}

export interface InstanceData {
    bot: SlotOutfitData;
    user: SlotOutfitData;
    promptInjectionEnabled?: boolean;
    [key: string]: unknown;
}

// Type alias for backward compatibility
export type OutfitData = SlotOutfitData;

export interface FullOutfitData {
    botInstances: BotInstances;
    userInstances: UserInstances;
    presets: Presets;
    settings?: Settings;
    version?: string;

    variables?: Record<string, unknown>; // For macro variables
    messageInstanceMap?: Record<string, string>; // Message hash -> instance ID mappings
}

export interface BotInstances {
    [characterId: string]: {
        [instanceId: string]: InstanceData;
    };
}

export interface UserInstances {
    [instanceId: string]: InstanceData;
}

export interface Presets {
    bot: {
        [characterId: string]: {
            [presetName: string]: SlotOutfitData;
        };
    };
    user: {
        [instanceId: string]: {
            [presetName: string]: SlotOutfitData;
        };
    };
}

export interface PanelColors {
    primary: string;
    border: string;
    shadow: string;
}

export interface PanelSettings {
    botPanelColors: PanelColors;
    userPanelColors: PanelColors;
}

export interface Settings {
    autoOpenBot: boolean;
    autoOpenUser: boolean;
    position: string;
    enableSysMessages: boolean;
    autoOutfitSystem: boolean;
    debugMode: boolean;
    autoOutfitPrompt: string;
    autoOutfitConnectionProfile: string | null;
    botPanelColors: PanelColors;
    userPanelColors: PanelColors;
    defaultBotPresets: {
        [characterId: string]: {
            [instanceId: string]: string | null;
        };
    };
    defaultUserPresets: {
        [instanceId: string]: string | null;
    };
}

export interface PanelVisibility {
    bot: boolean;
    user: boolean;
}

export interface OutfitStoreState {
    botOutfits: BotInstances;
    userOutfits: UserInstances;
    botInstances: BotInstances;
    userInstances: UserInstances;
    presets: Presets;
    panelSettings: PanelSettings;
    settings: Settings;
    panelVisibility: PanelVisibility;
    references: {
        botPanel: unknown;
        userPanel: unknown;
        autoOutfitSystem: unknown;
    };
}

export interface CharacterInfo {
    id: number;
    name: string;
    avatar?: string;
    description?: string;
    personality?: string;
    scenario?: string;
    characterNotes?: string;
    firstMessage?: string;
}

export interface MacroValue {
    value: string;
    timestamp: number;
}

export interface MacroCache {
    [key: string]: MacroValue;
}

export interface CustomMacroSystem {
    macroValueCache: Map<string, MacroValue>;
    macroDefinitions: Map<string, unknown>;
    macroFunctions: Map<string, unknown>;
}

export interface OutfitCommand {
    type: 'wear' | 'remove' | 'change';
    slot: string;
    item?: string;
}

export interface OutfitPanelAPI {
    isVisible: boolean;
    toggle: () => void;
    show: () => void;
    hide: () => void;
    updateOutfit: (outfit: SlotOutfitData) => void;
    getCurrentOutfit: () => SlotOutfitData;
    applyPanelColors?: () => void;
    outfitManager?: OutfitManager;
    domElement?: HTMLElement | null;
    renderContent?: () => void;
    sendSystemMessage?: (message: string) => void;
    updateCharacter?: (character: string) => void;
    updateHeader?: () => void;
}

export interface IAutoOutfitSystemStatus {
    enabled: boolean;
    hasPrompt: boolean;
    promptLength: number;
    isProcessing: boolean;
    consecutiveFailures: number;
    currentRetryCount: number;
    maxRetries: number;
}

export interface AutoOutfitSystemAPI {
    readonly isEnabled: boolean;
    enable: () => string;
    disable: () => string;
    setPrompt: (prompt: string) => void;
    getPrompt: () => string;
    setConnectionProfile: (profile: string | null) => void;
    getConnectionProfile: () => string | null;
    getStatus: () => IAutoOutfitSystemStatus;
    systemPrompt: string;
    resetToDefaultPrompt: () => void;
    manualTrigger: () => Promise<string>;
    markAppInitialized: () => void;
}

export interface ExtensionAPI {
    botOutfitPanel: OutfitPanelAPI | null;
    userOutfitPanel: OutfitPanelAPI | null;
    autoOutfitSystem: AutoOutfitSystemAPI | null;
    wipeAllOutfits: (() => Promise<void>) | null;
    replaceOutfitMacrosInText: ((text: string) => string) | null;
    getOutfitExtensionStatus:
        | (() => {
              core: boolean;
              autoOutfit: IAutoOutfitSystemStatus;
              botPanel: { isVisible: boolean };
              userPanel: { isVisible: boolean };
              events: boolean;
              managers: { bot: boolean; user: boolean };
          })
        | null;
    debugPanel?: unknown;
}

export interface EventCallback {
    (...args: unknown[]): void;
}

export interface EventBus {
    on: (event: string, callback: EventCallback) => void;
    off: (event: string, callback: EventCallback) => void;
    emit: (event: string, ...args: unknown[]) => void;
}

export interface LLMServiceResponse {
    success: boolean;
    content?: string;
    error?: string;
}

export interface LLMServiceOptions {
    profile?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: unknown;
}

export interface LLMGenerationOptions {
    prompt: string;
}

export interface LLMImportResult {
    message: string;
    commands: string[];
    characterName?: string;
    error?: string;
}

// Panel Types
export interface PanelEventListener {
    element: HTMLElement;
    event: string;
    handler: EventListener;
}

export interface OutfitSubscription {
    unsubscribe: () => void;
}

export type SaveSettingsFunction = (data?: unknown) => void;

// Command Types
export interface CommandArgs {
    quiet?: boolean;
    [key: string]: unknown;
}

export interface OutfitManagers {
    botManager: unknown;
    userManager: unknown;
    autoOutfitSystem?: unknown;
}

export interface LLMService {
    generate: (prompt: string, options?: LLMServiceOptions) => Promise<LLMServiceResponse>;
    isAvailable: () => boolean;
    getProfiles: () => string[];
}

export interface StorageData {
    [key: string]: unknown;
}

export interface StorageService {
    get: <T = unknown>(key: string, defaultValue?: T) => T;
    set: (key: string, value: unknown) => void;
    remove: (key: string) => void;
    clear: () => void;
}

export interface DataManager {
    load: () => Promise<void>;
    save: () => Promise<void>;
    get: <T = unknown>(key: string, defaultValue?: T) => T;
    set: (key: string, value: unknown) => void;
    remove: (key: string) => void;
}

export interface OutfitDataService {
    clearGlobalOutfitVariables: () => void;
    wipeAllOutfits: () => Promise<string>;
}

export interface CharacterService {
    getCharacterById: (id: number) => CharacterInfo | null;
    getCurrentCharacter: () => CharacterInfo | null;
    getAllCharacters: () => CharacterInfo[];
    findCharacterById: (id: number) => CharacterInfo | null;
}

export interface OutfitManager {
    slots: string[];
    currentValues: { [key: string]: string };
    outfitInstanceId: string | null;
    character: string;
    characterId: string | null;
    setCharacter: (name: string, characterId?: string | null) => void;
    setOutfitInstanceId: (instanceId: string) => void;
    getOutfitInstanceId: () => string | null;
    getCurrentOutfit: () => { [key: string]: string };
    setOutfit: (outfitData: { [key: string]: string }) => void;
    loadOutfit: (instanceId?: string | null) => void;
    saveOutfit: (instanceId?: string | null) => void;
    setOutfitItem: (slot: string, value: string) => Promise<string | null>;
    changeOutfitItem: (slot: string) => Promise<string | null>;
    getOutfitData: (slots: string[]) => { name: string; value: string; varName: string }[];
    savePreset: (presetName: string, instanceId?: string | null) => string;
    loadPreset: (presetName: string, instanceId?: string | null) => Promise<string>;
    deletePreset: (presetName: string, instanceId?: string | null) => string;
    getPresets: (instanceId?: string | null) => string[];
    loadDefaultOutfit: (instanceId?: string | null) => Promise<string | null>;
    overwritePreset: (presetName: string, instanceId?: string | null) => string;
    setPromptInjectionEnabled: (enabled: boolean, instanceId?: string | null) => void;
    getPromptInjectionEnabled: (instanceId?: string | null) => boolean;
    getDefaultPresetName: (instanceId?: string | null) => string | null;
    setPresetAsDefault: (presetName: string, instanceId?: string | null) => Promise<string>;
}

export interface MacroProcessor {
    process: (text: string, context?: Record<string, unknown>) => string;
    registerMacro: (name: string, handler: (args: string[]) => string) => void;
    unregisterMacro: (name: string) => void;
}

export interface StringProcessor {
    replaceMacros: (text: string) => string;
    extractCommands: (text: string) => OutfitCommand[];
}

export interface EventService {
    initialize: () => void;
    registerEvent: (event: string, handler: EventCallback) => void;
    unregisterEvent: (event: string, handler: EventCallback) => void;
    emitEvent: (event: string, ...args: unknown[]) => void;
}

export interface Position {
    top: number;
    left: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface DragState {
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

export interface ResizeState {
    isResizing: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
}

// Supporting types for SillyTavern Context
export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface Group {
    id: string;
    name: string;
    members: string[];
    chat_id?: string;
    folder?: string;
    avatar_url?: string;
    [key: string]: unknown;
}

export interface EventSource {
    events: Record<string, ((...args: unknown[]) => void)[]>;
    autoFireLastArgs: Record<string, unknown[]>;
    autoFireAfterEmit: Record<string, (...args: unknown[]) => void>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
    emit: (event: string, ...args: unknown[]) => Promise<void>;
}

export interface StreamingProcessor {
    [key: string]: unknown;
}

export interface GenerateOptions {
    jsonSchema?: JSONSchema;
    [key: string]: unknown;
}

export interface GenerateRawOptions extends GenerateOptions {
    systemPrompt?: string;
    prefill?: string;
    [key: string]: unknown;
}

export interface JSONSchema {
    name: string;
    description?: string;
    strict?: boolean;
    value: Record<string, unknown>;
}

export interface ChatMessageForGeneration {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface PresetManager {
    readPresetExtensionField: (options: { path: string; name?: string }) => unknown;
    writePresetExtensionField: (options: { path: string; value: unknown; name?: string }) => Promise<void>;
}

export interface ConnectionManagerRequestService {
    getSupportedProfiles: () => Promise<ConnectionProfile[]>;
    sendRequest: (
        profileId: string,
        prompt: string | ChatMessageForGeneration[],
        maxTokens: number,
        custom?: unknown,
        overridePayload?: unknown
    ) => Promise<string>;
    applyProfile?: (profile: ConnectionProfile) => Promise<void>;
    getCurrentProfileId?: () => string;
    getProfileById?: (profileId: string) => ConnectionProfile;
    getAllProfiles?: () => ConnectionProfile[];
}

export interface ConnectionProfile {
    id: string;
    name: string;
    type: string;
    endpoint: string;
    [key: string]: unknown;
}

// Power User Settings Types
export interface PowerUserSettings {
    charListGrid?: boolean;
    tokenizer?: number;
    token_padding?: number;
    collapse_newlines?: boolean;
    pin_examples?: boolean;
    strip_examples?: boolean;
    trim_sentences?: boolean;
    always_force_name2?: boolean;
    user_prompt_bias?: string;
    show_user_prompt_bias?: boolean;
    auto_continue?: AutoContinueSettings;
    markdown_escape_strings?: string;
    chat_truncation?: number;
    streaming_fps?: number;
    smooth_streaming?: boolean;
    smooth_streaming_speed?: number;
    stream_fade_in?: boolean;
    fast_ui_mode?: boolean;
    avatar_style?: number;
    chat_display?: number;
    toastr_position?: string;
    chat_width?: number;
    never_resize_avatars?: boolean;
    show_card_avatar_urls?: boolean;
    play_message_sound?: boolean;
    play_sound_unfocused?: boolean;
    auto_save_msg_edits?: boolean;
    confirm_message_delete?: boolean;
    sort_field?: string;
    sort_order?: 'asc' | 'desc';
    sort_rule?: unknown;
    font_scale?: number;
    blur_strength?: number;
    shadow_width?: number;
    main_text_color?: string;
    italics_text_color?: string;
    underline_text_color?: string;
    quote_text_color?: string;
    blur_tint_color?: string;
    chat_tint_color?: string;
    user_mes_blur_tint_color?: string;
    bot_mes_blur_tint_color?: string;
    shadow_color?: string;
    border_color?: string;
    custom_css?: string;
    waifuMode?: boolean;
    movingUI?: boolean;
    movingUIState?: Record<string, unknown>;
    movingUIPreset?: string;
    noShadows?: boolean;
    theme?: string;
    gestures?: boolean;
    auto_swipe?: boolean;
    auto_swipe_minimum_length?: number;
    auto_swipe_blacklist?: string[];
    auto_swipe_blacklist_threshold?: number;
    auto_scroll_chat_to_bottom?: boolean;
    auto_fix_generated_markdown?: boolean;
    send_on_enter?: number;
    console_log_prompts?: boolean;
    request_token_probabilities?: boolean;
    show_group_chat_queue?: boolean;
    allow_name1_display?: boolean;
    allow_name2_display?: boolean;
    hotswap_enabled?: boolean;
    timer_enabled?: boolean;
    timestamps_enabled?: boolean;
    timestamp_model_icon?: boolean;
    mesIDDisplay_enabled?: boolean;
    hideChatAvatars_enabled?: boolean;
    max_context_unlocked?: boolean;
    message_token_count_enabled?: boolean;
    expand_message_actions?: boolean;
    enableZenSliders?: boolean;
    enableLabMode?: boolean;
    prefer_character_prompt?: boolean;
    prefer_character_jailbreak?: boolean;
    quick_continue?: boolean;
    quick_impersonate?: boolean;
    continue_on_send?: boolean;
    trim_spaces?: boolean;
    relaxed_api_urls?: boolean;
    world_import_dialog?: boolean;
    enable_auto_select_input?: boolean;
    enable_md_hotkeys?: boolean;
    tag_import_setting?: number;
    disable_group_trimming?: boolean;
    single_line?: boolean;
    instruct?: InstructSettings;
    context?: ContextSettings;
    instruct_derived?: boolean;
    context_derived?: boolean;
    context_size_derived?: boolean;
    model_templates_mappings?: Record<string, unknown>;
    chat_template_hash?: string;
    sysprompt?: SystemPromptSettings;
    reasoning?: ReasoningSettings;
    personas?: Record<string, string>;
    default_persona?: string;
    persona_descriptions?: Record<string, PersonaDescription>;
    persona_description?: string;
    persona_description_position?: number;
    persona_description_role?: number;
    persona_description_depth?: number;
    persona_description_lorebook?: string;
    persona_show_notifications?: boolean;
    persona_sort_order?: 'asc' | 'desc';
    custom_stopping_strings?: string;
    custom_stopping_strings_macro?: boolean;
    fuzzy_search?: boolean;
    encode_tags?: boolean;
    servers?: ServerConfig[];
    bogus_folders?: boolean;
    zoomed_avatar_magnification?: boolean;
    show_tag_filters?: boolean;
    aux_field?: string;
    stscript?: STScriptSettings;
    restore_user_input?: boolean;
    reduced_motion?: boolean;
    compact_input_area?: boolean;
    show_swipe_num_all_messages?: boolean;
    auto_connect?: boolean;
    auto_load_chat?: boolean;
    forbid_external_media?: boolean;
    external_media_allowed_overrides?: string[];
    external_media_forbidden_overrides?: string[];
    pin_styles?: boolean;
    click_to_edit?: boolean;
    ui_mode?: number;
    auto_sort_tags?: boolean;
    selectSamplers?: SelectSamplersSettings;
    wi_key_input_plaintext?: boolean;
}

export interface AutoContinueSettings {
    enabled: boolean;
    allow_chat_completions: boolean;
    target_length: number;
}

export interface InstructSettings {
    enabled: boolean;
    preset: string;
    input_sequence: string;
    output_sequence: string;
    last_output_sequence: string;
    system_sequence: string;
    stop_sequence: string;
    wrap: boolean;
    macro: boolean;
    names_behavior: string;
    activation_regex: string;
    first_output_sequence: string;
    skip_examples: boolean;
    output_suffix: string;
    input_suffix: string;
    system_suffix: string;
    user_alignment_message: string;
    system_same_as_user: boolean;
    last_system_sequence: string;
    first_input_sequence: string;
    last_input_sequence: string;
    bind_to_context: boolean;
    sequences_as_stop_strings: boolean;
    story_string_prefix: string;
    story_string_suffix: string;
}

export interface ContextSettings {
    preset: string;
    story_string: string;
    chat_start: string;
    example_separator: string;
    use_stop_strings: boolean;
    names_as_stop_strings: boolean;
    story_string_position: number;
    story_string_depth: number;
    story_string_role: number;
}

export interface SystemPromptSettings {
    enabled: boolean;
    name: string;
    content: string;
    post_history: string;
}

export interface ReasoningSettings {
    name: string;
    auto_parse: boolean;
    add_to_prompts: boolean;
    auto_expand: boolean;
    show_hidden: boolean;
    prefix: string;
    suffix: string;
    separator: string;
    max_additions: number;
}

export interface PersonaDescription {
    description: string;
    position: number;
    depth?: number;
    role?: number;
    lorebook?: string;
    title: string;
    connections?: PersonaConnection[];
}

export interface PersonaConnection {
    type: string;
    id: string;
}

export interface ServerConfig {
    label: string;
    url: string;
    lastConnection: number;
}

export interface STScriptSettings {
    parser: {
        flags: Record<string, boolean>;
    };
    autocomplete: {
        state: number;
        autoHide: boolean;
        style: string;
        font: {
            scale: number;
        };
        width: {
            left: number;
            right: number;
        };
        select: number;
    };
}

export interface SelectSamplersSettings {
    forceHidden: string[];
    forceShown: string[];
}

// Extension Settings Types
export interface ExtensionSettings {
    memory?: MemoryExtensionSettings;
    caption?: CaptionExtensionSettings;
    expressions?: ExpressionsExtensionSettings;
    connection_manager?: ConnectionManagerExtensionSettings;
    dice_roller?: DiceRollerExtensionSettings;
    regex?: RegexExtensionSettings;
    tts?: TTSExtensionSettings;
    sd?: StableDiffusionExtensionSettings;
    chromadb?: ChromaDBExtensionSettings;
    translation?: TranslationExtensionSettings;
    objective?: ObjectiveExtensionSettings;
    quick_reply?: QuickReplyExtensionSettings;
    randomizer?: RandomizerExtensionSettings;
    speech_recognition?: SpeechRecognitionExtensionSettings;
    rvc?: RVCExtensionSettings;
    gallery?: GalleryExtensionSettings;
    cfg?: CFGExtensionSettings;
    'quick-reply-v2'?: QuickReplyV2ExtensionSettings;
    outfit_tracker?: OutfitTrackerExtensionSettings;
    [key: string]: unknown;
}

export interface MemoryExtensionSettings {
    [key: string]: unknown;
}

export interface CaptionExtensionSettings {
    [key: string]: unknown;
}

export interface ExpressionsExtensionSettings {
    [key: string]: unknown;
}

export interface ConnectionManagerExtensionSettings {
    [key: string]: unknown;
}

export interface DiceRollerExtensionSettings {
    [key: string]: unknown;
}

export interface RegexExtensionSettings {
    [key: string]: unknown;
}

export interface TTSExtensionSettings {
    [key: string]: unknown;
}

export interface StableDiffusionExtensionSettings {
    [key: string]: unknown;
}

export interface ChromaDBExtensionSettings {
    [key: string]: unknown;
}

export interface TranslationExtensionSettings {
    [key: string]: unknown;
}

export interface ObjectiveExtensionSettings {
    [key: string]: unknown;
}

export interface QuickReplyExtensionSettings {
    [key: string]: unknown;
}

export interface RandomizerExtensionSettings {
    [key: string]: unknown;
}

export interface SpeechRecognitionExtensionSettings {
    [key: string]: unknown;
}

export interface RVCExtensionSettings {
    [key: string]: unknown;
}

export interface GalleryExtensionSettings {
    [key: string]: unknown;
}

export interface CFGExtensionSettings {
    [key: string]: unknown;
}

export interface QuickReplyV2ExtensionSettings {
    [key: string]: unknown;
}

export interface OutfitTrackerExtensionSettings {
    [key: string]: unknown;
}

// Chat Completion and Text Completion Settings Types
export interface ChatCompletionSettings {
    [key: string]: unknown;
}

export interface TextCompletionSettings {
    [key: string]: unknown;
}

// Manifest Types
export interface ExtensionManifest {
    display_name: string;
    loading_order?: number;
    requires?: string[];
    optional?: string[];
    dependencies?: string[];
    js: string;
    css?: string;
    author: string;
    version: string;
    homePage?: string;
    auto_update?: boolean;
    minimum_client_version?: string;
    i18n?: Record<string, string>;
    generate_interceptor?: string;
    [key: string]: unknown;
}

// Slash Command Types
export interface SlashCommandArgument {
    description: string;
    typeList: string[];
    isRequired?: boolean;
}

export interface SlashCommandNamedArgument {
    name: string;
    description: string;
    typeList: string[];
    defaultValue?: string;
    enumList?: string[];
}

export interface SlashCommand {
    name: string;
    callback: (...args: unknown[]) => unknown;
    aliases?: string[];
    returns?: string;
    namedArgumentList?: SlashCommandNamedArgument[];
    unnamedArgumentList?: SlashCommandArgument[];
    helpString?: string;
}

export interface SlashCommandFromProps {
    name: string;
    callback: (...args: unknown[]) => unknown;
    aliases?: string[];
    returns?: string;
    namedArgumentList?: SlashCommandNamedArgument[];
    unnamedArgumentList?: SlashCommandArgument[];
    helpString?: string;
}

// SillyTavern Context Types
export interface SillyTavernContext {
    // Core chat and character data
    characterId?: number | null;
    characters?: TavernCard[];
    chat?: ChatMessage[];
    chatId?: string | null;
    groups?: Group[];
    groupId?: string | null;
    name1?: string; // User's name
    name2?: string; // Current character's name

    // Settings and storage
    accountStorage?: Record<string, unknown>;
    extensionSettings?: ExtensionSettings;
    powerUserSettings?: PowerUserSettings;
    chatMetadata?: { chat_id_hash: number };
    createCharacterData?: Record<string, unknown>;

    // API and connection
    mainApi?: string;
    onlineStatus?: string;
    maxContext?: number;
    chatCompletionSettings?: ChatCompletionSettings;
    textCompletionSettings?: TextCompletionSettings;
    ConnectionManagerRequestService?: ConnectionManagerRequestService;

    // UI and display
    tags?: Tag[];
    tagMap?: Record<string, string[]>;
    menuType?: string;
    POPUP_TYPE?: Record<string, number>;
    POPUP_RESULT?: Record<string, number | null>;

    // Event system
    eventSource?: EventSource;
    event_types?: Record<string, string>;

    // Tokenization and processing
    tokenizers?: Record<string, number>;
    streamingProcessor?: StreamingProcessor | null;
    extensionPrompts?: Record<string, unknown>;
    ARGUMENT_TYPE?: Record<string, string>;

    // Functions
    saveSettings?: (data?: unknown) => void;
    saveSettingsDebounced?: (data?: unknown) => void;
    saveMetadata?: () => void;
    writeExtensionField?: (extensionName: string, field: string, value: unknown) => void;
    addLocaleData?: (locale: string, data: unknown) => void;
    generateQuietPrompt?: (prompt: string, options?: GenerateOptions) => Promise<string>;
    generateRaw?: (prompt: string | ChatMessageForGeneration[], options?: GenerateRawOptions) => Promise<string>;
    registerMacro?: (name: string, func: () => unknown) => void;
    unregisterMacro?: (name: string) => void;
    getPresetManager?: () => PresetManager;
    getName?: (type?: string) => string;
    this_chid?: number;

    [key: string]: unknown;
}

export type STContext = SillyTavernContext;

// Chat Message Types
export interface ChatMessage {
    name: string;
    is_user: boolean;
    is_system: boolean;
    send_date: string;
    mes: string;
    extra?: ChatMessageExtra;
    swipe_id?: number;
    swipes?: string[];
    swipe_info?: SwipeInfo[];
    continueHistory?: ContinueHistoryEntry[];
    continueSwipeId?: number;
    continueSwipe?: ContinueSwipe;
    force_avatar?: string;
    uses_system_ui?: boolean;
    isSmallSys?: boolean;
    type?: string;
    [key: string]: unknown;
}

export interface ChatMessageExtra {
    outfit_injection?: boolean;
    type?: string;
    [key: string]: unknown;
}

export interface SwipeInfo {
    send_date: string;
    gen_started: string;
    gen_finished: string;
    [key: string]: unknown;
}

export interface ContinueHistoryEntry {
    [key: string]: unknown;
}

export interface ContinueSwipe {
    [key: string]: unknown;
}

// Auto Outfit System Types
export type AutoOutfitSystemConstructor = new (botManager: OutfitManager) => AutoOutfitSystemAPI;

export interface IDummyAutoOutfitSystem {
    name: string;
}

// Character Types
export interface CharacterData {
    name?: string;
    extensions?: {
        character_id?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface Character {
    name?: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    creatorcomment?: string;
    avatar?: string;
    chat?: string;
    talkativeness?: string;
    fav?: boolean;
    tags?: string[];
    spec?: string;
    spec_version?: string;
    data?: CharacterData;
    create_date?: string;
    json_data?: string;
    date_added?: number;
    chat_size?: number;
    date_last_chat?: number;
    data_size?: number;
    character_book?: CharacterBook;
    alternate_greetings?: string[];
    group_only_greetings?: string[];
    [key: string]: unknown;
}

// Tavern Card Types (matches global.d.ts definition)
export interface TavernCardV1 {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    [key: string]: unknown;
}

export interface CharacterBookEntry {
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

export interface CharacterBook {
    name?: string;
    description?: string;
    scan_depth?: number;
    token_budget?: number;
    recursive_scanning?: boolean;
    extensions: Record<string, any>;
    entries: CharacterBookEntry[];
}

export interface TavernCardV2 {
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
    [key: string]: unknown;
}

export type TavernCard = TavernCardV1 | TavernCardV2;

// DOM and Browser API Types
export interface HTMLElementWithExtensions extends HTMLElement {
    [key: string]: unknown;
}

export interface OutfitCommandEvent extends Event {
    detail?: {
        command: OutfitCommand;
        [key: string]: unknown;
    };
}

export interface OutfitSlotData {
    [slotName: string]: string;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    source?: string;
    data?: unknown;
    formattedMessage?: string;
}

export {};
