// Constants for Outfit Tracker Extension
/**
 * Array of clothing slot names used in the outfit system
 * @type {string[]}
 */
export const CLOTHING_SLOTS = [
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
export const ACCESSORY_SLOTS = [
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
export const ALL_SLOTS = [...CLOTHING_SLOTS, ...ACCESSORY_SLOTS];
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
export const DEFAULT_SETTINGS = Object.freeze({
    autoOpenBot: true,
    autoOpenUser: false,
    position: 'right',
    enableSysMessages: true,
    autoOutfitSystem: false,
    debugMode: false,
    autoOutfitPrompt: `You are a sophisticated outfit management AI. Your task is to analyze conversation snippets and identify any changes to a character's clothing or accessories. Based on your analysis, you must output a series of commands to update the character's outfit accordingly.

**TASK**
Based on the provided conversation, generate a sequence of commands to reflect any and all changes to the character's outfit.

**COMMANDS**
You have the following commands at your disposal:
- \`outfit-system_wear_<slot>("item name")\`
- \`outfit-system_remove_<slot>()\`
- \`outfit-system_change_<slot>("new item name")\`
- \`outfit-system_replace_<slot>("new item name")\`
- \`outfit-system_unequip_<slot>()\`

**SLOTS**
- Clothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear
- Accessories: head-accessory, ear-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory

**INSTRUCTIONS**
- Only output commands for explicit clothing changes.
- If no changes are detected, output only \`[none]\`.
- Do not include any explanations or conversational text in your output.
- Ensure that the item names are enclosed in double quotes.

**EXAMPLES**
- **User:** I'm feeling a bit cold.
  **Character:** I'll put on my favorite sweater.
  **Output:**
  \`outfit-system_wear_topwear("Favorite Sweater")\`

- **User:** Your shoes are untied.
  **Character:** Oh, thanks for letting me know. I'll take them off and tie them properly.
  **Output:**
  \`outfit-system_remove_footwear()\`

- **User:** That's a nice hat.
  **Character:** Thanks! It's new. I'll take it off for a moment to show you.
  **Output:**
  \`outfit-system_unequip_headwear()\`

- **User:** I like your shirt.
  **Character:** Thanks! I think I'll unbutton it a bit.
  **Output:**
  \`outfit-system_change_topwear("Shirt (unbuttoned)")\`

- **User:** It's getting warm in here.
  **Character:** I agree. I'll take off my jacket and put on this t-shirt instead.
  **Output:**
  \`outfit-system_replace_topwear("T-shirt")\`
`,
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
