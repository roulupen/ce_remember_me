// AI Configuration Module - Settings Management
class AIConfig {
    constructor() {
        this.util = window.Utility;
        this.settings = null;
        console.log('[AIConfig] Constructor initialized');
    }

    async init() {
        console.log('[AIConfig] Initializing AI Config module...');
        try {
            await this.loadSettings();
            this.setupEventListeners();
            console.log('[AIConfig] Initialized successfully');
        } catch (error) {
            console.error('[AIConfig] Initialization error:', error);
        }
    }

    setupEventListeners() {
        // AI Settings button
        const settingsBtn = document.getElementById('ai-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Save settings
        const saveBtn = document.getElementById('save-ai-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Cancel settings
        const cancelBtn = document.getElementById('cancel-ai-settings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // Test API key
        const testBtn = document.getElementById('test-api-key');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testAPIConnection());
        }

        // Close modal
        const closeBtn = document.getElementById('close-ai-settings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // Provider change: show/hide Azure fields
        const providerSelect = document.getElementById('ai-provider');
        if (providerSelect) {
            providerSelect.addEventListener('change', () => this.toggleProviderFields(providerSelect.value));
        }

        console.log('[AIConfig] Event listeners set up');
    }

    // Open settings modal
    openSettingsModal() {
        console.log('[AIConfig] Opening settings modal');
        const modal = document.getElementById('ai-settings-modal');
        if (!modal) {
            console.error('[AIConfig] Settings modal not found');
            return;
        }

        // Load current settings
        this.populateSettings();

        // Update rate limit status
        this.updateRateLimitStatus();

        // Show modal
        modal.classList.add('active');

        // Focus API key input
        const apiKeyInput = document.getElementById('ai-api-key');
        if (apiKeyInput) {
            apiKeyInput.focus();
        }
    }

    // Close settings modal
    closeSettingsModal() {
        const modal = document.getElementById('ai-settings-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Populate settings form
    async populateSettings() {
        await this.loadSettings();

        const providerSelect = document.getElementById('ai-provider');
        if (providerSelect) {
            providerSelect.value = this.settings.api_provider || 'anthropic';
            this.toggleProviderFields(providerSelect.value);
        }

        const apiKeyInput = document.getElementById('ai-api-key');
        if (apiKeyInput && this.settings.api_key) {
            apiKeyInput.value = this.maskAPIKey(this.settings.api_key);
        }

        const azureEndpoint = document.getElementById('ai-azure-endpoint');
        if (azureEndpoint && this.settings.azure_endpoint) {
            azureEndpoint.value = this.settings.azure_endpoint;
        }
        const azureDeployment = document.getElementById('ai-azure-deployment');
        if (azureDeployment && this.settings.azure_deployment) {
            azureDeployment.value = this.settings.azure_deployment;
        }
    }

    toggleProviderFields(provider) {
        const azureGroup = document.getElementById('ai-azure-fields');
        if (azureGroup) {
            azureGroup.style.display = (provider === 'azure') ? 'block' : 'none';
        }
    }

    // Mask API key for display
    maskAPIKey(apiKey) {
        if (!apiKey || apiKey.length < 12) return apiKey;
        const start = apiKey.substring(0, 8);
        const end = apiKey.substring(apiKey.length - 4);
        return `${start}${'*'.repeat(16)}${end}`;
    }

    // Save settings
    async saveSettings() {
        const apiKeyInput = document.getElementById('ai-api-key');
        if (!apiKeyInput) return;

        const providerSelect = document.getElementById('ai-provider');
        const provider = (providerSelect && providerSelect.value) || 'anthropic';

        let apiKey = apiKeyInput.value.trim();

        // If key is masked, keep existing key from storage
        if (apiKey.includes('*') && this.settings && this.settings.api_key) {
            apiKey = this.settings.api_key;
        }

        if (!apiKey) {
            this.util.showError('Please enter an API key');
            apiKeyInput.focus();
            return;
        }

        if (!this.validateAPIKey(apiKey, provider)) {
            this.util.showError(this.getAPIKeyValidationMessage(provider));
            apiKeyInput.focus();
            return;
        }

        const azureEndpointEl = document.getElementById('ai-azure-endpoint');
        const azureDeploymentEl = document.getElementById('ai-azure-deployment');
        const azureEndpoint = azureEndpointEl ? azureEndpointEl.value.trim() : '';
        const azureDeployment = azureDeploymentEl ? azureDeploymentEl.value.trim() : '';

        if (provider === 'azure' && (!azureEndpoint || !azureDeployment)) {
            this.util.showError('Azure: please set Endpoint and Deployment name (or set them in ai-api.config.js).');
            return;
        }

        try {
            const newSettings = {
                api_provider: provider,
                api_key: apiKey,
                auto_suggest: this.settings ? this.settings.auto_suggest : false,
                azure_endpoint: provider === 'azure' ? azureEndpoint : (this.settings && this.settings.azure_endpoint) || '',
                azure_deployment: provider === 'azure' ? azureDeployment : (this.settings && this.settings.azure_deployment) || '',
                azure_api_version: (this.settings && this.settings.azure_api_version) || '2024-02-15-preview'
            };

            const response = await this.util.sendMessageToBackground({
                action: 'saveAISettings',
                settings: newSettings
            });

            if (response && response.success) {
                this.settings = newSettings;
                this.util.showSuccess('AI settings saved successfully');
                this.closeSettingsModal();
            } else {
                throw new Error(response?.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error('[AIConfig] Save error:', error);
            this.util.showError('Failed to save settings: ' + error.message);
        }
    }

    validateAPIKey(apiKey, provider) {
        if (apiKey.includes('*')) return true;
        if (provider === 'anthropic') return apiKey.startsWith('sk-ant-');
        if (provider === 'azure' || provider === 'openai') return apiKey.length >= 8;
        return true;
    }

    getAPIKeyValidationMessage(provider) {
        if (provider === 'anthropic') return 'Invalid API key format. Claude keys start with sk-ant-';
        if (provider === 'azure' || provider === 'openai') return 'Please enter a valid API key.';
        return 'Invalid API key.';
    }

    // Test API connection
    async testAPIConnection() {
        const apiKeyInput = document.getElementById('ai-api-key');
        if (!apiKeyInput) return;

        let apiKey = apiKeyInput.value.trim();
        if (apiKey.includes('*')) {
            await this.loadSettings();
            apiKey = this.settings.api_key;
        }
        if (!apiKey) {
            this.util.showError('Please enter an API key first');
            return;
        }

        const providerSelect = document.getElementById('ai-provider');
        const provider = (providerSelect && providerSelect.value) || 'anthropic';
        const azureEndpointEl = document.getElementById('ai-azure-endpoint');
        const azureDeploymentEl = document.getElementById('ai-azure-deployment');
        const settings = {
            api_provider: provider,
            api_key: apiKey,
            azure_endpoint: azureEndpointEl ? azureEndpointEl.value.trim() : (this.settings && this.settings.azure_endpoint) || '',
            azure_deployment: azureDeploymentEl ? azureDeploymentEl.value.trim() : (this.settings && this.settings.azure_deployment) || ''
        };

        const testBtn = document.getElementById('test-api-key');
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
        }

        try {
            const response = await this.util.sendMessageToBackground({
                action: 'callAIAPI',
                prompt: 'Respond with valid JSON only: {"message":"Hello"}',
                settings: settings
            });

            if (response && response.success) {
                this.util.showSuccess('API connection successful!');
            } else {
                throw new Error(response?.error || 'Connection test failed');
            }
        } catch (error) {
            console.error('[AIConfig] Test error:', error);
            this.util.showError('Connection test failed: ' + error.message);
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        }
    }

    // Update rate limit status display
    async updateRateLimitStatus() {
        const statusDiv = document.getElementById('rate-limit-status');
        if (!statusDiv) return;

        try {
            const response = await this.util.sendMessageToBackground({
                action: 'getRateLimitStatus'
            });

            if (response && response.success) {
                const { current, max, resetMinutes } = response.data;
                statusDiv.textContent = `${current}/${max} calls used (resets in ${resetMinutes} min)`;

                // Add visual indicator
                if (current >= max) {
                    statusDiv.style.color = '#e74c3c';
                } else if (current >= max * 0.8) {
                    statusDiv.style.color = '#f39c12';
                } else {
                    statusDiv.style.color = '#2ecc71';
                }
            }
        } catch (error) {
            console.error('[AIConfig] Rate limit status error:', error);
            statusDiv.textContent = 'Rate limit status unavailable';
        }
    }

    // Load settings from storage
    async loadSettings() {
        const response = await this.util.sendMessageToBackground({
            action: 'getAISettings'
        });

        this.settings = (response && response.data) || {
            api_provider: 'anthropic',
            api_key: null,
            auto_suggest: false,
            azure_endpoint: '',
            azure_deployment: '',
            azure_api_version: '2024-02-15-preview'
        };

        return this.settings;
    }

    // Get current settings
    getSettings() {
        return this.settings;
    }
}

// Create global instance
window.AIConfig = new AIConfig();
