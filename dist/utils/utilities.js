var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { debugLog } from '../logging/DebugLogger.js';
/**
 * Utility functions for Outfit Tracker Extension
 */
import { macroProcessor } from '../processors/MacroProcessor.js';
export function generateShortId(id, maxLength = 8) {
    if (!id) {
        return '';
    }
    if (id.startsWith('temp_')) {
        return 'temp';
    }
    // Manually remove non-alphanumeric characters without regex
    let cleanId = '';
    for (let i = 0; i < id.length; i++) {
        const char = id[i];
        if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
            cleanId += char;
        }
    }
    return cleanId.substring(0, maxLength) || id.substring(0, maxLength);
}
/**
 * Generates an 8-character hash from a text string
 * @param {string} text - The text to hash
 * @returns {string} - 8-character hash string
 */
export function generateMessageHash(text) {
    if (!text) {
        return '';
    }
    let hash = 0;
    const str = text.substring(0, 100);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8).padEnd(8, '0');
}
/**
 * Sleep function to pause execution
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after ms milliseconds
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Validates if a slot name is valid
 * @param {string} slotName - The slot name to validate
 * @param {Array} allSlots - Array of all valid slot names
 * @returns {boolean} - True if the slot name is valid
 */
export function isValidSlot(slotName, allSlots) {
    return allSlots && Array.isArray(allSlots) && allSlots.includes(slotName);
}
/**
 * Safely gets a nested property from an object
 * @param obj - The object to get the property from
 * @param path - Dot notation path to the property
 * @param defaultValue - Value to return if path doesn't exist
 * @returns The value at the path or the default value
 */
export function safeGet(obj, path, defaultValue = null) {
    try {
        return path.split('.').reduce((acc, key) => acc && acc[key], obj) || defaultValue;
    }
    catch (error) {
        debugLog(`Error in safeGet for path "${path}":`, error, 'error');
        return defaultValue;
    }
}
/**
 * Creates a deep clone of an object
 * @param obj - The object to clone
 * @returns A deep clone of the input object
 */
export function deepClone(obj) {
    const visited = new WeakMap();
    function clone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (visited.has(obj)) {
            return visited.get(obj);
        }
        if (Array.isArray(obj)) {
            const clonedArr = [];
            visited.set(obj, clonedArr);
            for (let i = 0; i < obj.length; i++) {
                clonedArr[i] = clone(obj[i]);
            }
            return clonedArr;
        }
        if (typeof obj === 'object' && obj.constructor === Object) {
            const clonedObj = {};
            visited.set(obj, clonedObj);
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    clonedObj[key] = clone(obj[key]);
                }
            }
            return clonedObj;
        }
        // For other objects (Dates, functions, custom classes, etc.), return as-is to avoid issues
        return obj;
    }
    return clone(obj);
}
/**
 * Performs a deep merge of two objects
 * @param {object} target - The target object to merge into
 * @param {object} source - The source object to merge from
 * @returns {object} A new object that is the deep merge of target and source
 */
export function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach((key) => {
            const sourceKey = key;
            const targetKey = key;
            const sourceValue = source[sourceKey];
            if (sourceValue && typeof sourceValue === 'object' && targetKey in target) {
                output[key] = deepMerge(target[targetKey], sourceValue);
            }
            else {
                output[key] = sourceValue;
            }
        });
    }
    return output;
}
/**
 * Formats a slot name for display purposes
 * @param {string} slotName - The raw slot name to format
 * @returns {string} The formatted slot name
 */
export function formatSlotName(slotName) {
    if (typeof slotName !== 'string') {
        return 'Unknown';
    }
    const slotNameMap = {
        topunderwear: 'Top Underwear / Inner Top',
        bottomunderwear: 'Bottom Underwear / Inner Bottom',
        footunderwear: 'Foot Underwear / Socks',
        'head-accessory': 'Head Accessory',
        'ears-accessory': 'Ears Accessory',
        'eyes-accessory': 'Eyes Accessory',
        'mouth-accessory': 'Mouth Accessory',
        'neck-accessory': 'Neck Accessory',
        'body-accessory': 'Body Accessory',
        'arms-accessory': 'Arms Accessory',
        'hands-accessory': 'Hands Accessory',
        'waist-accessory': 'Waist Accessory',
        'bottom-accessory': 'Bottom Accessory',
        'legs-accessory': 'Legs Accessory',
        'foot-accessory': 'Foot Accessory',
    };
    if (slotNameMap[slotName]) {
        return slotNameMap[slotName];
    }
    let result = slotName.replace(/([a-z])([A-Z])/g, '$1 $2');
    result = result.charAt(0).toUpperCase() + result.slice(1);
    result = result.replace(/-/g, ' ');
    result = result.replace(/underwear/gi, 'Underwear');
    return result;
}
/**
 * Internal function to generate an instance ID from text using a simple hash algorithm
 * @param {string} text - The input text to hash
 * @returns {string} The generated instance ID
 */
