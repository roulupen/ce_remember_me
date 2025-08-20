// Productivity App with Sticky Notes and Task Tracker
class ProductivityApp {
    constructor() {
        this.utility = new Utility();
        this.stickyNotes = new StickyNotes();
        this.taskTracker = new TaskTracker();
        
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
            
            // Load and render sticky notes (default tab)
            await this.stickyNotes.loadFloatingNotes();
            
            console.log('[ProductivityApp] Initialization complete');
        } catch (error) {
            console.error('[ProductivityApp] Initialization failed:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productivityApp = new ProductivityApp();
    console.log('Productivity App initialized');
});