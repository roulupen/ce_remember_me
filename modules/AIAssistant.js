// AI Assistant Module - Smart Task Analysis with Claude
class AIAssistant {
    constructor() {
        this.util = window.Utility;
        this.cache = null;
        this.settings = null;
        console.log('[AIAssistant] Constructor initialized');
    }

    async init() {
        console.log('[AIAssistant] Initializing AI Assistant module...');
        try {
            await this.loadCache();
            await this.loadSettings();
            await this.cleanExpiredCache();
            console.log('[AIAssistant] Initialized successfully');
        } catch (error) {
            console.error('[AIAssistant] Initialization error:', error);
        }
    }

    // Main entry point for AI task analysis
    async analyzeTask(title, description = '') {
        console.log('[AIAssistant] === ANALYZE TASK ===');
        console.log('[AIAssistant] Title:', title);
        console.log('[AIAssistant] Description:', description);

        // 1. Validate inputs
        if (!title?.trim()) {
            throw new Error('Title required');
        }

        // 2. Check cache
        const hash = this.hashTask(title, description);
        console.log('[AIAssistant] Task hash:', hash);

        const cached = await this.getCachedResponse(hash);
        if (cached) {
            console.log('[AIAssistant] Using cached response');
            return cached;
        }

        // 3. Check rate limit
        const canCall = await this.checkRateLimit();
        if (!canCall) {
            const resetTime = await this.getResetTime();
            throw new Error(`Rate limit reached. Try again in ${resetTime} minutes.`);
        }

        // 4. Call API
        console.log('[AIAssistant] Calling Claude API...');
        const response = await this.callClaudeAPI(title, description);

        // 5. Cache response
        await this.cacheResponse(hash, response);

        // 6. Increment rate limit
        await this.incrementRateLimit();

        console.log('[AIAssistant] Analysis complete');
        return response;
    }

    // Call AI API (Anthropic, Azure OpenAI, or OpenAI) through background script
    async callClaudeAPI(title, description) {
        const prompt = this.buildPrompt(title, description);
        const settings = await this.loadSettings();
        if (!settings?.api_key) {
            throw new Error('API key not configured. Open AI Settings and add your key.');
        }

        const response = await this.util.sendMessageToBackground({
            action: 'callAIAPI',
            prompt: prompt,
            settings: {
                api_provider: settings.api_provider || 'anthropic',
                api_key: settings.api_key,
                azure_endpoint: settings.azure_endpoint,
                azure_deployment: settings.azure_deployment,
                azure_api_version: settings.azure_api_version
            }
        });

        if (!response || !response.success) {
            throw new Error(response?.error || 'API call failed');
        }
        return this.parseResponse(response.data);
    }

    // Build AI prompt
    buildPrompt(title, description) {
        return `Analyze this task and provide suggestions in JSON format.

Task Title: ${title}
Task Description: ${description || 'No description provided'}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "subtasks": [{"title": "string", "estimatedHours": number}],
  "suggestedPriority": "high|medium|low",
  "estimatedDays": number,
  "suggestedTemplate": "string or null",
  "reasoning": "brief explanation"
}

Requirements:
- Provide 3-7 actionable subtasks
- Estimate realistic hours for each subtask
- Suggest priority based on urgency and impact
- Estimate total days assuming 6 hours of work per day
- Match to common templates if applicable (Feature Development, Bug Fix, Research, etc.)
- Keep reasoning concise (1-2 sentences)`;
    }

    // Parse and validate API response
    parseResponse(data) {
        // Validate required fields
        if (!data.subtasks || !Array.isArray(data.subtasks)) {
            throw new Error('Invalid response: missing subtasks');
        }

        if (!data.suggestedPriority || !['low', 'medium', 'high'].includes(data.suggestedPriority)) {
            data.suggestedPriority = 'medium';
        }

        if (!data.estimatedDays || typeof data.estimatedDays !== 'number') {
            data.estimatedDays = 1;
        }

        // Ensure all subtasks have required fields
        data.subtasks = data.subtasks.map(sub => ({
            title: sub.title || 'Untitled subtask',
            estimatedHours: sub.estimatedHours || 1
        }));

        return {
            subtasks: data.subtasks,
            suggestedPriority: data.suggestedPriority,
            estimatedDays: data.estimatedDays,
            suggestedTemplate: data.suggestedTemplate || null,
            reasoning: data.reasoning || 'No reasoning provided'
        };
    }

    // Generate hash for caching
    hashTask(title, description) {
        const normalized = `${title.toLowerCase().trim()}|${description.toLowerCase().trim()}`;
        return this.simpleHash(normalized);
    }

    // Simple hash function
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // Get cached response
    async getCachedResponse(hash) {
        if (!this.cache) {
            await this.loadCache();
        }

        const cached = this.cache[hash];
        if (!cached) return null;

        // Check if expired
        if (cached.expiresAt < Date.now()) {
            delete this.cache[hash];
            await this.saveCache();
            return null;
        }

        return {
            subtasks: cached.subtasks,
            suggestedPriority: cached.suggestedPriority,
            estimatedDays: cached.estimatedDays,
            suggestedTemplate: cached.suggestedTemplate,
            reasoning: cached.reasoning
        };
    }

    // Cache response
    async cacheResponse(hash, response) {
        if (!this.cache) {
            await this.loadCache();
        }

        // Add to cache with 24-hour expiration
        this.cache[hash] = {
            ...response,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };

        // Enforce max cache size (50 entries)
        const entries = Object.entries(this.cache);
        if (entries.length > 50) {
            // Sort by timestamp and remove oldest
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = entries.slice(0, entries.length - 50);
            toRemove.forEach(([key]) => delete this.cache[key]);
        }

        await this.saveCache();
    }

    // Load cache from storage
    async loadCache() {
        const response = await this.util.sendMessageToBackground({
            action: 'getAICache'
        });

        this.cache = (response && response.data) || {};
        return this.cache;
    }

    // Save cache to storage
    async saveCache() {
        await this.util.sendMessageToBackground({
            action: 'saveAICache',
            cache: this.cache
        });
    }

    // Clean expired cache entries
    async cleanExpiredCache() {
        if (!this.cache) {
            await this.loadCache();
        }

        const now = Date.now();
        let cleaned = 0;

        for (const [hash, entry] of Object.entries(this.cache)) {
            if (entry.expiresAt < now) {
                delete this.cache[hash];
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[AIAssistant] Cleaned ${cleaned} expired cache entries`);
            await this.saveCache();
        }
    }

    // Check rate limit
    async checkRateLimit() {
        const response = await this.util.sendMessageToBackground({
            action: 'checkRateLimit'
        });

        return response && response.allowed;
    }

    // Increment rate limit counter
    async incrementRateLimit() {
        await this.util.sendMessageToBackground({
            action: 'incrementRateLimit'
        });
    }

    // Get reset time in minutes
    async getResetTime() {
        const response = await this.util.sendMessageToBackground({
            action: 'getResetTime'
        });

        return (response && response.minutes) || 60;
    }

    // Load settings
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

    // Check if API is configured
    async isConfigured() {
        const settings = await this.loadSettings();
        return !!(settings && settings.api_key);
    }
}

// Create global instance
window.AIAssistant = new AIAssistant();