function generateInstanceIdFromTextSimple(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}
/**
 * Normalizes text by removing macro values to ensure consistent instance IDs.
 * @param {string} text - The input text.
 * @returns {string} The normalized text.
 */
function normalizeTextForInstanceId(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    let result = text;
    let startIndex = 0;
    while (startIndex < result.length) {
        const openIdx = result.indexOf('{{', startIndex);
        if (openIdx === -1) {
            break;
        }
        const closeIdx = result.indexOf('}}', openIdx);
        if (closeIdx === -1) {
            break;
        }
        // Replace the entire {{...}} pattern with {{}}
        result = result.substring(0, openIdx) + '{{}}' + result.substring(closeIdx + 2);
        // Advance startIndex to the next position after the replacement
        startIndex = openIdx + '{{}}'.length;
    }
    return result;
}
/**
 * Generates a unique instance ID from a given text.
 * @param {string} text - The input text.
 * @param {Array<string>} [valuesToRemove] - Optional array of values to remove from the text before hashing.
 * @returns {Promise<string>} A promise that resolves to the instance ID.
 */
/**
 * Generates a UUID v4 (random GUID)
 * @returns {string} A UUID v4 string
 */
export function generateGUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback implementation for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export function generateInstanceIdFromText(text_1) {
    return __awaiter(this, arguments, void 0, function* (text, valuesToRemove = null) {
        let processedText = text;
        // If specific values to remove are provided, remove them from the text
        if (valuesToRemove && Array.isArray(valuesToRemove)) {
            valuesToRemove.forEach((value) => {
                if (value && typeof value === 'string') {
                    // Remove the value case-insensitively
                    const tempText = processedText;
                    let lowerTempText = tempText.toLowerCase();
                    const lowerValue = value.toLowerCase();
                    let startIndex = 0;
                    while ((startIndex = lowerTempText.indexOf(lowerValue, startIndex)) !== -1) {
                        // Check if it's a complete word match to avoid partial replacements
                        const endIndex = startIndex + lowerValue.length;
                        // Check if it's surrounded by word boundaries
                        const beforeChar = startIndex > 0 ? lowerTempText.charAt(startIndex - 1) : ' ';
                        const afterChar = endIndex < lowerTempText.length ? lowerTempText.charAt(endIndex) : ' ';
                        if ((beforeChar === ' ' ||
                            beforeChar === '.' ||
                            beforeChar === ',' ||
                            beforeChar === '"' ||
                            beforeChar === "'" ||
                            beforeChar === '(' ||
                            beforeChar === '[') &&
                            (afterChar === ' ' ||
                                afterChar === '.' ||
                                afterChar === ',' ||
                                afterChar === '"' ||
                                afterChar === "'" ||
                                afterChar === ')' ||
                                afterChar === ']')) {
                            processedText =
                                processedText.substring(0, startIndex) +
                                    '[OUTFIT_REMOVED]' +
                                    processedText.substring(endIndex);
                            lowerTempText = processedText.toLowerCase();
                        }
                        startIndex = endIndex;
                    }
                }
            });
        }
        const normalizedText = normalizeTextForInstanceId(processedText);
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(normalizedText);
                const hashBuffer = yield crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')
                    .substring(0, 16);
            }
            catch (err) {
                debugLog('Crypto API failed, falling back to simple hash for instance ID generation', err, 'warn');
                return generateInstanceIdFromTextSimple(normalizedText);
            }
        }
        else {
            return generateInstanceIdFromTextSimple(normalizedText);
        }
    });
}
/**
 * Unified message scrubber for instance ID calculation - used by both macro system and OutfitTracker
 */
export function scrubMessageForInstanceId(message, charName, outfitValues) {
    let processedMessage = message;
    // Replace {{char}} with character name if provided (simulates SillyTavern macro processing)
    // If no charName provided, replace {{char}} with placeholder (for macro system)
    if (charName) {
        processedMessage = processedMessage.replace(/\{\{char\}\}/g, charName);
    }
    else {
        processedMessage = processedMessage.replace(/\{\{char\}\}/g, '[CHAR_NAME]');
    }
    // Clean outfit macros from the text (replace {{char_topwear}} with {{}})
    processedMessage = macroProcessor.cleanOutfitMacrosFromText(processedMessage);
    // If outfit values are provided, remove them from the text (OutfitTracker logic)
    if (outfitValues && outfitValues.length > 0) {
        for (const value of outfitValues) {
            if (value && typeof value === 'string' && value.trim() !== '') {
                // Escape special regex characters in the value
                const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedValue, 'gi');
                processedMessage = processedMessage.replace(regex, '');
            }
        }
    }
    // Clean up extra whitespace that might result from replacements
    processedMessage = processedMessage.replace(/\s+/g, ' ').trim();
    return processedMessage;
}
