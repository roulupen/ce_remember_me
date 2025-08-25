// Productivity Hub - Complete workspace with Notes, Tasks, and Bookmarks
class ProductivityApp {
    constructor() {
        this.utility = new Utility();
        this.stickyNotes = new StickyNotes();
        this.taskTracker = new TaskTracker();
        this.bookmarks = new Bookmarks();
        this.notificationSound = new NotificationSound();
        
        // Theme management
        this.currentTheme = 'light'; // Default theme
        this.storage = chrome.storage.local;
        this.themeStorageKey = 'app_theme';
        
        // Tab persistence
        this.currentTab = 'notes-tab'; // Default tab
        this.tabStorageKey = 'app_current_tab';
        
        // Expose modules globally for onclick handlers
        window.stickyNotes = this.stickyNotes;
        window.taskTracker = this.taskTracker;
        window.bookmarks = this.bookmarks;
        
        this.init();
    }

    async init() {
        console.log('[ProductivityApp] Initializing...');
        
        try {
            // Load saved preferences first (before showing UI)
            await this.loadTheme();
            await this.loadTab();
            
            // Show loading indicator
            this.showLoadingIndicator();
            
            // Initialize all modules in parallel for faster loading
            const initPromises = [
                this.stickyNotes.init(),
                this.taskTracker.init(),
                this.bookmarks.init(),
                this.notificationSound.init()
            ];
            
            await Promise.all(initPromises);
            console.log('[ProductivityApp] All modules initialized');
            
            // Setup message listeners for sound system
            this.setupMessageListeners();
            
            // Setup tab switching functionality
            this.setupTabSwitching();
            
            // Setup theme toggle functionality
            this.setupThemeToggle();
            
            // Load and render data for both tabs to ensure consistency
            await this.loadAllData();
            
            // Apply saved tab after all modules are initialized
            await this.applySavedTab();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('[ProductivityApp] === INITIALIZATION COMPLETE ===');
            console.log('[ProductivityApp] Active theme:', this.currentTheme);
            console.log('[ProductivityApp] Active tab:', this.currentTab);
        } catch (error) {
            console.error('[ProductivityApp] Initialization failed:', error);
            this.hideLoadingIndicator();
            this.showError('Failed to load productivity workspace. Please refresh the page.');
        }
    }

    async loadAllData() {
        console.log('[ProductivityApp] Loading all data...');
        
        try {
            // Load notes, tasks and bookmarks data in parallel
            const loadPromises = [
                this.loadNotesData(),
                this.loadTasksData(),
                this.loadBookmarksData()
            ];
            
            await Promise.all(loadPromises);
            
            // Render the default tab (Notes)
            await this.renderDefaultTab();
            
            console.log('[ProductivityApp] All data loaded and rendered');
        } catch (error) {
            console.error('[ProductivityApp] Error loading data:', error);
            throw error;
        }
    }

    async loadNotesData() {
        console.log('[ProductivityApp] Loading notes data...');
        try {
            // Load floating notes for the default tab
            await this.stickyNotes.loadFloatingNotes();
            console.log('[ProductivityApp] Notes loaded successfully');
        } catch (error) {
            console.error('[ProductivityApp] Error loading notes:', error);
            throw error;
        }
    }

    async loadTasksData() {
        console.log('[ProductivityApp] Loading tasks data...');
        try {
            // Ensure tasks are loaded and ready
            await this.taskTracker.loadTasksData();
            console.log('[ProductivityApp] Tasks loaded successfully');
        } catch (error) {
            console.error('[ProductivityApp] Error loading tasks:', error);
            throw error;
        }
    }

    async loadBookmarksData() {
        console.log('[ProductivityApp] Loading bookmarks data...');
        try {
            // Ensure bookmarks are loaded and ready
            await this.bookmarks.loadBookmarks();
            console.log('[ProductivityApp] Bookmarks loaded successfully');
        } catch (error) {
            console.error('[ProductivityApp] Error loading bookmarks:', error);
            throw error;
        }
    }

