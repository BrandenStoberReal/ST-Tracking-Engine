import {dragElementWithSave, resizeElement} from '../common/shared';
import {outfitStore} from '../common/Store';
import {customMacroSystem} from '../services/CustomMacroService';
import {debugLogger} from '../logging/DebugLogger';
import {CharacterInfoType, getCharacterInfoById} from '../utils/CharacterUtils';
import {getCharacterOutfitData} from '../services/CharacterOutfitService';

declare const toastr: any;
declare const $: any;

export class DebugPanel {
    private isVisible: boolean = false;
    private domElement: HTMLElement | null = null;
    private currentTab: string = 'instances';
    private storeSubscription: (() => void) | null = null;
    private logsSortDescending: boolean = true;

    constructor() {
    }

    createPanel(): HTMLElement {
        if (this.domElement) return this.domElement;

        const panel = document.createElement('div');
        panel.id = 'outfit-debug-panel';
        panel.className = 'outfit-debug-panel';

        panel.innerHTML = `
            <div class="outfit-debug-header">
                <h3>Outfit Debug Panel</h3>
                <div class="outfit-debug-actions">
                    <span class="outfit-debug-action" id="outfit-debug-close">×</span>
                </div>
            </div>
            <div class="outfit-debug-tabs">
                <button class="outfit-debug-tab active" data-tab="instances">Instances</button>
                <button class="outfit-debug-tab" data-tab="macros">Macros</button>
                <button class="outfit-debug-tab" data-tab="pointers">Pointers</button>
                <button class="outfit-debug-tab" data-tab="logs">Logs</button>
                <button class="outfit-debug-tab" data-tab="embedded">Embedded</button>
                <button class="outfit-debug-tab" data-tab="state">State</button>
                <button class="outfit-debug-tab" data-tab="misc">Misc</button>
            </div>
            <div class="outfit-debug-content" id="outfit-debug-tab-content"></div>
        `;

        document.body.appendChild(panel);
        this.domElement = panel;

        this.domElement.querySelectorAll('.outfit-debug-tab').forEach(tab => {
            tab.addEventListener('click', (event) => {
                const tabName = (event.target as HTMLElement).dataset.tab;
                if (tabName) {
                    this.currentTab = tabName;
                    this.renderContent();
                    this.domElement?.querySelectorAll('.outfit-debug-tab').forEach(t => t.classList.remove('active'));
                    (event.target as HTMLElement).classList.add('active');
                }
            });
        });

        this.domElement.querySelector('#outfit-debug-close')?.addEventListener('click', () => this.hide());

        return panel;
    }

    show(): void {
        if (!outfitStore.getState().settings.debugMode) {
            debugLogger.log('Debug mode is disabled. Not showing debug panel.');
            return;
        }

        if (!this.domElement) {
            this.createPanel();
        }

        this.renderContent();
        this.domElement!.style.display = 'flex';
        this.isVisible = true;

        if (!this.storeSubscription) {
            this.storeSubscription = outfitStore.subscribe(() => {
                if (this.isVisible) this.renderContent();
            });
        }

        dragElementWithSave(this.domElement!, 'outfit-debug-panel');
        resizeElement($(this.domElement!), 'outfit-debug-panel');
    }

    hide(): void {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;

        if (this.storeSubscription) {
            this.storeSubscription();
            this.storeSubscription = null;
        }
    }

    toggle(): void {
        this.isVisible ? this.hide() : this.show();
    }

    renderContent(): void {
        if (!this.domElement) return;

        const contentArea = this.domElement.querySelector('#outfit-debug-tab-content');
        if (!contentArea) return;

        contentArea.innerHTML = '';
        const renderer = this.getTabRenderer(this.currentTab);
        if (renderer) {
            renderer(contentArea as HTMLElement);
        }
    }

    renderInstancesTab(container: HTMLElement): void {
        const {botInstances, userInstances, currentOutfitInstanceId} = outfitStore.getState();
        let html = '<h4>Bot Instances</h4>';
        if (Object.keys(botInstances).length === 0) {
            html += '<p>No bot instances.</p>';
        } else {
            for (const [charId, charData] of Object.entries(botInstances)) {
                const charName = getCharacterInfoById(charId, CharacterInfoType.Name) || 'Unknown';
                html += `<h5>${charName} (${charId})</h5>`;
                for (const [instId, instData] of Object.entries(charData as any)) {
                    html += this.createInstanceItem(instId, instData, currentOutfitInstanceId || '', 'bot', charId);
                }
            }
        }

        html += '<h4>User Instances</h4>';
        if (Object.keys(userInstances).length === 0) {
            html += '<p>No user instances.</p>';
        } else {
            for (const [instId, instData] of Object.entries(userInstances as any)) {
                html += this.createInstanceItem(instId, instData, currentOutfitInstanceId || '', 'user');
            }
        }
        container.innerHTML = html;
        this.addInstanceEventListeners(container);
    }

    createInstanceItem(instId: string, instData: any, currentId: string, type: 'bot' | 'user', charId?: string): string {
        const isCurrent = instId === currentId;
        return `
            <div class="instance-item ${isCurrent ? 'current-instance' : ''}" data-instance-id="${instId}" data-type="${type}" data-char-id="${charId || ''}">
                <div class="instance-id">${instId} ${isCurrent ? '[CURRENT]' : ''}</div>
                <div class="instance-data" style="display:none;"><pre>${JSON.stringify(instData, null, 2)}</pre></div>
            </div>
        `;
    }

