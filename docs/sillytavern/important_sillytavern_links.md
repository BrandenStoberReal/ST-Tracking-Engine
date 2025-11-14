Code sources located in this file **should not be referenced** in the extension project. This code is purely to assist understanding the SillyTavern architecture for better development.

# UI
- CSS Styles: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/style.css
  - This is the main CSS file for SillyTavern with a comprehensive theme system using CSS variables, styles for chat interface, UI components, responsive design, and media handling. It uses modern CSS techniques like grid, flexbox, custom properties, and backdrop filters.

- DOM Handlers: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/dom-handlers.js
  - This JavaScript file provides DOM event handling, specifically implementing wheel/touchpad scroll handling for number inputs. It traps mouse wheel events on number inputs and manually adjusts values, with throttling and Firefox compatibility.

- Preset Manager: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/preset-manager.js
  - Implements a preset management system for various AI APIs supporting CRUD operations (save, load, update, delete, rename), import/export functionality, automatic preset selection based on character names, and integration with slash commands.

# Core Functionality
- Constants: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/constants.js
  - Contains various constants for the SillyTavern application including debounce timeouts, IGNORE_SYMBOL, supported video extensions, generation type triggers, system extension injection IDs, and API model identifiers to ignore.

- Utils: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/utils.js
  - A comprehensive utility library with over 100 functions for object manipulation, array operations, string processing, UI/UX functions, file operations (reading, image processing, document parsing), input validation, and character management.

- Events: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/events.js
  - Defines a comprehensive set of event constants for various application activities and manages them through an EventEmitter instance, providing a centralized communication system for different parts of the application.

- Group Chats: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/group-chats.js
  - Implements group chat functionality allowing multiple AI characters in conversations, with features for group management, message generation, avatar handling, auto-mode, member controls, and various activation strategies.

- Macros: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/macros.js
  - Implements a macro system for text replacement with built-in macros for random selection, dice rolling, date/time utilities, chat context info, and text utilities. Supports both built-in and custom user-defined macros.

- ST-Context: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/st-context.js
  - Exports a `getContext()` function that serves as a centralized API, returning an object containing utility functions, settings, and data structures used throughout SillyTavern, acting as a comprehensive context provider.

- Personas: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/personas.js
  - Implements persona management allowing users to create and manage multiple character personas with different names, avatars, descriptions, and settings, including locking systems and avatar handling.

- Power User: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/power-user.js
  - Contains power user settings and functionality including UI customization options, text processing utilities, instruct mode configuration, and advanced features for extending SillyTavern's functionality.

- Core Script Logic: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/script.js
  - The main JavaScript file serving as the central hub that imports and coordinates numerous modules for character management, chat handling, multiple AI API integrations, and group chat functionality.

- Slash Commands: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/scripts/slash-commands.js
  - Implements a comprehensive slash command system with over 80 different commands for chat management, message operations, API control, generation control, and advanced features, with autocomplete functionality.

- Client Libraries: https://raw.githubusercontent.com/SillyTavern/SillyTavern/e9cd32a123f49c1f5d2f42f4320021007c1e9a50/public/lib.js
  - Serves as a client-side library bundle exposing various JavaScript utilities (lodash, moment, Fuse.js, DOMPurify, etc.) to the global window object, ensuring backward compatibility for extensions that don't import libraries directly.