    async renderDefaultTab() {
        console.log('[ProductivityApp] Rendering default tab...');
        
        // Ensure Notes tab is active and rendered
        const notesTab = document.getElementById('notes-tab');
        const tasksTab = document.getElementById('tasks-tab');
        
        if (notesTab && tasksTab) {
            // Make sure Notes tab is active
            notesTab.classList.add('active');
            tasksTab.classList.remove('active');
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('[data-tab="notes-tab"]')?.classList.add('active');
            
            // Force render notes if they exist
            if (this.stickyNotes.stickyNotes && this.stickyNotes.stickyNotes.length > 0) {
                console.log('[ProductivityApp] Rendering existing notes');
                this.stickyNotes.renderFloatingNotes(true); // Force render during initialization
            }
        }
    }

    showLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading your workspace...</div>
        `;
        document.body.appendChild(indicator);
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>⚠️ Loading Error</h3>
                <p>${message}</p>
                <button class="retry-btn" id="error-retry-btn">Retry</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        
        // Add event listener for retry button
        const retryBtn = document.getElementById('error-retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => location.reload());
        }
    }

    setupMessageListeners() {
        // Listen for messages from background script TO frontend
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Only handle messages that are meant for the frontend (have a 'type' property)
            // Messages with 'action' property are meant for the background script
            if (message.action) {
                console.log('📨 Ignoring message meant for background script:', message.action);
                return; // Don't handle or respond - let background script handle it
            }
            
            if (!message.type) {
                console.log('📨 Ignoring message without type or action:', message);
                return; // Don't handle unknown message format
            }
            
            console.log('📨 Frontend received message:', message);
            
            let handled = false;
            
            switch (message.type) {
                case 'startNotificationSound':
                    this.handleStartNotificationSound(message);
                    handled = true;
                    break;
                case 'stopNotificationSound':
                    this.handleStopNotificationSound(message);
                    handled = true;
                    break;
                case 'taskUpdated':
                    this.handleTaskUpdated(message.task);
                    handled = true;
                    break;
                case 'taskRingingStarted':
                    this.handleTaskRingingStarted(message);
                    handled = true;
                    break;
                case 'taskRingingStopped':
                    this.handleTaskRingingStopped(message);
                    handled = true;
                    break;
                default:
                    console.log('📨 Unknown message type for frontend:', message.type);
            }
            
            // Only send response if we actually handled the message
            if (handled) {
                sendResponse({ received: true });
            }
        });
    }

    async handleStartNotificationSound(message) {
        console.log('🔊 Starting notification sound:', message.notificationId);
        await this.notificationSound.startNotificationSound();
    }

    handleStopNotificationSound(message) {
        console.log('🔊 Stopping notification sound:', message.notificationId);
        this.notificationSound.stopNotificationSound();
    }

    handleTaskUpdated(task) {
        console.log('📋 Task updated:', task.title);
        // Refresh task display
        if (this.taskTracker.isTasksTabActive()) {
            this.taskTracker.loadTasksData();
        }
    }

    handleTaskRingingStarted(message) {
        console.log('🔔 Task started ringing:', message.taskId);
        this.taskTracker.handleTaskRingingStarted(message);
    }

    handleTaskRingingStopped(message) {
        console.log('🔕 Task stopped ringing:', message.taskId);
        this.taskTracker.handleTaskRingingStopped(message);
    }

    setupTabSwitching() {
        console.log('[ProductivityApp] Setting up tab switching...');
        
        // Tab switching functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    async switchTab(tabId) {
        console.log('[ProductivityApp] Switching to tab:', tabId);
        
        try {
            // Save current tab selection for persistence
            this.currentTab = tabId;
            await this.saveTab();
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabId)?.classList.add('active');

            // Render content for the active tab
            switch (tabId) {
                case 'notes-tab':
                    console.log('[ProductivityApp] Rendering Notes tab');
                    if (this.stickyNotes.stickyNotes && this.stickyNotes.stickyNotes.length > 0) {
                        this.stickyNotes.renderFloatingNotes(true);
                    }
                    break;
                    
                case 'tasks-tab':
                    console.log('[ProductivityApp] Rendering Tasks tab');
                    await this.taskTracker.renderTasks();
                    break;
                    
                case 'bookmarks-tab':
                    console.log('[ProductivityApp] Rendering Bookmarks tab');
                    await this.bookmarks.renderBookmarks();
                    // Additional refresh to catch any tab changes that happened while on other tabs
                    setTimeout(async () => {
                        try {
                            console.log('[ProductivityApp] Refreshing sidebar with latest tab data...');
                            await this.bookmarks.refreshSidebarAfterTabChange();
                        } catch (error) {
                            console.error('[ProductivityApp] Error refreshing sidebar on tab switch:', error);
                        }
                    }, 200); // Small delay to ensure renderBookmarks completes first
                    break;
            }
            
            console.log('[ProductivityApp] Tab switched and saved:', tabId);
        } catch (error) {
            console.error('[ProductivityApp] Error switching tabs:', error);
        }
    }

    // Tab Persistence Methods
    async loadTab() {
        try {
            console.log('[ProductivityApp] Loading saved tab...');
            const data = await this.storage.get(this.tabStorageKey);
            
            if (data[this.tabStorageKey]) {
                this.currentTab = data[this.tabStorageKey];
                console.log('[ProductivityApp] Loaded saved tab:', this.currentTab);
                
                // Validate that the saved tab exists
                const validTabs = ['notes-tab', 'tasks-tab', 'bookmarks-tab'];
                if (!validTabs.includes(this.currentTab)) {
                    console.warn('[ProductivityApp] Invalid saved tab, using default:', this.currentTab);
                    this.currentTab = 'notes-tab';
                }
            } else {
                this.currentTab = 'notes-tab'; // Default to notes tab
                console.log('[ProductivityApp] No saved tab, using default: notes-tab');
            }
            
        } catch (error) {
            console.error('[ProductivityApp] Error loading tab:', error);
            this.currentTab = 'notes-tab';
        }
    }

    async saveTab() {
        try {
            await this.storage.set({ [this.tabStorageKey]: this.currentTab });
            console.log('[ProductivityApp] Tab saved:', this.currentTab);
        } catch (error) {
            console.error('[ProductivityApp] Error saving tab:', error);
        }
    }

    async applySavedTab() {
        console.log('[ProductivityApp] === APPLYING SAVED TAB ===');
        console.log('[ProductivityApp] Saved tab to apply:', this.currentTab);
        
        try {
            // Always switch to the saved tab to ensure proper initialization
            console.log('[ProductivityApp] Switching to saved tab:', this.currentTab);
            
            // Remove any existing active classes (in case HTML had hardcoded ones)
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Apply the saved tab
            await this.switchTab(this.currentTab);
            
            console.log('[ProductivityApp] Saved tab applied successfully');
        } catch (error) {
            console.error('[ProductivityApp] Error applying saved tab:', error);
            // Fallback to notes tab
            console.log('[ProductivityApp] Falling back to default notes tab');
            await this.switchTab('notes-tab');
        }
    }

    // Theme Management Methods
    async loadTheme() {
        try {
            console.log('[ProductivityApp] Loading saved theme...');
            const data = await this.storage.get(this.themeStorageKey);
            
            if (data[this.themeStorageKey]) {
                this.currentTheme = data[this.themeStorageKey];
                console.log('[ProductivityApp] Loaded saved theme:', this.currentTheme);
            } else {
                this.currentTheme = 'light'; // Default to light theme
                console.log('[ProductivityApp] No saved theme, using default: light');
            }
            
            // Apply theme immediately
            this.applyTheme(this.currentTheme);
            
        } catch (error) {
            console.error('[ProductivityApp] Error loading theme:', error);
            this.currentTheme = 'light';
            this.applyTheme(this.currentTheme);
        }
    }

    async saveTheme() {
        try {
            await this.storage.set({ [this.themeStorageKey]: this.currentTheme });
            console.log('[ProductivityApp] Theme saved:', this.currentTheme);
        } catch (error) {
            console.error('[ProductivityApp] Error saving theme:', error);
        }
    }

    applyTheme(theme) {
        console.log('[ProductivityApp] Applying theme:', theme);
        
        // Remove existing theme classes
        document.body.classList.remove('light-theme', 'dark-theme');
        
        // Add new theme class
        document.body.classList.add(`${theme}-theme`);
        
        // Update theme toggle button
        this.updateThemeToggleButton();
        
        console.log('[ProductivityApp] Theme applied successfully:', theme);
    }

    toggleTheme() {
        console.log('[ProductivityApp] === TOGGLE THEME START ===');
        console.log('[ProductivityApp] Current theme:', this.currentTheme);
        
        // Toggle between light and dark
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        
        console.log('[ProductivityApp] New theme:', this.currentTheme);
        
        // Apply new theme
        this.applyTheme(this.currentTheme);
        
        // Save theme preference
        this.saveTheme();
        
        // Show feedback message
        this.showThemeChangeMessage();
        
        console.log('[ProductivityApp] === TOGGLE THEME COMPLETE ===');
    }

    updateThemeToggleButton() {
        const toggleBtn = document.getElementById('theme-toggle-btn');
        const lightIcon = toggleBtn?.querySelector('.light-icon');
        const darkIcon = toggleBtn?.querySelector('.dark-icon');
        
        if (toggleBtn && lightIcon && darkIcon) {
            if (this.currentTheme === 'dark') {
                lightIcon.classList.add('hidden');
                darkIcon.classList.remove('hidden');
                toggleBtn.title = 'Switch to Light Theme';
            } else {
                lightIcon.classList.remove('hidden');
                darkIcon.classList.add('hidden');
                toggleBtn.title = 'Switch to Dark Theme';
            }
        }
    }

    showThemeChangeMessage() {
        // Create temporary message
        const message = document.createElement('div');
        message.className = 'theme-change-message';
        message.innerHTML = `
            <div class="theme-message-content">
                <div class="theme-message-icon">
                    ${this.currentTheme === 'dark' ? '🌙' : '☀️'}
                </div>
                <div class="theme-message-text">
                    Switched to ${this.currentTheme} theme
                </div>
            </div>
        `;
        
        // Style the message
        message.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            background: ${this.currentTheme === 'dark' 
                ? 'rgba(93, 173, 226, 0.9)' 
                : 'rgba(52, 152, 219, 0.9)'};
            color: white;
            font-size: 14px;
            font-weight: 500;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Style the content
        const contentEl = message.querySelector('.theme-message-content');
        contentEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const iconEl = message.querySelector('.theme-message-icon');
        iconEl.style.cssText = `
            font-size: 16px;
            flex-shrink: 0;
        `;
        
        // Add to DOM
        document.body.appendChild(message);
        
        // Auto-remove after delay
        setTimeout(() => {
            if (message.parentNode) {
                message.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 300);
            }
        }, 2000);
    }

    setupThemeToggle() {
        console.log('[ProductivityApp] Setting up theme toggle...');
        
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', (e) => {
                console.log('[ProductivityApp] Theme toggle clicked');
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
            
            console.log('[ProductivityApp] Theme toggle listener attached');
        } else {
            console.error('[ProductivityApp] Theme toggle button not found!');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productivityApp = new ProductivityApp();
    
    // Expose debug functions globally
    window.debugTheme = () => {
        console.log('[Theme Debug] Current theme:', window.productivityApp.currentTheme);
        console.log('[Theme Debug] Body classes:', document.body.className);
        console.log('[Theme Debug] Theme toggle button found:', !!document.getElementById('theme-toggle-btn'));
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            console.log('[Theme Debug] Button title:', toggleBtn.title);
            console.log('[Theme Debug] Light icon hidden:', toggleBtn.querySelector('.light-icon')?.classList.contains('hidden'));
            console.log('[Theme Debug] Dark icon hidden:', toggleBtn.querySelector('.dark-icon')?.classList.contains('hidden'));
        }
    };
    
    window.debugTab = () => {
        console.log('[Tab Debug] Current tab:', window.productivityApp.currentTab);
        console.log('[Tab Debug] Active tab button:', document.querySelector('.tab-btn.active')?.dataset.tab);
        console.log('[Tab Debug] Active tab content:', document.querySelector('.tab-content.active')?.id);
        console.log('[Tab Debug] Available tabs:', Array.from(document.querySelectorAll('.tab-btn')).map(btn => btn.dataset.tab));
        console.log('[Tab Debug] Tab event listeners setup:', window.bookmarks?.tabEventListenersSetup);
        console.log('[Tab Debug] Last tab update time:', window.bookmarks?.lastTabUpdateTime);
    };
    
    window.debugApp = () => {
        window.debugTheme();
        window.debugTab();
        console.log('[App Debug] All modules initialized:', {
            stickyNotes: !!window.stickyNotes,
            taskTracker: !!window.taskTracker,
            bookmarks: !!window.bookmarks
        });
    };
    
    // Expose toggle functions globally for testing
    window.toggleTheme = () => window.productivityApp.toggleTheme();
    window.switchToTab = (tabId) => window.productivityApp.switchTab(tabId);
    
    // Expose bookmark functions for testing
    window.refreshSidebar = () => {
        if (window.bookmarks) {
            window.bookmarks.refreshSidebarAfterTabChange();
        }
    };
    
    // Expose TaskTracker debug functions for testing
    window.debugTaskTracker = () => {
        if (window.taskTracker) {
            return window.taskTracker.debugTaskTracker();
        } else {
            console.error('TaskTracker not available');
        }
    };
    
    window.testAddTaskButton = () => {
        if (window.taskTracker) {
            window.taskTracker.testAddTaskButton();
        } else {
            console.error('TaskTracker not available');
        }
    };
    
    window.testTaskModal = () => {
        if (window.taskTracker) {
            window.taskTracker.testTaskModal();
        } else {
            console.error('TaskTracker not available');
        }
    };
    
    window.testBackgroundCommunication = async () => {
        if (window.taskTracker) {
            return await window.taskTracker.testBackgroundCommunication();
        } else {
            console.error('TaskTracker not available');
            return false;
        }
    };
    
    window.testMessageRouting = async () => {
        if (window.taskTracker) {
            return await window.taskTracker.testMessageRouting();
        } else {
            console.error('TaskTracker not available');
            return false;
        }
    };
    
    // Test cross-module compatibility
    window.testAllModules = async () => {
        console.log('🧪 Testing all modules compatibility...');
        
        const results = {
            taskTracker: false,
            stickyNotes: false,
            bookmarks: false,
            tabSwitching: false,
            messageRouting: false
        };
        
        try {
            // Test TaskTracker
            if (window.taskTracker) {
                console.log('📋 Testing TaskTracker...');
                results.taskTracker = await window.taskTracker.testBackgroundCommunication();
            }
            
            // Test StickyNotes background communication
            if (window.stickyNotes && window.stickyNotes.util) {
                console.log('📝 Testing StickyNotes...');
                const response = await window.stickyNotes.util.sendMessageToBackground({ action: 'getNotes' });
                results.stickyNotes = response && response.success === true;
                console.log('📝 StickyNotes test result:', results.stickyNotes);
            }
            
            // Test Bookmarks
            if (window.bookmarks) {
                console.log('🔖 Testing Bookmarks...');
                results.bookmarks = Array.isArray(window.bookmarks.bookmarkGroups);
                console.log('🔖 Bookmarks test result:', results.bookmarks);
            }
            
            // Test Tab Switching
            console.log('📑 Testing tab switching...');
            const currentTab = document.querySelector('.tab-content.active')?.id;
            results.tabSwitching = !!currentTab;
            console.log('📑 Current active tab:', currentTab);
            
            // Test Message Routing
            if (window.taskTracker) {
                console.log('📨 Testing message routing...');
                results.messageRouting = await window.taskTracker.testMessageRouting();
            }
            
            console.log('🧪 All modules test results:', results);
            
            const allPassed = Object.values(results).every(result => result === true);
            if (allPassed) {
                console.log('✅ All modules are working correctly!');
            } else {
                console.warn('⚠️ Some modules may have issues:', 
                    Object.entries(results).filter(([_, passed]) => !passed).map(([module, _]) => module));
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Error testing modules:', error);
            return results;
        }
    };
    
    console.log('Productivity Hub initialized with theme system and tab persistence');
});