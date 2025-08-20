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
            // Initialize sticky notes module
            await this.stickyNotes.init();
            
            // Initialize task tracker module
            await this.taskTracker.init();
            
            // Initialize notification sound system
            await this.notificationSound.init();
            
            // Setup message listeners for sound system
            this.setupMessageListeners();
            
            // Load and render sticky notes (default tab)
            await this.stickyNotes.loadFloatingNotes();
            
            console.log('[ProductivityApp] Initialization complete');
        } catch (error) {
            console.error('[ProductivityApp] Initialization failed:', error);
        }
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