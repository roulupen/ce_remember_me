// Utility.js - Shared utility functions for all modules
class Utility {
    constructor() {
        this.notificationQueue = [];
        this.isShowingNotification = false;
    }

    // ===== STORAGE UTILITIES =====
    
    /**
     * Save data to Chrome local storage
     * @param {string} key - Storage key
     * @param {any} data - Data to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveToStorage(key, data) {
        try {
            console.log(`[Utility] Saving to storage: ${key}`, data);
            await chrome.storage.local.set({ [key]: data });
            console.log(`[Utility] Successfully saved ${key} to storage`);
            return true;
        } catch (error) {
            console.error(`[Utility] Error saving ${key} to storage:`, error);
            return false;
        }
    }

    /**
     * Load data from Chrome local storage
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if key doesn't exist
     * @returns {Promise<any>} - Retrieved data or default value
     */
    async loadFromStorage(key, defaultValue = null) {
        try {
            console.log(`[Utility] Loading from storage: ${key}`);
            const result = await chrome.storage.local.get([key]);
            const data = result[key] !== undefined ? result[key] : defaultValue;
            console.log(`[Utility] Loaded ${key} from storage:`, data);
            return data;
        } catch (error) {
            console.error(`[Utility] Error loading ${key} from storage:`, error);
            return defaultValue;
        }
    }

    /**
     * Remove data from Chrome local storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} - Success status
     */
    async removeFromStorage(key) {
        try {
            console.log(`[Utility] Removing from storage: ${key}`);
            await chrome.storage.local.remove([key]);
            console.log(`[Utility] Successfully removed ${key} from storage`);
            return true;
        } catch (error) {
            console.error(`[Utility] Error removing ${key} from storage:`, error);
            return false;
        }
    }

    /**
     * Clear all data from Chrome local storage
     * @returns {Promise<boolean>} - Success status
     */
    async clearAllStorage() {
        try {
            console.log('[Utility] Clearing all storage');
            await chrome.storage.local.clear();
            console.log('[Utility] Successfully cleared all storage');
            return true;
        } catch (error) {
            console.error('[Utility] Error clearing storage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     * @returns {Promise<object>} - Storage usage stats
     */
    async getStorageInfo() {
        try {
            const usage = await chrome.storage.local.getBytesInUse();
            const all = await chrome.storage.local.get();
            return {
                bytesInUse: usage,
                itemCount: Object.keys(all).length,
                items: Object.keys(all)
            };
        } catch (error) {
            console.error('[Utility] Error getting storage info:', error);
            return { bytesInUse: 0, itemCount: 0, items: [] };
        }
    }

    // ===== CHROME API UTILITIES =====

    /**
     * Send message to background script
     * @param {object} message - Message to send
     * @returns {Promise<any>} - Response from background script
     */
    async sendMessageToBackground(message) {
        try {
            console.log('[Utility] Sending message to background:', message);
            const response = await chrome.runtime.sendMessage(message);
            console.log('[Utility] Received response from background:', response);
            return response;
        } catch (error) {
            console.error('[Utility] Error sending message to background:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current active tab
     * @returns {Promise<object|null>} - Current tab or null
     */
    async getCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            return tabs[0] || null;
        } catch (error) {
            console.error('[Utility] Error getting current tab:', error);
            return null;
        }
    }

    /**
     * Get all tabs across all windows
     * @returns {Promise<object>} - Object with current and other window tabs
     */
    async getAllTabs() {
        try {
            const currentWindow = await chrome.windows.getCurrent();
            const allTabs = await chrome.tabs.query({});
            
            const current = allTabs.filter(tab => tab.windowId === currentWindow.id);
            const others = allTabs.filter(tab => tab.windowId !== currentWindow.id);
            
            return { current, others };
        } catch (error) {
            console.error('[Utility] Error getting all tabs:', error);
            return { current: [], others: [] };
        }
    }

    // ===== NOTIFICATION UTILITIES =====

    /**
     * Show notification toast
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info, success, error, warning)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        console.log(`[Utility] Notification (${type}):`, message);
        
        // Add to queue if another notification is showing
        if (this.isShowingNotification) {
            this.notificationQueue.push({ message, type, duration });
            return;
        }

        this.isShowingNotification = true;
        this._displayNotification(message, type, duration);
    }

    /**
     * Display notification (internal method)
     * @private
     */
    _displayNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `utility-notification toast ${type}`;
        notification.textContent = message;
        
        const colors = {
            info: '#333',
            success: '#388e3c',
            error: '#d32f2f',
            warning: '#f57c00'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                this.isShowingNotification = false;
                
                // Show next notification in queue
                if (this.notificationQueue.length > 0) {
                    const next = this.notificationQueue.shift();
                    this._displayNotification(next.message, next.type, next.duration);
                }
            }, 300);
        }, duration);
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     */
    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    // ===== DOM UTILITIES =====

    /**
     * Escape HTML to prevent XSS
     * @param {string} unsafe - Unsafe HTML string
     * @returns {string} - Escaped HTML string
     */
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }

    /**
     * Shorten URL for display
     * @param {string} url - Full URL
     * @param {number} maxLength - Maximum length
     * @returns {string} - Shortened URL
     */
    shortenUrl(url, maxLength = 50) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            const shortened = urlObj.hostname + urlObj.pathname;
            return shortened.length > maxLength ? 
                shortened.substring(0, maxLength) + '...' : 
                shortened;
        } catch {
            return url.length > maxLength ? 
                url.substring(0, maxLength) + '...' : 
                url;
        }
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncateText(text, maxLength = 100) {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }

    /**
     * Check if element is visible in viewport
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} - True if visible
     */
    isElementVisible(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Get element by ID with error handling
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} - Element or null
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`[Utility] Element with ID '${id}' not found`);
        }
        return element;
    }

    // ===== TIME UTILITIES =====

    /**
     * Format timestamp to relative time
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} - Formatted relative time
     */
    formatRelativeTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));
        
        if (diffInMinutes < 1) {
            return 'Just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffInMinutes / 1440);
            return `${days}d ago`;
        }
    }

    /**
     * Format timestamp to readable date
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} - Formatted date
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * Format timestamp to readable date and time
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} - Formatted date and time
     */
    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    // ===== VALIDATION UTILITIES =====

    /**
     * Validate URL
     * @param {string} url - URL to validate
     * @returns {boolean} - True if valid URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate email
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Check if string is empty or only whitespace
     * @param {string} str - String to check
     * @returns {boolean} - True if empty
     */
    isEmpty(str) {
        return !str || !str.trim();
    }

    // ===== ARRAY UTILITIES =====

    /**
     * Remove duplicates from array based on property
     * @param {Array} array - Array to deduplicate
     * @param {string} property - Property to compare (optional)
     * @returns {Array} - Deduplicated array
     */
    removeDuplicates(array, property = null) {
        if (!Array.isArray(array)) return [];
        
        if (property) {
            const seen = new Set();
            return array.filter(item => {
                const value = item[property];
                if (seen.has(value)) {
                    return false;
                }
                seen.add(value);
                return true;
            });
        } else {
            return [...new Set(array)];
        }
    }

    /**
     * Sort array by property
     * @param {Array} array - Array to sort
     * @param {string} property - Property to sort by
     * @param {boolean} ascending - Sort direction
     * @returns {Array} - Sorted array
     */
    sortBy(array, property, ascending = true) {
        if (!Array.isArray(array)) return [];
        
        return [...array].sort((a, b) => {
            const aVal = a[property];
            const bVal = b[property];
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    }

    // ===== DEBOUNCE/THROTTLE UTILITIES =====

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} - Throttled function
     */
    throttle(func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    // ===== RANDOM UTILITIES =====

    /**
     * Generate unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Generate random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} - Random number
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get random item from array
     * @param {Array} array - Array to pick from
     * @returns {any} - Random item
     */
    randomFromArray(array) {
        if (!Array.isArray(array) || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    // ===== CLIPBOARD UTILITIES =====

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} - Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('[Utility] Text copied to clipboard');
            return true;
        } catch (error) {
            console.error('[Utility] Error copying to clipboard:', error);
            return false;
        }
    }

    /**
     * Read text from clipboard
     * @returns {Promise<string|null>} - Clipboard text or null
     */
    async readFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            console.log('[Utility] Text read from clipboard');
            return text;
        } catch (error) {
            console.error('[Utility] Error reading from clipboard:', error);
            return null;
        }
    }

    // ===== ERROR HANDLING UTILITIES =====

    /**
     * Safe function execution with error handling
     * @param {Function} func - Function to execute
     * @param {any} defaultValue - Default value on error
     * @returns {any} - Function result or default value
     */
    safeExecute(func, defaultValue = null) {
        try {
            return func();
        } catch (error) {
            console.error('[Utility] Safe execute error:', error);
            return defaultValue;
        }
    }

    /**
     * Safe async function execution with error handling
     * @param {Function} func - Async function to execute
     * @param {any} defaultValue - Default value on error
     * @returns {Promise<any>} - Function result or default value
     */
    async safeExecuteAsync(func, defaultValue = null) {
        try {
            return await func();
        } catch (error) {
            console.error('[Utility] Safe execute async error:', error);
            return defaultValue;
        }
    }
}

// Add CSS for notifications
const utilityStyles = document.createElement('style');
utilityStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .utility-notification {
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    
    .utility-notification:hover {
        transform: translateX(-5px);
    }
`;
document.head.appendChild(utilityStyles);

// Create global utility instance
window.Utility = new Utility();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utility;
}
