// Productivity App with Sticky Notes and Task Tracker
class ProductivityApp {
    constructor() {
        this.utility = new Utility();
        this.stickyNotes = new StickyNotes();
        this.taskTracker = new TaskTracker();
        this.notificationSound = new NotificationSound();
        
        // Expose modules globally for onclick handlers
        window.stickyNotes = this.stickyNotes;
        window.taskTracker = this.taskTracker;
        
        this.init();
    }

    async init() {
        console.log('[ProductivityApp] Initializing...');
        
        try {
            // Show loading indicator
            this.showLoadingIndicator();
            
            // Initialize all modules in parallel for faster loading
            const initPromises = [
                this.stickyNotes.init(),
                this.taskTracker.init(),
                this.notificationSound.init()
            ];
            
            await Promise.all(initPromises);
            console.log('[ProductivityApp] All modules initialized');
            
            // Setup message listeners for sound system
            this.setupMessageListeners();
            
            // Load and render data for both tabs to ensure consistency
            await this.loadAllData();
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('[ProductivityApp] Initialization complete');
        } catch (error) {
            console.error('[ProductivityApp] Initialization failed:', error);
            this.hideLoadingIndicator();
            this.showError('Failed to load productivity workspace. Please refresh the page.');
        }
    }

    async loadAllData() {
        console.log('[ProductivityApp] Loading all data...');
        
        try {
            // Load notes and tasks data in parallel
            const loadPromises = [
                this.loadNotesData(),
                this.loadTasksData()
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
                <button onclick="location.reload()" class="retry-btn">Retry</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    setupMessageListeners() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Received message:', message);
            
            switch (message.type) {
                case 'startNotificationSound':
                    this.handleStartNotificationSound(message);
                    break;
                case 'stopNotificationSound':
                    this.handleStopNotificationSound(message);
                    break;
                case 'taskUpdated':
                    this.handleTaskUpdated(message.task);
                    break;
                case 'taskRingingStarted':
                    this.handleTaskRingingStarted(message);
                    break;
                case 'taskRingingStopped':
                    this.handleTaskRingingStopped(message);
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
            
            sendResponse({ received: true });
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productivityApp = new ProductivityApp();
    console.log('Productivity App initialized');
});