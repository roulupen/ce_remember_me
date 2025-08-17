// Simplified Sticky Notes App
class StickyNotesApp {
    constructor() {
        this.utility = new Utility();
        this.stickyNotes = new StickyNotes();
        
        // Expose modules globally for onclick handlers
        window.stickyNotes = this.stickyNotes;
        
        this.init();
    }

    async init() {
        console.log('[StickyNotesApp] Initializing...');
        
        try {
            // Initialize sticky notes module
            await this.stickyNotes.init();
            
            // Load and render sticky notes
            await this.stickyNotes.loadFloatingNotes();
            
            console.log('[StickyNotesApp] Initialization complete');
        } catch (error) {
            console.error('[StickyNotesApp] Initialization failed:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stickyNotesApp = new StickyNotesApp();
    console.log('Sticky Notes App initialized');
});