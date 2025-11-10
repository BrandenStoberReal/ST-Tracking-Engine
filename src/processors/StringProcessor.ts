/**
 * String processing utilities without regex
 */

// Helper function to replace all occurrences of a substring without using regex
export function replaceAll(str: string, searchValue: string, replaceValue: string): string {
    if (!searchValue) {
        return str;
    }

    // Prevent infinite loops when the replacement value contains the search value
    if (searchValue === replaceValue) {
        return str;
    }

    let result = str;
    let index = result.indexOf(searchValue);

    while (index !== -1) {
        result = result.substring(0, index) + replaceValue + result.substring(index + searchValue.length);
        // Move past the replacement value to prevent infinite loops
        index = result.indexOf(searchValue, index + replaceValue.length);
    }

    return result;
}

// Function to check if a string matches the pattern ^[a-zA-Z0-9_-]+$
function _isValidSlotName(str: string): boolean {
    if (str.length === 0) {
        return false;
    }

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (
            !(
                (char >= 'a' && char <= 'z') ||
                (char >= 'A' && char <= 'Z') ||
                (char >= '0' && char <= '9') ||
                char === '_' ||
                char === '-'
            )
        ) {
            return false;
        }
    }

    return true;
}

// Function to extract all commands matching the pattern without using regex
// Looking for patterns like: outfit-system_wear_headwear("Red Baseball Cap")
// Helper function to find the closing quote, handling escaped quotes
function findClosingQuote(text: string, startIndex: number): number {
    let i = startIndex;

    while (i < text.length) {
        if (text[i] === '"') {
            return i + 1; // Return the position after the closing quote
        }
        if (text[i] === '\\' && i + 1 < text.length) {
            i += 2; // Skip escaped character
        } else {
            i++;
        }
    }
    return text.length; // Return the end of the string if no closing quote is found
}

function findNextCommand(text: string, startIndex: number): { command: string | null; nextIndex: number } | null {
    const pattern = 'outfit-system_';
    const patternIndex = text.indexOf(pattern, startIndex);

    if (patternIndex === -1) {
        return null;
    }

    const actionStart = patternIndex + pattern.length;
    const actionEnd = text.indexOf('_', actionStart);

    if (actionEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const action = text.substring(actionStart, actionEnd);

    if (!['wear', 'remove', 'change'].includes(action)) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const slotStart = actionEnd + 1;
    const slotEnd = text.indexOf('(', slotStart);

    if (slotEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const slot = text.substring(slotStart, slotEnd);

    if (!_isValidSlotName(slot)) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const parenStart = slotEnd;
    let parenCount = 0;
    let parenEnd = -1;
    let i = parenStart;

    if (text[i] === '(') {
        parenCount = 1;
        i++;

        while (i < text.length && parenCount > 0) {
            if (text[i] === '(') {
                parenCount++;
            } else if (text[i] === ')') {
                parenCount--;
            } else if (text[i] === '"') {
                i = findClosingQuote(text, i + 1);
                continue; // Continue to the next character
            }
            i++;
        }

        if (parenCount === 0) {
            parenEnd = i - 1;
        }
    }

    if (parenEnd === -1) {
        return { command: null, nextIndex: patternIndex + 1 };
    }

    const fullCommand = text.substring(patternIndex, parenEnd + 1);

    return { command: fullCommand, nextIndex: parenEnd + 1 };
}

export function extractCommands(text: string): string[] {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const commands: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const result = findNextCommand(text, startIndex);

        if (!result) {
            break;
        }

        if (result.command) {
            commands.push(result.command);
        }

        startIndex = result.nextIndex;
    }

    return commands;
}

// Function to extract multiple values from a text without using regex
export function extractValues(
    text: string,
    startMarker: string,
    endMarker: string
): {
    fullMatch: string;
    value: string;
}[] {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const values: { fullMatch: string; value: string }[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        const startIdx = text.indexOf(startMarker, startIndex);

        if (startIdx === -1) {
            break;
        }

        const contentStart = startIdx + startMarker.length;
        const endIdx = text.indexOf(endMarker, contentStart);

        if (endIdx === -1) {
            // No closing marker found, invalid format
            startIndex = startIdx + 1;
            continue;
        }

        const value = text.substring(contentStart, endIdx);

        values.push({
            fullMatch: text.substring(startIdx, endIdx + endMarker.length),
            value,
        });

        startIndex = endIdx + endMarker.length;
    }

    return values;
}

// Function to safely access nested properties
export function safeGet(obj: any, path: string, defaultValue: any = null): any {
    if (!obj || typeof obj !== 'object') {
        return defaultValue;
    }

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[key];
    }

    return current !== undefined ? current : defaultValue;
}

// Function to safely set nested properties
export function safeSet(obj: any, path: string, value: any): void {
    if (!obj || typeof obj !== 'object') {
        return;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;

    for (const key of keys) {
        if (current[key] === null || current[key] === undefined || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    if (lastKey !== undefined) {
        current[lastKey] = value;
    }
}

// Function to remove macros from a string
export function removeMacros(text: string): string {
    if (!text || typeof text !== 'string') {
        return text;
    }

    let result = text;

    // Remove {{...}} patterns iteratively without regex
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

        // Remove the entire {{...}} pattern
        result = result.substring(0, openIdx) + result.substring(closeIdx + 2);
        // Don't advance startIndex since we modified the string
        startIndex = openIdx;
    }

    // Remove <...> patterns iteratively without regex
    startIndex = 0;
    while (startIndex < result.length) {
        const openIdx = result.indexOf('<', startIndex);

        if (openIdx === -1) {
            break;
        }

        const closeIdx = result.indexOf('>', openIdx);

        if (closeIdx === -1) {
            break;
        }

        // Remove the entire <...> pattern
        result = result.substring(0, openIdx) + result.substring(closeIdx + 1);
        // Don't advance startIndex since we modified the string
        startIndex = openIdx;
    }

    return result;
}
