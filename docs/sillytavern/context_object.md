# SillyTavern Context Object Documentation

## Overview

The SillyTavern context object contains all the essential data for a chat session, including characters, chat history,
settings, and extension configurations. This document provides detailed information about each field in the context
object.

## Important Naming Convention

- `name1`: The user's name (as referenced in the chat)
- `name2`: The current character's name

## Complete Field Reference

### Root Level Fields

#### `accountStorage`

- **Type**: Object
- **Purpose**: Stores account-specific data (empty in this example)

#### `chat`

- **Type**: Array
- **Purpose**: Contains the chat message history
- **Content**: Array of message objects with fields:
    - `name`: Name of the message sender
    - `force_avatar`: Path to avatar image
    - `mes`: The message text content
    - `is_system`: Boolean indicating if it's a system message
    - `is_user`: Boolean indicating if it's a user message
    - `send_date`: Timestamp when the message was sent
    - `extra`: Additional message metadata
        - `type`: Type of system message
    - `isSmallSys`: Boolean for small system messages
    - `uses_system_ui`: Boolean for system UI usage
    - `type`: Additional message type identifier

#### `characters`

- **Type**: Array
- **Purpose**: Array of character objects in the current session
- **Content**: Each character object contains the full character card data as defined by the character card
  specification. For a complete example, see [character_example.json](character_example.json).
    - `name`: Character's name
    - `description`: Character's description and personality traits
    - `personality`: Brief personality summary
    - `first_mes`: Character's first message/greeting
    - `avatar`: Character's avatar image filename
    - `chat`: Identifier for the character's chat
    - `mes_example`: Example messages from the character
    - `scenario`: Character's scenario/background
    - `create_date`: Timestamp of character creation
    - `talkativeness`: Character's conversation level (0.0-1.0)
    - `fav`: Whether character is favorited
    - `creatorcomment`: Creator's notes about the character
    - `spec`: Character card specification (e.g., "chara_card_v3")
    - `spec_version`: Character card version (e.g., "3.0")
    - `data`: Complete character card data in the original format
    - `group_only_greetings`: Array of greetings for group chats
    - `json_data`: JSON string representation of the character
    - `date_added`: Timestamp when character was added to system
    - `chat_size`: Size of the character's chat
    - `date_last_chat`: Timestamp of last chat with character
    - `data_size`: Size of character data
    - `character_book`: Character's world info entries
        - `entries`: Array of world info entries with fields:
            - `id`: Entry ID
            - `keys`: Keywords that trigger the entry
            - `content`: Content of the entry
            - `constant`: Whether entry is always active
            - `selective`: Whether entry uses selection logic
            - `insertion_order`: Order of insertion
            - `enabled`: Whether entry is enabled
            - `position`: Position of entry in prompt
            - `use_regex`: Whether to use regex for matching
            - `extensions`: Additional entry settings
        - `name`: Name of the character book

#### `groups`

- **Type**: Array
- **Purpose**: Stores group chat information (empty in this example)

#### `name1`

- **Type**: String
- **Purpose**: Represents the user's name (as referenced in the chat)

#### `name2`

- **Type**: String
- **Purpose**: Represents the current character's name

#### `groupId`

- **Type**: String or null
- **Purpose**: Identifier for group chat (null if not in a group)

#### `onlineStatus`

- **Type**: String
- **Purpose**: Current API connection status (e.g., "Connected")

#### `maxContext`

- **Type**: Number
- **Purpose**: Maximum context size (tokens) allowed (8192)

#### `chatMetadata`

- **Type**: Object
- **Purpose**: Additional chat metadata
- **Content**:
    - `chat_id_hash`: Hash identifier for the chat

#### `streamingProcessor`

- **Type**: Object or null
- **Purpose**: Handles streaming response processing (null in this example)

#### `eventSource`

- **Type**: Object
- **Purpose**: Event emitter for SillyTavern events
- **Content**:
    - `events`: Object mapping event names to arrays of handlers
    - `autoFireLastArgs`: Object for auto-fired events
    - `autoFireAfterEmit`: Event post-processing object

#### `eventTypes`

