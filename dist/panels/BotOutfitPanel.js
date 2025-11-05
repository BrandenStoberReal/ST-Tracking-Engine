var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BaseOutfitPanel } from './BaseOutfitPanel.js';
import { extractCommands } from '../processors/StringProcessor.js';
import { LLMUtility } from '../utils/LLMUtility.js';
import { areSystemMessagesEnabled } from '../utils/SettingsUtil.js';
import { findCharacterById } from '../services/CharacterIdService.js';
import { debugLog } from '../logging/DebugLogger.js';
export class BotOutfitPanel extends BaseOutfitPanel {
    constructor(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced) {
        super(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced, 'bot-outfit-panel', 'bot');
    }
    getPanelTitle() {
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        const characterName = this.outfitManager.character || 'Unknown';
        return `${characterName}'s Outfit${hashDisplay}`;
    }
    renderFillOutfitButton(container) {
        const fillButton = document.createElement('button');
        fillButton.className = 'fill-outfit-btn';
        fillButton.textContent = 'Fill Outfit with LLM';
        fillButton.addEventListener('click', () => this.generateOutfitFromCharacterInfo());
        container.appendChild(fillButton);
    }
    generateOutfitFromCharacterInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage('Generating outfit from character info...');
                }
                const characterInfo = yield this.getCharacterData();
                if (characterInfo.error) {
                    throw new Error(characterInfo.error);
                }
                const response = yield this.generateOutfitFromLLM(characterInfo);
                yield this.parseAndApplyOutfitCommands(response);
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage('Outfit generated and applied successfully!');
                }
            }
            catch (error) {
                debugLog('Error in generateOutfitFromCharacterInfo:', error, 'error');
                if (areSystemMessagesEnabled()) {
                    this.sendSystemMessage(`Error generating outfit: ${error.message}`);
                }
            }
        });
    }
    getCharacterData() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
            const character = findCharacterById(this.outfitManager.characterId) || ((_d = context === null || context === void 0 ? void 0 : context.characters) === null || _d === void 0 ? void 0 : _d[context.characterId]);
            if (!character) {
                return { error: 'No character selected or context not ready' };
            }
            return {
                name: character.name || 'Unknown',
                description: character.description || '',
                personality: character.personality || '',
                scenario: character.scenario || '',
                firstMessage: ((_f = (_e = context === null || context === void 0 ? void 0 : context.chat) === null || _e === void 0 ? void 0 : _e.find((msg) => !msg.is_user && !msg.is_system)) === null || _f === void 0 ? void 0 : _f.mes) || character.first_mes || '',
                characterNotes: character.character_notes || '',
            };
        });
    }
    generateOutfitFromLLM(characterInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const prompt = this.getDefaultOutfitPrompt()
                .replace('<CHARACTER_NAME>', characterInfo.name)
                .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
                .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
                .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
                .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
                .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);
            const connectionProfile = (_b = (_a = window.autoOutfitSystem) === null || _a === void 0 ? void 0 : _a.getConnectionProfile) === null || _b === void 0 ? void 0 : _b.call(_a);
            return LLMUtility.generateWithProfile(prompt, 'You are an outfit generation system. Output outfit commands based on character info.', ((_d = (_c = window.SillyTavern) === null || _c === void 0 ? void 0 : _c.getContext) === null || _d === void 0 ? void 0 : _d.call(_c)) || ((_e = window.getContext) === null || _e === void 0 ? void 0 : _e.call(window)), connectionProfile);
        });
    }
    parseAndApplyOutfitCommands(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const commands = extractCommands(response);
            if (!commands || commands.length === 0) {
                debugLog('[BotOutfitPanel] No outfit commands found in response');
                return;
            }
            for (const command of commands) {
                try {
                    yield this.processSingleCommand(command);
                }
                catch (error) {
                    debugLog(`Error processing command "${command}":`, error, 'error');
                }
            }
            this.renderContent();
            this.saveSettingsDebounced();
        });
    }
    processSingleCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const match = command.match(/outfit-system_(wear|remove|change)_([a-zA-Z\-]+)\((?:"(.*?)")?\)/);
            if (!match)
                return;
            const [, action, slot, value] = match;
            const cleanValue = value ? value.replace(/\\"/g, '"') : 'None';
            debugLog(`[BotOutfitPanel] Processing: ${action} ${slot} "${cleanValue}"`);
            const message = yield this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);
            if (message && areSystemMessagesEnabled()) {
                this.sendSystemMessage(message);
            }
        });
    }
    getDefaultOutfitPrompt() {
        return `Based on the character's description, personality, scenario, notes, and first message, generate appropriate outfit commands.\n\nCHARACTER INFO:\nName: <CHARACTER_NAME>\nDescription: <CHARACTER_DESCRIPTION>\nPersonality: <CHARACTER_PERSONALITY>\nScenario: <CHARACTER_SCENARIO>\nNotes: <CHARACTER_NOTES>\nFirst Message: <CHARACTER_FIRST_MESSAGE>\n\nOUTPUT FORMAT (one command per line):\noutfit-system_wear_headwear(\"item name\")\noutfit-system_wear_topwear(\"item name\")\noutfit-system_remove_headwear()  // for items not applicable\n\nSLOTS:\nClothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear\nAccessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory\n\nINSTRUCTIONS:\n- Only output outfit commands based on character details\n- Use \"remove\" for items that don't fit the character\n- If uncertain about an item, omit the command\n- Output only commands, no explanations`;
    }
    getFirstMessageText() {
        var _a, _b, _c, _d, _e;
        const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
        const character = findCharacterById(this.outfitManager.characterId);
        const characterName = (character === null || character === void 0 ? void 0 : character.name) || this.outfitManager.character;
        const aiMessages = (_d = context === null || context === void 0 ? void 0 : context.chat) === null || _d === void 0 ? void 0 : _d.filter((msg) => !msg.is_user && !msg.is_system && msg.name === characterName);
        return ((_e = aiMessages === null || aiMessages === void 0 ? void 0 : aiMessages[0]) === null || _e === void 0 ? void 0 : _e.mes) || '';
    }
    updateCharacter(name) {
        this.outfitManager.setCharacter(name);
        this.updateHeader();
        this.renderContent();
    }
    setupDynamicRefresh() {
        var _a, _b, _c;
        super.setupDynamicRefresh();
        const context = ((_b = (_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext) === null || _b === void 0 ? void 0 : _b.call(_a)) || ((_c = window.getContext) === null || _c === void 0 ? void 0 : _c.call(window));
        if ((context === null || context === void 0 ? void 0 : context.eventSource) && context.event_types) {
            const { eventSource, event_types } = context;
            const refresh = () => {
                if (this.isVisible) {
                    this.updateCharacter(this.outfitManager.character);
                    this.outfitManager.loadOutfit(this.outfitManager.getOutfitInstanceId());
                    this.renderContent();
                }
            };
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CHANGED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_ID_CHANGED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.CHAT_CREATED, refresh));
            this.eventListeners.push(() => eventSource.on(event_types.MESSAGE_RECEIVED, () => this.isVisible && this.renderContent()));
        }
    }
}
