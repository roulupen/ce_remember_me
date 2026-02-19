/**
 * AI API Configuration
 *
 * Put your AI provider details here. Supported providers:
 * - anthropic: Claude (Anthropic API)
 * - azure: GPT models hosted on Azure OpenAI (endpoint + API key + deployment name)
 * - openai: OpenAI API (e.g. GPT-4)
 *
 * For Azure: set endpoint (e.g. https://YOUR_RESOURCE.openai.azure.com),
 * deployment (your deployment name), and add your API key in the extension's
 * AI Settings UI (or below in azure.api_key - do not commit real keys).
 *
 * API keys can be stored here for development, but prefer using the in-extension
 * AI Settings so keys are not committed to version control.
 */
const AI_API_CONFIG = {
    // Default provider: 'anthropic' | 'azure' | 'openai'
    defaultProvider: 'azure',

    anthropic: {
        // Get your key from https://console.anthropic.com/
        // Leave empty to set via extension AI Settings UI
        api_key: '',
        model: 'claude-3-5-sonnet-20241022',
    },

    azure: {
        // Azure OpenAI resource endpoint (e.g. https://YOUR_RESOURCE.openai.azure.com)
        endpoint: 'https://cs23m-miflo4bo-westus.cognitiveservices.azure.com/',
        // Deployment name (as created in Azure portal)
        deployment: 'gpt-4.1',
        // API version for chat completions
        api_version: '2024-12-01-preview',
        // API key - leave empty to set via extension AI Settings UI
        api_key: '',
    },

    openai: {
        // Get your key from https://platform.openai.com/api-keys
        api_key: '',
        model: 'gpt-4o-mini',
    },
};

// Export for use in background script (importScripts)
if (typeof self !== 'undefined') {
    self.AI_API_CONFIG = AI_API_CONFIG;
}
