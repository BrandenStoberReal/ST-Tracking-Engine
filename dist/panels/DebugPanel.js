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
import { CharacterInfoType, getCharacterInfoById } from '../utils/CharacterUtils.js';
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
        tabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = event.target.dataset.tab;
                if (tabName == null)
                    return;
                this.currentTab = tabName;
                this.renderContent();
                tabs.forEach(t => t.classList.remove('active'));
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
                resizeElement($(this.domElement), 'outfit-debug-panel');
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
     * Renders the 'Macros' tab to showcase current instances and derivations
     */
    renderMacrosTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let macrosHtml = '<div class="debug-macros-list">';
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
        if (currentCharacterId && currentInstanceId && botInstances[currentCharacterId] && botInstances[currentCharacterId][currentInstanceId]) {
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
     * Updates tabs that need real-time data based on store changes
     */
    updateRealTimeTabs(newState) {
        if (!this.isVisible)
            return;
        // Note: Real-time updates are handled by intervals in startRealTimeUpdates()
        // This method is kept for future use if needed
    }
    /**
     * Renders the 'Logs' tab with logs from the DebugLogger
     */
    renderLogsTab(container) {
        const logs = debugLogger.getLogs();
        let logsHtml = `
            <div class="debug-logs-header">
                <input type="text" id="log-search" placeholder="Search logs...">
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
            logsHtml += groupedLogs.map(group => {
                const log = group.logs[0]; // Use the first log for display
                const hasData = log.data !== null && log.data !== undefined;
                const logItemClasses = `log-item log-${log.level.toLowerCase()}`;
                const logItemAttributes = `data-level="${log.level.toLowerCase()}" data-message="${log.message.toLowerCase()}"`;
                const countDisplay = group.count > 1 ? ` <span class="log-count">(${group.count}x)</span>` : '';
                if (hasData) {
                    return `
                        <div class="${logItemClasses}" ${logItemAttributes}>
                            <details>
                                <summary>
                                    <span class="log-timestamp">${new Date(log.timestamp).toISOString()}</span>
                                    <span class="log-level">[${log.level}]</span>
                                    <span class="log-message">${log.message}${countDisplay}</span>
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
                            <span class="log-message">${log.message}${countDisplay}</span>
                        </div>
                    `;
                }
            }).join('');
        }
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
            logItems.forEach(item => {
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
            detailsElements.forEach(details => {
                details.open = true;
            });
        });
        collapseAllBtn.addEventListener('click', () => {
            const detailsElements = container.querySelectorAll('.log-item details');
            detailsElements.forEach(details => {
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
     * Groups logs with the same message and data together
     */
    groupSimilarLogs(logs) {
        const groups = new Map();
        for (const log of logs) {
            // Create a key based on message and data
            const dataStr = log.data !== null && log.data !== undefined ? JSON.stringify(log.data) : '';
            const key = `${log.level}:${log.message}:${dataStr}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(log);
        }
        // Convert to array of groups, keeping only the most recent log for each group
        return Array.from(groups.values()).map(logsInGroup => ({
            logs: [logsInGroup[0]], // Keep only the first (most recent) log
            count: logsInGroup.length
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
        const logLines = groupedLogs.map(group => {
            const log = group.logs[0]; // Use the first (most recent) log for display
            const timestamp = new Date(log.timestamp).toISOString();
            const level = log.level.toUpperCase().padEnd(5);
            const message = log.message;
            const countSuffix = group.count > 1 ? ` (${group.count}x)` : '';
            let logLine = `[${timestamp}] [${level}] ${message}${countSuffix}`;
            // Add data if present
            if (log.data !== null && log.data !== undefined) {
                try {
                    const dataStr = JSON.stringify(log.data, null, 2);
                    logLine += '\n' + dataStr.split('\n').map(line => `    ${line}`).join('\n');
                }
                catch (error) {
                    logLine += `\n    [Error serializing data: ${error}]`;
                }
            }
            return logLine;
        });
        // Create the full log content
        const logContent = logLines.join('\n\n') + '\n';
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
            // Check if settings drawer might be affected - use a more targeted update
            const settingsDrawer = document.querySelector('.inline-drawer-content');
            const isDrawerPotentiallyOpen = settingsDrawer && window.getComputedStyle(settingsDrawer).display !== 'none';
            // If drawer might be open, delay the update to avoid interference
            if (isDrawerPotentiallyOpen) {
                setTimeout(() => {
                    if (this.isVisible && this.currentTab === 'logs') {
                        this.renderLogsTab(contentArea);
                    }
                }, 100);
            }
            else {
                this.renderLogsTab(contentArea);
            }
        }
    }
    /**
     * Renders the 'Embedded Data' tab for debugging character card embedded outfit data
     */
    renderEmbeddedDataTab(container) {
        var _a, _b, _c, _d, _e, _f;
        const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_d = (_c = window).getContext) === null || _d === void 0 ? void 0 : _d.call(_c));
        let embeddedHtml = '<div class="debug-embedded-content">';
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
            embeddedHtml += '<div class="embedded-search-container"><input type="text" id="embedded-search" placeholder="Search characters..."></div>';
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
                    const lastModified = embeddedData.lastModified ? new Date(embeddedData.lastModified).toLocaleString() : 'Unknown';
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
        embeddedHtml += '<button id="migrate-default-outfits-btn" class="menu_button">Migrate Default Outfits to Cards</button>';
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
                    characterItems.forEach(item => {
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
            characterItems.forEach(item => {
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
                            resultsDiv.innerHTML = '<p>ℹ️ Preset migration is not available. Only default outfits are embedded.</p>';
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
        let performanceHtml = '<div class="debug-performance-content">';
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
            performanceHtml += '<div class="warning">⚠️ High number of bot instances detected - may impact performance</div>';
        }
        else if (botInstanceCount > 20) {
            performanceHtml += '<div class="info">ℹ️ Moderate number of bot instances</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Low number of bot instances</div>';
        }
        if (userInstanceCount > 10) {
            performanceHtml += '<div class="warning">⚠️ High number of user instances detected - may impact performance</div>';
        }
        else {
            performanceHtml += '<div class="good">✅ Reasonable number of user instances</div>';
        }
        const storageKB = new Blob([stateStr]).size / 1024;
        if (storageKB > 1000) { // More than 1MB
            performanceHtml += '<div class="warning">⚠️ Large storage size detected - consider cleanup</div>';
        }
        else if (storageKB > 500) { // More than 500KB
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
    /**
     * Renders the 'Instances' tab with instance browser functionality
     */
    renderInstancesTab(container) {
        const state = outfitStore.getState();
        const botInstances = state.botInstances;
        const userInstances = state.userInstances;
        let instancesHtml = '<div class="debug-instances-list">';
        // Add search input
        instancesHtml += '<div class="instance-search-container"><input type="text" id="instance-search" placeholder="Search instances..."></div>';
        // Add bot instances
        instancesHtml += '<h4>Bot Instances</h4>';
        if (Object.keys(botInstances).length === 0) {
            instancesHtml += '<p class="no-instances">No bot instances found</p>';
        }
        else {
            for (const [charId, charData] of Object.entries(botInstances)) {
                const charName = getCharacterInfoById(charId, CharacterInfoType.Name);
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
                        outfit: instData.bot
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
                    outfit: instData
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
            instanceItems.forEach(item => {
                var _a, _b, _c, _d, _e, _f;
                const instanceId = (_b = (_a = item.dataset.instance) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
                const characterName = (_d = (_c = item.dataset.character) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : '';
                const instanceData = (_f = (_e = item.querySelector('.instance-data pre').textContent) === null || _e === void 0 ? void 0 : _e.toLowerCase()) !== null && _f !== void 0 ? _f : '';
                if (instanceId.includes(searchTerm) || characterName.includes(searchTerm) || instanceData.includes(searchTerm)) {
                    item.style.display = '';
                }
                else {
                    item.style.display = 'none';
                }
            });
        });
        // Add click handlers to instance items to show details
        const instanceItems = container.querySelectorAll('.instance-item');
        instanceItems.forEach(item => {
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
     * Updates pointers tab with current reference status
     */
    updatePointersTab() {
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'pointers')
            return;
        // Check if content has been rendered
        const pointerInfo = contentArea.querySelector('.pointer-info');
        if (!pointerInfo)
            return;
        const state = outfitStore.getState();
        const references = state.references;
        // Update global references (without the header that's already there)
        let refsHtml = '';
        for (const [key, value] of Object.entries(references)) {
            refsHtml += `<div><strong>${key}:</strong> ${value ? 'Available' : 'Not Set'}</div>`;
        }
        // Update global API references
        const globalRefs = [
            { name: 'window.botOutfitPanel', exists: Boolean(window.botOutfitPanel) },
            { name: 'window.userOutfitPanel', exists: Boolean(window.userOutfitPanel) },
            { name: 'window.outfitTracker', exists: Boolean(window.outfitTracker) },
            { name: 'window.outfitTrackerInterceptor', exists: Boolean(window.outfitTrackerInterceptor) },
            { name: 'window.getOutfitExtensionStatus', exists: Boolean(window.getOutfitExtensionStatus) },
            { name: 'outfitStore', exists: Boolean(outfitStore) },
            { name: 'customMacroSystem', exists: Boolean(customMacroSystem) },
        ];
        refsHtml += '<h5>Extension API References:</h5>';
        refsHtml += '<table class="pointer-values-table">';
        refsHtml += '<tr><th>Reference</th><th>Status</th></tr>';
        for (const ref of globalRefs) {
            refsHtml += `<tr><td>${ref.name}</td><td>${ref.exists ? 'Available' : 'Not Available'}</td></tr>`;
        }
        refsHtml += '</table>';
        pointerInfo.innerHTML = refsHtml;
    }
    /**
     * Renders the 'Pointers' tab
     */
    renderPointersTab(container) {
        const state = outfitStore.getState();
        const references = state.references;
        let pointersHtml = '<div class="debug-pointers-list">';
        pointersHtml += '<h4>Global References</h4>';
        pointersHtml += '<div class="pointer-info">';
        // Show available references
        for (const [key, value] of Object.entries(references)) {
            pointersHtml += `<div><strong>${key}:</strong> ${value ? 'Available' : 'Not Set'}</div>`;
        }
        // Show global API references
        pointersHtml += '<h5>Extension API References:</h5>';
        pointersHtml += '<table class="pointer-values-table">';
        pointersHtml += '<tr><th>Reference</th><th>Status</th></tr>';
        // Check various global references
        const globalRefs = [
            { name: 'window.botOutfitPanel', exists: Boolean(window.botOutfitPanel) },
            { name: 'window.userOutfitPanel', exists: Boolean(window.userOutfitPanel) },
            { name: 'window.outfitTracker', exists: Boolean(window.outfitTracker) },
            { name: 'window.outfitTrackerInterceptor', exists: Boolean(window.outfitTrackerInterceptor) },
            { name: 'window.getOutfitExtensionStatus', exists: Boolean(window.getOutfitExtensionStatus) },
            { name: 'outfitStore', exists: Boolean(outfitStore) },
            { name: 'customMacroSystem', exists: Boolean(customMacroSystem) },
        ];
        for (const ref of globalRefs) {
            pointersHtml += `<tr><td>${ref.name}</td><td>${ref.exists ? 'Available' : 'Not Available'}</td></tr>`;
        }
        pointersHtml += '</table>';
        pointersHtml += '</div></div>';
        container.innerHTML = pointersHtml;
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
        let estimatedStorageSize;
        const now = Date.now();
        if (now - this.lastStateStringifyTime > 30000) { // 30 seconds
            const stateStr = JSON.stringify(state);
            this.lastStorageSize = new Blob([stateStr]).size / 1024;
            this.lastStateStringifyTime = now;
        }
        estimatedStorageSize = `${this.lastStorageSize.toFixed(2)} KB`;
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
        var _a;
        const contentArea = (_a = this.domElement) === null || _a === void 0 ? void 0 : _a.querySelector('.outfit-debug-content');
        if (!contentArea || contentArea.getAttribute('data-tab') !== 'misc')
            return;
        // Check if content has been rendered
        const storeInfo = contentArea.querySelector('.store-info');
        if (!storeInfo)
            return;
        const state = outfitStore.getState();
        const currentCharName = state.currentCharacterId ? getCharacterInfoById(state.currentCharacterId, CharacterInfoType.Name) : 'None';
        let infoHtml = `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        infoHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        infoHtml += `<div><strong>Current Outfit Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        infoHtml += `<div><strong>Bot Panels Visible:</strong> ${state.panelVisibility.bot ? 'Yes' : 'No'}</div>`;
        infoHtml += `<div><strong>User Panels Visible:</strong> ${state.panelVisibility.user ? 'Yes' : 'No'}</div>`;
        infoHtml += '<h5>Settings:</h5>';
        infoHtml += '<pre>' + JSON.stringify(state.settings, null, 2) + '</pre>';
        storeInfo.innerHTML = infoHtml;
    }
    /**
     * Renders the 'State' tab with the current store state
     */
    renderStateTab(container) {
        const state = outfitStore.getState();
        let stateHtml = '<div class="debug-state-content">';
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
     * Renders the 'Misc' tab for other functions
     */
    renderMiscTab(container) {
        const state = outfitStore.getState();
        let miscHtml = '<div class="debug-misc-content">';
        miscHtml += '<h4>Store State Information</h4>';
        miscHtml += '<div class="store-info">';
        // Show key store properties
        const currentCharName = state.currentCharacterId ? getCharacterInfoById(state.currentCharacterId, CharacterInfoType.Name) : 'None';
        miscHtml += `<div><strong>Current Character:</strong> ${currentCharName}</div>`;
        miscHtml += `<div><strong>Current Chat ID:</strong> ${state.currentChatId || 'None'}</div>`;
        miscHtml += `<div><strong>Current Outfit Instance ID:</strong> ${state.currentOutfitInstanceId || 'None'}</div>`;
        miscHtml += `<div><strong>Bot Panels Visible:</strong> ${state.panelVisibility.bot ? 'Yes' : 'No'}</div>`;
        miscHtml += `<div><strong>User Panels Visible:</strong> ${state.panelVisibility.user ? 'Yes' : 'No'}</div>`;
        miscHtml += '<h5>Settings:</h5>';
        miscHtml += '<pre>' + JSON.stringify(state.settings, null, 2) + '</pre>';
        miscHtml += '</div>';
        // Add buttons for various debug functions
        miscHtml += '<h4>Debug Functions</h4>';
        miscHtml += '<div class="debug-functions">';
        miscHtml += '<button id="debug-refresh-store" class="menu_button">Refresh Store State</button>';
        miscHtml += '<button id="debug-clear-cache" class="menu_button">Clear Macro Cache</button>';
        miscHtml += '<button id="debug-wipe-all" class="menu_button danger-button">WIPE ALL DATA</button>';
        miscHtml += '<button id="debug-export-data" class="menu_button">Export All Data</button>';
        miscHtml += '<button id="debug-import-data" class="menu_button">Import Data</button>';
        miscHtml += '<input type="file" id="debug-import-file" style="display: none;" accept=".json">';
        miscHtml += '</div>';
        // Add event listeners for debug functions
        container.innerHTML = miscHtml;
        // Add button event listeners after content is inserted
        setTimeout(() => {
            var _a, _b, _c, _d, _e, _f;
            (_a = document.getElementById('debug-refresh-store')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                // Re-render to show updated store state
                this.renderContent();
            });
            (_b = document.getElementById('debug-clear-cache')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
                customMacroSystem.clearCache();
                toastr.success('Macro cache cleared!', 'Debug Panel');
                this.renderContent();
            });
            (_c = document.getElementById('debug-wipe-all')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
                if (confirm('Are you sure you want to wipe all outfit data? This cannot be undone.')) {
                    if (window.wipeAllOutfits) {
                        window.wipeAllOutfits();
                        this.renderContent();
                    }
                }
            });
            (_d = document.getElementById('debug-export-data')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
                this.exportOutfitData();
            });
            (_e = document.getElementById('debug-import-data')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
                var _a;
                (_a = document.getElementById('debug-import-file')) === null || _a === void 0 ? void 0 : _a.click();
            });
            (_f = document.getElementById('debug-import-file')) === null || _f === void 0 ? void 0 : _f.addEventListener('change', (e) => {
                var _a;
                this.importOutfitData((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]);
            });
        }, 100);
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
     * Starts real-time update intervals for various tabs
     */
    startRealTimeUpdates() {
        // Clear existing intervals
        this.stopRealTimeUpdates();
        // Update logs tab every 5000ms (reduced frequency to prevent drawer collapsing)
        this.logUpdateInterval = window.setInterval(() => {
            if (this.isVisible && this.currentTab === 'logs') {
                // Check if user is actively interacting with settings to avoid collapsing drawer
                const settingsPanel = document.getElementById('extensions_settings');
                const isUserInteractingWithSettings = settingsPanel &&
                    (settingsPanel.contains(document.activeElement) ||
                        settingsPanel.matches(':hover'));
                // Only update logs if user is not actively using settings
                if (!isUserInteractingWithSettings) {
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
                case 'misc':
                    this.updateMiscTab();
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
                    if (embeddedData && embeddedData.defaultOutfit && Object.keys(embeddedData.defaultOutfit).length > 0) {
                        totalDefaultOutfits++;
                    }
                }
            }
            statNumberElement.textContent = totalDefaultOutfits.toString();
        }
        // Update timestamp displays
        const lastModifiedElements = contentArea.querySelectorAll('.embedded-last-modified');
        lastModifiedElements.forEach(element => {
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
