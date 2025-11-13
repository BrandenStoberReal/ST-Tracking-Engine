# Character Example Documentation

## Overview

This document explains the structure and purpose of the character_example.json file, which represents a typical
SillyTavern character card object. This example uses the character card v3 specification.

## File Purpose

The character_example.json file demonstrates the complete structure of a character object as used in SillyTavern. This
includes all fields required for character definition, metadata, and extension data.

## Field Reference

### Basic Character Information

- `name`: The character's name as it appears in conversations
- `description`: Detailed description of the character
- `personality`: Brief summary of the character's personality
- `scenario`: Background scenario or setting for the character
- `first_mes`: The character's first message when starting a new chat
- `mes_example`: Example messages that demonstrate the character's speaking style
- `creatorcomment`: Notes from the character's creator
- `avatar`: Filename of the character's avatar image
- `chat`: Identifier for the character's chat history

### Character Card Metadata

- `spec`: Character card specification version (e.g., "chara_card_v3")
- `spec_version`: Specific version of the spec (e.g., "3.0")
- `create_date`: Timestamp when the character was created
- `date_added`: Unix timestamp when character was added to the system
- `date_last_chat`: Unix timestamp of last chat with this character
- `chat_size`: Size/length of the character's chat history
- `data_size`: Size of the character's stored data

### Behavior Settings

- `talkativeness`: Numeric value (0.0-1.0) representing how talkative the character is
- `fav`: Boolean indicating whether the character is favorited

### Character Card Data (`data` object)

This nested object contains the character information in the original format as defined by the character card
specification:

- `name`: Character's name
- `description`: Character's description
- `personality`: Personality summary
- `scenario`: Character's scenario
- `first_mes`: First message
- `mes_example`: Message examples
- `creator_notes`: Creator's notes
- `system_prompt`: System-level instructions for the AI
- `post_history_instructions`: Instructions appended after chat history
- `tags`: Array of tags associated with the character
- `creator`: Name of the character's creator
- `character_version`: Version of the character
- `alternate_greetings`: Alternative greeting messages
- `group_only_greetings`: Greetings used only in group chats
- `extensions`: Object containing extension-specific data

### Extensions (`extensions` object)

- `talkativeness`: Talkativeness setting (duplicate of root level)
- `fav`: Favorite status (duplicate of root level)
- `world`: World information associated with the character
- `depth_prompt`: Object for configuring depth prompting
    - `prompt`: The depth prompt text
    - `depth`: How many tokens back the prompt applies
    - `role`: Role for the depth prompt (e.g., "system")

### Character Book (`character_book` in `data`)

If present, the character book contains:

- `entries`: Array of world info entries with:
    - `id`: Unique identifier for the entry
    - `keys`: Array of keywords that trigger the entry
    - `content`: The actual world info content
    - `constant`: Whether the entry is always active
    - `selective`: Whether the entry uses selection logic
    - `insertion_order`: Order of insertion in the prompt
    - `enabled`: Whether the entry is currently enabled
    - `position`: Position in the prompt where entry appears
    - `use_regex`: Whether to use regex for matching keys
    - `extensions`: Additional extension-specific settings for this entry
- `name`: Name of the character book

### JSON Data Representation

- `json_data`: A stringified version of the character data, used for internal processing and storage

## Usage

The character_example.json file serves as a reference for:

- Understanding the structure of character objects in SillyTavern
- Developing extensions that interact with character data
- Debugging character card issues
- Learning about available fields and their purposes

## Notes

- This example uses the chara_card_v3 specification
- Some fields may be empty strings or null depending on character configuration
- The structure may vary slightly between different character card specifications
- Extensions can add additional fields to the `extensions` object