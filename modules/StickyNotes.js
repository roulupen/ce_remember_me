// StickyNotes.js - Sticky Notes functionality module
class StickyNotes {
    constructor() {
        this.stickyNotes = [];
        this.currentEditingNote = null;
        this.draggedNote = null;
        this.util = window.Utility; // Use global utility instance
        this.isUpdatingStorage = false; // Flag to prevent infinite loops
        this.lastStorageUpdate = 0; // Timestamp of last storage update
    }
    
    // Utility method to escape HTML content
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize sticky notes functionality
    async init() {
        console.log('[StickyNotes] Initializing...');
        try {
            this.setupEventListeners();
            await this.loadNotesData();
            await this.setupStorageListener();
            console.log('[StickyNotes] Initialization complete');
        } catch (error) {
            console.error('[StickyNotes] Initialization failed:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Notes tab functionality
        document.getElementById('add-note-btn')?.addEventListener('click', () => {
            this.createDirectNote();
        });

        document.getElementById('clear-notes-btn')?.addEventListener('click', () => {
            this.clearAllNotes();
        });

        // Note modal listeners
        document.getElementById('save-note')?.addEventListener('click', () => {
            this.saveNote();
        });

        document.getElementById('cancel-note')?.addEventListener('click', () => {
            this.closeNoteModal();
        });

        // Double-click to add sticky note in notes container
        document.addEventListener('dblclick', (e) => {
            // Only create notes on double-click in the notes container or when notes tab is active
            if (this.isNotesTabActive() && (
                e.target.id === 'notes-floating-container' || 
                e.target.classList.contains('notes-floating-container') ||
                e.target.closest('#notes-tab')
            )) {
                const container = document.getElementById('notes-floating-container');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.createQuickNoteInContainer(x, y);
                }
            }
        });

        // Handle note card actions with event delegation
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.note-card-action');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const action = actionBtn.dataset.action;
                const noteId = actionBtn.dataset.noteId;
                
                if (action === 'edit') {
                    this.editNoteInTab(noteId);
                } else if (action === 'delete') {
                    this.deleteNoteFromTab(noteId);
                }
            }
        });
    }

    setupStorageListener() {
        // Listen for storage changes from other tabs/windows
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.notes) {
                console.log('Notes storage changed in another tab/window');
                this.handleNotesStorageChange(changes.notes);
            }
        });
    }

    async handleNotesStorageChange(notesChange) {
        try {
            // Prevent handling our own storage changes
            if (this.isUpdatingStorage) {
                console.log('Ignoring storage change - caused by current tab');
                return;
            }

            // Throttle storage change handling to prevent rapid fire events
            const now = Date.now();
            if (now - this.lastStorageUpdate < 100) {
                console.log('Throttling storage change - too frequent');
                return;
            }
            this.lastStorageUpdate = now;

            // Get the new value from storage change
            const newNotes = notesChange.newValue || [];
            const oldNotes = notesChange.oldValue || [];
            
            console.log('Storage change detected from another tab:', {
                oldCount: oldNotes.length,
                newCount: newNotes.length
            });

            // Only update if there are actual differences
            const currentNotesJson = JSON.stringify(this.stickyNotes);
            const newNotesJson = JSON.stringify(newNotes);
            
            if (currentNotesJson === newNotesJson) {
                console.log('No actual changes detected, skipping update');
                return;
            }

            // Update local notes array
            this.stickyNotes = newNotes;

            // Re-render views if we're on the notes tab
            if (this.isNotesTabActive()) {
                // Only render floating notes for the Notes tab
                setTimeout(() => {
                    this.renderFloatingNotes();
                }, 100); // Increased delay to prevent rapid re-renders
            }

            // Show notification for significant changes
            if (newNotes.length < oldNotes.length) {
                const deletedCount = oldNotes.length - newNotes.length;
                this.showNotification(`${deletedCount} note(s) deleted in another window`);
            } else if (newNotes.length > oldNotes.length) {
                const addedCount = newNotes.length - oldNotes.length;
                this.showNotification(`${addedCount} new note(s) added in another window`);
            }
        } catch (error) {
            console.error('Error handling notes storage change:', error);
        }
    }

    async syncNotesFromStorage() {
        try {
            console.log('Syncing notes from storage...');
            const response = await chrome.runtime.sendMessage({ action: 'getNotes' });
            if (response.success) {
                const storageNotes = response.data;
                
                // Check if there are actual changes
                const currentCount = this.stickyNotes.length;
                const storageCount = storageNotes.length;
                
                if (currentCount !== storageCount || 
                    JSON.stringify(this.stickyNotes) !== JSON.stringify(storageNotes)) {
                    
                    console.log('Notes out of sync, updating...', {
                        currentCount,
                        storageCount
                    });
                    
                    this.stickyNotes = storageNotes;
                    
                    // Re-render if we're on the notes tab
                    if (this.isNotesTabActive()) {
                        // Only render floating notes for the Notes tab
                        setTimeout(() => {
                            this.renderFloatingNotes();
                        }, 50);
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing notes from storage:', error);
        }
    }

    // Load notes data without rendering (for initialization)
    async loadNotesData() {
        try {
            console.log('Loading notes data from storage...');
            const response = await this.util.sendMessageToBackground({ action: 'getNotes' });
            if (response.success) {
                this.stickyNotes = response.data;
                console.log('Loaded', this.stickyNotes.length, 'notes data from storage');
            } else {
                console.error('Failed to load notes data:', response);
            }
        } catch (error) {
            console.error('Error loading notes data:', error);
        }
    }

    // Windows-style Floating Sticky Notes
    async loadFloatingNotes() {
        try {
            console.log('[StickyNotes] Loading floating notes from storage...');
            const response = await this.util.sendMessageToBackground({ action: 'getNotes' });
            console.log('[StickyNotes] Background response:', response);
            
            if (response.success) {
                const storageNotes = response.data || [];
                console.log('[StickyNotes] Loaded', storageNotes.length, 'sticky notes from storage');
                
                // Log position data for debugging
                storageNotes.forEach(note => {
                    console.log(`[StickyNotes] Note ${note.id} position:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                });
                
                // Always update with latest from storage
                this.stickyNotes = storageNotes;
                
                // Wait for container to be available
                await this.waitForContainer();
                
                // Always render floating notes during initialization
                this.renderFloatingNotes(true);
                
                console.log('[StickyNotes] Floating notes loaded and rendered successfully');
            } else {
                console.error('[StickyNotes] Failed to load notes:', response);
                this.stickyNotes = [];
            }
        } catch (error) {
            console.error('[StickyNotes] Error loading floating notes:', error);
            this.stickyNotes = [];
            throw error;
        }
    }

    // Wait for container to be available
    async waitForContainer(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            const container = document.getElementById('notes-floating-container');
            if (container) {
                console.log('[StickyNotes] Container found on attempt', i + 1);
                return container;
            }
            
            console.log('[StickyNotes] Container not found, waiting... (attempt', i + 1, '/', maxAttempts, ')');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.error('[StickyNotes] Container not found after', maxAttempts, 'attempts');
        throw new Error('Notes container not found');
    }

    renderFloatingNotes(forceRender = false) {
        console.log('[StickyNotes] Rendering floating notes...', forceRender ? '(forced)' : '');
        const container = document.getElementById('notes-floating-container');
        
        if (!container) {
            console.log('[StickyNotes] Notes floating container not found');
            return;
        }

        // During initialization or when forced, always render. Otherwise check tab state
        if (!forceRender && !this.isNotesTabActive()) {
            console.log('[StickyNotes] Notes tab not active, skipping render');
            return;
        }

        // Check if notes are already rendered to avoid unnecessary re-renders
        const existingNotes = container.querySelectorAll('.windows-sticky-note');
        if (!forceRender && existingNotes.length === this.stickyNotes.length && this.stickyNotes.length > 0) {
            console.log('[StickyNotes] Notes already rendered, checking if all present...');
            let allPresent = true;
            for (const note of this.stickyNotes) {
                if (!container.querySelector(`[data-note-id="${note.id}"]`)) {
                    allPresent = false;
                    break;
                }
            }
            if (allPresent) {
                console.log('[StickyNotes] All notes present, skipping re-render');
                return;
            }
        }

        console.log('[StickyNotes] Clearing container and rendering', this.stickyNotes.length, 'notes');
        
        // Backup current positions from DOM before clearing
        this.backupCurrentPositions(container);
        
        container.innerHTML = '';

        // Ensure all notes have valid position data before rendering
        this.validateNotePositions();

        this.stickyNotes.forEach((note, index) => {
            try {
                console.log(`[StickyNotes] Rendering note ${index + 1}/${this.stickyNotes.length}:`, note.id);
                this.createFloatingNote(note);
            } catch (error) {
                console.error(`[StickyNotes] Error rendering note ${note.id}:`, error, note);
            }
        });
        
        console.log('[StickyNotes] Finished rendering all notes');
    }

    // Backup current positions from DOM before clearing
    backupCurrentPositions(container) {
        const existingNotes = container.querySelectorAll('.windows-sticky-note');
        console.log('[StickyNotes] Backing up positions for', existingNotes.length, 'existing notes');
        
        existingNotes.forEach(noteElement => {
            const noteId = noteElement.dataset.noteId;
            const note = this.stickyNotes.find(n => n.id == noteId);
            
            if (note) {
                const currentX = parseInt(noteElement.style.left) || note.x;
                const currentY = parseInt(noteElement.style.top) || note.y;
                const currentWidth = parseInt(noteElement.style.width) || note.width;
                const currentHeight = parseInt(noteElement.style.height) || note.height;
                
                // Update note data with current DOM positions
                note.x = currentX;
                note.y = currentY;
                note.width = currentWidth;
                note.height = currentHeight;
                
                console.log(`[StickyNotes] Backed up position for note ${noteId}:`, { x: currentX, y: currentY, width: currentWidth, height: currentHeight });
            }
        });
    }

    validateNotePositions() {
        const container = document.getElementById('notes-floating-container');
        if (!container) return;

        this.stickyNotes.forEach(note => {
            // Convert string positions to numbers if needed (from storage)
            if (typeof note.x === 'string' && !isNaN(note.x)) {
                note.x = parseFloat(note.x);
            }
            if (typeof note.y === 'string' && !isNaN(note.y)) {
                note.y = parseFloat(note.y);
            }
            if (typeof note.width === 'string' && !isNaN(note.width)) {
                note.width = parseFloat(note.width);
            }
            if (typeof note.height === 'string' && !isNaN(note.height)) {
                note.height = parseFloat(note.height);
            }

            // Only assign new position if data is truly missing or invalid
            const hasValidPosition = (
                note.x !== undefined && note.x !== null && !isNaN(note.x) &&
                note.y !== undefined && note.y !== null && !isNaN(note.y)
            );

            if (!hasValidPosition) {
                console.log(`[StickyNotes] Note ${note.id} missing position data, assigning default position`);
                console.log(`[StickyNotes] Current position data:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                
                // Generate new position only for truly missing data
                note.x = Math.random() * (window.innerWidth - 220) + 10;
                note.y = Math.random() * ((window.innerHeight - 80) - 190) + 10;
                note.width = note.width || 200;
                note.height = note.height || 200;
                
                console.log(`[StickyNotes] Assigned new position for note ${note.id}:`, { x: note.x, y: note.y });
                
                // Save the assigned position (but don't await to avoid blocking rendering)
                this.saveNotePosition(note.id, {
                    x: note.x,
                    y: note.y,
                    width: note.width,
                    height: note.height
                }).catch(error => console.error('Error saving generated position:', error));
            } else {
                console.log(`[StickyNotes] Note ${note.id} has valid position data:`, { x: note.x, y: note.y, width: note.width, height: note.height });
            }
        });
    }

    createFloatingNote(note) {
        const container = document.getElementById('notes-floating-container');
        
        const noteElement = document.createElement('div');
        noteElement.className = `windows-sticky-note ${note.color || 'yellow'}`;
        noteElement.dataset.noteId = note.id;
        
        // Use stored position data - positions should already be validated by validateNotePositions
        let x = note.x;
        let y = note.y;
        
        console.log(`[StickyNotes] Creating floating note ${note.id} with position:`, { x, y, width: note.width, height: note.height });
        
        // Ensure positions are numbers (should already be handled by validation)
        if (typeof x === 'string') x = parseFloat(x);
        if (typeof y === 'string') y = parseFloat(y);
        
        // Final safety check - if still invalid, use safe defaults
        if (isNaN(x) || x === null || x === undefined) {
            x = 50;
            console.warn(`[StickyNotes] Using fallback X position for note ${note.id}`);
        }
        if (isNaN(y) || y === null || y === undefined) {
            y = 50;
            console.warn(`[StickyNotes] Using fallback Y position for note ${note.id}`);
        }
        
        console.log(`[StickyNotes] ✓ Final position for note ${note.id}:`, { x, y });
        
        const width = note.width || 200;
        const height = note.height || 200;
        
        noteElement.style.left = x + 'px';
        noteElement.style.top = y + 'px';
        noteElement.style.width = width + 'px';
        noteElement.style.height = height + 'px';

        // Ensure content is properly loaded
        const noteContent = note.content || '';
        const noteTitle = note.title || '';
        console.log('Creating note with content:', note.id, 'title:', noteTitle, 'content:', noteContent);
        
        try {
            noteElement.innerHTML = `
                <div class="sticky-note-header">
                    <input type="text" class="sticky-note-title" placeholder="Note title..." value="${this.escapeHtml(noteTitle)}" maxlength="50">
                    <button class="sticky-note-close" data-note-id="${note.id}">&times;</button>
                </div>
                <div class="sticky-note-content">
                    <textarea class="sticky-note-textarea" placeholder="Type your note here...">${this.escapeHtml(noteContent)}</textarea>
                </div>
            `;
        } catch (error) {
            console.error('Error creating note HTML for note:', note.id, error);
            // Fallback to basic note structure
            noteElement.innerHTML = `
                <div class="sticky-note-header">
                    <input type="text" class="sticky-note-title" placeholder="Note title..." value="" maxlength="50">
                    <button class="sticky-note-close" data-note-id="${note.id}">&times;</button>
                </div>
                <div class="sticky-note-content">
                    <textarea class="sticky-note-textarea" placeholder="Type your note here...">${noteContent}</textarea>
                </div>
            `;
        }

        container.appendChild(noteElement);

        // Make note draggable
        this.makeDraggable(noteElement);
        
        // Make note resizable
        this.makeResizable(noteElement);

        // Add close button event listener
        const closeBtn = noteElement.querySelector('.sticky-note-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteFloatingNote(note.id);
        });

        // Auto-save on content change
        const textarea = noteElement.querySelector('.sticky-note-textarea');
        if (!textarea) {
            console.error('Textarea not found in note:', note.id);
            return;
        }
        let saveTimeout;
        
        textarea.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                console.log('Saving note content:', note.id, textarea.value);
                try {
                    // Update the note content in background
                    await this.util.sendMessageToBackground({
                        action: 'updateNoteContent',
                        noteId: note.id,
                        content: textarea.value
                    });
                    
                    // Update local array immediately
                    const localNote = this.stickyNotes.find(n => n.id === note.id);
                    if (localNote) {
                        localNote.content = textarea.value;
                    }
                    
                    console.log('Note content saved successfully');
                } catch (error) {
                    console.error('Error saving note content:', error);
                    this.util.showError('Failed to save note content');
                }
            }, 500); // Reduced timeout for faster saving
        });
        
        // Also save on blur (when user clicks away)
        textarea.addEventListener('blur', async () => {
            clearTimeout(saveTimeout);
            console.log('Saving note content on blur:', note.id, textarea.value);
            try {
                await this.util.sendMessageToBackground({
                    action: 'updateNoteContent',
                    noteId: note.id,
                    content: textarea.value
                });
                
                // Update local array immediately
                const localNote = this.stickyNotes.find(n => n.id === note.id);
                if (localNote) {
                    localNote.content = textarea.value;
                }
                
                console.log('Note content saved on blur');
            } catch (error) {
                console.error('Error saving note content on blur:', error);
            }
        });

        // Auto-save title on input change
        const titleInput = noteElement.querySelector('.sticky-note-title');
        if (!titleInput) {
            console.error('Title input not found in note:', note.id);
            return;
        }
        
        // Ensure title input can receive events
        titleInput.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent drag from starting
        });
        
        titleInput.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent any parent click handlers
            titleInput.focus(); // Ensure focus
        });
        
        let titleSaveTimeout;
        
        titleInput.addEventListener('input', () => {
            clearTimeout(titleSaveTimeout);
            titleSaveTimeout = setTimeout(async () => {
                console.log('Saving note title:', note.id, titleInput.value);
                try {
                    // Update the note title in background
                    await this.util.sendMessageToBackground({
                        action: 'updateNoteTitle',
                        noteId: note.id,
                        title: titleInput.value.trim()
                    });
                    
                    // Update local array immediately
                    const localNote = this.stickyNotes.find(n => n.id === note.id);
                    if (localNote) {
                        localNote.title = titleInput.value.trim();
                    }
                    
                    console.log('Note title saved successfully');
                } catch (error) {
                    console.error('Error saving note title:', error);
                    this.util.showError('Failed to save note title');
                }
            }, 500);
        });
        
        // Also save title on blur
        titleInput.addEventListener('blur', async () => {
            clearTimeout(titleSaveTimeout);
            console.log('Saving note title on blur:', note.id, titleInput.value);
            try {
                await this.util.sendMessageToBackground({
                    action: 'updateNoteTitle',
                    noteId: note.id,
                    title: titleInput.value.trim()
                });
                
                // Update local array immediately
                const localNote = this.stickyNotes.find(n => n.id === note.id);
                if (localNote) {
                    localNote.title = titleInput.value.trim();
                }
                
                console.log('Note title saved on blur');
            } catch (error) {
                console.error('Error saving note title on blur:', error);
            }
        });
    }

    makeDraggable(element) {
        const header = element.querySelector('.sticky-note-header');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;

        // Add hover effect to show it's draggable
        header.addEventListener('mouseenter', () => {
            if (!isDragging) {
                header.style.background = 'rgba(251, 192, 45, 0.6)';
            }
        });

        header.addEventListener('mouseleave', () => {
            if (!isDragging) {
                header.style.background = 'rgba(251, 192, 45, 0.4)';
            }
        });

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            
            // Don't drag if clicking on close button or title input
            if (e.target.classList.contains('sticky-note-close') || 
                e.target.classList.contains('sticky-note-title')) {
                return;
            }
            
            e.preventDefault();
            
            isDragging = true;
            element.classList.add('dragging');
            element.style.zIndex = '1010'; // Bring to front while dragging
            header.style.background = 'rgba(251, 192, 45, 0.8)';
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            if (!isDragging) return;
            
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            const newTop = element.offsetTop - pos2;
            const newLeft = element.offsetLeft - pos1;
            
            // Keep within available bounds with some padding for visibility
            const padding = 20; // Allow some space for drag handle visibility
            const availableHeight = window.innerHeight - 80; // Account for tab navigation
            const minX = -padding;
            const minY = -padding;
            const maxX = window.innerWidth - element.offsetWidth + padding;
            const maxY = availableHeight - element.offsetHeight + padding;
            
            element.style.top = Math.max(minY, Math.min(newTop, maxY)) + "px";
            element.style.left = Math.max(minX, Math.min(newLeft, maxX)) + "px";
        }

        function closeDragElement() {
            isDragging = false;
            element.classList.remove('dragging');
            element.style.zIndex = '1000'; // Reset z-index
            header.style.background = 'rgba(251, 192, 45, 0.4)'; // Reset header background
            document.onmouseup = null;
            document.onmousemove = null;
            
            // Save position
            const noteId = element.dataset.noteId;
            const x = element.offsetLeft;
            const y = element.offsetTop;
            
            // Auto-save position
            if (window.stickyNotes) {
                window.stickyNotes.saveNotePosition(noteId, {
                    x: x,
                    y: y,
                    width: parseInt(element.style.width),
                    height: parseInt(element.style.height)
                });
            }
        }
    }

    makeResizable(element) {
        // Add resize functionality using CSS resize property
        element.style.resize = 'both';
        element.style.overflow = 'hidden';

        let resizeTimeout;

        // Use ResizeObserver to detect when element is resized
        const resizeObserver = new ResizeObserver(entries => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const noteId = element.dataset.noteId;
                const rect = element.getBoundingClientRect();
                
                // Let CSS flexbox handle textarea sizing automatically
                // No manual height calculations needed
                
                if (window.stickyNotes) {
                    window.stickyNotes.saveNotePosition(noteId, {
                        x: element.offsetLeft,
                        y: element.offsetTop,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    });
                }
            }, 100); // Reduced timeout for more responsive updates
        });
        
        resizeObserver.observe(element);
        
        // Store observer reference for cleanup
        element._resizeObserver = resizeObserver;
    }

    async saveNotePosition(noteId, updates) {
        try {
            // Find the note and update it
            const note = this.stickyNotes.find(n => n.id == noteId);
            if (note) {
                console.log(`💾 Saving position for note ${noteId}:`, updates);
                console.log(`💾 Note before update:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                
                // Update the note with new position data
                Object.assign(note, updates);
                note.updatedAt = Date.now(); // Add timestamp
                
                console.log(`💾 Note after update:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                
                // Set flag to prevent handling our own storage change
                this.isUpdatingStorage = true;
                
                // Save to background storage
                const response = await this.util.sendMessageToBackground({ action: 'saveNote', note });
                
                // Reset flag after a short delay
                setTimeout(() => {
                    this.isUpdatingStorage = false;
                }, 200);
                
                if (response.success) {
                    console.log(`✅ Position saved successfully for note ${noteId}`);
                } else {
                    console.error(`❌ Failed to save position for note ${noteId}:`, response);
                }
            } else {
                console.error(`❌ Note ${noteId} not found for position update`);
                console.log(`Available notes:`, this.stickyNotes.map(n => ({ id: n.id, x: n.x, y: n.y })));
            }
        } catch (error) {
            console.error('❌ Error saving note position:', error);
            // Reset flag on error
            this.isUpdatingStorage = false;
        }
    }

    async deleteFloatingNote(noteId) {
        try {
            console.log('Deleting note:', noteId);
            
            // Clean up resize observer before removing from DOM
            const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
            if (noteElement && noteElement._resizeObserver) {
                noteElement._resizeObserver.disconnect();
                delete noteElement._resizeObserver;
            }
            
            await this.util.sendMessageToBackground({ action: 'deleteNote', noteId });
            // Remove from local array immediately for instant UI update
            this.stickyNotes = this.stickyNotes.filter(note => note.id != noteId);
            // Refresh both views
            await this.loadFloatingNotes();
            await this.loadNotesForTab();
            this.util.showSuccess('Note deleted');
            console.log('Note deleted successfully');
        } catch (error) {
            console.error('Error deleting note:', error);
            this.util.showError('Failed to delete note');
        }
    }

    async createDirectNote() {
        // Create a note directly without modal
        const container = document.getElementById('notes-floating-container');
        if (!container) return;

        // Use available dimensions for positioning (accounting for tab navigation)
        const availableHeight = window.innerHeight - 80; // Account for tab navigation
        const x = Math.random() * (window.innerWidth - 220) + 10;
        const y = Math.random() * (availableHeight - 190) + 10; // Leave space for floating buttons

        await this.createQuickNoteInContainer(x, y);
    }

    async createQuickNoteInContainer(x, y) {
        // Create a note directly at the clicked position within the container
        const container = document.getElementById('notes-floating-container');
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        
        const note = {
            id: Date.now().toString(),
            title: '',
            content: '',
            color: this.getRandomNoteColor(),
            x: Math.max(10, Math.min(x - 100, window.innerWidth - 210)),
            y: Math.max(10, Math.min(y - 100, (window.innerHeight - 80) - 180)),
            width: 200,
            height: 200
        };

        try {
            // Set flag to prevent handling our own storage change
            this.isUpdatingStorage = true;
            
            const response = await this.util.sendMessageToBackground({ action: 'saveNote', note });
            
            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdatingStorage = false;
            }, 200);
            
            if (response.success) {
                await this.loadFloatingNotes();
                
                // Focus the newly created note
                setTimeout(() => {
                    const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
                    if (noteElement) {
                        const textarea = noteElement.querySelector('.sticky-note-textarea');
                        if (textarea) {
                            textarea.focus();
                            console.log('Focused on new note:', note.id);
                        }
                    }
                }, 100);
                this.util.showSuccess('Note created');
            }
        } catch (error) {
            console.error('Error creating quick note:', error);
            this.util.showError('Failed to create note');
            // Reset flag on error
            this.isUpdatingStorage = false;
        }
    }

    // Notes Tab Functionality
    async loadNotesForTab() {
        try {
            console.log('Loading notes for tab from storage...');
            const response = await this.util.sendMessageToBackground({ action: 'getNotes' });
            if (response.success) {
                const storageNotes = response.data;
                console.log('Loaded', storageNotes.length, 'notes for tab from storage');
                
                // Always update with latest from storage
                this.stickyNotes = storageNotes;
                
                // Check if we have a notes grid (for future tab implementations)
                const notesGrid = document.getElementById('notes-grid');
                if (notesGrid) {
                    this.renderNotesGrid();
                }
                
                // Render floating notes with a small delay to ensure DOM is ready
                setTimeout(() => {
                    this.renderFloatingNotes();
                }, 50);
            }
        } catch (error) {
            console.error('Error loading notes for tab:', error);
        }
    }

    renderNotesGrid() {
        const container = document.getElementById('notes-grid');
        
        // If notes-grid container doesn't exist, this method shouldn't run
        if (!container) {
            console.log('Notes grid container not found, skipping grid render');
            return;
        }
        
        if (this.stickyNotes.length === 0) {
            container.innerHTML = '';
            return;
        }

        const html = this.stickyNotes.map(note => {
            // Smart title generation: use title if available, otherwise use first line of content
            let displayTitle = note.title && note.title.trim() ? note.title.trim() : '';
            if (!displayTitle && note.content) {
                const firstLine = note.content.split('\n')[0].trim();
                displayTitle = firstLine ? this.util.truncateText(firstLine, 30) : 'Untitled';
            } else if (!displayTitle) {
                displayTitle = 'Untitled';
            }
            
            return `
                <div class="note-card" data-note-id="${note.id}">
                    <div class="note-card-header">
                        <div class="note-card-title">${this.util.escapeHtml(displayTitle)}</div>
                        <div class="note-card-date">${this.util.formatDate(note.updatedAt || note.createdAt)}</div>
                    </div>
                    <div class="note-card-content">${this.util.escapeHtml(this.util.truncateText(note.content || '', 100))}</div>
                    <div class="note-card-actions">
                        <button class="note-card-action" data-action="edit" data-note-id="${note.id}">✏️</button>
                        <button class="note-card-action" data-action="delete" data-note-id="${note.id}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    editNoteInTab(noteId) {
        const note = this.stickyNotes.find(n => n.id == noteId);
        if (note) {
            this.openNoteModal(note);
        }
    }

    async deleteNoteFromTab(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            try {
                console.log('Deleting note from tab:', noteId);
                await this.util.sendMessageToBackground({ action: 'deleteNote', noteId });
                // Remove from local array immediately
                this.stickyNotes = this.stickyNotes.filter(note => note.id != noteId);
                // Refresh both views
                await this.loadNotesForTab();
                await this.loadFloatingNotes();
                this.util.showSuccess('Note deleted');
                console.log('Note deleted from tab successfully');
            } catch (error) {
                console.error('Error deleting note:', error);
                this.util.showError('Failed to delete note');
            }
        }
    }

    async clearAllNotes() {
        if (confirm('Are you sure you want to delete all notes?')) {
            try {
                console.log('Clearing all notes...');
                // Use the more efficient clearAllNotes action
                await this.util.sendMessageToBackground({ action: 'clearAllNotes' });
                // Clear local array immediately
                this.stickyNotes = [];
                // Reload both grid and floating notes
                await this.loadNotesForTab();
                await this.loadFloatingNotes();
                this.util.showSuccess('All notes cleared');
                console.log('All notes cleared successfully');
            } catch (error) {
                console.error('Error clearing notes:', error);
                this.util.showError('Failed to clear notes');
            }
        }
    }

    // Modal functionality
    openNoteModal(note = null) {
        this.currentEditingNote = note;
        const modal = document.getElementById('note-modal');
        const titleEl = modal.querySelector('#modal-title');
        const titleInput = modal.querySelector('#note-title');
        const contentInput = modal.querySelector('#note-content');

        if (note) {
            titleEl.textContent = 'Edit Note';
            if (titleInput) titleInput.value = note.title || '';
            contentInput.value = note.content || '';
        } else {
            titleEl.textContent = 'Add Sticky Note';
            if (titleInput) titleInput.value = '';
            contentInput.value = '';
        }

        modal.classList.add('active');
        // Focus title input first if it exists, otherwise content
        if (titleInput) {
            titleInput.focus();
        } else {
            contentInput.focus();
        }
    }

    closeNoteModal() {
        const modal = document.getElementById('note-modal');
        modal.classList.remove('active');
        this.currentEditingNote = null;
    }

    async saveNote() {
        const titleInput = document.getElementById('note-title');
        const content = document.getElementById('note-content').value.trim();
        const title = titleInput ? titleInput.value.trim() : '';

        if (!content && !title) {
            return;
        }

        // Use available dimensions for proper positioning
        let x = Math.random() * (window.innerWidth - 220) + 10;
        let y = Math.random() * ((window.innerHeight - 80) - 190) + 10;

        const note = {
            title: title,
            content: content,
            color: this.getRandomNoteColor(),
            x: x,
            y: y,
            width: 200,
            height: 200
        };

        if (this.currentEditingNote) {
            note.id = this.currentEditingNote.id;
            note.x = this.currentEditingNote.x;
            note.y = this.currentEditingNote.y;
            note.width = this.currentEditingNote.width;
            note.height = this.currentEditingNote.height;
            note.color = this.currentEditingNote.color;
        }

        try {
            // Set flag to prevent handling our own storage change
            this.isUpdatingStorage = true;
            
            await this.util.sendMessageToBackground({ action: 'saveNote', note });
            
            // Reset flag after a short delay
            setTimeout(() => {
                this.isUpdatingStorage = false;
            }, 200);
            
            await this.loadFloatingNotes();
            this.closeNoteModal();
            this.util.showSuccess(this.currentEditingNote ? 'Note updated' : 'Note created');
        } catch (error) {
            console.error('Error saving note:', error);
            this.util.showError('Failed to save note');
            // Reset flag on error
            this.isUpdatingStorage = false;
        }
    }

    getRandomNoteColor() {
        const colors = ['yellow', 'blue', 'green', 'pink', 'purple'];
        return this.util.randomFromArray(colors);
    }

    // Helper methods
    isNotesTabActive() {
        const notesTab = document.getElementById('notes-tab');
        return notesTab && notesTab.classList.contains('active');
    }

    // Removed - now using utility methods
}

// Export for use in main newtab.js
window.StickyNotes = StickyNotes;