- **Type**: Object
- **Purpose**: Maps event name constants to their string identifiers

#### `tokenizers`

- **Type**: Object
- **Purpose**: Available tokenizers for different models
- **Values**: NONE, GPT2, OPENAI, LLAMA, NERD, NERD2, API_CURRENT, MISTRAL, YI, API_TEXTGENERATIONWEBUI, API_KOBOLD,
  CLAUDE, LLAMA3, GEMMA, JAMBA, QWEN2, COMMAND_R, NEMO, DEEPSEEK, COMMAND_A, BEST_MATCH

#### `extensionPrompts`

- **Type**: Object
- **Purpose**: Prompts used by extensions

#### `ARGUMENT_TYPE`

- **Type**: Object
- **Purpose**: Defines argument types for function calls
- **Values**: STRING, NUMBER, RANGE, BOOLEAN, VARIABLE_NAME, CLOSURE, SUBCOMMAND, LIST, DICTIONARY

#### `mainApi`

- **Type**: String
- **Purpose**: The main API being used (e.g., "koboldhorde")

#### `extensionSettings`

- **Type**: Object
- **Purpose**: Settings for all active extensions
- **Content**: Detailed configuration for:
    - Memory extension
    - Caption extension
    - Expressions extension
    - Connection manager
    - Dice roller
    - Regex extension
    - Text-to-speech (TTS)
    - Stable Diffusion (SD) image generation
    - ChromaDB vector storage
    - Translation
    - Objective tracking
    - Quick Reply
    - Randomizer
    - Speech recognition
    - RVC (Retrieval-based Voice Conversion)
    - Gallery
    - CFG (Classifier-Free Guidance)
    - Quick Reply V2
    - And more

#### `tags`

- **Type**: Array
- **Purpose**: Array of tag objects with ID, name, and color

#### `tagMap`

- **Type**: Object
- **Purpose**: Maps file paths to their associated tags

#### `menuType`

- **Type**: String
- **Purpose**: Current menu type (empty string for default)

#### `createCharacterData`

- **Type**: Object
- **Purpose**: Template data used when creating new characters

#### `event_types`

- **Type**: Object
- **Purpose**: Duplicate mapping of event types (alternative to eventTypes)

#### `POPUP_TYPE`

- **Type**: Object
- **Purpose**: UI popup type constants
- **Values**: TEXT, CONFIRM, INPUT, DISPLAY, CROP

#### `POPUP_RESULT`

- **Type**: Object
- **Purpose**: Possible results from popup interactions
- **Values**: AFFIRMATIVE, NEGATIVE, CANCELLED, CUSTOM1-9

#### `chatCompletionSettings`

- **Type**: Object
- **Purpose**: Settings for chat completion APIs
- **Content**:
    - Model parameters (temperature, frequency penalty, etc.)
    - Prompt templates and ordering
    - Stopping strings
    - Bias presets
    - Model-specific configurations
    - API connection settings

#### `textCompletionSettings`

- **Type**: Object
- **Purpose**: Settings for text completion APIs
- **Content**:
    - Sampling parameters (temperature, top_p, top_k, etc.)
    - Repetition penalties
    - Token generation parameters
    - Model-specific settings
    - Stopping conditions

#### `powerUserSettings`

- **Type**: Object
- **Purpose**: Advanced user settings
- **Content**:
    - UI preferences (theme, font scale, etc.)
    - Display settings (avatar style, chat display mode)
    - Chat behavior (auto-continue, send on enter, etc.)
    - Instruct mode settings
    - Context formatting options
    - Reasoning settings
    - Accessibility options
    - Custom CSS
    - And many more

#### `CONNECT_API_MAP`

- **Type**: Object
- **Purpose**: Maps API names to their button selectors and configuration

#### `symbols`

- **Type**: Object
- **Purpose**: Additional symbol definitions (empty in this example)

## Special Notes

- `name1` typically refers to the user's name in the chat
- `name2` typically refers to the character's name
- Most extension settings follow a similar pattern with model-specific parameters, endpoints, and behavior flags
- The context object is deeply nested and contains thousands of configuration options
- This object is used internally by SillyTavern to maintain the complete state of a chat session