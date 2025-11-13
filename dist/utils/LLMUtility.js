var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { outfitStore } from '../common/Store.js';
import { debugLog } from '../logging/DebugLogger.js';
class ConnectionProfileHelper {
    static withConnectionProfile(profileId_1, generationFunc_1) {
        return __awaiter(this, arguments, void 0, function* (profileId, generationFunc, context = null) {
            if (!profileId) {
                if (context) {
                    return generationFunc(context);
                }
                else {
                    throw new Error('Context is required for generation');
                }
            }
            const currentProfile = this.getCurrentConnectionProfile();
            try {
                yield this.applyConnectionProfile(profileId);
                if (context) {
                    return yield generationFunc(context);
                }
                else {
                    throw new Error('Context is null but required for generation');
                }
            }
            catch (error) {
                debugLog(`Error during generation with connection profile ${profileId}:`, error, 'error', 'LLMUtility');
                throw error;
            }
            finally {
                if (currentProfile && currentProfile !== profileId) {
                    yield this.applyConnectionProfile(currentProfile);
                }
            }
        });
    }
    static applyConnectionProfile(profileId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                if (window.connectionManager && typeof window.connectionManager.applyProfile === 'function') {
                    const profile = this.getProfileById(profileId);
                    if (profile) {
                        yield window.connectionManager.applyProfile(profile);
                    }
                    else {
                        debugLog(`Profile with ID ${profileId} not found. Falling back to slash command.`, null, 'warn', 'LLMUtility');
                        if ((_b = (_a = window.SlashCommandParser) === null || _a === void 0 ? void 0 : _a.commands) === null || _b === void 0 ? void 0 : _b.profile) {
                            yield window.SlashCommandParser.commands['profile'].callback({}, profileId);
                        }
                    }
                }
                else if ((_d = (_c = window.SlashCommandParser) === null || _c === void 0 ? void 0 : _c.commands) === null || _d === void 0 ? void 0 : _d.profile) {
                    yield window.SlashCommandParser.commands['profile'].callback({}, profileId);
                }
                else {
                    debugLog('Could not apply connection profile, no implementation found.', null, 'warn', 'LLMUtility');
                }
            }
            catch (error) {
                debugLog(`Failed to apply connection profile ${profileId}:`, error, 'error', 'LLMUtility');
            }
        });
    }
    static getCurrentConnectionProfile() {
        var _a, _b, _c;
        if (window.connectionManager && typeof window.connectionManager.getCurrentProfileId === 'function') {
            return window.connectionManager.getCurrentProfileId();
        }
        if ((_b = (_a = window.extension_settings) === null || _a === void 0 ? void 0 : _a.connectionManager) === null || _b === void 0 ? void 0 : _b.selectedProfile) {
            return window.extension_settings.connectionManager.selectedProfile;
        }
        try {
            const storeState = outfitStore.getState();
            return ((_c = storeState.settings) === null || _c === void 0 ? void 0 : _c.autoOutfitConnectionProfile) || null;
        }
        catch (error) {
            debugLog('Could not access store for connection profile:', error, 'warn', 'LLMUtility');
        }
        return null;
    }
    static getProfileById(profileId) {
        var _a, _b;
        if (!profileId) {
            return null;
        }
        if (window.connectionManager && typeof window.connectionManager.getProfileById === 'function') {
            return window.connectionManager.getProfileById(profileId);
        }
        if ((_b = (_a = window.extension_settings) === null || _a === void 0 ? void 0 : _a.connectionManager) === null || _b === void 0 ? void 0 : _b.profiles) {
            return window.extension_settings.connectionManager.profiles.find((p) => p.id === profileId);
        }
        try {
            return null;
        }
        catch (error) {
            debugLog('Could not access store for profiles:', error, 'warn', 'LLMUtility');
        }
        return null;
    }
    static getAllProfiles() {
        var _a, _b;
        if (window.connectionManager && typeof window.connectionManager.getAllProfiles === 'function') {
            return window.connectionManager.getAllProfiles();
        }
        if ((_b = (_a = window.extension_settings) === null || _a === void 0 ? void 0 : _a.connectionManager) === null || _b === void 0 ? void 0 : _b.profiles) {
            return window.extension_settings.connectionManager.profiles;
        }
        try {
            return [];
        }
        catch (error) {
            debugLog('Could not access store for profiles:', error, 'warn', 'LLMUtility');
        }
        return [];
    }
}
export class LLMUtility {
    static generateWithRetry(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt = 'You are an AI assistant.', context = null, maxRetries = 3) {
            var _a;
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                    ? window.SillyTavern.getContext()
                    : window.getContext
                        ? window.getContext()
                        : null;
            }
            let attempt = 0;
            while (attempt < maxRetries) {
                try {
                    let result;
                    if (context && context.generateRaw) {
                        result = yield context.generateRaw(prompt, { systemPrompt });
                    }
                    else if (context && context.generateQuietPrompt) {
                        result = yield context.generateQuietPrompt(prompt);
                    }
                    else {
                        throw new Error('No generation method available in context');
                    }
                    if (!result || result.trim() === '') {
                        debugLog(`Empty response from LLM (attempt ${attempt + 1}/${maxRetries})`, null, 'warn', 'LLMUtility');
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error('Empty response from LLM after retries');
                        }
                        continue;
                    }
                    return result;
                }
                catch (error) {
                    debugLog(`Generation attempt ${attempt + 1}/${maxRetries} failed:`, error, 'error', 'LLMUtility');
                    attempt++;
                    if (attempt >= maxRetries) {
                        throw new Error(`Generation failed after ${maxRetries} attempts: ${error.message}`);
                    }
                }
            }
            throw new Error(`Generation failed after ${maxRetries} attempts`);
        });
    }
    static generateWithProfile(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, systemPrompt = 'You are an AI assistant.', context = null, profile = null, maxRetries = 3) {
            var _a, _b;
            if (!context) {
                context = ((_a = window.SillyTavern) === null || _a === void 0 ? void 0 : _a.getContext)
                    ? window.SillyTavern.getContext()
                    : window.getContext
                        ? window.getContext()
                        : null;
            }
            // If no profile specified, use the default generation method
            if (!profile) {
                return yield this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
            }
            // Use the new SillyTavern ConnectionManagerRequestService.sendRequest API
            if ((_b = context === null || context === void 0 ? void 0 : context.ConnectionManagerRequestService) === null || _b === void 0 ? void 0 : _b.sendRequest) {
                let attempt = 0;
                const maxTokens = 2048; // Default max tokens, can be made configurable
                while (attempt < maxRetries) {
                    try {
                        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
                        const result = yield context.ConnectionManagerRequestService.sendRequest(profile, fullPrompt, maxTokens, {}, // custom parameters (use defaults)
                        {} // override payload
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
                    }
                    catch (error) {
                        debugLog(`Profile generation attempt ${attempt + 1}/${maxRetries} with profile ${profile} failed:`, error, 'error', 'LLMUtility');
                        attempt++;
                        if (attempt >= maxRetries) {
                            throw new Error(`Profile generation failed after ${maxRetries} attempts: ${error.message}`);
                        }
                    }
                }
            }
            // Fallback to the old method if the new API is not available
            debugLog('[LLMUtility] ConnectionManagerRequestService.sendRequest not available, falling back to legacy method', null, 'warn');
            const generationFunc = (genContext) => __awaiter(this, void 0, void 0, function* () {
                if (genContext && genContext.generateRaw) {
                    return genContext.generateRaw(prompt, { systemPrompt });
                }
                else if (genContext && genContext.generateQuietPrompt) {
                    return genContext.generateQuietPrompt(prompt);
                }
                throw new Error('No generation method available in context');
            });
            try {
                if (profile && context) {
                    return yield ConnectionProfileHelper.withConnectionProfile(profile, generationFunc, context);
                }
                return yield this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
            }
            catch (error) {
                debugLog(`Profile generation with ${profile !== null && profile !== void 0 ? profile : 'null'} failed:`, error, 'error', 'LLMUtility');
                debugLog('Falling back to default generation after profile failures...', null, 'info', 'LLMUtility');
                return this.generateWithRetry(prompt, systemPrompt, context, maxRetries);
            }
        });
    }
}
