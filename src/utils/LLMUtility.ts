import {outfitStore} from '../common/Store';
import {debugLog} from '../logging/DebugLogger';

declare global {
    interface Window {
        connectionManager: any;
        SlashCommandParser: any;
        extension_settings: any;
        SillyTavern: any;
        getContext: any;
    }
}

class ConnectionProfileHelper {
    static async withConnectionProfile(profileId: string, generationFunc: (context: SillyTavernContext) => Promise<any>, context: SillyTavernContext | null = null): Promise<any> {
        if (!profileId) {
            if (context) {
                return generationFunc(context);
            } else {
                throw new Error('Context is required for generation');
            }
        }

        const currentProfile = this.getCurrentConnectionProfile();

        try {
            await this.applyConnectionProfile(profileId);
            if (context) {
                return await generationFunc(context);
            } else {
                throw new Error('Context is null but required for generation');
            }
        } catch (error: any) {
            debugLog(`[LLMUtility] Error during generation with connection profile ${profileId}:`, error, 'error');
            throw error;
        } finally {
            if (currentProfile && currentProfile !== profileId) {
                await this.applyConnectionProfile(currentProfile);
            }
        }
    }

    static async applyConnectionProfile(profileId: string): Promise<void> {
        try {
            if (window.connectionManager && typeof window.connectionManager.applyProfile === 'function') {
                const profile = this.getProfileById(profileId);

                if (profile) {
                    await window.connectionManager.applyProfile(profile);
                } else {
                    debugLog(`[LLMUtility] Profile with ID ${profileId} not found. Falling back to slash command.`, null, 'warn');
                    if (window.SlashCommandParser?.commands?.profile) {
                        await window.SlashCommandParser.commands['profile'].callback({}, profileId);
                    }
                }
            } else if (window.SlashCommandParser?.commands?.profile) {
                await window.SlashCommandParser.commands['profile'].callback({}, profileId);
            } else {
                debugLog('[LLMUtility] Could not apply connection profile, no implementation found.', null, 'warn');
            }
        } catch (error: any) {
            debugLog(`[LLMUtility] Failed to apply connection profile ${profileId}:`, error, 'error');
        }
    }

    static getCurrentConnectionProfile(): string | null {
        if (window.connectionManager && typeof window.connectionManager.getCurrentProfileId === 'function') {
            return window.connectionManager.getCurrentProfileId();
        }

        if (window.extension_settings?.connectionManager?.selectedProfile) {
            return window.extension_settings.connectionManager.selectedProfile;
        }

        try {
            const storeState = outfitStore.getState();
            return storeState.settings?.autoOutfitConnectionProfile || null;
        } catch (error: any) {
            debugLog('Could not access store for connection profile:', error, 'warn');
        }

        return null;
    }

    static getProfileById(profileId: string): any | null {
        if (!profileId) {
            return null;
        }

        if (window.connectionManager && typeof window.connectionManager.getProfileById === 'function') {
            return window.connectionManager.getProfileById(profileId);
        }

        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles.find((p: any) => p.id === profileId);
        }

        try {
            const storeState = outfitStore.getState();
            return null;
        } catch (error) {
            debugLog('Could not access store for profiles:', error, 'warn');
        }

        return null;
    }

    static getAllProfiles(): any[] {
        if (window.connectionManager && typeof window.connectionManager.getAllProfiles === 'function') {
            return window.connectionManager.getAllProfiles();
        }

        if (window.extension_settings?.connectionManager?.profiles) {
            return window.extension_settings.connectionManager.profiles;
        }

        try {
            const storeState = outfitStore.getState();
            return [];
        } catch (error) {
            debugLog('Could not access store for profiles:', error, 'warn');
        }

        return [];
    }
}

export class LLMUtility {
    static async generateWithRetry(prompt: string, systemPrompt: string = 'You are an AI assistant.', context: SillyTavernContext | null = null, maxRetries: number = 3): Promise<string> {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                let result: string;

                if (context && context.generateRaw) {
                    result = await context.generateRaw(prompt, systemPrompt);
                } else if (context && context.generateQuietPrompt) {
                    result = await context.generateQuietPrompt(prompt);
                } else {
                    throw new Error('No generation method available in context');
                }

                if (!result || result.trim() === '') {
                    debugLog(`[LLMUtility] Empty response from LLM (attempt ${attempt + 1}/${maxRetries})`, null, 'warn');
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error('Empty response from LLM after retries');
                    }
                    continue;
                }

                return result;
            } catch (error: any) {
                debugLog(`[LLMUtility] Generation attempt ${attempt + 1}/${maxRetries} failed:`, error, 'error');
                attempt++;
                if (attempt >= maxRetries) {
                    throw new Error(`Generation failed after ${maxRetries} attempts: ${error.message}`);
                }
            }
        }

        throw new Error(`Generation failed after ${maxRetries} attempts`);
    }

    static async generateWithProfile(prompt: string, systemPrompt: string = 'You are an AI assistant.', context: SillyTavernContext | null = null, profile: string | null = null, maxRetries: number = 3): Promise<string> {
        if (!context) {
            context = window.SillyTavern?.getContext ? window.SillyTavern.getContext() : (window.getContext ? window.getContext() : null);
        }

        // If no profile specified, use the default generation method
        if (!profile) {
            return await this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        }

        // Use the new SillyTavern ConnectionManagerRequestService.sendRequest API
        if (context?.ConnectionManagerRequestService?.sendRequest) {
            let attempt = 0;
            const maxTokens = 2048; // Default max tokens, can be made configurable

            while (attempt < maxRetries) {
                try {
                    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
                    const result = await context.ConnectionManagerRequestService.sendRequest(
                        profile,
                        fullPrompt,
                        maxTokens,
                        {}, // custom parameters (use defaults)
                        {}  // override payload
                    );

                    if (!result || result.trim() === '') {
                        debugLog(`[LLMUtility] Empty response from profile ${profile} (attempt ${attempt + 1}/${maxRetries})`, null, 'warn');
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error('Empty response from LLM after retries');
                        }
                        continue;
                    }

                    return result;
                } catch (error: any) {
                    debugLog(`[LLMUtility] Profile generation attempt ${attempt + 1}/${maxRetries} with profile ${profile} failed:`, error, 'error');
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error(`Profile generation failed after ${maxRetries} attempts: ${error.message}`);
                    }
                }
            }
        }

        // Fallback to the old method if the new API is not available
        debugLog('[LLMUtility] ConnectionManagerRequestService.sendRequest not available, falling back to legacy method', null, 'warn');
        const generationFunc = async (genContext: SillyTavernContext): Promise<string> => {
            if (genContext && genContext.generateRaw) {
                return genContext.generateRaw(prompt, systemPrompt);
            } else if (genContext && genContext.generateQuietPrompt) {
                return genContext.generateQuietPrompt(prompt);
            }
            throw new Error('No generation method available in context');
        };

        try {
            if (profile && context) {
                return await ConnectionProfileHelper.withConnectionProfile(profile, generationFunc, context);
            }
            return await this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        } catch (error: any) {
            debugLog(`[LLMUtility] Profile generation with ${profile ?? 'null'} failed:`, error, 'error');
            debugLog('[LLMUtility] Falling back to default generation after profile failures...');
            return this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
        }
    }
}
