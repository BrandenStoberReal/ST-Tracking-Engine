import {BaseOutfitPanel} from './BaseOutfitPanel';
import {extractCommands} from '../processors/StringProcessor';
import {LLMUtility} from '../utils/LLMUtility';
import {areSystemMessagesEnabled} from '../utils/SettingsUtil';
import {findCharacterById} from '../services/CharacterIdService';
import {debugLog} from '../logging/DebugLogger';

declare const window: any;

export class BotOutfitPanel extends BaseOutfitPanel {
    constructor(outfitManager: any, clothingSlots: string[], accessorySlots: string[], saveSettingsDebounced: any) {
        super(outfitManager, clothingSlots, accessorySlots, saveSettingsDebounced, 'bot-outfit-panel', 'bot');
    }

    getPanelTitle(): string {
        const messageHash = this.generateMessageHash(this.getFirstMessageText() || this.outfitManager.getOutfitInstanceId() || '');
        const hashDisplay = messageHash ? ` (${messageHash})` : '';
        const characterName = this.outfitManager.character || 'Unknown';
        return `${characterName}'s Outfit${hashDisplay}`;
    }

    renderFillOutfitButton(container: HTMLElement): void {
        const fillButton = document.createElement('button');
        fillButton.className = 'fill-outfit-btn';
        fillButton.textContent = 'Fill Outfit with LLM';
        fillButton.addEventListener('click', () => this.generateOutfitFromCharacterInfo());
        container.appendChild(fillButton);
    }

    async generateOutfitFromCharacterInfo(): Promise<void> {
        try {
            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage('Generating outfit from character info...');
            }

            const characterInfo = await this.getCharacterData();
            if (characterInfo.error) {
                throw new Error(characterInfo.error);
            }

            const response = await this.generateOutfitFromLLM(characterInfo);
            await this.parseAndApplyOutfitCommands(response);

            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage('Outfit generated and applied successfully!');
            }
        } catch (error: any) {
            debugLog('Error in generateOutfitFromCharacterInfo:', error, 'error');
            if (areSystemMessagesEnabled()) {
                this.sendSystemMessage(`Error generating outfit: ${error.message}`);
            }
        }
    }

    updateCharacter(name: string): void {
        this.outfitManager.setCharacter(name);
        this.updateHeader();
        this.renderContent();
    }

    setupDynamicRefresh(): void {
        super.setupDynamicRefresh();
        const context = window.SillyTavern?.getContext?.() || window.getContext?.();
        if (context?.eventSource && context.event_types) {
            const {eventSource, event_types} = context;
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

    private async getCharacterData(): Promise<any> {
        const context = window.SillyTavern?.getContext?.() || window.getContext?.();
        const character = findCharacterById(this.outfitManager.characterId) || (context?.characters?.[context.characterId]);

        if (!character) {
            return {error: 'No character selected or context not ready'};
        }

        return {
            name: character.name || 'Unknown',
            description: character.description || '',
            personality: character.personality || '',
            scenario: character.scenario || '',
            firstMessage: context?.chat?.find((msg: any) => !msg.is_user && !msg.is_system)?.mes || character.first_mes || '',
            characterNotes: character.character_notes || '',
        };
    }

    private async generateOutfitFromLLM(characterInfo: any): Promise<string> {
        const prompt = this.getDefaultOutfitPrompt()
            .replace('<CHARACTER_NAME>', characterInfo.name)
            .replace('<CHARACTER_DESCRIPTION>', characterInfo.description)
            .replace('<CHARACTER_PERSONALITY>', characterInfo.personality)
            .replace('<CHARACTER_SCENARIO>', characterInfo.scenario)
            .replace('<CHARACTER_NOTES>', characterInfo.characterNotes)
            .replace('<CHARACTER_FIRST_MESSAGE>', characterInfo.firstMessage);

        const connectionProfile = window.autoOutfitSystem?.getConnectionProfile?.();
        return LLMUtility.generateWithProfile(
            prompt,
            'You are an outfit generation system. Output outfit commands based on character info.',
            window.SillyTavern?.getContext?.() || window.getContext?.(),
            connectionProfile
        );
    }

    private async parseAndApplyOutfitCommands(response: string): Promise<void> {
        const commands = extractCommands(response);
        if (!commands || commands.length === 0) {
            debugLog('[BotOutfitPanel] No outfit commands found in response');
            return;
        }

        for (const command of commands) {
            try {
                await this.processSingleCommand(command);
            } catch (error) {
                debugLog(`Error processing command "${command}":`, error, 'error');
            }
        }

        this.renderContent();
        this.saveSettingsDebounced();
    }

    private async processSingleCommand(command: string): Promise<void> {
        const match = command.match(/outfit-system_(wear|remove|change)_([a-zA-Z\-]+)\((?:"(.*?)")?\)/);
        if (!match) return;

        const [, action, slot, value] = match;
        const cleanValue = value ? value.replace(/\\"/g, '"') : 'None';

        debugLog(`[BotOutfitPanel] Processing: ${action} ${slot} "${cleanValue}"`);
        const message = await this.outfitManager.setOutfitItem(slot, action === 'remove' ? 'None' : cleanValue);
        if (message && areSystemMessagesEnabled()) {
            this.sendSystemMessage(message);
        }
    }

    private getDefaultOutfitPrompt(): string {
        return `Based on the character's description, personality, scenario, notes, and first message, generate appropriate outfit commands.\n\nCHARACTER INFO:\nName: <CHARACTER_NAME>\nDescription: <CHARACTER_DESCRIPTION>\nPersonality: <CHARACTER_PERSONALITY>\nScenario: <CHARACTER_SCENARIO>\nNotes: <CHARACTER_NOTES>\nFirst Message: <CHARACTER_FIRST_MESSAGE>\n\nOUTPUT FORMAT (one command per line):\noutfit-system_wear_headwear(\"item name\")\noutfit-system_wear_topwear(\"item name\")\noutfit-system_remove_headwear()  // for items not applicable\n\nSLOTS:\nClothing: headwear, topwear, topunderwear, bottomwear, bottomunderwear, footwear, footunderwear\nAccessories: head-accessory, ears-accessory, eyes-accessory, mouth-accessory, neck-accessory, body-accessory, arms-accessory, hands-accessory, waist-accessory, bottom-accessory, legs-accessory, foot-accessory\n\nINSTRUCTIONS:\n- Only output outfit commands based on character details\n- Use \"remove\" for items that don't fit the character\n- If uncertain about an item, omit the command\n- Output only commands, no explanations`;
    }

    private getFirstMessageText(): string {
        const context = window.SillyTavern?.getContext?.() || window.getContext?.();
        const character = findCharacterById(this.outfitManager.characterId);
        const characterName = character?.name || this.outfitManager.character;
        const aiMessages = context?.chat?.filter((msg: any) => !msg.is_user && !msg.is_system && msg.name === characterName);
        return aiMessages?.[0]?.mes || '';
    }
}