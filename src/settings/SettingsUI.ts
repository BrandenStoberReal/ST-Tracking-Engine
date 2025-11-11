import { outfitStore } from '../common/Store';
import { debugLog } from '../logging/DebugLogger';
import { IDummyAutoOutfitSystem } from '../types';

declare const $: any;
declare const toastr: any;

export function createSettingsUI(AutoOutfitSystem: IDummyAutoOutfitSystem, autoOutfitSystem: any, context: any) {
    const MODULE_NAME = 'outfit_tracker';

    const storeState = outfitStore.getState();
    const settings = { outfit_tracker: storeState.settings };
    const saveSettingsFn = context?.saveSettingsDebounced || window.saveSettingsDebounced;
    const hasAutoSystem = AutoOutfitSystem.name !== 'DummyAutoOutfitSystem';

    // Safely access settings, with fallback to default values
    const currentSettings = settings?.[MODULE_NAME] || {};
    const autoOutfitConnectionProfile = currentSettings.autoOutfitConnectionProfile || '';
    const autoOutfitPrompt = currentSettings.autoOutfitPrompt || '';

    // Function to fetch connection profiles from SillyTavern API
    async function getConnectionProfiles(): Promise<Array<{ id: string; name: string }>> {
        try {
            const context = window.SillyTavern?.getContext
                ? window.SillyTavern.getContext()
                : window.getContext
                  ? window.getContext()
                  : null;
            if (context?.ConnectionManagerRequestService?.getSupportedProfiles) {
                const profiles = await context.ConnectionManagerRequestService.getSupportedProfiles();
                return profiles.map((profile: any) => ({
                    id: profile.id,
                    name: profile.name || profile.id,
                }));
            }
        } catch (error) {
            debugLog('Error fetching connection profiles:', error, 'error', 'SettingsUI');
        }
        return [];
    }

    // Generate profile options HTML
    function generateProfileOptions(profiles: Array<{ id: string; name: string }>): string {
        let optionsHtml = '<option value="">Default Connection</option>';

        profiles.forEach((profile) => {
            const selected = autoOutfitConnectionProfile === profile.id ? 'selected' : '';
            optionsHtml += `<option value="${profile.id}" ${selected}>${profile.name}</option>`;
        });

        return optionsHtml;
    }

    // Function to populate the connection profile dropdown
    async function populateConnectionProfiles(): Promise<void> {
        try {
            const profiles = await getConnectionProfiles();
            const optionsHtml = generateProfileOptions(profiles);
            $('#outfit-connection-profile').html(optionsHtml);
        } catch (error) {
            debugLog('Error populating connection profiles:', error, 'error', 'SettingsUI');
        }
    }

    const autoSettingsHtml = hasAutoSystem
        ? `
        <div class="flex-container setting-row">
            <label for="outfit-auto-system">Enable auto outfit updates</label>
            <input type="checkbox" id="outfit-auto-system"
                    ${currentSettings.autoOutfitSystem ? 'checked' : ''}>
        </div>
        <div class="flex-container setting-row">
            <label for="outfit-connection-profile">Connection Profile (Optional):</label>
            <select id="outfit-connection-profile" class="option">
                <option value="">Loading profiles...</option>
            </select>
        </div>
        <div class="flex-container setting-row">
            <label for="outfit-prompt-input">System Prompt:</label>
            <textarea id="outfit-prompt-input" placeholder="Enter system prompt for auto outfit detection">${autoOutfitPrompt}</textarea>
        </div>
        <div class="flex-container">
            <button id="outfit-prompt-reset-btn" class="menu_button">Reset to Default Prompt</button>
            <button id="outfit-prompt-view-btn" class="menu_button">View Current Prompt</button>
        </div>
    `
        : `
        <div class="flex-container setting-row">
            <label>Auto Outfit System: <span class="error-text">Not Available</span></label>
        </div>
    `;

    const settingsHtml = `
    <div class="outfit-extension-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Outfit Tracker Settings</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <!-- Status Indicators Section -->
                <div class="setting-group">
                    <h4>Extension Status</h4>
                    <div class="status-indicators">
                        <div class="status-row">
                            <span class="status-label">Core Extension:</span>
                            <span id="status-core" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Auto Outfit System:</span>
                            <span id="status-auto-outfit" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Character Panel:</span>
                            <span id="status-bot-panel" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">User Panel:</span>
                            <span id="status-user-panel" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Event System:</span>
                            <span id="status-events" class="status-indicator status-loading">Loading...</span>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Outfit Managers:</span>
                            <span id="status-managers" class="status-indicator status-loading">Loading...</span>
                        </div>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>General Settings</h4>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-sys-toggle">Enable system messages</label>
                        <input type="checkbox" id="outfit-sys-toggle"
                               ${(currentSettings.enableSysMessages ?? true) ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-auto-bot">Auto-open character panel</label>
                        <input type="checkbox" id="outfit-auto-bot"
                               ${(currentSettings.autoOpenBot ?? true) ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-auto-user">Auto-open user panel</label>
                        <input type="checkbox" id="outfit-auto-user"
                               ${(currentSettings.autoOpenUser ?? false) ? 'checked' : ''}>
                    </div>
                    
                    <div class="flex-container setting-row">
                        <label for="outfit-debug-mode">Enable debug mode</label>
                        <input type="checkbox" id="outfit-debug-mode"
                               ${(currentSettings.debugMode ?? false) ? 'checked' : ''}>
                    </div>
                    

                </div>
                
                <!-- Panel Colors Customization Section -->
                <div class="setting-group">
                    <h4>Panel Colors</h4>
                    
                    <!-- Bot Panel Colors -->
                    <div class="panel-color-section">
                        <h5 class="color-section-title">Character Panel</h5>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-primary-color" class="color-label">Primary Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-primary-color-picker" value="#6a4fc1">
                                <input type="text" id="bot-panel-primary-color" value="${currentSettings?.botPanelColors?.primary || 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)'}">
                                <button id="bot-panel-primary-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-border-color" class="color-label">Border Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-border-color-picker" value="${currentSettings?.botPanelColors?.border || '#8a7fdb'}">
                                <input type="text" id="bot-panel-border-color" value="${currentSettings?.botPanelColors?.border || '#8a7fdb'}">
                                <button id="bot-panel-border-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="bot-panel-shadow-color" class="color-label">Shadow Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="bot-panel-shadow-color-picker" value="#6a4fc1">
                                <input type="text" id="bot-panel-shadow-color" value="${currentSettings?.botPanelColors?.shadow || 'rgba(106, 79, 193, 0.4)'}">
                                <button id="bot-panel-shadow-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- User Panel Colors -->
                    <div class="panel-color-section">
                        <h5 class="color-section-title">User Panel</h5>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-primary-color" class="color-label">Primary Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-primary-color-picker" value="#1a78d1">
                                <input type="text" id="user-panel-primary-color" value="${currentSettings?.userPanelColors?.primary || 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)'}">
                                <button id="user-panel-primary-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-border-color" class="color-label">Border Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-border-color-picker" value="${currentSettings?.userPanelColors?.border || '#5da6f0'}">
                                <input type="text" id="user-panel-border-color" value="${currentSettings?.userPanelColors?.border || '#5da6f0'}">
                                <button id="user-panel-border-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <label for="user-panel-shadow-color" class="color-label">Shadow Color:</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="user-panel-shadow-color-picker" value="#1a78d1">
                                <input type="text" id="user-panel-shadow-color" value="${currentSettings?.userPanelColors?.shadow || 'rgba(26, 120, 209, 0.4)'}">
                                <button id="user-panel-shadow-reset" class="color-reset-btn">Reset</button>
                            </div>
                        </div>
                    </div>
                    
                    <button id="apply-panel-colors" class="menu_button">Apply Panel Colors</button>
                </div>
                <div class="setting-group">
                    <h4>${hasAutoSystem ? 'Auto Outfit Settings' : 'Advanced Settings'}</h4>
                    ${autoSettingsHtml}
                </div>
                <div class="setting-group">
                    <h4>LLM Output</h4>
                    <div class="flex-container setting-row">
                        <label for="outfit-llm-output">LLM Output:</label>
                        <textarea id="outfit-llm-output" readonly></textarea>
                    </div>
                    <div class="flex-container setting-row">
                        <label>Generated Commands:</label>
                        <ul id="outfit-generated-commands"></ul>
                    </div>
                    <div class="flex-container">
                        <button id="outfit-process-btn" class="menu_button">Process</button>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>Debug Tools</h4>
                    <div class="flex-container">
                        <button id="outfit-debug-panel-btn" class="menu_button">Open Debug Panel</button>
                    </div>
                    <p class="setting-description">The debug panel provides detailed information about outfit instances, macro processing, performance metrics, and other debugging tools. Requires debug mode to be enabled.</p>
                </div>
   
                <div class="setting-group">
                    <h4>Data Management</h4>
                    <div class="flex-container">
                        <button id="outfit-wipe-all-btn" class="menu_button warning-button">Wipe All Data</button>
                    </div>
                    <p class="setting-description">This will permanently delete all extension data and reload the page. This action cannot be undone.</p>
                </div
            </div>
        </div>
    </div>
    `;

    $('#extensions_settings').append(settingsHtml);

    // Populate connection profiles after UI is created
    if (hasAutoSystem) {
        populateConnectionProfiles();
    }

    // Update status indicators after settings are loaded
    function updateStatusIndicators() {
        if (typeof window.getOutfitExtensionStatus === 'function') {
            const status = window.getOutfitExtensionStatus();

            // Cache DOM elements to avoid repeated jQuery lookups
            const $statusCore = $('#status-core');
            const $statusAutoOutfit = $('#status-auto-outfit');
            const $statusBotPanel = $('#status-bot-panel');
            const $statusUserPanel = $('#status-user-panel');
            const $statusEvents = $('#status-events');
            const $statusManagers = $('#status-managers');

            // Update core extension status
            if (status.core) {
                if (!$statusCore.hasClass('status-active')) {
                    $statusCore.removeClass('status-loading').addClass('status-active').text('Active');
                }
            } else {
                if (!$statusCore.hasClass('status-inactive')) {
                    $statusCore.removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
            }

            // Update auto outfit system status
            if (status.autoOutfit) {
                if (status.autoOutfit.enabled) {
                    if (!$statusAutoOutfit.hasClass('status-active')) {
                        $statusAutoOutfit.removeClass('status-loading').addClass('status-active').text('Active');
                    }
                } else {
                    if (!$statusAutoOutfit.hasClass('status-inactive')) {
                        $statusAutoOutfit.removeClass('status-loading').addClass('status-inactive').text('Inactive');
                    }
                }
            } else {
                if (!$statusAutoOutfit.hasClass('status-inactive') || $statusAutoOutfit.text() !== 'Not Available') {
                    $statusAutoOutfit.removeClass('status-loading').addClass('status-inactive').text('Not Available');
                }
            }

            // Update bot panel status
            if (status.botPanel) {
                if (status.botPanel.isVisible) {
                    if (!$statusBotPanel.hasClass('status-active')) {
                        $statusBotPanel.removeClass('status-loading').addClass('status-active').text('Visible');
                    }
                } else {
                    if (!$statusBotPanel.hasClass('status-inactive')) {
                        $statusBotPanel.removeClass('status-loading').addClass('status-inactive').text('Hidden');
                    }
                }
            } else {
                if (!$statusBotPanel.hasClass('status-inactive') || $statusBotPanel.text() !== 'Not Loaded') {
                    $statusBotPanel.removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
                }
            }

            // Update user panel status
            if (status.userPanel) {
                if (status.userPanel.isVisible) {
                    if (!$statusUserPanel.hasClass('status-active')) {
                        $statusUserPanel.removeClass('status-loading').addClass('status-active').text('Visible');
                    }
                } else {
                    if (!$statusUserPanel.hasClass('status-inactive')) {
                        $statusUserPanel.removeClass('status-loading').addClass('status-inactive').text('Hidden');
                    }
                }
            } else {
                if (!$statusUserPanel.hasClass('status-inactive') || $statusUserPanel.text() !== 'Not Loaded') {
                    $statusUserPanel.removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
                }
            }

            // Update event system status
            if (status.events) {
                if (!$statusEvents.hasClass('status-active')) {
                    $statusEvents.removeClass('status-loading').addClass('status-active').text('Active');
                }
            } else {
                if (!$statusEvents.hasClass('status-warning')) {
                    $statusEvents.removeClass('status-loading').addClass('status-warning').text('Limited');
                }
            }

            // Update outfit managers status
            if (status.managers) {
                if (!$statusManagers.hasClass('status-active')) {
                    $statusManagers.removeClass('status-loading').addClass('status-active').text('Active');
                }
            } else {
                if (!$statusManagers.hasClass('status-inactive')) {
                    $statusManagers.removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
            }
        } else {
            // Fallback to direct checking
            try {
                // Check if the extension is properly loaded
                if (window.outfitTracker && settings?.[MODULE_NAME]) {
                    $('#status-core').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-core').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }

                // Check if auto outfit system is available and enabled
                if (window.outfitTracker?.autoOutfitSystem) {
                    const autoOutfitSystem = window.outfitTracker.autoOutfitSystem;
                    const autoOutfitStatus =
                        typeof autoOutfitSystem.getStatus === 'function' ? autoOutfitSystem.getStatus() : null;

                    if (autoOutfitStatus && autoOutfitStatus.enabled) {
                        $('#status-auto-outfit').removeClass('status-loading').addClass('status-active').text('Active');
                    } else if (autoOutfitStatus) {
                        $('#status-auto-outfit')
                            .removeClass('status-loading')
                            .addClass('status-inactive')
                            .text('Inactive');
                    } else {
                        $('#status-auto-outfit')
                            .removeClass('status-loading')
                            .addClass('status-inactive')
                            .text('Not Available');
                    }
                } else {
                    $('#status-auto-outfit')
                        .removeClass('status-loading')
                        .addClass('status-inactive')
                        .text('Not Available');
                }

                // Check bot panel status
                if (window.outfitTracker?.botOutfitPanel) {
                    if (window.outfitTracker.botOutfitPanel.isVisible) {
                        $('#status-bot-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                    } else {
                        $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Hidden');
                    }
                } else {
                    $('#status-bot-panel').removeClass('status-loading').addClass('status-inactive').text('Not Loaded');
                }

                // Check user panel status
                if (window.outfitTracker?.userOutfitPanel) {
                    if (window.outfitTracker.userOutfitPanel.isVisible) {
                        $('#status-user-panel').removeClass('status-loading').addClass('status-active').text('Visible');
                    } else {
                        $('#status-user-panel')
                            .removeClass('status-loading')
                            .addClass('status-inactive')
                            .text('Hidden');
                    }
                } else {
                    $('#status-user-panel')
                        .removeClass('status-loading')
                        .addClass('status-inactive')
                        .text('Not Loaded');
                }

                // Check event system status (check if event listeners were set up)
                const context = window.SillyTavern?.getContext
                    ? window.SillyTavern.getContext()
                    : window.getContext
                      ? window.getContext()
                      : null;

                if (context && context.eventSource) {
                    $('#status-events').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-events').removeClass('status-loading').addClass('status-warning').text('Limited');
                }

                // Check outfit managers status
                if (
                    window.outfitTracker?.botOutfitPanel?.outfitManager &&
                    window.outfitTracker?.userOutfitPanel?.outfitManager
                ) {
                    $('#status-managers').removeClass('status-loading').addClass('status-active').text('Active');
                } else {
                    $('#status-managers').removeClass('status-loading').addClass('status-inactive').text('Inactive');
                }
            } catch (error) {
                debugLog('Error in fallback status check:', error, 'error', 'SettingsUI');

                // Set all statuses to error state
                $('#status-core').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-auto-outfit').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-bot-panel').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-user-panel').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-events').removeClass('status-loading').addClass('status-error').text('Error');
                $('#status-managers').removeClass('status-loading').addClass('status-error').text('Error');
            }
        }
    }

    // Update status indicators when the drawer is opened
    $('.inline-drawer-toggle').on('click', function () {
        setTimeout(updateStatusIndicators, 100); // Small delay to ensure UI is fully loaded
    });

    // Function to update status indicators periodically (reduced frequency to prevent stuttering)
    function periodicallyUpdateStatusIndicators() {
        updateStatusIndicators();
        setTimeout(periodicallyUpdateStatusIndicators, 30000); // Update every 30 seconds instead of 10
    }

    // Start periodic updates after a longer delay
    setTimeout(periodicallyUpdateStatusIndicators, 5000);

    // Helper function to convert hex color to rgba
    function hexToRgba(hex: string, opacity: number): string {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        if (hex.length === 4 || (hex.length === 5 && hex.startsWith('#'))) {
            // Check if it matches the pattern of a shorthand hex (e.g., #03F or 03F)
            const hexVal = hex.startsWith('#') ? hex.substring(1) : hex;
            const isValid = /^[a-fA-F0-9]{3}$/.test(hexVal);

            if (isValid) {
                const r = hexVal[0];
                const g = hexVal[1];
                const b = hexVal[2];

                hex = `#${r}${r}${g}${g}${b}${b}`;
            }
        }

        // Now parse the full hex format
        const hexWithoutHash = hex.startsWith('#') ? hex.substring(1) : hex;

        if (hexWithoutHash.length === 6) {
            const r = parseInt(hexWithoutHash.substring(0, 2), 16);
            const g = parseInt(hexWithoutHash.substring(2, 4), 16);
            const b = parseInt(hexWithoutHash.substring(4, 6), 16);

            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }

        return 'rgba(0, 0, 0, 0.4)'; // default fallback
    }

    // Update status indicators when panel visibility changes
    // We need to hook into panel show/hide methods to update status immediately
    if (window.botOutfitPanel) {
        const originalBotShow = window.botOutfitPanel.show;
        const originalBotHide = window.botOutfitPanel.hide;

        window.botOutfitPanel.show = function (this: any) {
            originalBotShow.call(this);
            // Update status after the panel is shown
            setTimeout(() => {
                if (window.botOutfitPanel) {
                    $('#status-bot-panel')
                        .removeClass('status-loading status-inactive')
                        .addClass('status-active')
                        .text('Visible');
                }
            }, 100);
        };

        window.botOutfitPanel.hide = function (this: any) {
            originalBotHide.call(this);
            // Update status after the panel is hidden
            setTimeout(() => {
                if (window.botOutfitPanel) {
                    $('#status-bot-panel')
                        .removeClass('status-loading status-active')
                        .addClass('status-inactive')
                        .text('Hidden');
                }
            }, 100);
        };
    }

    if (window.userOutfitPanel) {
        const originalUserShow = window.userOutfitPanel.show;
        const originalUserHide = window.userOutfitPanel.hide;

        window.userOutfitPanel.show = function (this: any) {
            originalUserShow.call(this);
            // Update status after the panel is shown
            setTimeout(() => {
                if (window.userOutfitPanel) {
                    $('#status-user-panel')
                        .removeClass('status-loading status-inactive')
                        .addClass('status-active')
                        .text('Visible');
                }
            }, 100);
        };

        window.userOutfitPanel.hide = function (this: any) {
            originalUserHide.call(this);
            // Update status after the panel is hidden
            setTimeout(() => {
                if (window.userOutfitPanel) {
                    $('#status-user-panel')
                        .removeClass('status-loading status-active')
                        .addClass('status-inactive')
                        .text('Hidden');
                }
            }, 100);
        };
    }

    // Helper function to extract hex color from gradient string
    function extractHexFromGradient(gradientStr: string): string {
        // Find hex color in gradient string
        const startIndex = gradientStr.indexOf('#');

        if (startIndex === -1) {
            return '#6a4fc1'; // Default color if no # found
        }

        // Extract potential hex color (# + 6 characters)
        if (startIndex + 7 <= gradientStr.length) {
            const potentialHex = gradientStr.substr(startIndex, 7); // Get # + 6 characters

            // Check if it's a valid hex color: starts with # and has 6 valid hex characters
            if (potentialHex.length === 7 && isValidHexColor(potentialHex)) {
                return potentialHex;
            }
        }

        // If not found at first position or not valid, scan the entire string for a hex color
        for (let i = startIndex; i < gradientStr.length - 6; i++) {
            if (gradientStr[i] === '#') {
                const potentialHex = gradientStr.substr(i, 7);

                if (isValidHexColor(potentialHex)) {
                    return potentialHex;
                }
            }
        }

        return '#6a4fc1'; // Default color if not found
    }

    // Helper function to validate hex color format
    function isValidHexColor(hex: string): boolean {
        if (hex[0] !== '#' || hex.length !== 7) {
            return false;
        }

        for (let i = 1; i < 7; i++) {
            const char = hex[i].toLowerCase();

            if (!((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f'))) {
                return false;
            }
        }
        return true;
    }

    // Function to update the color pickers based on text input values
    function updateColorPickersFromText() {
        // Update bot panel color pickers
        const botPrimaryText = $('#bot-panel-primary-color').val();

        if (botPrimaryText.startsWith('linear-gradient')) {
            $('#bot-panel-primary-color-picker').val(extractHexFromGradient(botPrimaryText));
        } else {
            $('#bot-panel-primary-color-picker').val(botPrimaryText);
        }

        const botBorderText = $('#bot-panel-border-color').val();

        $('#bot-panel-border-color-picker').val(extractHexFromGradient(botBorderText) || botBorderText);

        const botShadowText = $('#bot-panel-shadow-color').val();
        // Extract hex from rgba if possible
        const rgbaMatch = extractRgbaValues(botShadowText);

        if (rgbaMatch) {
            const r = parseInt(rgbaMatch.r).toString(16).padStart(2, '0');
            const g = parseInt(rgbaMatch.g).toString(16).padStart(2, '0');
            const b = parseInt(rgbaMatch.b).toString(16).padStart(2, '0');

            $('#bot-panel-shadow-color-picker').val(`#${r}${g}${b}`);
        } else {
            $('#bot-panel-shadow-color-picker').val(extractHexFromGradient(botShadowText) || botShadowText);
        }

        // Update user panel color pickers
        const userPrimaryText = $('#user-panel-primary-color').val();

        if (userPrimaryText.startsWith('linear-gradient')) {
            $('#user-panel-primary-color-picker').val(extractHexFromGradient(userPrimaryText));
        } else {
            $('#user-panel-primary-color-picker').val(userPrimaryText);
        }

        const userBorderText = $('#user-panel-border-color').val();

        $('#user-panel-border-color-picker').val(extractHexFromGradient(userBorderText) || userBorderText);

        const userShadowText = $('#user-panel-shadow-color').val();
        // Extract hex from rgba if possible
        const userRgbaMatch = extractRgbaValues(userShadowText);

        if (userRgbaMatch) {
            const r = parseInt(userRgbaMatch.r).toString(16).padStart(2, '0');
            const g = parseInt(userRgbaMatch.g).toString(16).padStart(2, '0');
            const b = parseInt(userRgbaMatch.b).toString(16).padStart(2, '0');

            $('#user-panel-shadow-color-picker').val(`#${r}${g}${b}`);
        } else {
            $('#user-panel-shadow-color-picker').val(extractHexFromGradient(userShadowText) || userShadowText);
        }
    }

    // Helper function to validate hex color without regex
    function isValidHexColorNoRegex(value: string): boolean {
        if (!value || typeof value !== 'string') {
            return false;
        }

        // Remove the # prefix if present
        if (value.startsWith('#')) {
            value = value.substring(1);
        }

        // Check if it's 3 or 6 characters long
        if (value.length !== 3 && value.length !== 6) {
            return false;
        }

        // Check if all characters are valid hex digits (0-9, A-F, a-f)
        for (let i = 0; i < value.length; i++) {
            const char = value[i];
            const code = char.charCodeAt(0);

            // Check if character is digit (0-9)
            if (code >= 48 && code <= 57) {
                continue;
            }
            // Check if character is uppercase letter A-F
            if (code >= 65 && code <= 70) {
                continue;
            }
            // Check if character is lowercase letter a-f
            if (code >= 97 && code <= 102) {
                continue;
            }

            // If character is none of the above, it's invalid
            return false;
        }

        return true;
    }

    // Helper function to extract rgba values without regex
    function extractRgbaValues(str: string): { r: any; g: any; b: any } | null {
        // Check if the string starts with rgba( or rgb(
        if (!str || typeof str !== 'string') {
            return null;
        }

        let startIndex = -1;

        if (str.toLowerCase().startsWith('rgba(')) {
            startIndex = 5; // Length of 'rgba('
        } else if (str.toLowerCase().startsWith('rgb(')) {
            startIndex = 4; // Length of 'rgb('
        } else {
            return null; // Not an rgba/rgb string
        }

        // Extract the content inside the parentheses
        const endIndex = str.indexOf(')', startIndex);

        if (endIndex === -1) {
            return null; // No closing parenthesis found
        }

        const content = str.substring(startIndex, endIndex);

        // Split by comma and trim whitespace to get the values
        const parts = content.split(',').map((part) => part.trim());

        // Check if we have the right number of parts (at least 3 for rgb, up to 4 for rgba)
        if (parts.length < 3 || parts.length > 4) {
            return null;
        }

        // Validate and parse the first three values (r, g, b)
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);

        // Validate that the values are valid numbers in the range 0-255
        if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
            return null;
        }

        // If we have 4 parts, validate the alpha as well
        if (parts.length === 4) {
            const a = parseFloat(parts[3]);

            if (isNaN(a) || a < 0 || a > 1) {
                return null;
            }
        }

        // Return the rgba values as an object
        return {
            r: r,
            g: g,
            b: b,
        };
    }

    // Function to update settings and apply colors
    function updateColorSettingsAndApply() {
        // Update the extension settings with new color values
        if (settings && settings[MODULE_NAME]) {
            settings[MODULE_NAME].botPanelColors = {
                primary: $('#bot-panel-primary-color').val(),
                border: $('#bot-panel-border-color').val(),
                shadow: $('#bot-panel-shadow-color').val(),
            };

            settings[MODULE_NAME].userPanelColors = {
                primary: $('#user-panel-primary-color').val(),
                border: $('#user-panel-border-color').val(),
                shadow: $('#user-panel-shadow-color').val(),
            };

            saveSettingsFn();

            // Update the outfit store to reflect the new color settings
            outfitStore.setSetting('botPanelColors', settings[MODULE_NAME].botPanelColors);
            outfitStore.setSetting('userPanelColors', settings[MODULE_NAME].userPanelColors);
        }

        // Apply the new colors to the panels
        if (window.botOutfitPanel && window.botOutfitPanel.applyPanelColors) {
            window.botOutfitPanel.applyPanelColors();
        }
        if (window.userOutfitPanel && window.userOutfitPanel.applyPanelColors) {
            window.userOutfitPanel.applyPanelColors();
        }

        // Show a confirmation message
        toastr.success('Panel colors updated successfully!', 'Outfit Colors');
    }

    // Custom toggle switch styling
    $(document).on('change', '#outfit-sys-toggle, #outfit-auto-bot, #outfit-auto-user, #outfit-debug-mode', () => {
        if (settings && settings[MODULE_NAME]) {
            settings[MODULE_NAME].enableSysMessages = $('#outfit-sys-toggle').prop('checked');
            settings[MODULE_NAME].autoOpenBot = $('#outfit-auto-bot').prop('checked');
            settings[MODULE_NAME].autoOpenUser = $('#outfit-auto-user').prop('checked');
            settings[MODULE_NAME].debugMode = $('#outfit-debug-mode').prop('checked');
            saveSettingsFn();

            // Update the outfit store to reflect the new settings
            outfitStore.setSetting('enableSysMessages', settings[MODULE_NAME].enableSysMessages);
            outfitStore.setSetting('autoOpenBot', settings[MODULE_NAME].autoOpenBot);
            outfitStore.setSetting('autoOpenUser', settings[MODULE_NAME].autoOpenUser);
            outfitStore.setSetting('debugMode', settings[MODULE_NAME].debugMode);
        }
    });

    // Update panel colors when settings change
    $(document).on(
        'input',
        '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color',
        function (this: HTMLElement) {
            // Get the current input element
            const $currentInput = $(this);
            const colorValue = $currentInput.val();

            // For non-hex colors (like gradients or rgba), don't validate
            // Only validate if it looks like a hex color
            const colorValueNoSpaces = colorValue
                .split(' ')
                .join('')
                .split('\t')
                .join('')
                .split('\n')
                .join('')
                .split('\r')
                .join('');
            const isHexColor = isValidHexColorNoRegex(colorValueNoSpaces);

            if (isHexColor) {
                // If it doesn't start with #, add it
                let normalizedValue = colorValue;

                if (!colorValue.startsWith('#')) {
                    normalizedValue = '#' + colorValue;
                    $currentInput.val(normalizedValue);
                }

                // Convert 3-digit hex to 6-digit if needed
                if (normalizedValue.length === 4) {
                    // # + 3 digits
                    normalizedValue =
                        '#' +
                        normalizedValue[1] +
                        normalizedValue[1] +
                        normalizedValue[2] +
                        normalizedValue[2] +
                        normalizedValue[3] +
                        normalizedValue[3];
                    $currentInput.val(normalizedValue);
                }

                // Update the input to show the normalized value
                $currentInput.val(normalizedValue.toUpperCase());
            }

            updateColorSettingsAndApply();
        }
    );

    // Update outfit store when color values are changed directly
    $(document).on(
        'change',
        '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color',
        () => {
            // Update the outfit store to reflect the new color settings
            const newBotColors = {
                primary: $('#bot-panel-primary-color').val(),
                border: $('#bot-panel-border-color').val(),
                shadow: $('#bot-panel-shadow-color').val(),
            };

            const newUserColors = {
                primary: $('#user-panel-primary-color').val(),
                border: $('#user-panel-border-color').val(),
                shadow: $('#user-panel-shadow-color').val(),
            };

            outfitStore.setSetting('botPanelColors', newBotColors);
            outfitStore.setSetting('userPanelColors', newUserColors);
        }
    );

    // Color customization event listeners
    $('#apply-panel-colors').on('click', function (this: HTMLElement) {
        updateColorSettingsAndApply();

        // Visual feedback for button click
        const originalText = $(this).text();
        const $this = $(this); // Capture this context

        $this.text('Applied!').css('background', 'linear-gradient(135deg, #5a8d5a, #4a7d4a)');

        setTimeout(() => {
            $this.text(originalText).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
        }, 2000);
    });

    // Update text inputs when color pickers change
    $('#bot-panel-primary-color-picker').on('input', function (this: HTMLInputElement) {
        // Extract hex color from the picker and update the text field
        const hexColor = $(this).val();

        $('#bot-panel-primary-color').val(`linear-gradient(135deg, ${hexColor} 0%, #5a49d0 50%, #4a43c0 100%)`);
    });

    $('#bot-panel-border-color-picker').on('input', function (this: HTMLInputElement) {
        const hexColor = $(this).val();

        $('#bot-panel-border-color').val(hexColor);
    });

    $('#bot-panel-shadow-color-picker').on('input', function (this: HTMLInputElement) {
        const hexColor = $(this).val();
        // Convert hex to rgba for shadow (with opacity)
        const rgba = hexToRgba(hexColor, 0.4);

        $('#bot-panel-shadow-color').val(rgba);
    });

    $('#user-panel-primary-color-picker').on('input', function (this: HTMLInputElement) {
        const hexColor = $(this).val();

        $('#user-panel-primary-color').val(`linear-gradient(135deg, ${hexColor} 0%, #2a68c1 50%, #1a58b1 100%)`);
    });

    $('#user-panel-border-color-picker').on('input', function (this: HTMLInputElement) {
        const hexColor = $(this).val();

        $('#user-panel-border-color').val(hexColor);
    });

    $('#user-panel-shadow-color-picker').on('input', function (this: HTMLInputElement) {
        const hexColor = $(this).val();
        // Convert hex to rgba for shadow (with opacity)
        const rgba = hexToRgba(hexColor, 0.4);

        $('#user-panel-shadow-color').val(rgba);
    });

    // Update color pickers when text inputs change (in case users type in values)
    $(document).on(
        'input',
        '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color',
        function (this: HTMLElement) {
            updateColorPickersFromText();
        }
    );

    // Add hover effects to the apply button
    $('#apply-panel-colors').hover(
        function (this: HTMLElement) {
            // Mouse enter
            $(this).css('background', 'linear-gradient(135deg, #5a6bc8 0%, #4a5ba8 100%)');
        },
        function (this: HTMLElement) {
            // Mouse leave
            $(this).css('background', 'linear-gradient(135deg, #4a5bb8 0%, #3a4ba8 100%)');
        }
    );

    // Store original default values for comparison
    const originalDefaults = {
        bot: {
            primary: 'linear-gradient(135deg, #6a4fc1 0%, #5a49d0 50%, #4a43c0 100%)',
            border: '#8a7fdb',
            shadow: 'rgba(106, 79, 193, 0.4)',
        },
        user: {
            primary: 'linear-gradient(135deg, #1a78d1 0%, #2a68c1 50%, #1a58b1 100%)',
            border: '#5da6f0',
            shadow: 'rgba(26, 120, 209, 0.4)',
        },
    };

    // Function to check if a field has been modified from its default
    function isFieldModified(fieldId: string, defaultValue: string): boolean {
        const currentValue = $(`#${fieldId}`).val();

        return currentValue !== defaultValue;
    }

    // Helper function to toggle reset button visibility
    function toggleResetButton(buttonId: string, show: boolean) {
        const button = $(`#${buttonId}`);

        if (show) {
            button.show();
        } else {
            button.hide();
        }
    }

    // Function to update reset button visibility
    function updateResetButtonVisibility() {
        // Bot panel
        toggleResetButton(
            'bot-panel-primary-reset',
            isFieldModified('bot-panel-primary-color', originalDefaults.bot.primary)
        );
        toggleResetButton(
            'bot-panel-border-reset',
            isFieldModified('bot-panel-border-color', originalDefaults.bot.border)
        );
        toggleResetButton(
            'bot-panel-shadow-reset',
            isFieldModified('bot-panel-shadow-color', originalDefaults.bot.shadow)
        );

        // User panel
        toggleResetButton(
            'user-panel-primary-reset',
            isFieldModified('user-panel-primary-color', originalDefaults.user.primary)
        );
        toggleResetButton(
            'user-panel-border-reset',
            isFieldModified('user-panel-border-color', originalDefaults.user.border)
        );
        toggleResetButton(
            'user-panel-shadow-reset',
            isFieldModified('user-panel-shadow-color', originalDefaults.user.shadow)
        );
    }

    // Attach input event listeners to text fields to check for modifications
    $(
        '#bot-panel-primary-color, #bot-panel-border-color, #bot-panel-shadow-color, #user-panel-primary-color, #user-panel-border-color, #user-panel-shadow-color'
    ).on('input', () => {
        updateResetButtonVisibility();
    });

    // Initialize reset button visibility after UI is created
    setTimeout(updateResetButtonVisibility, 200);

    // Reset button event handlers
    $('#bot-panel-primary-reset').on('click', function () {
        $('#bot-panel-primary-color').val(originalDefaults.bot.primary);
        $('#bot-panel-primary-color-picker').val(extractHexFromGradient(originalDefaults.bot.primary));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#bot-panel-border-reset').on('click', function () {
        $('#bot-panel-border-color').val(originalDefaults.bot.border);
        $('#bot-panel-border-color-picker').val(originalDefaults.bot.border);
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#bot-panel-shadow-reset').on('click', function () {
        $('#bot-panel-shadow-color').val(originalDefaults.bot.shadow);
        $('#bot-panel-shadow-color-picker').val(extractHexFromGradient(originalDefaults.bot.shadow));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-primary-reset').on('click', function () {
        $('#user-panel-primary-color').val(originalDefaults.user.primary);
        $('#user-panel-primary-color-picker').val(extractHexFromGradient(originalDefaults.user.primary));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-border-reset').on('click', function () {
        $('#user-panel-border-color').val(originalDefaults.user.border);
        $('#user-panel-border-color-picker').val(originalDefaults.user.border);
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    $('#user-panel-shadow-reset').on('click', function () {
        $('#user-panel-shadow-color').val(originalDefaults.user.shadow);
        $('#user-panel-shadow-color-picker').val(extractHexFromGradient(originalDefaults.user.shadow));
        updateResetButtonVisibility();
        updateColorSettingsAndApply();
    });

    // Initialize color pickers with current values when the settings UI loads
    setTimeout(updateColorPickersFromText, 100);

    // Only add auto system event listeners if it loaded successfully
    if (hasAutoSystem) {
        $('#outfit-auto-system').on('input', function (this: HTMLInputElement) {
            if (settings && settings[MODULE_NAME]) {
                settings[MODULE_NAME].autoOutfitSystem = $(this).prop('checked');
                if ($(this).prop('checked')) {
                    autoOutfitSystem.enable();
                } else {
                    autoOutfitSystem.disable();
                }
                saveSettingsFn();

                // Update the outfit store to reflect the new settings
                outfitStore.setSetting('autoOutfitSystem', settings[MODULE_NAME].autoOutfitSystem);
            }
        });

        $('#outfit-connection-profile').on('change', function (this: HTMLSelectElement) {
            const profile = $(this).val() || null;

            if (settings && settings[MODULE_NAME]) {
                settings[MODULE_NAME].autoOutfitConnectionProfile = profile;
                if (autoOutfitSystem.setConnectionProfile) {
                    autoOutfitSystem.setConnectionProfile(profile);
                }
                saveSettingsFn();

                // Update the outfit store to reflect the new settings
                outfitStore.setSetting(
                    'autoOutfitConnectionProfile',
                    settings[MODULE_NAME].autoOutfitConnectionProfile
                );
            }
        });

        $('#outfit-prompt-input').on('change', function (this: HTMLTextAreaElement) {
            if (settings && settings[MODULE_NAME]) {
                settings[MODULE_NAME].autoOutfitPrompt = $(this).val();
                autoOutfitSystem.setPrompt($(this).val());
                saveSettingsFn();

                // Update the outfit store to reflect the new settings
                outfitStore.setSetting('autoOutfitPrompt', settings[MODULE_NAME].autoOutfitPrompt);
            }
        });

        $('#outfit-prompt-reset-btn').on('click', function () {
            const message = autoOutfitSystem.resetToDefaultPrompt();

            if (settings && settings[MODULE_NAME]) {
                $('#outfit-prompt-input').val(autoOutfitSystem.systemPrompt);
                settings[MODULE_NAME].autoOutfitPrompt = autoOutfitSystem.systemPrompt;
                saveSettingsFn();

                // Update the outfit store to reflect the new settings
                outfitStore.setSetting('autoOutfitPrompt', settings[MODULE_NAME].autoOutfitPrompt);
            }

            if (currentSettings?.enableSysMessages && window.botOutfitPanel?.sendSystemMessage) {
                window.botOutfitPanel.sendSystemMessage(message);
            } else {
                toastr.info(message);
            }
        });

        $('#outfit-prompt-view-btn').on('click', function () {
            const status = autoOutfitSystem.getStatus();
            const preview =
                autoOutfitSystem.systemPrompt.length > 100
                    ? autoOutfitSystem.systemPrompt.substring(0, 100) + '...'
                    : autoOutfitSystem.systemPrompt;

            toastr.info(
                `Prompt preview: ${preview}\n\nFull length: ${status.promptLength} characters`,
                'Current System Prompt',
                {
                    timeOut: 15000,
                    extendedTimeOut: 30000,
                }
            );
        });
    }

    // Add event listener for the wipe all outfits button
    $('#outfit-wipe-all-btn').on('click', function () {
        // Show confirmation dialog
        if (
            confirm(
                'Are you sure you want to permanently delete ALL extension data and reload the page? This action cannot be undone.'
            )
        ) {
            // Call the wipe function after confirmation
            if (typeof window.wipeAllOutfits === 'function') {
                window.wipeAllOutfits();
                // Reload the page after wiping all data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        }
    });

    // Add event listener for the debug panel button
    $('#outfit-debug-panel-btn').on('click', async function () {
        // Check if debug mode is enabled
        const storeState = outfitStore.getState();

        if (!storeState.settings.debugMode) {
            toastr.warning('Debug mode must be enabled to use the debug panel.', 'Debug Panel');
            return;
        }

        // Create and show the debug panel
        // Create a global reference to the debug panel if it doesn't exist
        if (!window.outfitDebugPanel) {
            const { DebugPanel } = await import('../panels/DebugPanel');

            window.outfitDebugPanel = new DebugPanel();
        }

        window.outfitDebugPanel.toggle();
    });

    // Add event listener for the outfit process button
    $('#outfit-process-btn').on('click', async function () {
        if (hasAutoSystem && autoOutfitSystem) {
            try {
                // Show a processing message
                toastr.info('Processing outfit changes from recent messages...', 'Outfit Processing');

                // Manually trigger the LLM analysis
                await autoOutfitSystem.manualTrigger();

                // Get the LLM output and generated commands
                const llmOutputData = autoOutfitSystem.getLlmOutput();

                if (llmOutputData) {
                    // Update the LLM output textarea
                    $('#outfit-llm-output').val(llmOutputData.llmOutput || 'No output generated');

                    // Update the generated commands list
                    const $commandsList = $('#outfit-generated-commands');

                    $commandsList.empty(); // Clear existing items

                    if (llmOutputData.generatedCommands && llmOutputData.generatedCommands.length > 0) {
                        llmOutputData.generatedCommands.forEach((cmd: string) => {
                            $commandsList.append(`<li>${cmd}</li>`);
                        });
                    } else {
                        $commandsList.append('<li>No commands generated</li>');
                    }

                    toastr.success(
                        'Outfit processing completed. See results in the LLM Output section.',
                        'Processing Complete'
                    );
                } else {
                    $('#outfit-llm-output').val('No output data available');
                    $('#outfit-generated-commands').empty().append('<li>No commands generated</li>');
                    toastr.warning('No output data returned from the system.', 'No Data');
                }
            } catch (error: any) {
                debugLog('Error during outfit processing:', error, 'error', 'SettingsUI');
                $('#outfit-llm-output').val(`Error: ${error.message}`);
                $('#outfit-generated-commands').empty().append(`<li>Error: ${error.message}</li>`);
                toastr.error(`Outfit processing failed: ${error.message}`, 'Processing Error');
            }
        } else {
            toastr.error('Auto outfit system is not available.', 'System Unavailable');
        }
    });

    // Initialize LLM output display if auto outfit system is available
    if (hasAutoSystem && autoOutfitSystem) {
        // Try to get initial LLM output (if available)
        try {
            const llmOutputData = autoOutfitSystem.getLlmOutput();

            if (llmOutputData) {
                $('#outfit-llm-output').val(llmOutputData.llmOutput || 'No output generated');

                const $commandsList = $('#outfit-generated-commands');

                $commandsList.empty();

                if (llmOutputData.generatedCommands && llmOutputData.generatedCommands.length > 0) {
                    llmOutputData.generatedCommands.forEach((cmd: string) => {
                        $commandsList.append(`<li>${cmd}</li>`);
                    });
                } else {
                    $commandsList.append('<li>No commands generated</li>');
                }
            }
        } catch (error) {
            debugLog('Error initializing LLM output display:', error, 'error', 'SettingsUI');
        }
    }
}
