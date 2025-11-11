var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { dragElementWithSave, resizeElement } from '../common/shared.js';
import { outfitStore } from '../common/Store.js';
import { customMacroSystem } from '../services/CustomMacroService.js';
import { debugLogger } from '../logging/DebugLogger.js';
import { findCharacterById } from '../services/CharacterIdService.js';
import { extensionEventBus } from '../core/events.js';
import { getCharacterOutfitData } from '../services/CharacterOutfitService.js';
export class DebugPanel {
    constructor() {
        this.isVisible = false;
        this.domElement = null;
        this.currentTab = 'instances';
        this.eventListeners = [];
        this.storeSubscription = null;
        this.previousInstanceId = null;
        this.realTimeUpdateInterval = null;
        this.logUpdateInterval = null;
        this.logsSortDescending = true; // true = newest first (descending)
        this.lastMacroCacheSize = 0; // Track macro cache size to avoid unnecessary updates
        this.lastStorageSize = 0; // Cache storage size calculation
        this.lastStateStringifyTime = 0; // Track when we last did expensive stringify operations
    }
    /**
     * Creates the debug panel DOM element and sets up its basic functionality
     * @returns {HTMLElement} The created panel element
     */
    createPanel() {
        if (this.domElement) {
            return this.domElement;
        }
        const panel = document.createElement('div');
        panel.id = 'outfit-debug-panel';
        panel.className = 'outfit-debug-panel';
        panel.innerHTML = `
            <div class="outfit-debug-header">
                <h3>Outfit Debug Panel <span class="realtime-status" id="realtime-status">🔄 Live</span></h3>
                <div class="outfit-debug-actions">
                    <span class="outfit-debug-action" id="outfit-debug-close">×</span>
                </div>
            </div>
             <div class="outfit-debug-tabs">
                 <button class="outfit-debug-tab ${this.currentTab === 'instances' ? 'active' : ''}" data-tab="instances">Instances <span class="realtime-indicator">🔄</span></button>
                 <button class="outfit-debug-tab ${this.currentTab === 'macros' ? 'active' : ''}" data-tab="macros">Macros <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'pointers' ? 'active' : ''}" data-tab="pointers">Pointers <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'performance' ? 'active' : ''}" data-tab="performance">Performance <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs">Logs <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'embedded' ? 'active' : ''}" data-tab="embedded">Embedded <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'state' ? 'active' : ''}" data-tab="state">State <span class="realtime-indicator">🔄</span></button>
                  <button class="outfit-debug-tab ${this.currentTab === 'misc' ? 'active' : ''}" data-tab="misc">Misc <span class="realtime-indicator">🔄</span></button>
             </div>
            <div class="outfit-debug-content" id="outfit-debug-tab-content"></div>
        `;
        document.body.appendChild(panel);
        // Set up tab switching
        const tabs = panel.querySelectorAll('.outfit-debug-tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                if (tabName == null)
                    return;
                this.currentTab = tabName;
                this.renderContent();
                tabs.forEach((t) => t.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
        return panel;
    }
    /**
     * Shows the debug panel UI
     */
    show() {
        var _a;
        // Check if debug mode is enabled
        const state = outfitStore.getState();
        if (!state.settings.debugMode) {
            debugLogger.log('Debug mode is disabled. Not showing debug panel.');
            return;
        }
        if (!this.domElement) {
            this.domElement = this.createPanel();
        }
        // Initialize the previous instance ID to the current one when showing the panel
        this.previousInstanceId = state.currentOutfitInstanceId;
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.isVisible = true;
        // Subscribe to store changes to update highlighting when current instance changes
        if (!this.storeSubscription) {
            this.storeSubscription = outfitStore.subscribe((newState) => {
                // Check if the current outfit instance ID has changed
                if (this.previousInstanceId !== newState.currentOutfitInstanceId) {
                    this.previousInstanceId = newState.currentOutfitInstanceId;
                    // Only re-render if the debug panel is visible to avoid unnecessary updates
                    if (this.isVisible && this.currentTab === 'instances') {
                        this.renderContent();
                    }
                }
                // Update other tabs that need real-time data
                this.updateRealTimeTabs(newState);
            });
        }
        // Start real-time update intervals
        this.startRealTimeUpdates();
        if (this.domElement) {
            dragElementWithSave(this.domElement, 'outfit-debug-panel');
            // Initialize resizing with appropriate min/max dimensions
            setTimeout(() => {
                if (this.domElement) {
                    resizeElement(this.domElement, 'outfit-debug-panel');
                }
            }, 10); // Small delay to ensure panel is rendered first
            (_a = this.domElement.querySelector('#outfit-debug-close')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => this.hide());
        }
    }
    /**
     * Hides the debug panel UI
     */
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        // Unsubscribe from store changes when panel is hidden
        if (this.storeSubscription) {
            this.storeSubscription();
            this.storeSubscription = null;
        }
        // Stop real-time updates
        this.stopRealTimeUpdates();
    }
    /**
     * Renders the content of the currently selected tab
     */
    renderContent() {
        if (!this.domElement) {
            return;
        }
        const contentArea = this.domElement.querySelector('.outfit-debug-content');
        if (!contentArea) {
            return;
        }
        contentArea.innerHTML = '';
        contentArea.setAttribute('data-tab', this.currentTab);
        const tabRenderers = {
            instances: this.renderInstancesTab.bind(this),
            macros: this.renderMacrosTab.bind(this),
            pointers: this.renderPointersTab.bind(this),
            performance: this.renderPerformanceTab.bind(this),
            logs: this.renderLogsTab.bind(this),
            embedded: this.renderEmbeddedDataTab.bind(this),
            state: this.renderStateTab.bind(this),
            misc: this.renderMiscTab.bind(this),
        };
        const renderer = tabRenderers[this.currentTab];
        if (renderer) {
            renderer(contentArea);
        }
    }
    /**
     * Renders the 'Macros' tab to showcase current instances and derivations
     */
    renderMacrosTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let macrosHtml = '<div class="debug-tab-content">';
        // Show macro information
        macrosHtml += '<h4>Current Macro Values</h4>';
        macrosHtml += '<div class="macro-info">';
        // Get current character and user names
        const currentCharName = customMacroSystem.getCurrentCharName();
        const currentUserName = customMacroSystem.getCurrentUserName();
        macrosHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        macrosHtml += `<div><strong>Current User:</strong> ${currentUserName}</div>`;
        macrosHtml += `<div><strong>Current Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        // Show some example macro values
        macrosHtml += '<h5>Example Macro Values:</h5>';
        macrosHtml += '<table class="macro-values-table">';
        macrosHtml += '<tr><th>Macro</th><th>Value</th><th>Source</th></tr>';
        // Get current character's outfit data if available
        const currentCharacterId = state.currentCharacterId;
        const currentInstanceId = state.currentOutfitInstanceId;
        if (currentCharacterId &&
            currentInstanceId &&
            botInstances[currentCharacterId] &&
            botInstances[currentCharacterId][currentInstanceId]) {
            const botOutfitData = botInstances[currentCharacterId][currentInstanceId].bot;
            for (const [slot, value] of Object.entries(botOutfitData)) {
                macrosHtml += `<tr><td>{{char_${slot}}}</td><td>${value}</td><td>Bot Outfit Data</td></tr>`;
            }
        }
        // Get current user's outfit data if available
        if (currentInstanceId && userInstances[currentInstanceId]) {
            const userOutfitData = userInstances[currentInstanceId];
            for (const [slot, value] of Object.entries(userOutfitData)) {
                macrosHtml += `<tr><td>{{user_${slot}}}</td><td>${value}</td><td>User Outfit Data</td></tr>`;
            }
        }
        macrosHtml += '</table>';
        // Show macro cache information
        macrosHtml += '<h5>Macro Cache Info:</h5>';
        macrosHtml += `<div class="macro-cache-info">Cached entries: ${customMacroSystem.macroValueCache.size} <small>(Updated: ${new Date().toLocaleTimeString()})</small></div>`;
        macrosHtml += '<table class="macro-cache-table">';
        macrosHtml += '<thead><tr><th>Cache Key</th><th>Value</th><th>Timestamp</th></tr></thead>';
        macrosHtml += '<tbody>';
        for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
            const timestamp = new Date(entry.timestamp).toISOString();
            macrosHtml += `<tr><td>${key}</td><td>${entry.value}</td><td>${timestamp}</td></tr>`;
        }
        macrosHtml += '</tbody></table>';
        // Add more detailed macro processing information
        macrosHtml += '<h5>Detailed Macro Processing Info:</h5>';
        macrosHtml += '<div class="macro-processing-info">';
        macrosHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        macrosHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        macrosHtml += '</div>';
        macrosHtml += '</div></div>';
        // Add macro testing section
        macrosHtml += '<h5>Test Macro Processing</h5>';
        macrosHtml += '<div class="macro-testing-area">';
        macrosHtml += '<textarea id="macro-test-input" placeholder="Enter text with macros to test..."></textarea>';
        macrosHtml += '<button id="macro-test-btn" class="menu_button">Process Macros</button>';
        macrosHtml += '<div id="macro-test-output"></div>';
        macrosHtml += '</div>';
        container.innerHTML = macrosHtml;
        // Add event listener for macro testing
        setTimeout(() => {
            var _a;
            (_a = document.getElementById('macro-test-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                const input = document.getElementById('macro-test-input').value;
                const output = customMacroSystem.replaceMacrosInText(input);
                document.getElementById('macro-test-output').innerText = output;
            });
        }, 100);
    }
    /**
     * Parses and highlights service names in log messages
     */
    highlightServiceNames(message, source) {
        let highlightedMessage = message;
        // If source is provided, add service highlighting at the beginning
        if (source) {
            const serviceClass = this.getServiceClass(source);
            const serviceLabel = `<span class="service-name ${serviceClass}">[${source}]</span> `;
            highlightedMessage = serviceLabel + highlightedMessage;
        }
        else {
            // Fallback to parsing message text for backward compatibility
            const servicePatterns = [
                { pattern: /\[CustomMacroService\]/g, class: 'service-custom-macro' },
                { pattern: /\[EventService\]/g, class: 'service-event' },
                { pattern: /\[CharacterService\]/g, class: 'service-character' },
                { pattern: /\[LLMService\]/g, class: 'service-llm' },
                { pattern: /\[StorageService\]/g, class: 'service-storage' },
                { pattern: /\[AutoOutfitService\]/g, class: 'service-auto-outfit' },
                { pattern: /\[CharacterOutfitService\]/g, class: 'service-character-outfit' },
                { pattern: /\[CharacterIdService\]/g, class: 'service-character-id' },
                { pattern: /\[OutfitDataService\]/g, class: 'service-outfit-data' },
                { pattern: /\[OutfitTracker\]/g, class: 'service-outfit-tracker' },
                { pattern: /\[OutfitTracker Debug\]/g, class: 'service-outfit-tracker-debug' },
            ];
            for (const { pattern, class: className } of servicePatterns) {
                highlightedMessage = highlightedMessage.replace(pattern, `<span class="service-name ${className}">$&</span>`);
            }
        }
        return highlightedMessage;
    }
    /**
     * Gets the CSS class for a service name
     */
    getServiceClass(serviceName) {
        const serviceClassMap = {
            // Services
            CustomMacroService: 'service-custom-macro',
            EventService: 'service-event',
            CharacterService: 'service-character',
            LLMService: 'service-llm',
            StorageService: 'service-storage',
            AutoOutfitService: 'service-auto-outfit',
            CharacterOutfitService: 'service-character-outfit',
            CharacterIdService: 'service-character-id',
            OutfitDataService: 'service-outfit-data',
            // Managers
            DataManager: 'service-data-manager',
            BotOutfitManager: 'service-bot-outfit-manager',
            UserOutfitManager: 'service-user-outfit-manager',
            OutfitManager: 'service-outfit-manager',
            // Panels
            BotOutfitPanel: 'service-bot-outfit-panel',
            DebugPanel: 'service-debug-panel',
            UserOutfitPanel: 'service-user-outfit-panel',
            // Processors
            MacroProcessor: 'service-macro-processor',
            StringProcessor: 'service-string-processor',
            // Utils
            CharacterUtils: 'service-character-utils',
            LLMUtility: 'service-llm-utility',
            SettingsUtil: 'service-settings-util',
            Utilities: 'service-utilities',
            // Core
            EventBus: 'service-event-bus',
            ExtensionCore: 'service-extension-core',
            // Commands
            OutfitCommands: 'service-outfit-commands',
            // Other
            SharedUtils: 'service-shared-utils',
            Store: 'service-store',
            Settings: 'service-settings',
            SettingsUI: 'service-settings-ui',
            // Legacy
            OutfitTracker: 'service-outfit-tracker',
            'OutfitTracker Debug': 'service-outfit-tracker-debug',
        };
        return serviceClassMap[serviceName] || 'service-generic';
    }
    /**
     * Renders the 'Logs' tab with logs from the DebugLogger
     */
    renderLogsTab(container) {
        const logs = debugLogger.getLogs();
        let logsHtml = `
            <div class="debug-tab-content">
            <div class="debug-search-container">
                <input type="text" id="log-search" placeholder="Search logs...">
            </div>
            <div class="debug-controls">
                <select id="log-level-filter">
                    <option value="all">All Levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                </select>
                <button id="expand-all-logs-btn" class="menu_button" title="Expand all log details">📖 Expand All</button>
                <button id="collapse-all-logs-btn" class="menu_button" title="Collapse all log details">📕 Collapse All</button>
                <button id="refresh-logs-btn" class="menu_button" title="Refresh logs">🔄 Refresh</button>
                <button id="toggle-logs-sort" class="menu_button" title="Toggle sort direction">
                    ${this.logsSortDescending ? '⬇️ Newest First' : '⬆️ Oldest First'}
                </button>
                <button id="export-logs-btn" class="menu_button">Export Logs</button>
                <button id="clear-logs-btn" class="menu_button">Clear Logs</button>
            </div>
            <div class="debug-logs-list">
        `;
        if (logs.length === 0) {
            logsHtml += '<p>No logs available.</p>';
        }
        else {
            // Sort logs based on timestamp
            const sortedLogs = [...logs].sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return this.logsSortDescending ? timeB - timeA : timeA - timeB;
            });
            // Group logs with the same message and data
            const groupedLogs = this.groupSimilarLogs(sortedLogs);
            logsHtml += groupedLogs
                .map((group) => {
                const log = group.logs[0]; // Use the first log for display
                const hasData = log.data !== null && log.data !== undefined;
                const logItemClasses = `log-item log-${log.level.toLowerCase()}`;
                const logItemAttributes = `data-level="${log.level.toLowerCase()}" data-message="${log.message.toLowerCase()}"`;
                const countDisplay = group.count > 1 ? ` <span class="log-count">(${group.count}x)</span>` : '';
                const highlightedMessage = this.highlightServiceNames(log.message, log.source);
                if (hasData) {
                    return `
                        <div class="${logItemClasses}" ${logItemAttributes}>
                            <details>
                                <summary>
                                    <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                                    <span class="log-level">[${log.level}]</span>
                                    <span class="log-message">${highlightedMessage}${countDisplay}</span>
                                </summary>
                                <div class="log-data">
                                    <pre>${JSON.stringify(log.data, null, 2)}</pre>
                                </div>
                            </details>
                        </div>
                    `;
                }
                else {
                    return `
                        <div class="${logItemClasses}" ${logItemAttributes}>
                            <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                            <span class="log-level">[${log.level}]</span>
                            <span class="log-message">${highlightedMessage}${countDisplay}</span>
                        </div>
                    `;
                }
            })
                .join('');
        }
        logsHtml += '</div>';
        logsHtml += '</div>';
        container.innerHTML = logsHtml;
        const searchInput = container.querySelector('#log-search');
        const levelFilter = container.querySelector('#log-level-filter');
        const expandAllBtn = container.querySelector('#expand-all-logs-btn');
        const collapseAllBtn = container.querySelector('#collapse-all-logs-btn');
        const refreshBtn = container.querySelector('#refresh-logs-btn');
        const sortBtn = container.querySelector('#toggle-logs-sort');
        const exportBtn = container.querySelector('#export-logs-btn');
        const clearBtn = container.querySelector('#clear-logs-btn');
        const filterLogs = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedLevel = levelFilter.value;
            const logItems = container.querySelectorAll('.log-item');
            logItems.forEach((item) => {
                const level = item.dataset.level;
                const message = item.dataset.message;
                const isLevelMatch = selectedLevel === 'all' || level === selectedLevel;
                const isSearchMatch = message === null || message === void 0 ? void 0 : message.includes(searchTerm);
                if (isLevelMatch && isSearchMatch) {
                    item.style.display = '';
                }
                else {
                    item.style.display = 'none';
                }
            });
        };
        searchInput.addEventListener('input', filterLogs);
        levelFilter.addEventListener('change', filterLogs);
        expandAllBtn.addEventListener('click', () => {
            const detailsElements = container.querySelectorAll('.log-item details');
            detailsElements.forEach((details) => {
                details.open = true;
            });
        });
        collapseAllBtn.addEventListener('click', () => {
            const detailsElements = container.querySelectorAll('.log-item details');
            detailsElements.forEach((details) => {
                details.open = false;
            });
        });
        refreshBtn.addEventListener('click', () => {
            this.renderLogsTab(container);
        });
        sortBtn.addEventListener('click', () => {
            this.logsSortDescending = !this.logsSortDescending;
            this.renderContent();
        });
        exportBtn.addEventListener('click', () => {
            this.exportLogsToFile();
        });
        clearBtn.addEventListener('click', () => {
            debugLogger.clearLogs();
            this.renderContent();
            toastr.success('Logs cleared!', 'Debug Panel');
        });
    }
    /**
     * Renders the 'Embedded Data' tab for debugging character card embedded outfit data
     */
    renderEmbeddedDataTab(container) {
        var _a, _b, _c, _d, _e, _f;
        const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_d = (_c = window).getContext) === null || _d === void 0 ? void 0 : _d.call(_c));
        let embeddedHtml = '<div class="debug-tab-content">';
        embeddedHtml += '<h4>Character Card Embedded Outfit Data</h4>';
        // Count total default outfits
        let totalDefaultOutfits = 0;
        if (context && context.characters) {
            for (let i = 0; i < context.characters.length; i++) {
                const character = context.characters[i];
                const embeddedData = getCharacterOutfitData(character);
                if (embeddedData && embeddedData.defaultOutfit && Object.keys(embeddedData.defaultOutfit).length > 0) {
                    totalDefaultOutfits++;
                }
            }
        }
        embeddedHtml += `<div class="embedded-summary-stats">
            <div class="embedded-stat-card">
                <div class="stat-number">${totalDefaultOutfits}</div>
                <div class="stat-label">Default Outfits Embedded</div>
            </div>
        </div>`;
        embeddedHtml += '<div class="embedded-info">';
        if (!context || !context.characters) {
            embeddedHtml += '<p class="no-characters">No characters available for embedded data inspection.</p>';
        }
        else {
            embeddedHtml +=
                '<div class="debug-search-container"><input type="text" id="embedded-search" placeholder="Search characters..."></div>';
            embeddedHtml += '<h5>Characters with Embedded Outfit Data:</h5>';
            let charactersWithEmbeddedData = 0;
            for (let i = 0; i < context.characters.length; i++) {
                const character = context.characters[i];
                const characterName = character.name || `Character ${i + 1}`;
                const characterId = ((_f = (_e = character.data) === null || _e === void 0 ? void 0 : _e.extensions) === null || _f === void 0 ? void 0 : _f.character_id) || 'No ID';
                const embeddedData = getCharacterOutfitData(character);
                if (embeddedData) {
                    charactersWithEmbeddedData++;
                    const hasDefaultOutfit = embeddedData.defaultOutfit && Object.keys(embeddedData.defaultOutfit).length > 0;
                    const presetCount = embeddedData.presets ? Object.keys(embeddedData.presets).length : 0;
                    const hasPresets = presetCount > 0;
                    const lastModified = embeddedData.lastModified
                        ? new Date(embeddedData.lastModified).toLocaleString()
                        : 'Unknown';
                    embeddedHtml += `
                        <div class="embedded-character-item" data-character-name="${characterName.toLowerCase()}" data-character-id="${characterId}">
                            <div class="embedded-character-header">
                                <span class="embedded-character-name">${characterName}</span>
                                <span class="embedded-character-id">(${characterId})</span>
                                <div class="embedded-character-actions">
                                    <button class="copy-embedded-btn" title="Copy embedded data">📋</button>
                                    <button class="view-embedded-btn" title="Toggle details">▼</button>
                                </div>
                            </div>
                            <div class="embedded-character-summary">
                                <span class="embedded-status ${hasDefaultOutfit ? 'has-default' : 'no-default'}">
                                    ${hasDefaultOutfit ? '✅' : '❌'} Default Outfit
                                </span>
                                <span class="embedded-status ${hasPresets ? 'has-presets' : 'no-presets'}">
                                    ${hasPresets ? '📁' : '📂'} ${presetCount} Presets
                                </span>
                                <span class="embedded-last-modified">Modified: ${lastModified}</span>
                            </div>
                            <div class="embedded-character-details" style="display: none;">
                                <h6>Embedded Data:</h6>
                                <pre>${JSON.stringify(embeddedData, null, 2)}</pre>
                            </div>
                        </div>
                    `;
                }
            }
            if (charactersWithEmbeddedData === 0) {
                embeddedHtml += '<p class="no-embedded-data">No characters have embedded outfit data.</p>';
            }
            embeddedHtml += `<div class="embedded-stats">
                <span>Total Characters: ${context.characters.length}</span>
                <span>With Embedded Data: ${charactersWithEmbeddedData}</span>
                <span>Without Embedded Data: ${context.characters.length - charactersWithEmbeddedData}</span>
            </div>`;
        }
        embeddedHtml += '</div>';
        // Add migration section
        embeddedHtml += '<h4>Migration Tools</h4>';
        embeddedHtml += '<div class="embedded-migration-tools">';
        embeddedHtml +=
            '<button id="migrate-default-outfits-btn" class="menu_button">Migrate Default Outfits to Cards</button>';
        embeddedHtml += '<button id="migrate-presets-btn" class="menu_button">Migrate Presets to Cards</button>';
        embeddedHtml += '<div id="migration-results"></div>';
        embeddedHtml += '</div>';
        embeddedHtml += '</div>';
        container.innerHTML = embeddedHtml;
        // Add event listeners
        setTimeout(() => {
            // Search functionality
            const searchInput = container.querySelector('#embedded-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const characterItems = container.querySelectorAll('.embedded-character-item');
                    characterItems.forEach((item) => {
                        var _a;
                        const characterName = item.dataset.characterName || '';
                        const characterId = item.dataset.characterId || '';
                        const itemText = ((_a = item.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                        if (characterName.includes(searchTerm) ||
                            characterId.includes(searchTerm) ||
                            itemText.includes(searchTerm)) {
                            item.style.display = '';
                        }
                        else {
                            item.style.display = 'none';
                        }
                    });
                });
            }
            // Character item interactions
            const characterItems = container.querySelectorAll('.embedded-character-item');
            characterItems.forEach((item) => {
                const viewBtn = item.querySelector('.view-embedded-btn');
                const copyBtn = item.querySelector('.copy-embedded-btn');
                const details = item.querySelector('.embedded-character-details');
                if (viewBtn && details) {
                    viewBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isVisible = details.style.display !== 'none';
                        details.style.display = isVisible ? 'none' : 'block';
                        viewBtn.textContent = isVisible ? '▼' : '▲';
                    });
                }
                if (copyBtn) {
                    copyBtn.addEventListener('click', (e) => {
                        var _a;
                        e.stopPropagation();
                        const dataElement = item.querySelector('.embedded-character-details pre');
                        if (dataElement) {
                            navigator.clipboard.writeText(dataElement.textContent || '');
                            (_a = window.toastr) === null || _a === void 0 ? void 0 : _a.success('Embedded data copied to clipboard!', 'Debug Panel');
                        }
                    });
                }
            });
            // Migration buttons
            const migrateDefaultsBtn = container.querySelector('#migrate-default-outfits-btn');
            const migratePresetsBtn = container.querySelector('#migrate-presets-btn');
            const resultsDiv = container.querySelector('#migration-results');
            if (migrateDefaultsBtn) {
                migrateDefaultsBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    if (resultsDiv) {
                        resultsDiv.innerHTML = '<p>Migrating default outfits...</p>';
                    }
                    try {
                        const result = yield ((_b = (_a = window).migrateDefaultOutfitsToCharacterCards) === null || _b === void 0 ? void 0 : _b.call(_a));
                        if (resultsDiv) {
                            resultsDiv.innerHTML = `<p>✅ Migration completed: ${(result === null || result === void 0 ? void 0 : result.defaultOutfitsMigrated) || 0} characters migrated.</p>`;
                        }
                        this.renderContent(); // Refresh the tab
                        (_c = window.toastr) === null || _c === void 0 ? void 0 : _c.success('Default outfits migrated!', 'Debug Panel');
                    }
                    catch (error) {
                        if (resultsDiv) {
                            resultsDiv.innerHTML = '<p>❌ Migration failed. Check console for details.</p>';
                        }
                        debugLogger.log('Migration error:', error, 'error');
                        (_d = window.toastr) === null || _d === void 0 ? void 0 : _d.error('Migration failed', 'Debug Panel');
                    }
                }));
            }
            if (migratePresetsBtn) {
                migratePresetsBtn.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    if (resultsDiv) {
                        resultsDiv.innerHTML = '<p>Migrating presets...</p>';
                    }
                    try {
                        // Note: Preset migration is not implemented as we only embed default outfits
                        if (resultsDiv) {
                            resultsDiv.innerHTML =
                                '<p>ℹ️ Preset migration is not available. Only default outfits are embedded.</p>';
                        }
                        (_a = window.toastr) === null || _a === void 0 ? void 0 : _a.info('Preset migration not available', 'Debug Panel');
                    }
                    catch (error) {
                        if (resultsDiv) {
                            resultsDiv.innerHTML = '<p>❌ Migration failed. Check console for details.</p>';
                        }
                        debugLogger.log('Migration error:', error, 'error');
                        (_b = window.toastr) === null || _b === void 0 ? void 0 : _b.error('Migration failed', 'Debug Panel');
                    }
                }));
            }
        }, 100);
    }
    /**
     * Renders the 'Performance' tab with performance metrics
     */
    renderPerformanceTab(container) {
        const state = outfitStore.getState();
        // Calculate performance metrics
        const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
            return total + Object.keys(state.botInstances[charId]).length;
        }, 0);
        const userInstanceCount = Object.keys(state.userInstances).length;
        // Estimate storage size
        const stateStr = JSON.stringify(state);
        const estimatedStorageSize = `${(new Blob([stateStr]).size / 1024).toFixed(2)} KB`;
        let performanceHtml = '<div class="debug-tab-content">';
        performanceHtml += '<h4>Performance Metrics</h4>';
        performanceHtml += '<div class="performance-info">';
        // General metrics
        performanceHtml += `<div><strong>Total Bot Instances:</strong> ${botInstanceCount}</div>`;
        performanceHtml += `<div><strong>Total User Instances:</strong> ${userInstanceCount}</div>`;
        performanceHtml += `<div><strong>Total Outfit Slots:</strong> ${(botInstanceCount + userInstanceCount) * 19}</div>`;
        performanceHtml += `<div><strong>Estimated Storage Size:</strong> ${estimatedStorageSize}</div>`;
        // Macro performance
        performanceHtml += '<h5>Macro System Performance:</h5>';
        performanceHtml += `<div><strong>Current Cache Size:</strong> ${customMacroSystem.macroValueCache.size} items</div>`;
        // Performance indicators
        performanceHtml += '<h5>Performance Indicators:</h5>';
        performanceHtml += '<div class="performance-indicators">';
        // Check for potentially large data
        if (botInstanceCount > 50) {
            performanceHtml +=
                '<div class="warning">⚠️ High number of bot instances detected - may impact performance</div>';
        }
        else if (botInstanceCount > 20) {
            performanceHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Low number of bot instances</div>';
        }
        if (userInstanceCount > 10) {
            performanceHtml +=
                '<div class="warning">⚠️ High number of user instances detected - may impact performance</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }
        const storageKB = new Blob([stateStr]).size / 1024;
        if (storageKB > 1000) {
            // More than 1MB
            performanceHtml += '<div class="warning">⚠️ Large storage size detected - consider cleanup</div>';
        }
        else if (storageKB > 500) {
            // More than 500KB
            performanceHtml += '<div class="info">ℹ️ Moderate storage size</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Reasonable storage size</div>';
        }
        performanceHtml += '</div>';
        // Add performance testing section
        performanceHtml += '<h5>Performance Testing:</h5>';
        performanceHtml += '<div class="performance-testing">';
        performanceHtml += '<button id="debug-run-performance-test" class="menu_button">Run Performance Test</button>';
        performanceHtml += '<div id="performance-test-results"></div>';
        performanceHtml += '</div>';
        performanceHtml += '</div></div>';
        container.innerHTML = performanceHtml;
        // Add event listener for performance testing
        const performanceTestBtn = container.querySelector('#debug-run-performance-test');
        if (performanceTestBtn) {
            performanceTestBtn.addEventListener('click', () => {
                this.runPerformanceTest();
            });
        }
    }
    // ===== MISC TAB HELPER METHODS =====
    /**
     * Renders the 'Misc' tab for other functions
     */
    renderMiscTab(container) {
        let miscHtml = '<div class="debug-tab-content">';
        // System Information Section
        miscHtml += '<h4>🖥️ System Information</h4>';
        miscHtml += '<div class="system-info">';
        miscHtml += `<div><strong>Extension Version:</strong> ${this.getExtensionVersion()}</div>`;
        miscHtml += `<div><strong>Browser:</strong> ${this.getBrowserInfo()}</div>`;
        miscHtml += `<div><strong>Platform:</strong> ${navigator.platform}</div>`;
        miscHtml += `<div><strong>User Agent:</strong> ${navigator.userAgent.substring(0, 50)}...</div>`;
        miscHtml += `<div><strong>Language:</strong> ${navigator.language}</div>`;
        miscHtml += `<div><strong>Timezone:</strong> ${Intl.DateTimeFormat().resolvedOptions().timeZone}</div>`;
        miscHtml += `<div><strong>Screen:</strong> ${screen.width}x${screen.height} (${window.devicePixelRatio}x)</div>`;
        miscHtml += `<div><strong>Memory Usage:</strong> ${this.getMemoryUsage()}</div>`;
        miscHtml += '</div>';
        // Extension Health Check
        miscHtml += '<h4>🏥 Extension Health Check</h4>';
        miscHtml += '<div class="health-check">';
        miscHtml += '<div class="health-status">';
        miscHtml += `<div class="health-item"><span class="health-label">Store:</span> <span class="health-value ${this.checkStoreHealth() ? 'status-active' : 'status-inactive'}">${this.checkStoreHealth() ? '✅ Healthy' : '❌ Issues'}</span></div>`;
        miscHtml += `<div class="health-item"><span class="health-label">Panels:</span> <span class="health-value ${this.checkPanelsHealth() ? 'status-active' : 'status-inactive'}">${this.checkPanelsHealth() ? '✅ Loaded' : '❌ Issues'}</span></div>`;
        miscHtml += `<div class="health-item"><span class="health-label">Macros:</span> <span class="health-value ${this.checkMacrosHealth() ? 'status-active' : 'status-inactive'}">${this.checkMacrosHealth() ? '✅ Working' : '❌ Issues'}</span></div>`;
        miscHtml += `<div class="health-item"><span class="health-label">Event Bus:</span> <span class="health-value ${this.checkEventBusHealth() ? 'status-active' : 'status-inactive'}">${this.checkEventBusHealth() ? '✅ Active' : '❌ Issues'}</span></div>`;
        miscHtml += '</div>';
        miscHtml += '<button id="run-health-check" class="menu_button">🔄 Run Full Health Check</button>';
        miscHtml += '</div>';
        // Quick Actions Section
        miscHtml += '<h4>⚡ Quick Actions</h4>';
        miscHtml += '<div class="quick-actions">';
        miscHtml += '<button id="reset-panel-positions" class="menu_button">Reset Panel Positions</button>';
        miscHtml += '<button id="clear-all-caches" class="menu_button">Clear All Caches</button>';
        miscHtml +=
            '<button id="reset-settings" class="menu_button warning-button">Reset Settings to Defaults</button>';
        miscHtml += '<button id="force-gc" class="menu_button">Force Garbage Collection</button>';
        miscHtml += '<button id="create-backup" class="menu_button">Create Emergency Backup</button>';
        miscHtml += '<button id="show-extension-info" class="menu_button">Show Extension Info</button>';
        miscHtml += '</div>';
        // Debug Functions Section
        miscHtml += '<h4>🔧 Debug Functions</h4>';
        miscHtml += '<div class="debug-functions">';
        miscHtml += '<button id="debug-refresh-store" class="menu_button">Refresh Store State</button>';
        miscHtml += '<button id="debug-clear-cache" class="menu_button">Clear Macro Cache</button>';
        miscHtml += '<button id="debug-wipe-all" class="menu_button danger-button">WIPE ALL DATA</button>';
        miscHtml += '<button id="debug-export-data" class="menu_button">Export All Data</button>';
        miscHtml += '<button id="debug-import-data" class="menu_button">Import Data</button>';
        miscHtml += '<input type="file" id="debug-import-file" style="display: none;" accept=".json">';
        miscHtml += '</div>';
        miscHtml += '</div>';
        container.innerHTML = miscHtml;
        // Add button event listeners after content is inserted
        setTimeout(() => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            // Health Check
            (_a = document.getElementById('run-health-check')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                this.runFullHealthCheck();
            });
            // Quick Actions
            (_b = document.getElementById('reset-panel-positions')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
                this.resetPanelPositions();
            });
            (_c = document.getElementById('clear-all-caches')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
                this.clearAllCaches();
            });
            (_d = document.getElementById('reset-settings')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
                this.resetSettingsToDefaults();
            });
            (_e = document.getElementById('force-gc')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
                this.forceGarbageCollection();
            });
            (_f = document.getElementById('create-backup')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
                this.createEmergencyBackup();
            });
            (_g = document.getElementById('show-extension-info')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', () => {
                this.showExtensionInfo();
            });
            // Debug Functions
            (_h = document.getElementById('debug-refresh-store')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', () => {
                // Re-render to show updated store state
                this.renderContent();
            });
            (_j = document.getElementById('debug-clear-cache')) === null || _j === void 0 ? void 0 : _j.addEventListener('click', () => {
                customMacroSystem.clearCache();
                toastr.success('Macro cache cleared!', 'Debug Panel');
                this.renderContent();
            });
            (_k = document.getElementById('debug-wipe-all')) === null || _k === void 0 ? void 0 : _k.addEventListener('click', () => {
                if (confirm('Are you sure you want to wipe all outfit data? This cannot be undone.')) {
                    if (window.wipeAllOutfits) {
                        window.wipeAllOutfits();
                        this.renderContent();
                    }
                }
            });
            (_l = document.getElementById('debug-export-data')) === null || _l === void 0 ? void 0 : _l.addEventListener('click', () => {
                this.exportOutfitData();
            });
            (_m = document.getElementById('debug-import-data')) === null || _m === void 0 ? void 0 : _m.addEventListener('click', () => {
                var _a;
                (_a = document.getElementById('debug-import-file')) === null || _a === void 0 ? void 0 : _a.click();
            });
            (_o = document.getElementById('debug-import-file')) === null || _o === void 0 ? void 0 : _o.addEventListener('change', (e) => {
                var _a;
                this.importOutfitData((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]);
            });
        }, 100);
    }
    /**
     * Gets the extension version
     */
    getExtensionVersion() {
        // Version from manifest.json - updated during build process
        return '2.0.0-dev-unstable';
    }
    /**
     * Gets browser information
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome'))
            return 'Chrome';
        if (ua.includes('Firefox'))
            return 'Firefox';
        if (ua.includes('Safari'))
            return 'Safari';
        if (ua.includes('Edge'))
            return 'Edge';
        return 'Unknown';
    }
    /**
     * Gets memory usage information
     */
    getMemoryUsage() {
        try {
            if ('memory' in performance) {
                const mem = performance.memory;
                const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
                const total = Math.round(mem.totalJSHeapSize / 1024 / 1024);
                const limit = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
                return `${used}MB / ${total}MB (Limit: ${limit}MB)`;
            }
        }
        catch (_a) {
            // Do nothing and ignore the error
        }
        return 'Not available';
    }
    /**
     * Checks store health
     */
    checkStoreHealth() {
        try {
            const state = outfitStore.getState();
            return (state &&
                typeof state === 'object' &&
                typeof state.botInstances === 'object' &&
                typeof state.userInstances === 'object');
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Checks panels health
     */
    checkPanelsHealth() {
        try {
            return !!(window.botOutfitPanel && window.userOutfitPanel);
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Checks macros health
     */
    checkMacrosHealth() {
        try {
            return customMacroSystem && typeof customMacroSystem.registerMacros === 'function';
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Checks event bus health
     */
    checkEventBusHealth() {
        try {
            return extensionEventBus && typeof extensionEventBus.emit === 'function';
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Runs a full health check
     */
    runFullHealthCheck() {
        const results = {
            store: this.checkStoreHealth(),
            panels: this.checkPanelsHealth(),
            macros: this.checkMacrosHealth(),
            eventBus: this.checkEventBusHealth(),
            timestamp: new Date().toISOString(),
        };
        const healthy = Object.values(results)
            .filter((v) => typeof v === 'boolean')
            .every((v) => v);
        const message = healthy
            ? `✅ All systems healthy! (${Object.values(results).filter((v) => v === true).length}/${Object.keys(results).length - 1})`
            : `❌ Issues detected. Check individual components.`;
        toastr.info(message, 'Health Check Complete');
        console.log('Extension Health Check Results:', results);
    }
    /**
     * Resets panel positions
     */
    resetPanelPositions() {
        var _a, _b;
        try {
            if ((_a = window.botOutfitPanel) === null || _a === void 0 ? void 0 : _a.domElement) {
                window.botOutfitPanel.domElement.style.top = '100px';
                window.botOutfitPanel.domElement.style.left = '20px';
            }
            if ((_b = window.userOutfitPanel) === null || _b === void 0 ? void 0 : _b.domElement) {
                window.userOutfitPanel.domElement.style.top = '100px';
                window.userOutfitPanel.domElement.style.right = '20px';
            }
            toastr.success('Panel positions reset!', 'Debug Panel');
        }
        catch (error) {
            toastr.error('Failed to reset panel positions', 'Debug Panel');
        }
    }
    /**
     * Clears all caches
     */
    clearAllCaches() {
        try {
            customMacroSystem.clearCache();
            // Clear any other caches here if they exist
            toastr.success('All caches cleared!', 'Debug Panel');
        }
        catch (error) {
            toastr.error('Failed to clear caches', 'Debug Panel');
        }
    }
    /**
     * Resets settings to defaults
     */
    resetSettingsToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will not affect your outfit data.')) {
            try {
                const defaultSettings = {
                    autoOpenBot: false,
                    autoOpenUser: false,
                    position: 'right',
                    enableSysMessages: true,
                    autoOutfitSystem: false,
                    debugMode: false,
                    autoOutfitPrompt: '',
                    autoOutfitConnectionProfile: null,
                    botPanelColors: { primary: '#6a4fc1', border: '#8a7fdb', shadow: '#6a4fc1' },
                    userPanelColors: { primary: '#1a78d1', border: '#5da6f0', shadow: '#1a78d1' },
                    defaultBotPresets: {},
                    defaultUserPresets: {},
                };
                outfitStore.setState({ settings: defaultSettings });
                outfitStore.saveState();
                toastr.success('Settings reset to defaults!', 'Debug Panel');
                this.renderContent(); // Refresh to show updated settings
            }
            catch (error) {
                toastr.error('Failed to reset settings', 'Debug Panel');
            }
        }
    }
    /**
     * Forces garbage collection
     */
    forceGarbageCollection() {
        try {
            if (window.gc) {
                window.gc();
                toastr.success('Garbage collection forced!', 'Debug Panel');
            }
            else {
                toastr.info('Garbage collection not available in this browser', 'Debug Panel');
            }
        }
        catch (error) {
            toastr.error('Failed to force garbage collection', 'Debug Panel');
        }
    }
    /**
     * Creates an emergency backup
     */
    createEmergencyBackup() {
        try {
            const state = outfitStore.getState();
            const backup = {
                timestamp: new Date().toISOString(),
                version: this.getExtensionVersion(),
                data: state,
            };
            const dataStr = JSON.stringify(backup, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const filename = `emergency-backup-${new Date().toISOString().slice(0, 19)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', filename);
            linkElement.click();
            toastr.success('Emergency backup created!', 'Debug Panel');
        }
        catch (error) {
            toastr.error('Failed to create emergency backup', 'Debug Panel');
        }
    }
    /**
     * Renders the 'Instances' tab with instance browser functionality
     */
    renderInstancesTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let instancesHtml = '<div class="debug-tab-content">';
        // Add search input
        instancesHtml +=
            '<div class="debug-search-container"><input type="text" id="instance-search" placeholder="Search instances..."></div>';
        // Add bot instances
        instancesHtml += '<h4>Bot Instances</h4>';
        if (Object.keys(botInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No bot instances found</p>';
        }
        else {
            for (const [charId, charData] of Object.entries(botInstances)) {
                const character = findCharacterById(charId);
                const charName = character ? String(character.name || 'Unknown') : 'Unknown';
                instancesHtml += `<h5>Character: ${charName} (${charId})</h5>`;
                for (const [instId, instData] of Object.entries(charData)) {
                    const currentInstanceId = state.currentOutfitInstanceId;
                    const isCurrent = instId === currentInstanceId;
                    // Format bot instance data for better readability
                    const formattedBotData = {
                        timestamp: instData.timestamp || 'No timestamp',
                        characterName: charName,
                        characterId: charId,
                        instanceId: instId,
                        outfit: instData.bot,
                    };
                    instancesHtml += `
                     <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="${charName}" data-instance="${instId}" data-type="bot">
                         <div class="instance-id">
                             <span>${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</span>
                             <div class="instance-actions">
                                 <button class="copy-instance-btn" title="Copy to Clipboard">📋</button>
                                 <button class="delete-instance-btn" title="Delete Instance">🗑️</button>
                             </div>
                         </div>
                         <div class="instance-data">
                             <pre>${JSON.stringify(formattedBotData, null, 2)}</pre>
                         </div>
                     </div>
                    `;
                }
            }
        }
        // Add user instances
        instancesHtml += '<h4>User Instances</h4>';
        if (Object.keys(userInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No user instances found</p>';
        }
        else {
            for (const [instId, instData] of Object.entries(userInstances)) {
                const currentInstanceId = state.currentOutfitInstanceId;
                const isCurrent = instId === currentInstanceId;
                // Format user instance data for better readability
                const formattedUserData = {
                    timestamp: instData.timestamp || 'No timestamp',
                    instanceId: instId,
                    outfit: instData,
                };
                instancesHtml += `
                     <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-character="user" data-instance="${instId}" data-type="user">
                         <div class="instance-id">
                             <span>${instId} ${isCurrent ? ' <span class="current-marker">[CURRENT]</span>' : ''}</span>
                             <div class="instance-actions">
                                 <button class="copy-instance-btn" title="Copy to Clipboard">📋</button>
                                 <button class="delete-instance-btn" title="Delete Instance">🗑️</button>
                             </div>
                         </div>
                         <div class="instance-data">
                             <pre>${JSON.stringify(formattedUserData, null, 2)}</pre>
                         </div>
                     </div>
                `;
            }
        }
        instancesHtml += '</div>';
        container.innerHTML = instancesHtml;
        // Add event listener for search
        const searchInput = container.querySelector('#instance-search');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const instanceItems = container.querySelectorAll('.instance-item');
            instanceItems.forEach((item) => {
                var _a, _b, _c, _d, _e, _f;
                const instanceId = (_b = (_a = item.dataset.instance) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
                const characterName = (_d = (_c = item.dataset.character) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : '';
                const instanceData = (_f = (_e = item.querySelector('.instance-data pre').textContent) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : '';
                if (instanceId.includes(searchTerm) ||
                    characterName.includes(searchTerm) ||
                    instanceData.includes(searchTerm)) {
                    item.style.display = '';
                }
                else {
                    item.style.display = 'none';
                }
            });
        });
        // Add click handlers to instance items to show details
        const instanceItems = container.querySelectorAll('.instance-item');
        instanceItems.forEach((item) => {
            const instanceIdElement = item.querySelector('.instance-id');
            if (instanceIdElement) {
                instanceIdElement.addEventListener('click', (e) => {
                    // Stop propagation to prevent the buttons from triggering this
                    if (e.target.tagName === 'BUTTON') {
                        return;
                    }
                    // Expand or collapse the instance data
                    const dataElement = item.querySelector('.instance-data');
                    if (dataElement.style.display === 'none' || !dataElement.style.display) {
                        dataElement.style.display = 'block';
                    }
                    else {
                        dataElement.style.display = 'none';
                    }
                });
            }
            // Add event listener for copy button
            const copyBtn = item.querySelector('.copy-instance-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dataElement = item.querySelector('.instance-data pre');
                    navigator.clipboard.writeText(dataElement.innerText);
                    toastr.success('Instance data copied to clipboard!', 'Debug Panel');
                });
            }
            // Add event listener for delete button
            const deleteBtn = item.querySelector('.delete-instance-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const instanceId = item.dataset.instance;
                    const instanceType = item.dataset.type;
                    const characterId = item.dataset.character;
                    if (instanceId && instanceType) {
                        if (confirm(`Are you sure you want to delete instance ${instanceId}?`)) {
                            outfitStore.deleteInstance(instanceId, instanceType, characterId !== 'user' ? characterId : undefined);
                            this.renderContent();
                            toastr.success(`Instance ${instanceId} deleted!`, 'Debug Panel');
                        }
                    }
                });
            }
        });
    }
    /**
     * Renders the 'Pointers' tab
     */
    renderPointersTab(container) {
        var _a;
        const state = outfitStore.getState();
        const references = state.references;
        let pointersHtml = '<div class="debug-tab-content">';
        // Current Context Section
        pointersHtml += '<h4>📍 Current Context</h4>';
        pointersHtml += '<div class="pointer-context-section">';
        const currentCharName = state.currentCharacterId
            ? ((_a = findCharacterById(state.currentCharacterId)) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'
            : 'None';
        const currentCharId = state.currentCharacterId || 'None';
        pointersHtml += '<div class="context-info-grid">';
        pointersHtml += `<div class="context-item"><span class="context-label">Character:</span> <span class="context-value">${currentCharName}</span> <small>(${currentCharId})</small></div>`;
        pointersHtml += `<div class="context-item"><span class="context-label">Chat ID:</span> <span class="context-value">${state.currentChatId || 'None'}</span></div>`;
        pointersHtml += `<div class="context-item"><span class="context-label">Instance ID:</span> <span class="context-value">${state.currentOutfitInstanceId || 'None'}</span></div>`;
        pointersHtml += `<div class="context-item"><span class="context-label">Bot Panel:</span> <span class="context-value ${state.panelVisibility.bot ? 'status-active' : 'status-inactive'}">${state.panelVisibility.bot ? 'Visible' : 'Hidden'}</span></div>`;
        pointersHtml += `<div class="context-item"><span class="context-label">User Panel:</span> <span class="context-value ${state.panelVisibility.user ? 'status-active' : 'status-inactive'}">${state.panelVisibility.user ? 'Visible' : 'Hidden'}</span></div>`;
        pointersHtml += '</div>';
        pointersHtml += '</div>';
        // Global References Section
        pointersHtml += '<h4>🔗 Global References</h4>';
        pointersHtml += '<div class="pointer-references-section">';
        pointersHtml += '<table class="pointer-values-table">';
        pointersHtml += '<thead><tr><th>Reference</th><th>Status</th><th>Details</th></tr></thead><tbody>';
        // Show available references with more detail
        for (const [key, value] of Object.entries(references)) {
            const status = value ? '✅ Available' : '❌ Not Set';
            const statusClass = value ? 'status-available' : 'status-unavailable';
            const details = value ? this.getReferenceDetails(key, value) : 'N/A';
            pointersHtml += `<tr><td>${key}</td><td class="${statusClass}">${status}</td><td>${details}</td></tr>`;
        }
        pointersHtml += '</tbody></table>';
        pointersHtml += '</div>';
        // Extension API References Section
        pointersHtml += '<h4>🛠️ Extension API References</h4>';
        pointersHtml += '<div class="pointer-api-section">';
        pointersHtml += '<table class="pointer-values-table">';
        pointersHtml +=
            '<thead><tr><th>API Reference</th><th>Status</th><th>Type</th><th>Details</th></tr></thead><tbody>';
        // Check various global references with more detail
        const globalRefs = [
            {
                name: 'window.botOutfitPanel',
                exists: Boolean(window.botOutfitPanel),
                type: 'Panel Instance',
                details: window.botOutfitPanel ? 'Bot outfit panel controller' : 'Panel not initialized',
            },
            {
                name: 'window.userOutfitPanel',
                exists: Boolean(window.userOutfitPanel),
                type: 'Panel Instance',
                details: window.userOutfitPanel ? 'User outfit panel controller' : 'Panel not initialized',
            },
            {
                name: 'window.outfitTracker',
                exists: Boolean(window.outfitTracker),
                type: 'Tracker Service',
                details: window.outfitTracker ? 'Outfit change tracker' : 'Tracker not initialized',
            },
            {
                name: 'window.outfitTrackerInterceptor',
                exists: Boolean(window.outfitTrackerInterceptor),
                type: 'Interceptor',
                details: window.outfitTrackerInterceptor
                    ? 'Message interception handler'
                    : 'Interceptor not active',
            },
            {
                name: 'window.getOutfitExtensionStatus',
                exists: Boolean(window.getOutfitExtensionStatus),
                type: 'Status Function',
                details: window.getOutfitExtensionStatus
                    ? 'Extension status checker'
                    : 'Status function not available',
            },
            {
                name: 'outfitStore',
                exists: Boolean(outfitStore),
                type: 'Store Instance',
                details: outfitStore ? 'Main state management store' : 'Store not initialized',
            },
            {
                name: 'customMacroSystem',
                exists: Boolean(customMacroSystem),
                type: 'Macro System',
                details: customMacroSystem
                    ? `Macro processor (${customMacroSystem.macroValueCache.size} cached)`
                    : 'Macro system not initialized',
            },
            {
                name: 'debugLogger',
                exists: Boolean(debugLogger),
                type: 'Logger Instance',
                details: debugLogger ? `Debug logger (${debugLogger.getLogs().length} logs)` : 'Logger not initialized',
            },
        ];
        for (const ref of globalRefs) {
            const status = ref.exists ? '✅ Available' : '❌ Not Available';
            const statusClass = ref.exists ? 'status-available' : 'status-unavailable';
            pointersHtml += `<tr><td>${ref.name}</td><td class="${statusClass}">${status}</td><td>${ref.type}</td><td>${ref.details}</td></tr>`;
        }
        pointersHtml += '</tbody></table>';
        pointersHtml += '</div>';
        // Service Status Section
        pointersHtml += '<h4>⚙️ Service Status</h4>';
        pointersHtml += '<div class="pointer-services-section">';
        pointersHtml += '<div class="service-status-grid">';
        // Character Service
        const charService = window.characterService || window.CharacterService;
        pointersHtml += `<div class="service-item">
            <div class="service-name">Character Service</div>
            <div class="service-status ${charService ? 'status-active' : 'status-inactive'}">
                ${charService ? '✅ Active' : '❌ Inactive'}
            </div>
            <div class="service-details">${charService ? 'Character data management' : 'Service not available'}</div>
        </div>`;
        // LLM Service
        const llmService = window.llmService || window.LLMService;
        pointersHtml += `<div class="service-item">
            <div class="service-name">LLM Service</div>
            <div class="service-status ${llmService ? 'status-active' : 'status-inactive'}">
                ${llmService ? '✅ Active' : '❌ Inactive'}
            </div>
            <div class="service-details">${llmService ? 'AI integration service' : 'Service not available'}</div>
        </div>`;
        // Event Service
        const eventService = window.eventService || window.EventService;
        pointersHtml += `<div class="service-item">
            <div class="service-name">Event Service</div>
            <div class="service-status ${eventService ? 'status-active' : 'status-inactive'}">
                ${eventService ? '✅ Active' : '❌ Inactive'}
            </div>
            <div class="service-details">${eventService ? 'Event handling system' : 'Service not available'}</div>
        </div>`;
        // Storage Service
        const storageService = window.storageService || window.StorageService;
        pointersHtml += `<div class="service-item">
            <div class="service-name">Storage Service</div>
            <div class="service-status ${storageService ? 'status-active' : 'status-inactive'}">
                ${storageService ? '✅ Active' : '❌ Inactive'}
            </div>
            <div class="service-details">${storageService ? 'Data persistence layer' : 'Service not available'}</div>
        </div>`;
        pointersHtml += '</div>';
        pointersHtml += '</div>';
        // Memory & Performance Section
        pointersHtml += '<h4>💾 Memory & Objects</h4>';
        pointersHtml += '<div class="pointer-memory-section">';
        pointersHtml += '<div class="memory-info-grid">';
        // Store state size
        const stateSize = JSON.stringify(state).length;
        const stateSizeKB = (stateSize / 1024).toFixed(2);
        pointersHtml += `<div class="memory-item">
            <span class="memory-label">Store State Size:</span>
            <span class="memory-value">${stateSizeKB} KB</span>
            <span class="memory-details">(${stateSize.toLocaleString()} chars)</span>
        </div>`;
        // Bot instances count
        const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
            return total + Object.keys(state.botInstances[charId]).length;
        }, 0);
        pointersHtml += `<div class="memory-item">
            <span class="memory-label">Bot Instances:</span>
            <span class="memory-value">${botInstanceCount}</span>
            <span class="memory-details">Active outfit instances</span>
        </div>`;
        // User instances count
        const userInstanceCount = Object.keys(state.userInstances).length;
        pointersHtml += `<div class="memory-item">
            <span class="memory-label">User Instances:</span>
            <span class="memory-value">${userInstanceCount}</span>
            <span class="memory-details">User outfit instances</span>
        </div>`;
        // Macro cache size
        const macroCacheSize = customMacroSystem.macroValueCache.size;
        pointersHtml += `<div class="memory-item">
            <span class="memory-label">Macro Cache:</span>
            <span class="memory-value">${macroCacheSize}</span>
            <span class="memory-details">Cached macro values</span>
        </div>`;
        pointersHtml += '</div>';
        pointersHtml += '</div>';
        pointersHtml += '</div>';
        container.innerHTML = pointersHtml;
    }
    /**
     * Gets detailed information about a reference
     */
    getReferenceDetails(key, value) {
        if (!value)
            return 'N/A';
        try {
            switch (key) {
                case 'currentCharacterId':
                    return `Character ID: ${value}`;
                case 'currentChatId':
                    return `Chat ID: ${value}`;
                case 'currentOutfitInstanceId':
                    return `Instance ID: ${value}`;
                case 'debugMode':
                    return `Debug mode: ${value ? 'Enabled' : 'Disabled'}`;
                case 'autoSave':
                    return `Auto-save: ${value ? 'Enabled' : 'Disabled'}`;
                default:
                    if (typeof value === 'object') {
                        const keys = Object.keys(value);
                        return `${keys.length} properties`;
                    }
                    return typeof value === 'string' ? `"${value}"` : String(value);
            }
        }
        catch (error) {
            return 'Error getting details';
        }
    }
    /**
     * Runs performance tests and displays results
     */
    runPerformanceTest() {
        const resultsDiv = document.getElementById('performance-test-results');
        if (!resultsDiv) {
            return;
        }
        resultsDiv.innerHTML = '<p>Running performance tests...</p>';
        // Test macro resolution performance
        const startTime = performance.now();
        // Perform several macro resolutions to test performance
        for (let i = 0; i < 100; i++) {
            // Try to resolve a common macro pattern using the correct method
            customMacroSystem.getCurrentSlotValue('char', 'headwear');
            customMacroSystem.getCurrentSlotValue('user', 'topwear');
        }
        const endTime = performance.now();
        const macroTestTime = endTime - startTime;
        // Test store access performance
        const storeStartTime = performance.now();
        for (let i = 0; i < 1000; i++) {
            outfitStore.getState();
        }
        const storeEndTime = performance.now();
        const storeTestTime = storeEndTime - storeStartTime;
        // Display results
        resultsDiv.innerHTML = `
            <h6>Test Results:</h6>
            <ul>
                <li>Macro resolution test (100 iterations): ${macroTestTime.toFixed(2)}ms</li>
                <li>Store access test (1000 iterations): ${storeTestTime.toFixed(2)}ms</li>
                <li>Avg macro resolution: ${(macroTestTime / 100).toFixed(4)}ms</li>
                <li>Avg store access: ${(storeTestTime / 1000).toFixed(4)}ms</li>
            </ul>
        `;
    }
    /**
     * Renders the 'State' tab with the current store state
     */
    renderStateTab(container) {
        const state = outfitStore.getState();
        let stateHtml = '<div class="debug-tab-content">';
        stateHtml += '<h4>Current Store State</h4>';
        stateHtml += '<button id="copy-state-btn" class="menu_button">Copy to Clipboard</button>';
        stateHtml += '<div class="state-info">';
        stateHtml += '<pre>' + JSON.stringify(state, null, 2) + '</pre>';
        stateHtml += '</div>';
        stateHtml += '</div>';
        container.innerHTML = stateHtml;
        setTimeout(() => {
            var _a;
            (_a = document.getElementById('copy-state-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                navigator.clipboard.writeText(JSON.stringify(state, null, 2));
                toastr.success('State copied to clipboard!', 'Debug Panel');
            });
        }, 100);
    }
    /**
     * Shows extension information
     */
    showExtensionInfo() {
        const info = {
            version: this.getExtensionVersion(),
            loadedModules: {
                store: !!outfitStore,
                panels: !!(window.botOutfitPanel && window.userOutfitPanel),
                macroSystem: !!customMacroSystem,
                eventBus: !!extensionEventBus,
                debugPanel: !!this,
            },
            globalAPIs: {
                outfitTracker: !!window.outfitTracker,
                wipeAllOutfits: !!window.wipeAllOutfits,
                refreshOutfitMacros: !!window.refreshOutfitMacros,
            },
            services: {
                characterService: !!window.characterService,
                llmService: !!window.llmService,
                eventService: !!window.eventService,
                storageService: !!window.storageService,
            },
        };
        console.log('Extension Information:', info);
        toastr.info('Extension info logged to console!', 'Debug Panel');
    }
    /**
     * Export all outfit data to a JSON file
     */
    exportOutfitData() {
        try {
            const state = outfitStore.getState();
            const dataStr = JSON.stringify(state, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `outfit-data-export-${new Date().toISOString().slice(0, 19)}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toastr.success('Outfit data exported!', 'Debug Panel');
        }
        catch (error) {
            debugLogger.log('Error exporting outfit data:', error, 'error');
            toastr.error('Error exporting outfit data', 'Debug Panel');
        }
    }
    /**
     * Import outfit data from a JSON file
     */
    importOutfitData(file) {
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            var _a;
            try {
                const data = JSON.parse((_a = e.target) === null || _a === void 0 ? void 0 : _a.result);
                if (confirm('Are you sure you want to import this outfit data? This will replace all current data.')) {
                    // Update store state with imported data
                    outfitStore.setState(data);
                    outfitStore.saveState(); // Save to storage
                    this.renderContent();
                    toastr.success('Outfit data imported!', 'Debug Panel');
                }
            }
            catch (error) {
                debugLogger.log('Error importing outfit data:', error, 'error');
                toastr.error('Error importing outfit data. Check console for details.', 'Debug Panel');
            }
        };
        reader.readAsText(file);
    }
    /**
     * Toggles the visibility of the debug panel
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    /**
     * Stops real-time update intervals
     */
    stopRealTimeUpdates() {
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
            this.realTimeUpdateInterval = null;
        }
        if (this.logUpdateInterval) {
            clearInterval(this.logUpdateInterval);
            this.logUpdateInterval = null;
        }
    }
    /**
     * Updates tabs that need real-time data based on store changes
     */
    updateRealTimeTabs(_newState) {
        if (!this.isVisible)
            return;
        // Note: Real-time updates are handled by intervals in startRealTimeUpdates()
        // This method is kept for future use if needed
    }
    /**
     * Groups logs with the same message and data together
     */
    groupSimilarLogs(logs) {
        var _a;
        const groups = new Map();
        for (const log of logs) {
            // Create a key based on message and data
            const dataStr = log.data !== null && log.data !== undefined ? JSON.stringify(log.data) : '';
            const key = `${log.level}:${log.message}:${dataStr}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            (_a = groups.get(key)) === null || _a === void 0 ? void 0 : _a.push(log);
        }
        // Convert to array of groups, keeping only the most recent log for each group
        return Array.from(groups.values()).map((logsInGroup) => ({
            logs: [logsInGroup[0]], // Keep only the first (most recent) log
            count: logsInGroup.length,
        }));
    }
    /**
     * Exports current logs to a downloadable .log file
     */
    exportLogsToFile() {
        const logs = debugLogger.getLogs();
        if (logs.length === 0) {
            toastr.warning('No logs to export!', 'Debug Panel');
            return;
        }
        // Sort logs by timestamp (newest first for export)
        const sortedLogs = [...logs].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return timeB - timeA; // Newest first
        });
        // Group similar logs
        const groupedLogs = this.groupSimilarLogs(sortedLogs);
        // Format grouped logs for export
        const logLines = groupedLogs.map((group) => {
            const log = group.logs[0]; // Use the first (most recent) log for display
            const timestamp = new Date(log.timestamp).toISOString();
            const level = log.level.toUpperCase();
            const message = log.message;
            const countSuffix = group.count > 1 ? ` (${group.count}x)` : '';
            let logLine = `[${timestamp}] [${level}] ${message}${countSuffix}`;
            // Add data if present
            if (log.data !== null && log.data !== undefined) {
                try {
                    const dataStr = JSON.stringify(log.data, null, 2);
                    logLine +=
                        '\n' +
                            dataStr
                                .split('\n')
                                .map((line) => `    ${line}`)
                                .join('\n');
                }
                catch (error) {
                    logLine += `\n    [Error serializing data: ${error}]`;
                }
            }
            return logLine;
        });
        // Create the full log content
        const logContent = logLines.join('\n') + '\n';
        // Create and download the file
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `st-outfits-logs-${new Date().toISOString().split('T')[0]}.log`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toastr.success(`Exported ${groupedLogs.length} unique log entries (${logs.length} total)!`, 'Debug Panel');
    }
    /**
     * Updates logs tab with new log entries
     */
    updateLogsTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'logs')
            return;
        // Check if content has been rendered
        const logList = contentArea.querySelector('.debug-logs-list');
        if (!logList)
            return;
        const logs = debugLogger.getLogs();
        const logItems = contentArea.querySelectorAll('.log-item');
        // Only update if there are new logs
        if (logs.length > logItems.length) {
            this.renderLogsTab(contentArea);
        }
    }
    /**
     * Updates pointers tab with current reference status
     */
    updatePointersTab() {
        var _a, _b;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'pointers')
            return;
        const state = outfitStore.getState();
        // Update context information
        const contextGrid = contentArea.querySelector('.context-info-grid');
        if (contextGrid) {
            const currentCharName = state.currentCharacterId
                ? ((_b = findCharacterById(state.currentCharacterId)) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown'
                : 'None';
            const currentCharId = state.currentCharacterId || 'None';
            const contextItems = contextGrid.querySelectorAll('.context-item');
            if (contextItems.length >= 5) {
                // Update character info
                const charItem = contextItems[0];
                charItem.innerHTML = `<span class="context-label">Character:</span> <span class="context-value">${currentCharName}</span> <small>(${currentCharId})</small>`;
                // Update chat ID
                const chatItem = contextItems[1];
                chatItem.innerHTML = `<span class="context-label">Chat ID:</span> <span class="context-value">${state.currentChatId || 'None'}</span>`;
                // Update instance ID
                const instanceItem = contextItems[2];
                instanceItem.innerHTML = `<span class="context-label">Instance ID:</span> <span class="context-value">${state.currentOutfitInstanceId || 'None'}</span>`;
                // Update panel visibility
                const botPanelItem = contextItems[3];
                botPanelItem.innerHTML = `<span class="context-label">Bot Panel:</span> <span class="context-value ${state.panelVisibility.bot ? 'status-active' : 'status-inactive'}">${state.panelVisibility.bot ? 'Visible' : 'Hidden'}</span>`;
                const userPanelItem = contextItems[4];
                userPanelItem.innerHTML = `<span class="context-label">User Panel:</span> <span class="context-value ${state.panelVisibility.user ? 'status-active' : 'status-inactive'}">${state.panelVisibility.user ? 'Visible' : 'Hidden'}</span>`;
            }
        }
        // Update global references table
        const referencesTable = contentArea.querySelector('.pointer-references-section table tbody');
        if (referencesTable) {
            const references = state.references;
            let tbodyHtml = '';
            for (const [key, value] of Object.entries(references)) {
                const status = value ? '✅ Available' : '❌ Not Set';
                const statusClass = value ? 'status-available' : 'status-unavailable';
                const details = value ? this.getReferenceDetails(key, value) : 'N/A';
                tbodyHtml += `<tr><td>${key}</td><td class="${statusClass}">${status}</td><td>${details}</td></tr>`;
            }
            referencesTable.innerHTML = tbodyHtml;
        }
        // Update API references table
        const apiTable = contentArea.querySelector('.pointer-api-section table tbody');
        if (apiTable) {
            const globalRefs = [
                {
                    name: 'window.botOutfitPanel',
                    exists: Boolean(window.botOutfitPanel),
                    type: 'Panel Instance',
                    details: window.botOutfitPanel ? 'Bot outfit panel controller' : 'Panel not initialized',
                },
                {
                    name: 'window.userOutfitPanel',
                    exists: Boolean(window.userOutfitPanel),
                    type: 'Panel Instance',
                    details: window.userOutfitPanel ? 'User outfit panel controller' : 'Panel not initialized',
                },
                {
                    name: 'window.outfitTracker',
                    exists: Boolean(window.outfitTracker),
                    type: 'Tracker Service',
                    details: window.outfitTracker ? 'Outfit change tracker' : 'Tracker not initialized',
                },
                {
                    name: 'window.outfitTrackerInterceptor',
                    exists: Boolean(window.outfitTrackerInterceptor),
                    type: 'Interceptor',
                    details: window.outfitTrackerInterceptor
                        ? 'Message interception handler'
                        : 'Interceptor not active',
                },
                {
                    name: 'window.getOutfitExtensionStatus',
                    exists: Boolean(window.getOutfitExtensionStatus),
                    type: 'Status Function',
                    details: window.getOutfitExtensionStatus
                        ? 'Extension status checker'
                        : 'Status function not available',
                },
                {
                    name: 'outfitStore',
                    exists: Boolean(outfitStore),
                    type: 'Store Instance',
                    details: outfitStore ? 'Main state management store' : 'Store not initialized',
                },
                {
                    name: 'customMacroSystem',
                    exists: Boolean(customMacroSystem),
                    type: 'Macro System',
                    details: customMacroSystem
                        ? `Macro processor (${customMacroSystem.macroValueCache.size} cached)`
                        : 'Macro system not initialized',
                },
                {
                    name: 'debugLogger',
                    exists: Boolean(debugLogger),
                    type: 'Logger Instance',
                    details: debugLogger
                        ? `Debug logger (${debugLogger.getLogs().length} logs)`
                        : 'Logger not initialized',
                },
            ];
            let tbodyHtml = '';
            for (const ref of globalRefs) {
                const status = ref.exists ? '✅ Available' : '❌ Not Available';
                const statusClass = ref.exists ? 'status-available' : 'status-unavailable';
                tbodyHtml += `<tr><td>${ref.name}</td><td class="${statusClass}">${status}</td><td>${ref.type}</td><td>${ref.details}</td></tr>`;
            }
            apiTable.innerHTML = tbodyHtml;
        }
        // Update memory information
        const memoryGrid = contentArea.querySelector('.memory-info-grid');
        if (memoryGrid) {
            const memoryItems = memoryGrid.querySelectorAll('.memory-item');
            if (memoryItems.length >= 4) {
                // Update store state size
                const stateSize = JSON.stringify(state).length;
                const stateSizeKB = (stateSize / 1024).toFixed(2);
                const stateItem = memoryItems[0];
                stateItem.innerHTML = `<span class="memory-label">Store State Size:</span> <span class="memory-value">${stateSizeKB} KB</span> <span class="memory-details">(${stateSize.toLocaleString()} chars)</span>`;
                // Update bot instances count
                const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
                    return total + Object.keys(state.botInstances[charId]).length;
                }, 0);
                const botItem = memoryItems[1];
                botItem.innerHTML = `<span class="memory-label">Bot Instances:</span> <span class="memory-value">${botInstanceCount}</span> <span class="memory-details">Active outfit instances</span>`;
                // Update user instances count
                const userInstanceCount = Object.keys(state.userInstances).length;
                const userItem = memoryItems[2];
                userItem.innerHTML = `<span class="memory-label">User Instances:</span> <span class="memory-value">${userInstanceCount}</span> <span class="memory-details">User outfit instances</span>`;
                // Update macro cache size
                const macroCacheSize = customMacroSystem.macroValueCache.size;
                const macroItem = memoryItems[3];
                macroItem.innerHTML = `<span class="memory-label">Macro Cache:</span> <span class="memory-value">${macroCacheSize}</span> <span class="memory-details">Cached macro values</span>`;
            }
        }
    }
    /**
     * Updates macros tab with current macro values
     */
    updateMacrosTab() {
        var _a, _b;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'macros')
            return;
        // Check if content has been rendered
        const cacheInfo = contentArea.querySelector('.macro-cache-info');
        const cacheTable = contentArea.querySelector('.macro-cache-table');
        if (!cacheInfo || !cacheTable)
            return;
        const currentCacheSize = customMacroSystem.macroValueCache.size;
        // Only update if cache size changed
        if (currentCacheSize === this.lastMacroCacheSize) {
            // Just update the timestamp
            const updateTime = new Date().toLocaleTimeString();
            const sizeText = ((_b = cacheInfo.innerHTML.match(/Cached entries: \d+/)) === null || _b === void 0 ? void 0 : _b[0]) || `Cached entries: ${currentCacheSize}`;
            cacheInfo.innerHTML = `${sizeText} <small>(Updated: ${updateTime})</small>`;
            return;
        }
        this.lastMacroCacheSize = currentCacheSize;
        // Update macro cache info
        const updateTime = new Date().toLocaleTimeString();
        cacheInfo.innerHTML = `Cached entries: ${currentCacheSize} <small>(Updated: ${updateTime})</small>`;
        // Update macro cache table (only if cache size changed)
        const tbody = cacheTable.querySelector('tbody');
        if (tbody && currentCacheSize !== this.lastMacroCacheSize) {
            let tbodyHtml = '';
            for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
                const timestamp = new Date(entry.timestamp).toISOString();
                tbodyHtml += `<tr><td>${key}</td><td>${entry.value}</td><td>${timestamp}</td></tr>`;
            }
            tbody.innerHTML = tbodyHtml;
        }
    }
    /**
     * Updates performance tab with current metrics
     */
    updatePerformanceTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'performance')
            return;
        // Check if content has been rendered
        const perfInfo = contentArea.querySelector('.performance-info');
        if (!perfInfo)
            return;
        const state = outfitStore.getState();
        // Calculate performance metrics
        const botInstanceCount = Object.keys(state.botInstances).reduce((total, charId) => {
            return total + Object.keys(state.botInstances[charId]).length;
        }, 0);
        const userInstanceCount = Object.keys(state.userInstances).length;
        // Only recalculate storage size every 30 seconds to reduce performance impact
        const now = Date.now();
        if (now - this.lastStateStringifyTime > 30000) {
            // 30 seconds
            const stateStr = JSON.stringify(state);
            this.lastStorageSize = new Blob([stateStr]).size / 1024;
            this.lastStateStringifyTime = now;
        }
        const estimatedStorageSize = `${this.lastStorageSize.toFixed(2)} KB`;
        const updateTime = new Date().toLocaleTimeString();
        // Update performance info
        let infoHtml = `<div><strong>Total Bot Instances:</strong> ${botInstanceCount}</div>`;
        infoHtml += `<div><strong>Total User Instances:</strong> ${userInstanceCount}</div>`;
        infoHtml += `<div><strong>Total Outfit Slots:</strong> ${(botInstanceCount + userInstanceCount) * 19}</div>`;
        infoHtml += `<div><strong>Estimated Storage Size:</strong> ${estimatedStorageSize}</div>`;
        infoHtml += `<div><strong>Current Cache Size:</strong> ${customMacroSystem.macroValueCache.size} items</div>`;
        infoHtml += `<div><small>Last updated: ${updateTime}</small></small></div>`;
        // Update performance indicators
        infoHtml += '<h5>Performance Indicators:</h5>';
        infoHtml += '<div class="performance-indicators">';
        if (botInstanceCount > 50) {
            infoHtml += '<div class="warning">⚠️ High number of bot instances detected</div>';
        }
        else if (botInstanceCount > 20) {
            infoHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Low number of bot instances</div>';
        }
        if (userInstanceCount > 10) {
            infoHtml += '<div class="warning">⚠️ High number of user instances detected</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }
        if (this.lastStorageSize > 1000) {
            infoHtml += '<div class="warning">⚠️ Large storage size detected</div>';
        }
        else if (this.lastStorageSize > 500) {
            infoHtml += '<div class="info">ℹ️ Moderate storage size</div>';
        }
        else {
            infoHtml += '<div class="good">✅ Reasonable storage size</div>';
        }
        infoHtml += '</div>';
        perfInfo.innerHTML = infoHtml;
        // Ensure performance testing button is present and has event listener
        this.ensurePerformanceTestButton();
    }
    /**
     * Ensures the performance test button is present and has event listener
     */
    ensurePerformanceTestButton() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'performance')
            return;
        // Check if performance testing section exists
        let testingSection = contentArea.querySelector('.performance-testing');
        if (!testingSection) {
            // Add the performance testing section after the performance-info div
            const perfInfo = contentArea.querySelector('.performance-info');
            if (perfInfo && perfInfo.parentNode) {
                const testingHtml = `
                    <h5>Performance Testing:</h5>
                    <div class="performance-testing">
                        <button id="debug-run-performance-test" class="menu_button">Run Performance Test</button>
                        <div id="performance-test-results"></div>
                    </div>
                `;
                perfInfo.insertAdjacentHTML('afterend', testingHtml);
                testingSection = contentArea.querySelector('.performance-testing');
            }
        }
        // Ensure button has event listener
        const performanceTestBtn = contentArea.querySelector('#debug-run-performance-test');
        if (performanceTestBtn && !performanceTestBtn.hasAttribute('data-has-listener')) {
            performanceTestBtn.addEventListener('click', () => {
                this.runPerformanceTest();
            });
            performanceTestBtn.setAttribute('data-has-listener', 'true');
        }
    }
    /**
     * Updates state tab with current store state
     */
    updateStateTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'state')
            return;
        // Check if content has been rendered
        const stateInfo = contentArea.querySelector('.state-info');
        if (!stateInfo)
            return;
        const state = outfitStore.getState();
        const preElement = stateInfo.querySelector('pre');
        if (preElement) {
            preElement.textContent = JSON.stringify(state, null, 2);
        }
    }
    /**
     * Updates misc tab with current information
     */
    updateMiscTab() {
        // Misc tab no longer has real-time content to update
    }
    /**
     * Starts real-time update intervals for various tabs
     */
    startRealTimeUpdates() {
        // Clear existing intervals
        this.stopRealTimeUpdates();
        // Update logs tab every 5000ms (prevent refreshing if any drawers are open)
        this.logUpdateInterval = window.setInterval(() => {
            if (this.isVisible && this.currentTab === 'logs') {
                // Check if any drawers are open
                const openDrawers = document.querySelectorAll('.inline-drawer-content:not([style*="display: none"])');
                const areDrawersOpen = openDrawers.length > 0;
                // Only update logs if no drawers are open
                if (!areDrawersOpen) {
                    this.updateLogsTab();
                }
            }
        }, 5000);
        // Update other tabs every 10 seconds (further reduced to prevent stuttering)
        this.realTimeUpdateInterval = window.setInterval(() => {
            if (!this.isVisible)
                return;
            switch (this.currentTab) {
                case 'macros':
                    this.updateMacrosTab();
                    break;
                case 'pointers':
                    this.updatePointersTab();
                    break;
                case 'performance':
                    this.updatePerformanceTab();
                    break;
                case 'embedded':
                    this.updateEmbeddedDataTab();
                    break;
                case 'state':
                    this.updateStateTab();
                    break;
                // Removed 'events' from real-time updates - it only updates when events are recorded
            }
        }, 10000);
    }
    /**
     * Updates the embedded data tab with current information
     */
    updateEmbeddedDataTab() {
        var _a, _b, _c, _d, _e;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'embedded')
            return;
        // Check if content has been rendered
        const embeddedInfo = contentArea.querySelector('.embedded-info');
        if (!embeddedInfo)
            return;
        // Update the counter if it exists
        const statNumberElement = contentArea.querySelector('.stat-number');
        if (statNumberElement) {
            const context = ((_c = (_b = window.SillyTavern) === null || _b === void 0 ? void 0 : _b.getContext) === null || _c === void 0 ? void 0 : _c.call(_b)) || ((_e = (_d = window).getContext) === null || _e === void 0 ? void 0 : _e.call(_d));
            let totalDefaultOutfits = 0;
            if (context && context.characters) {
                for (let i = 0; i < context.characters.length; i++) {
                    const character = context.characters[i];
                    const embeddedData = getCharacterOutfitData(character);
                    if (embeddedData &&
                        embeddedData.defaultOutfit &&
                        Object.keys(embeddedData.defaultOutfit).length > 0) {
                        totalDefaultOutfits++;
                    }
                }
            }
            statNumberElement.textContent = totalDefaultOutfits.toString();
        }
        // Update timestamp displays
        const lastModifiedElements = contentArea.querySelectorAll('.embedded-last-modified');
        lastModifiedElements.forEach((element) => {
            var _a;
            // Update "Modified: X" text with current time indicator
            const currentTime = new Date().toLocaleTimeString();
            if ((_a = element.textContent) === null || _a === void 0 ? void 0 : _a.includes('Modified:')) {
                // Keep original timestamp but add a visual indicator that we're live
                element.innerHTML = element.innerHTML.replace(/Modified: ([^<]*)/, `Modified: $1 <small>(Live: ${currentTime})</small>`);
            }
        });
    }
}
