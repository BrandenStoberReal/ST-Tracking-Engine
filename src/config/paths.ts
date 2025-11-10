// Define path constants for SillyTavern core modules
// Extensions are installed in public/extensions/third-party/[extension-name]/
// So core modules are located at relative paths from extension files

// Base path with 6 levels of parent directory for consistent access to SillyTavern core
const ROOTDIR = '../../../../../../';

interface SillyTavernPaths {
    EXTENSIONS: string;
    SCRIPT: string;
    SLASH_COMMANDS: {
        PARSER: string;
        COMMAND: string;
        ARGUMENT: string;
    };
}

export const SILLY_TAVERN_PATHS: SillyTavernPaths = {
    // Path to extensions.js from extension files (when extension is in public/extensions/third-party/[name]/)
    EXTENSIONS: ROOTDIR + 'scripts/extensions.js',

    // Path to main script.js from extension files
    SCRIPT: ROOTDIR + 'script.js',

    // Path to slash commands from extension files
    SLASH_COMMANDS: {
        PARSER: ROOTDIR + 'slash-commands/SlashCommandParser.js',
        COMMAND: ROOTDIR + 'slash-commands/SlashCommand.js',
        ARGUMENT: ROOTDIR + 'slash-commands/SlashCommandArgument.js',
    },
};