    addInstanceEventListeners(container: HTMLElement) {
        container.querySelectorAll('.instance-item').forEach(item => {
            item.addEventListener('click', () => {
                const data = item.querySelector('.instance-data') as HTMLElement;
                if (data) {
                    data.style.display = data.style.display === 'none' ? 'block' : 'none';
                }
            });
        });
    }

    renderMacrosTab(container: HTMLElement): void {
        const {currentOutfitInstanceId, currentCharacterId} = outfitStore.getState();
        const charName = customMacroSystem.getCurrentCharName();
        const userName = customMacroSystem.getCurrentUserName();

        container.innerHTML = `
            <div><strong>Character:</strong> ${charName}</div>
            <div><strong>User:</strong> ${userName}</div>
            <div><strong>Instance ID:</strong> ${currentOutfitInstanceId || 'None'}</div>
            <h5>Macro Cache (${customMacroSystem.macroValueCache.size} entries)</h5>
            <div id="macro-cache-list"></div>
            <h5>Test Macro</h5>
            <textarea id="macro-test-input" placeholder="Enter text with macros..."></textarea>
            <button id="macro-test-btn">Test</button>
            <pre id="macro-test-output"></pre>
        `;

        const cacheList = container.querySelector('#macro-cache-list')!;
        let cacheHtml = '';
        for (const [key, entry] of customMacroSystem.macroValueCache.entries()) {
            cacheHtml += `<div><strong>${key}</strong>: ${entry.value}</div>`;
        }
        cacheList.innerHTML = cacheHtml;

        container.querySelector('#macro-test-btn')?.addEventListener('click', () => {
            const input = (container.querySelector('#macro-test-input') as HTMLTextAreaElement).value;
            const output = customMacroSystem.replaceMacrosInText(input);
            container.querySelector('#macro-test-output')!.textContent = output;
        });
    }

    renderPointersTab(container: HTMLElement): void {
        const {references} = outfitStore.getState();
        let html = '<h4>Global References</h4>';
        for (const [key, value] of Object.entries(references)) {
            html += `<div><strong>${key}:</strong> ${value ? 'Available' : 'Not Set'}</div>`;
        }
        container.innerHTML = html;
    }

    renderLogsTab(container: HTMLElement): void {
        const logs = debugLogger.getLogs();
        container.innerHTML = `
            <div style="margin-bottom: 10px;">
                <button id="sort-logs-btn">Sort ${this.logsSortDescending ? 'Oldest' : 'Newest'} First</button>
                <button id="clear-logs-btn">Clear Logs</button>
            </div>
            <div id="logs-list"></div>
        `;

        const sortedLogs = [...logs].sort((a, b) => {
            const timeA = new Date(a.timestamp).getTime();
            const timeB = new Date(b.timestamp).getTime();
            return this.logsSortDescending ? timeB - timeA : timeA - timeB;
        });

        const logsList = container.querySelector('#logs-list')!;
        logsList.innerHTML = sortedLogs.map(log => `
            <div class="log-item log-${log.level.toLowerCase()}">
                <strong>[${log.level}]</strong> ${log.message}
                ${log.data ? `<pre>${JSON.stringify(log.data, null, 2)}</pre>` : ''}
            </div>
        `).join('');

        container.querySelector('#sort-logs-btn')?.addEventListener('click', () => {
            this.logsSortDescending = !this.logsSortDescending;
            this.renderContent();
        });

        container.querySelector('#clear-logs-btn')?.addEventListener('click', () => {
            debugLogger.clearLogs();
            this.renderContent();
        });
    }

    renderEmbeddedDataTab(container: HTMLElement): void {
        const context = (window as any).SillyTavern?.getContext?.() || (window as any).getContext?.();
        if (!context || !context.characters) {
            container.innerHTML = '<p>No characters loaded.</p>';
            return;
        }

        let html = '<h4>Embedded Outfit Data</h4>';
        context.characters.forEach((char: any) => {
            const embeddedData = getCharacterOutfitData(char);
            if (embeddedData) {
                html += `
                    <div>
                        <strong>${char.name}</strong>
                        <pre>${JSON.stringify(embeddedData, null, 2)}</pre>
                    </div>
                `;
            }
        });
        container.innerHTML = html;
    }

    renderStateTab(container: HTMLElement): void {
        const state = outfitStore.getState();
        container.innerHTML = `
            <button id="copy-state-btn">Copy State</button>
            <pre>${JSON.stringify(state, null, 2)}</pre>
        `;
        container.querySelector('#copy-state-btn')?.addEventListener('click', () => {
            navigator.clipboard.writeText(JSON.stringify(state, null, 2));
            toastr.success('State copied to clipboard!');
        });
    }

    renderMiscTab(container: HTMLElement): void {
        container.innerHTML = `
            <button id="wipe-all-btn">Wipe All Data</button>
        `;
        container.querySelector('#wipe-all-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to wipe all outfit data? This is irreversible.')) {
                outfitStore.wipeAllOutfitData();
                toastr.success('All outfit data has been wiped.');
                this.renderContent();
            }
        });
    }

    private getTabRenderer(tab: string): ((container: HTMLElement) => void) | null {
        switch (tab) {
            case 'instances':
                return this.renderInstancesTab.bind(this);
            case 'macros':
                return this.renderMacrosTab.bind(this);
            case 'pointers':
                return this.renderPointersTab.bind(this);
            case 'logs':
                return this.renderLogsTab.bind(this);
            case 'embedded':
                return this.renderEmbeddedDataTab.bind(this);
            case 'state':
                return this.renderStateTab.bind(this);
            case 'misc':
                return this.renderMiscTab.bind(this);
            default:
                return null;
        }
    }
}
