interface PanelColors {
    primary: string;
    border: string;
    shadow: string;
}

interface DefaultSettings {
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

// Constants for Outfit Tracker Extension

/**
 * Array of clothing slot names used in the outfit system
 * @type {string[]}
 */
export const CLOTHING_SLOTS: string[] = [
    'headwear',
    'topwear',
    'topunderwear',
    'bottomwear',
    'footwear',
    'footunderwear',
];

/**
 * Array of accessory slot names used in the outfit system
 * @type {string[]}
 */
export const ACCESSORY_SLOTS: string[] = [
    'head-accessory',
    'ears-accessory',
    'eyes-accessory',
    'mouth-accessory',
    'neck-accessory',
    'body-accessory',
    'arms-accessory',
    'hands-accessory',
    'waist-accessory',
    'bottom-accessory',
    'legs-accessory',
    'foot-accessory',
];

/**
 * Combined array of all outfit slot names
 * @type {string[]}
 */
export const ALL_SLOTS: string[] = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];

/**
 * Default settings for the outfit tracker extension
 * @type {object}
 * @property {boolean} autoOpenBot - Whether to automatically open the bot outfit panel
 * @property {boolean} autoOpenUser - Whether to automatically open the user outfit panel
 * @property {string} position - The position of the outfit panels
 * @property {boolean} enableSysMessages - Whether to enable system messages
 * @property {boolean} autoOutfitSystem - Whether the auto outfit system is enabled
 * @property {boolean} debugMode - Whether debug mode is enabled
 * @property {string} autoOutfitPrompt - The prompt for the auto outfit system
 * @property {string|null} autoOutfitConnectionProfile - The connection profile for auto outfit system
 * @property {object} botPanelColors - Color settings for the bot outfit panel
 * @property {string} botPanelColors.primary - Primary color gradient for bot panel
 * @property {string} botPanelColors.border - Border color for bot panel
 * @property {string} botPanelColors.shadow - Shadow color for bot panel
 * @property {object} userPanelColors - Color settings for the user outfit panel
 * @property {string} userPanelColors.primary - Primary color gradient for user panel
 * @property {string} userPanelColors.border - Border color for user panel
 * @property {string} userPanelColors.shadow - Shadow color for user panel
 */
export const DEFAULT_SETTINGS: DefaultSettings = Object.freeze({
    autoOpenBot: true,
    autoOpenUser: false,
    position: 'right',
    enableSysMessages: true,
    autoOutfitSystem: false,
    debugMode: false,
    autoOutfitPrompt:
        'After each character response, analyze the conversation to identify any outfit changes (items worn, removed, or changed). Provide updates in the format: "/outfit-wear slotName item", "/outfit-remove slotName", or "/outfit-change slotName newItem". Only output the commands, no additional text.',
    autoOutfitConnectionProfile: null,
    botPanelColors: {
        primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
        border: '#8a7fdb',
        shadow: 'rgba(106, 79, 193, 0.4)',
    },
    userPanelColors: {
        primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
        border: '#5da6f0',
        shadow: 'rgba(26, 120, 209, 0.4)',
    },
    defaultBotPresets: {},
    defaultUserPresets: {},
});

/**
 * Constants for outfit command types
 * @type {object}
 * @property {string} WEAR - Command to wear an item
 * @property {string} REMOVE - Command to remove an item
 * @property {string} CHANGE - Command to change an item
 */
export const OUTFIT_COMMANDS: { [key: string]: string } = {
    WEAR: 'wear',
    REMOVE: 'remove',
    CHANGE: 'change',
};
