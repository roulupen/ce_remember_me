// StickyNotes.js - Sticky Notes functionality module
class StickyNotes {
    constructor() {
        this.stickyNotes = [];
        this.currentEditingNote = null;
        this.draggedNote = null;
        this.util = window.Utility; // Use global utility instance
    }
    
    // Utility method to escape HTML content
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize sticky notes functionality
    async init() {
        this.setupEventListeners();
        await this.loadNotesData();
        await this.setupStorageListener();
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
            // Get the new value from storage change
            const newNotes = notesChange.newValue || [];
            const oldNotes = notesChange.oldValue || [];
            
            console.log('Storage change detected:', {
                oldCount: oldNotes.length,
                newCount: newNotes.length
            });

            // Update local notes array
            this.stickyNotes = newNotes;

            // Re-render both views if we're on the notes tab
            if (this.isNotesTabActive()) {
                this.renderNotesGrid();
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    this.renderFloatingNotes();
                }, 50);
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
                        this.renderNotesGrid();
                        // Small delay to ensure DOM is ready
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
            console.log('Loading floating notes from storage...');
            const response = await this.util.sendMessageToBackground({ action: 'getNotes' });
            console.log('Background response:', response);
            
            if (response.success) {
                const storageNotes = response.data;
                console.log('Loaded', storageNotes.length, 'sticky notes from storage:', storageNotes);
                
                // Log position data for debugging
                storageNotes.forEach(note => {
                    console.log(`Note ${note.id} position:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                });
                
                // Always update with latest from storage
                this.stickyNotes = storageNotes;
                
                // Add debugging for container availability
                const container = document.getElementById('notes-floating-container');
                console.log('Container available:', !!container);
                console.log('Notes tab active:', this.isNotesTabActive());
                
                this.renderFloatingNotes();
            } else {
                console.error('Failed to load notes:', response);
            }
        } catch (error) {
            console.error('Error loading floating notes:', error);
        }
    }

    renderFloatingNotes() {
        console.log('Rendering floating notes...');
        const container = document.getElementById('notes-floating-container');
        
        if (!container) {
            console.log('Notes floating container not found, will retry when notes tab is active');
            return;
        }

        // Check if container is visible (notes tab is active)
        if (!this.isNotesTabActive()) {
            console.log('Notes tab not active, skipping render');
            return;
        }

        container.innerHTML = '';
        console.log('Rendering', this.stickyNotes.length, 'notes to container');

        // Ensure all notes have valid position data before rendering
        this.validateNotePositions();

        this.stickyNotes.forEach((note, index) => {
            try {
                console.log(`Rendering note ${index + 1}/${this.stickyNotes.length}:`, note.id, note);
                this.createFloatingNote(note);
            } catch (error) {
                console.error(`Error rendering note ${note.id}:`, error, note);
            }
        });
        
        console.log('Finished rendering all notes');
    }

    validateNotePositions() {
        const container = document.getElementById('notes-floating-container');
        if (!container) return;

        this.stickyNotes.forEach(note => {
            // Check if note has valid position data - be more strict about what constitutes valid data
            if (note.x === undefined || note.y === undefined || note.x === null || note.y === null || 
                typeof note.x !== 'number' || typeof note.y !== 'number') {
                console.log(`Note ${note.id} missing or invalid position data, assigning default position`);
                console.log(`Current position data:`, { x: note.x, y: note.y, width: note.width, height: note.height });
                
                // Generate new position
                note.x = Math.random() * (window.innerWidth - 220) + 10;
                note.y = Math.random() * ((window.innerHeight - 80) - 190) + 10;
                note.width = note.width || 200;
                note.height = note.height || 200;
                
                console.log(`Assigned new position for note ${note.id}:`, { x: note.x, y: note.y });
                
                // Save the assigned position
                this.saveNotePosition(note.id, {
                    x: note.x,
                    y: note.y,
                    width: note.width,
                    height: note.height
                });
            } else {
                console.log(`Note ${note.id} has valid position data:`, { x: note.x, y: note.y, width: note.width, height: note.height });
            }
        });
    }

    createFloatingNote(note) {
        const container = document.getElementById('notes-floating-container');
        
        const noteElement = document.createElement('div');
        noteElement.className = `windows-sticky-note ${note.color || 'yellow'}`;
        noteElement.dataset.noteId = note.id;
        
        // Use stored position data, or calculate default position only if not stored
        let x, y;
        console.log(`Creating floating note ${note.id} with position data:`, { x: note.x, y: note.y, width: note.width, height: note.height });
        
        if (note.x !== undefined && note.y !== undefined && typeof note.x === 'number' && typeof note.y === 'number') {
            // Use exact stored position
            x = note.x;
            y = note.y;
            console.log(`✓ Using stored position for note ${note.id}:`, { x, y });
        } else {
            // Only generate random position for truly new notes
            x = Math.random() * (window.innerWidth - 220) + 10;
            y = Math.random() * ((window.innerHeight - 80) - 190) + 10;
            console.log(`⚠ Generated new position for note ${note.id}:`, { x, y });
            console.log(`⚠ Reason: x=${note.x} (${typeof note.x}), y=${note.y} (${typeof note.y})`);
            
            // Save the generated position immediately
            this.saveNotePosition(note.id, { x, y });
        }
        
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
                
                // Save to background storage
                const response = await this.util.sendMessageToBackground({ action: 'saveNote', note });
                
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
            const response = await this.util.sendMessageToBackground({ action: 'saveNote', note });
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
                this.renderNotesGrid();
                
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
                        <button class="note-card-action" onclick="stickyNotes.editNoteInTab('${note.id}')">✏️</button>
                        <button class="note-card-action" onclick="stickyNotes.deleteNoteFromTab('${note.id}')">🗑️</button>
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
            await this.util.sendMessageToBackground({ action: 'saveNote', note });
            await this.loadFloatingNotes();
            this.closeNoteModal();
            this.util.showSuccess(this.currentEditingNote ? 'Note updated' : 'Note created');
        } catch (error) {
            console.error('Error saving note:', error);
            this.util.showError('Failed to save note');
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
