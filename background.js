// Background script for Sticky Notes extension
class StickyNotesBackground {
    constructor() {
        this.stickyNotes = [];
        this.tasks = [];
        this.init();
    }

    init() {
        // Listen for extension installation
        chrome.runtime.onInstalled.addListener(() => {
            console.log('Sticky Notes extension installed');
            this.loadNotesFromStorage();
            this.loadTasksFromStorage();
        });

        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });

        // Load notes and tasks on startup
        this.loadNotesFromStorage();
        this.loadTasksFromStorage();
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            console.log('Background received message:', message.action);

            switch (message.action) {
                case 'saveNote':
                    await this.saveNote(message.note);
                    sendResponse({ success: true });
                    break;

                case 'getNotes':
                    const notes = await this.getNotes();
                    sendResponse({ success: true, data: notes });
                    break;

                case 'deleteNote':
                    await this.deleteNote(message.noteId);
                    sendResponse({ success: true });
                    break;

                case 'clearAllNotes':
                    await this.clearAllNotes();
                    sendResponse({ success: true });
                    break;

                case 'updateNotePosition':
                    await this.updateNotePosition(message.noteId, message.x, message.y);
                    sendResponse({ success: true });
                    break;

                case 'updateNoteSize':
                    await this.updateNoteSize(message.noteId, message.width, message.height);
                    sendResponse({ success: true });
                    break;

                case 'updateNoteContent':
                    await this.updateNoteContent(message.noteId, message.content);
                    sendResponse({ success: true });
                    break;

                case 'updateNoteTitle':
                    await this.updateNoteTitle(message.noteId, message.title);
                    sendResponse({ success: true });
                    break;

                // Task management actions
                case 'saveTask':
                    await this.saveTask(message.task);
                    sendResponse({ success: true });
                    break;

                case 'getTasks':
                    const tasks = await this.getTasks();
                    sendResponse({ success: true, data: tasks });
                    break;

                case 'updateTask':
                    await this.updateTask(message.task);
                    sendResponse({ success: true });
                    break;

                case 'deleteTask':
                    await this.deleteTask(message.taskId);
                    sendResponse({ success: true });
                    break;

                case 'clearAllTasks':
                    await this.clearAllTasks();
                    sendResponse({ success: true });
                    break;

                default:
                    console.warn('Unknown action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async loadNotesFromStorage() {
        try {
            const result = await chrome.storage.local.get(['notes']);
            this.stickyNotes = result.notes || [];
            console.log('Loaded', this.stickyNotes.length, 'notes from storage');
        } catch (error) {
            console.error('Error loading notes from storage:', error);
            this.stickyNotes = [];
        }
    }

    async saveNote(note) {
        try {
            // Check if note already exists
            const existingIndex = this.stickyNotes.findIndex(n => n.id === note.id);
            
            if (existingIndex !== -1) {
                // Update existing note
                const updatedNote = { 
                    ...this.stickyNotes[existingIndex], 
                    ...note, 
                    updatedAt: Date.now() 
                };
                this.stickyNotes[existingIndex] = updatedNote;
            } else {
                // Add new note with timestamps
                const newNote = {
                    ...note,
                    id: note.id || Date.now().toString(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                this.stickyNotes.push(newNote);
            }

            await chrome.storage.local.set({ notes: this.stickyNotes });
            console.log('Note saved:', note.id);
        } catch (error) {
            console.error('Error saving note:', error);
            throw error;
        }
    }

    async getNotes() {
        return this.stickyNotes;
    }

    async deleteNote(noteId) {
        try {
            this.stickyNotes = this.stickyNotes.filter(note => note.id !== noteId);
            await chrome.storage.local.set({ notes: this.stickyNotes });
            console.log('Note deleted:', noteId);
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }

    async clearAllNotes() {
        try {
            this.stickyNotes = [];
            await chrome.storage.local.set({ notes: [] });
            console.log('All notes cleared');
        } catch (error) {
            console.error('Error clearing notes:', error);
            throw error;
        }
    }

    async updateNotePosition(noteId, x, y) {
        try {
            const note = this.stickyNotes.find(n => n.id === noteId);
            if (note) {
                note.x = x;
                note.y = y;
                await chrome.storage.local.set({ notes: this.stickyNotes });
                console.log('Note position updated:', noteId, x, y);
            }
        } catch (error) {
            console.error('Error updating note position:', error);
            throw error;
        }
    }

    async updateNoteSize(noteId, width, height) {
        try {
            const note = this.stickyNotes.find(n => n.id === noteId);
            if (note) {
                note.width = width;
                note.height = height;
                await chrome.storage.local.set({ notes: this.stickyNotes });
                console.log('Note size updated:', noteId, width, height);
            }
        } catch (error) {
            console.error('Error updating note size:', error);
            throw error;
        }
    }

    async updateNoteContent(noteId, content) {
        try {
            const note = this.stickyNotes.find(n => n.id === noteId);
            if (note) {
                note.content = content;
                note.updatedAt = Date.now();
                await chrome.storage.local.set({ notes: this.stickyNotes });
                console.log('Note content updated:', noteId);
            }
        } catch (error) {
            console.error('Error updating note content:', error);
            throw error;
        }
    }

    async updateNoteTitle(noteId, title) {
        try {
            const note = this.stickyNotes.find(n => n.id === noteId);
            if (note) {
                note.title = title;
                note.updatedAt = Date.now();
                await chrome.storage.local.set({ notes: this.stickyNotes });
                console.log('Note title updated:', noteId);
            }
        } catch (error) {
            console.error('Error updating note title:', error);
            throw error;
        }
    }

    // Task management methods
    async loadTasksFromStorage() {
        try {
            const result = await chrome.storage.local.get(['tasks']);
            this.tasks = result.tasks || [];
            console.log('Loaded', this.tasks.length, 'tasks from storage');
        } catch (error) {
            console.error('Error loading tasks from storage:', error);
            this.tasks = [];
        }
    }

    async saveTask(task) {
        try {
            // Check if task already exists
            const existingIndex = this.tasks.findIndex(t => t.id === task.id);
            
            if (existingIndex !== -1) {
                // Update existing task
                const updatedTask = { 
                    ...this.tasks[existingIndex], 
                    ...task, 
                    updatedAt: Date.now() 
                };
                this.tasks[existingIndex] = updatedTask;
            } else {
                // Add new task with timestamps
                const newTask = {
                    ...task,
                    id: task.id || Date.now().toString(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                this.tasks.push(newTask);
            }

            await chrome.storage.local.set({ tasks: this.tasks });
            console.log('Task saved:', task.id);
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    }

    async getTasks() {
        return this.tasks;
    }

    async updateTask(task) {
        try {
            const existingIndex = this.tasks.findIndex(t => t.id === task.id);
            if (existingIndex !== -1) {
                this.tasks[existingIndex] = { ...task, updatedAt: Date.now() };
                await chrome.storage.local.set({ tasks: this.tasks });
                console.log('Task updated:', task.id);
            }
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            await chrome.storage.local.set({ tasks: this.tasks });
            console.log('Task deleted:', taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async clearAllTasks() {
        try {
            this.tasks = [];
            await chrome.storage.local.set({ tasks: [] });
            console.log('All tasks cleared');
        } catch (error) {
            console.error('Error clearing tasks:', error);
            throw error;
        }
    }
}

// Initialize the background script
new StickyNotesBackground();
