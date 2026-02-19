// Load AI provider config (edit ai-api.config.js to set Azure endpoint, deployment, etc.)
try {
    importScripts('ai-api.config.js');
} catch (e) {
    console.warn('[AI] ai-api.config.js not loaded, using defaults');
}
const AI_API_CONFIG = typeof self !== 'undefined' && self.AI_API_CONFIG ? self.AI_API_CONFIG : {
    defaultProvider: 'anthropic',
    anthropic: { api_key: '', model: 'claude-3-5-sonnet-20241022' },
    azure: { endpoint: '', deployment: '', api_version: '2024-02-15-preview', api_key: '' },
    openai: { api_key: '', model: 'gpt-4o-mini' }
};

// Background script for Sticky Notes extension
class StickyNotesBackground {
    constructor() {
        this.stickyNotes = [];
        this.tasks = [];
        this.activeNotifications = new Map(); // Track active notifications
        this.notificationSounds = new Map(); // Track notification sound timers
        this.activeRingingTasks = new Set(); // Track tasks currently ringing
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
            console.log('🔔 Message listener triggered with action:', message.action);
            console.log('🔔 This context:', this);
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });

        // Listen for notification clicks and button clicks
        chrome.notifications.onClicked.addListener((notificationId) => {
            this.handleNotificationClick(notificationId);
        });

        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
            this.handleNotificationButtonClick(notificationId, buttonIndex);
        });

        chrome.notifications.onClosed.addListener((notificationId, byUser) => {
            this.handleNotificationClosed(notificationId, byUser);
        });

        // Load notes and tasks on startup
        this.loadNotesFromStorage();
        this.loadTasksFromStorage();
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            console.log('🔔 Background received message:', message.action);
            console.log('📋 Full message object:', message);
            console.log('📋 Message type:', typeof message.action);
            console.log('📋 Available actions in switch:', [
                'saveNote', 'getNotes', 'deleteNote', 'clearAllNotes', 
                'updateNotePosition', 'updateNoteSize', 'updateNoteContent', 
                'updateNoteTitle', 'saveTask', 'getTasks', 'updateTask', 
                'deleteTask', 'clearAllTasks', 'showTaskNotification', 
                'closeTaskNotification', 'testSimpleNotification', 
                'checkNotificationPermissions'
            ]);
            
            switch (message.action) {
                case 'saveNote':
                    try {
                        await this.saveNote(message.note);
                        sendResponse({ success: true });
                    } catch (saveError) {
                        console.error('❌ Error in saveNote:', saveError);
                        sendResponse({ success: false, error: saveError.message });
                    }
                    break;

                case 'getNotes':
                    try {
                        const notes = await this.getNotes();
                        sendResponse({ success: true, data: notes });
                    } catch (getError) {
                        console.error('❌ Error in getNotes:', getError);
                        sendResponse({ success: false, error: getError.message });
                    }
                    break;

                case 'deleteNote':
                    try {
                        await this.deleteNote(message.noteId);
                        sendResponse({ success: true });
                    } catch (deleteError) {
                        console.error('❌ Error in deleteNote:', deleteError);
                        sendResponse({ success: false, error: deleteError.message });
                    }
                    break;

                case 'clearAllNotes':
                    try {
                        await this.clearAllNotes();
                        sendResponse({ success: true });
                    } catch (clearError) {
                        console.error('❌ Error in clearAllNotes:', clearError);
                        sendResponse({ success: false, error: clearError.message });
                    }
                    break;

                case 'updateNotePosition':
                    try {
                        await this.updateNotePosition(message.noteId, message.x, message.y);
                        sendResponse({ success: true });
                    } catch (updateError) {
                        console.error('❌ Error in updateNotePosition:', updateError);
                        sendResponse({ success: false, error: updateError.message });
                    }
                    break;

                case 'updateNoteSize':
                    try {
                        await this.updateNoteSize(message.noteId, message.width, message.height);
                        sendResponse({ success: true });
                    } catch (updateError) {
                        console.error('❌ Error in updateNoteSize:', updateError);
                        sendResponse({ success: false, error: updateError.message });
                    }
                    break;

                case 'updateNoteContent':
                    try {
                        await this.updateNoteContent(message.noteId, message.content);
                        sendResponse({ success: true });
                    } catch (updateError) {
                        console.error('❌ Error in updateNoteContent:', updateError);
                        sendResponse({ success: false, error: updateError.message });
                    }
                    break;

                case 'updateNoteTitle':
                    try {
                        await this.updateNoteTitle(message.noteId, message.title);
                        sendResponse({ success: true });
                    } catch (updateError) {
                        console.error('❌ Error in updateNoteTitle:', updateError);
                        sendResponse({ success: false, error: updateError.message });
                    }
                    break;

                // Task management actions
                case 'saveTask':
                    try {
                        await this.saveTask(message.task);
                        console.log('✅ Task saved successfully, sending success response');
                        sendResponse({ success: true });
                    } catch (saveError) {
                        console.error('❌ Error in saveTask:', saveError);
                        sendResponse({ success: false, error: saveError.message });
                    }
                    break;

                case 'getTasks':
                    try {
                        const tasks = await this.getTasks();
                        sendResponse({ success: true, data: tasks });
                    } catch (getError) {
                        console.error('❌ Error in getTasks:', getError);
                        sendResponse({ success: false, error: getError.message });
                    }
                    break;

                case 'updateTask':
                    try {
                        await this.updateTask(message.task);
                        sendResponse({ success: true });
                    } catch (updateError) {
                        console.error('❌ Error in updateTask:', updateError);
                        sendResponse({ success: false, error: updateError.message });
                    }
                    break;

                case 'deleteTask':
                    try {
                        await this.deleteTask(message.taskId);
                        sendResponse({ success: true });
                    } catch (deleteError) {
                        console.error('❌ Error in deleteTask:', deleteError);
                        sendResponse({ success: false, error: deleteError.message });
                    }
                    break;

                case 'clearAllTasks':
                    try {
                        await this.clearAllTasks();
                        sendResponse({ success: true });
                    } catch (clearError) {
                        console.error('❌ Error in clearAllTasks:', clearError);
                        sendResponse({ success: false, error: clearError.message });
                    }
                    break;
                case 'showTaskNotification':
                    try {
                        await this.showTaskNotification(message.task);
                        sendResponse({ success: true });
                    } catch (notificationError) {
                        console.error('❌ Error in showTaskNotification:', notificationError);
                        sendResponse({ success: false, error: notificationError.message });
                    }
                    break;
                case 'closeTaskNotification':
                    try {
                        await this.closeTaskNotification(message.notificationId);
                        sendResponse({ success: true });
                    } catch (closeError) {
                        console.error('❌ Error in closeTaskNotification:', closeError);
                        sendResponse({ success: false, error: closeError.message });
                    }
                    break;
                case 'testSimpleNotification':
                    try {
                        await this.testSimpleNotification();
                        sendResponse({ success: true });
                    } catch (testError) {
                        console.error('❌ Error in testSimpleNotification:', testError);
                        sendResponse({ success: false, error: testError.message });
                    }
                    break;
                case 'checkNotificationPermissions':
                    try {
                        const permissionStatus = await this.checkNotificationPermissions();
                        sendResponse({ success: true, data: permissionStatus });
                    } catch (permissionError) {
                        console.error('❌ Error in checkNotificationPermissions:', permissionError);
                        sendResponse({ success: false, error: permissionError.message });
                    }
                    break;
                case 'testConnection':
                    try {
                        console.log('✅ Test connection received successfully');
                        console.log('📤 Sending success response...');
                        const testResponse = { success: true, message: 'Background script connected' };
                        console.log('📤 Response object:', testResponse);
                        sendResponse(testResponse);
                        console.log('✅ Response sent');
                    } catch (testError) {
                        console.error('❌ Error in testConnection:', testError);
                        sendResponse({ success: false, error: testError.message });
                    }
                    break;
                case 'stopNotificationSound':
                    try {
                        await this.stopNotificationSoundForTask(message.taskId);
                        sendResponse({ success: true });
                    } catch (stopError) {
                        console.error('❌ Error in stopNotificationSound:', stopError);
                        sendResponse({ success: false, error: stopError.message });
                    }
                    break;
                case 'getActiveRingingTasks':
                    try {
                        sendResponse({ success: true, data: Array.from(this.activeRingingTasks) });
                    } catch (getError) {
                        console.error('❌ Error in getActiveRingingTasks:', getError);
                        sendResponse({ success: false, error: getError.message });
                    }
                    break;

                // AI Assistant actions
                case 'callClaudeAPI':
                case 'callAIAPI':
                    try {
                        const result = await this.callAIAPI(message.prompt, message.settings || message.apiKey);
                        sendResponse(result);
                    } catch (apiError) {
                        console.error('❌ Error in callAIAPI:', apiError);
                        sendResponse({ success: false, error: apiError.message });
                    }
                    break;

                case 'getAISettings':
                    try {
                        const settings = await this.getAISettings();
                        sendResponse({ success: true, data: settings });
                    } catch (getError) {
                        console.error('❌ Error in getAISettings:', getError);
                        sendResponse({ success: false, error: getError.message });
                    }
                    break;

                case 'saveAISettings':
                    try {
                        await this.saveAISettings(message.settings);
                        sendResponse({ success: true });
                    } catch (saveError) {
                        console.error('❌ Error in saveAISettings:', saveError);
                        sendResponse({ success: false, error: saveError.message });
                    }
                    break;

                case 'checkRateLimit':
                    try {
                        const allowed = await this.checkRateLimit();
                        sendResponse({ success: true, allowed: allowed });
                    } catch (checkError) {
                        console.error('❌ Error in checkRateLimit:', checkError);
                        sendResponse({ success: false, error: checkError.message });
                    }
                    break;

                case 'incrementRateLimit':
                    try {
                        await this.incrementRateLimit();
                        sendResponse({ success: true });
                    } catch (incError) {
                        console.error('❌ Error in incrementRateLimit:', incError);
                        sendResponse({ success: false, error: incError.message });
                    }
                    break;

                case 'getResetTime':
                    try {
                        const minutes = await this.getResetTime();
                        sendResponse({ success: true, minutes: minutes });
                    } catch (resetError) {
                        console.error('❌ Error in getResetTime:', resetError);
                        sendResponse({ success: false, error: resetError.message });
                    }
                    break;

                case 'getAICache':
                    try {
                        const cache = await this.getAICache();
                        sendResponse({ success: true, data: cache });
                    } catch (cacheError) {
                        console.error('❌ Error in getAICache:', cacheError);
                        sendResponse({ success: false, error: cacheError.message });
                    }
                    break;

                case 'saveAICache':
                    try {
                        await this.saveAICache(message.cache);
                        sendResponse({ success: true });
                    } catch (saveError) {
                        console.error('❌ Error in saveAICache:', saveError);
                        sendResponse({ success: false, error: saveError.message });
                    }
                    break;

                case 'getRateLimitStatus':
                    try {
                        const status = await this.getRateLimitStatus();
                        sendResponse({ success: true, data: status });
                    } catch (statusError) {
                        console.error('❌ Error in getRateLimitStatus:', statusError);
                        sendResponse({ success: false, error: statusError.message });
                    }
                    break;

                default:
                    console.warn('Unknown action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('❌ Error handling message:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Original message:', message);
            const errorResponse = { success: false, error: error.message };
            console.log('📤 Sending error response:', errorResponse);
            sendResponse(errorResponse);
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
            console.log('🔄 Background: Saving note:', note.id, { x: note.x, y: note.y, width: note.width, height: note.height });
            
            // Check if note already exists
            const existingIndex = this.stickyNotes.findIndex(n => n.id === note.id);
            
            if (existingIndex !== -1) {
                // Update existing note
                console.log('🔄 Background: Updating existing note at index', existingIndex);
                console.log('🔄 Background: Old note:', { x: this.stickyNotes[existingIndex].x, y: this.stickyNotes[existingIndex].y });
                
                const updatedNote = { 
                    ...this.stickyNotes[existingIndex], 
                    ...note, 
                    updatedAt: Date.now() 
                };
                this.stickyNotes[existingIndex] = updatedNote;
                
                console.log('🔄 Background: Updated note:', { x: updatedNote.x, y: updatedNote.y, width: updatedNote.width, height: updatedNote.height });
            } else {
                // Add new note with timestamps
                console.log('🔄 Background: Adding new note');
                const newNote = {
                    ...note,
                    id: note.id || Date.now().toString(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                this.stickyNotes.push(newNote);
                console.log('🔄 Background: New note added:', { x: newNote.x, y: newNote.y, width: newNote.width, height: newNote.height });
            }

            await chrome.storage.local.set({ notes: this.stickyNotes });
            console.log('✅ Background: Note saved to storage:', note.id);
        } catch (error) {
            console.error('❌ Background: Error saving note:', error);
            throw error;
        }
    }

    async getNotes() {
        // Always read from chrome.storage.local directly.
        // Returning this.stickyNotes (in-memory) is unsafe: when the service
        // worker restarts after all tabs are closed, loadNotesFromStorage() is
        // called without await in init(), so this.stickyNotes may still be []
        // when the first getNotes message arrives.
        const result = await chrome.storage.local.get(['notes']);
        this.stickyNotes = result.notes || [];
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

    // Rich notification methods
    async showTaskNotification(task) {
        try {
            const notificationId = `task-reminder-${task.id}-${Date.now()}`;
            
            console.log('🔔 Creating rich Chrome notification for task:', task.title);
            console.log('🔔 Notification ID:', notificationId);

            // Check if chrome.notifications is available
            if (!chrome.notifications) {
                console.error('❌ chrome.notifications API not available');
                throw new Error('Chrome notifications API not available');
            }

            // Create rich notification
            const notificationOptions = {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '⏰ Task Reminder',
                message: `Don't forget: ${task.title}`,
                contextMessage: task.description || 'Task reminder from Productivity Hub',
                priority: 2, // High priority
                requireInteraction: true, // Keep notification visible until user interacts
                silent: false, // Allow sound
                buttons: [
                    { title: '✓ Mark Done' },
                    { title: '⏰ Snooze 5min' }
                ]
            };

            console.log('🔔 Notification options:', notificationOptions);

            // Create the notification
            chrome.notifications.create(notificationId, notificationOptions, (createdId) => {
                console.log('🔔 Notification callback called with ID:', createdId);
                
                if (chrome.runtime.lastError) {
                    console.error('❌ Failed to create notification:', chrome.runtime.lastError);
                    console.error('❌ Last error details:', chrome.runtime.lastError.message);
                    return;
                }
                
                console.log('✅ Rich notification created successfully:', createdId);
                
                // Store notification info
                this.activeNotifications.set(createdId, {
                    taskId: task.id,
                    task: task,
                    createdAt: Date.now()
                });

                // Track ringing task
                this.activeRingingTasks.add(task.id);

                console.log('🔔 Starting sound for notification:', createdId);
                // Start sound notification (30 seconds)
                this.startNotificationSound(createdId);

                // Broadcast to tabs that task is ringing
                this.broadcastToTabs({
                    type: 'taskRingingStarted',
                    taskId: task.id,
                    task: task,
                    notificationId: createdId
                });
            });

            return notificationId;

        } catch (error) {
            console.error('❌ Error creating task notification:', error);
            console.error('❌ Error details:', error.message, error.stack);
            throw error;
        }
    }

    startNotificationSound(notificationId) {
        console.log('🔊 Starting notification sound for:', notificationId);
        
        // Clear any existing sound timer for this notification
        if (this.notificationSounds.has(notificationId)) {
            clearTimeout(this.notificationSounds.get(notificationId));
        }

        // Create a timer to stop the sound after 30 seconds
        const soundTimer = setTimeout(() => {
            console.log('🔊 Auto-stopping notification sound after 30 seconds');
            this.stopNotificationSound(notificationId);
        }, 30000);

        this.notificationSounds.set(notificationId, soundTimer);

        // Send message to content script to play sound
        this.broadcastToTabs({
            type: 'startNotificationSound',
            notificationId: notificationId,
            duration: 30000
        });
    }

    stopNotificationSound(notificationId) {
        console.log('🔊 Stopping notification sound for:', notificationId);
        
        if (this.notificationSounds.has(notificationId)) {
            clearTimeout(this.notificationSounds.get(notificationId));
            this.notificationSounds.delete(notificationId);
        }

        // Get task info and remove from ringing tasks
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            this.activeRingingTasks.delete(notification.taskId);
            
            // Broadcast that task stopped ringing
            this.broadcastToTabs({
                type: 'taskRingingStopped',
                taskId: notification.taskId,
                notificationId: notificationId
            });
        }

        // Send message to content script to stop sound
        this.broadcastToTabs({
            type: 'stopNotificationSound',
            notificationId: notificationId
        });
    }

    // Stop notification sound for a specific task
    async stopNotificationSoundForTask(taskId) {
        console.log('🔊 Stopping notification sound for task:', taskId);
        
        // Find notification by task ID
        for (const [notificationId, notification] of this.activeNotifications.entries()) {
            if (notification.taskId === taskId) {
                // Clear the Chrome notification
                chrome.notifications.clear(notificationId);
                
                // Stop the sound
                this.stopNotificationSound(notificationId);
                
                // Remove from active notifications
                this.activeNotifications.delete(notificationId);
                break;
            }
        }
        
        // Ensure task is removed from ringing tasks
        this.activeRingingTasks.delete(taskId);
    }

    async closeTaskNotification(notificationId) {
        try {
            console.log('🔔 Closing notification:', notificationId);
            
            // Stop sound
            this.stopNotificationSound(notificationId);
            
            // Clear notification
            chrome.notifications.clear(notificationId, (wasCleared) => {
                if (wasCleared) {
                    console.log('✅ Notification cleared:', notificationId);
                } else {
                    console.log('⚠️ Notification was already cleared:', notificationId);
                }
            });

            // Remove from active notifications
            this.activeNotifications.delete(notificationId);

        } catch (error) {
            console.error('❌ Error closing notification:', error);
            throw error;
        }
    }

    // Broadcast message to all tabs
    async broadcastToTabs(message) {
        try {
            const tabs = await chrome.tabs.query({});
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {
                    // Ignore errors for tabs that don't have content script
                });
            });
        } catch (error) {
            console.log('Could not broadcast to tabs:', error);
        }
    }

    // Notification event handlers
    handleNotificationClick(notificationId) {
        console.log('🔔 Notification clicked:', notificationId);
        
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            // Focus on the extension tab
            this.focusExtensionTab();
            
            // Close the notification
            this.closeTaskNotification(notificationId);
        }
    }

    async handleNotificationButtonClick(notificationId, buttonIndex) {
        console.log('🔔 Notification button clicked:', notificationId, 'button:', buttonIndex);
        
        const notification = this.activeNotifications.get(notificationId);
        if (!notification) return;

        const task = notification.task;

        if (buttonIndex === 0) { // Mark Done
            console.log('✅ Marking task as done:', task.title);
            task.completed = true;
            task.updatedAt = Date.now();
            await this.updateTask(task);
            
            // Broadcast update to tabs
            this.broadcastToTabs({
                type: 'taskUpdated',
                task: task
            });
            
        } else if (buttonIndex === 1) { // Snooze 5 minutes
            console.log('⏰ Snoozing task for 5 minutes:', task.title);
            task.reminder = Date.now() + (5 * 60 * 1000); // 5 minutes from now
            task.updatedAt = Date.now();
            await this.updateTask(task);
            
            // Broadcast update to tabs
            this.broadcastToTabs({
                type: 'taskUpdated',
                task: task
            });
        }

        // Close the notification
        this.closeTaskNotification(notificationId);
    }

    handleNotificationClosed(notificationId, byUser) {
        console.log('🔔 Notification closed:', notificationId, 'by user:', byUser);
        
        // Stop sound when notification is closed
        this.stopNotificationSound(notificationId);
        
        // Remove from active notifications
        this.activeNotifications.delete(notificationId);
    }

    // Focus on extension tab
    async focusExtensionTab() {
        try {
            const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('newtab.html') });
            
            if (tabs.length > 0) {
                // Focus existing tab
                await chrome.tabs.update(tabs[0].id, { active: true });
                await chrome.windows.update(tabs[0].windowId, { focused: true });
            } else {
                // Create new tab
                await chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
            }
        } catch (error) {
            console.error('Error focusing extension tab:', error);
        }
    }

    // Simple test notification to debug issues
    async testSimpleNotification() {
        console.log('🧪 Testing simple Chrome notification...');
        
        try {
            // Check permissions first
            const permissionStatus = await this.checkNotificationPermissions();
            console.log('🔔 Permission status before test:', permissionStatus);
            
            // Test basic notification first
            const testId = 'test-simple-' + Date.now();
            
            chrome.notifications.create(testId, {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Test Notification',
                message: 'This is a simple test notification'
            }, (createdId) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Simple notification failed:', chrome.runtime.lastError);
                    console.error('❌ Error message:', chrome.runtime.lastError.message);
                } else {
                    console.log('✅ Simple notification created:', createdId);
                    
                    // Auto-close after 5 seconds
                    setTimeout(() => {
                        chrome.notifications.clear(createdId);
                        console.log('🔔 Test notification cleared');
                    }, 5000);
                }
            });
            
        } catch (error) {
            console.error('❌ Error creating test notification:', error);
        }
    }

    // Check notification permissions and system status
    async checkNotificationPermissions() {
        console.log('🔍 Checking notification permissions...');
        
        const status = {
            chromeNotificationsAPI: !!chrome.notifications,
            hasNotificationPermission: false,
            systemNotificationsEnabled: false,
            manifestPermissions: []
        };

        try {
            // Check if chrome.notifications API is available
            if (chrome.notifications) {
                console.log('✅ chrome.notifications API is available');
                
                // Check manifest permissions
                const manifest = chrome.runtime.getManifest();
                status.manifestPermissions = manifest.permissions || [];
                console.log('📋 Manifest permissions:', status.manifestPermissions);
                
                // Check if we have notification permission in manifest
                status.hasNotificationPermission = status.manifestPermissions.includes('notifications');
                console.log('🔔 Has notification permission in manifest:', status.hasNotificationPermission);
                
                // Try to check system notification settings (this may not be available in all contexts)
                try {
                    // This is a Chrome extension specific check
                    status.systemNotificationsEnabled = true; // Assume enabled if we can't check
                    console.log('🔔 System notifications assumed enabled');
                } catch (e) {
                    console.log('⚠️ Could not check system notification settings:', e.message);
                }
                
            } else {
                console.error('❌ chrome.notifications API not available');
            }
            
        } catch (error) {
            console.error('❌ Error checking notification permissions:', error);
            status.error = error.message;
        }

        console.log('🔍 Final permission status:', status);
        return status;
    }

    // AI Assistant Functions – multi-provider (Anthropic, Azure OpenAI, OpenAI)

    async callAIAPI(prompt, settingsOrApiKey) {
        const settings = await this.getMergedAISettings(settingsOrApiKey);
        const provider = (settings.api_provider || AI_API_CONFIG.defaultProvider || 'anthropic').toLowerCase();

        if (provider === 'azure') {
            return this.callAzureOpenAI(prompt, settings);
        }
        if (provider === 'openai') {
            return this.callOpenAI(prompt, settings);
        }
        return this.callAnthropicAPI(prompt, settings);
    }

    async getMergedAISettings(settingsOrApiKey) {
        const stored = await this.getAISettings();
        const config = AI_API_CONFIG || {};
        let settings = { ...stored };

        if (typeof settingsOrApiKey === 'string') {
            settings.api_key = settingsOrApiKey;
            settings.api_provider = settings.api_provider || config.defaultProvider || 'anthropic';
        } else if (settingsOrApiKey && typeof settingsOrApiKey === 'object') {
            settings = { ...settings, ...settingsOrApiKey };
        }

        const provider = (settings.api_provider || config.defaultProvider || 'anthropic').toLowerCase();
        if (provider === 'azure') {
            const cfg = config.azure || {};
            settings.azure_endpoint = settings.azure_endpoint || cfg.endpoint || '';
            settings.azure_deployment = settings.azure_deployment || cfg.deployment || '';
            settings.azure_api_version = settings.azure_api_version || cfg.api_version || '2024-02-15-preview';
            settings.api_key = settings.api_key || cfg.api_key || '';
        }
        if (provider === 'openai') {
            settings.api_key = settings.api_key || (config.openai && config.openai.api_key) || '';
        }
        if (provider === 'anthropic') {
            settings.api_key = settings.api_key || (config.anthropic && config.anthropic.api_key) || '';
        }
        return settings;
    }

    async callAnthropicAPI(prompt, settings) {
        const apiKey = settings.api_key;
        const model = (AI_API_CONFIG.anthropic && AI_API_CONFIG.anthropic.model) || 'claude-3-5-sonnet-20241022';
        console.log('[AI] Calling Anthropic API...');

        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        max_tokens: 1024,
                        messages: [{ role: 'user', content: prompt }]
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    if (response.status === 401) throw new Error('Invalid API key');
                    if (response.status === 429) throw new Error('Rate limit reached');
                    if (response.status >= 500 && attempt < maxRetries - 1) {
                        attempt++;
                        await this.sleep(Math.pow(2, attempt) * 1000);
                        continue;
                    }
                    throw new Error(errBody.error?.message || `API error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.content[0].text;
                const parsed = JSON.parse(content);
                console.log('[AI] Anthropic API call successful');
                return { success: true, data: parsed };
            } catch (error) {
                if (error.name === 'AbortError') throw new Error('Request timeout');
                if (attempt === maxRetries - 1) {
                    console.error('[AI] Anthropic API failed:', error);
                    return { success: false, error: error.message };
                }
                attempt++;
            }
        }
    }

    async callAzureOpenAI(prompt, settings) {
        const apiKey = settings.api_key;
        let endpoint = (settings.azure_endpoint || '').trim().replace(/\/$/, '');
        const deployment = (settings.azure_deployment || '').trim();
        const apiVersion = settings.azure_api_version || '2024-02-15-preview';

        if (!endpoint || !deployment) {
            return { success: false, error: 'Azure OpenAI: set endpoint and deployment in ai-api.config.js or AI Settings.' };
        }
        if (!apiKey) {
            return { success: false, error: 'Azure OpenAI: API key required. Set in ai-api.config.js or AI Settings.' };
        }

        const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${apiVersion}`;
        console.log('[AI] Calling Azure OpenAI...');

        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'api-key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 1024,
                        temperature: 0.2
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    if (response.status === 401) throw new Error('Invalid API key');
                    if (response.status === 429) throw new Error('Rate limit reached');
                    if (response.status >= 500 && attempt < maxRetries - 1) {
                        attempt++;
                        await this.sleep(Math.pow(2, attempt) * 1000);
                        continue;
                    }
                    const msg = errBody.error?.message || errBody.error || `API error: ${response.status}`;
                    throw new Error(msg);
                }

                const data = await response.json();
                const content = data.choices && data.choices[0] && data.choices[0].message
                    ? data.choices[0].message.content
                    : '';
                const parsed = JSON.parse(content);
                console.log('[AI] Azure OpenAI call successful');
                return { success: true, data: parsed };
            } catch (error) {
                if (error.name === 'AbortError') throw new Error('Request timeout');
                if (attempt === maxRetries - 1) {
                    console.error('[AI] Azure OpenAI failed:', error);
                    return { success: false, error: error.message };
                }
                attempt++;
            }
        }
    }

    async callOpenAI(prompt, settings) {
        const apiKey = settings.api_key;
        const model = (AI_API_CONFIG.openai && AI_API_CONFIG.openai.model) || 'gpt-4o-mini';
        console.log('[AI] Calling OpenAI API...');

        const maxRetries = 3;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 1024,
                        temperature: 0.2
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    if (response.status === 401) throw new Error('Invalid API key');
                    if (response.status === 429) throw new Error('Rate limit reached');
                    if (response.status >= 500 && attempt < maxRetries - 1) {
                        attempt++;
                        await this.sleep(Math.pow(2, attempt) * 1000);
                        continue;
                    }
                    throw new Error(errBody.error?.message || `API error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices && data.choices[0] && data.choices[0].message
                    ? data.choices[0].message.content
                    : '';
                const parsed = JSON.parse(content);
                console.log('[AI] OpenAI API call successful');
                return { success: true, data: parsed };
            } catch (error) {
                if (error.name === 'AbortError') throw new Error('Request timeout');
                if (attempt === maxRetries - 1) {
                    console.error('[AI] OpenAI API failed:', error);
                    return { success: false, error: error.message };
                }
                attempt++;
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getAISettings() {
        const result = await chrome.storage.local.get(['ai_settings']);
        return result.ai_settings || {
            api_provider: AI_API_CONFIG.defaultProvider || 'anthropic',
            api_key: null,
            auto_suggest: false,
            azure_endpoint: AI_API_CONFIG.azure?.endpoint || '',
            azure_deployment: AI_API_CONFIG.azure?.deployment || '',
            azure_api_version: AI_API_CONFIG.azure?.api_version || '2024-02-15-preview',
            rate_limit: {
                max_calls: 10,
                period_hours: 1,
                call_history: []
            }
        };
    }

    async saveAISettings(settings) {
        // Preserve rate limit if not included
        const current = await this.getAISettings();
        if (!settings.rate_limit) {
            settings.rate_limit = current.rate_limit;
        }

        await chrome.storage.local.set({ ai_settings: settings });
        console.log('[AI] Settings saved');
    }

    async checkRateLimit() {
        const settings = await this.getAISettings();
        const rateLimit = settings.rate_limit || {
            max_calls: 10,
            call_history: []
        };

        const now = Date.now();
        const oneHourAgo = now - 3600000;

        // Remove calls older than 1 hour
        rateLimit.call_history = rateLimit.call_history.filter(ts => ts > oneHourAgo);

        const allowed = rateLimit.call_history.length < rateLimit.max_calls;

        // Save updated history
        settings.rate_limit = rateLimit;
        await this.saveAISettings(settings);

        return allowed;
    }

    async incrementRateLimit() {
        const settings = await this.getAISettings();
        const rateLimit = settings.rate_limit || {
            max_calls: 10,
            call_history: []
        };

        rateLimit.call_history.push(Date.now());

        settings.rate_limit = rateLimit;
        await this.saveAISettings(settings);

        console.log('[AI] Rate limit incremented:', rateLimit.call_history.length, '/', rateLimit.max_calls);
    }

    async getResetTime() {
        const settings = await this.getAISettings();
        const rateLimit = settings.rate_limit || { call_history: [] };

        if (rateLimit.call_history.length === 0) {
            return 0;
        }

        const now = Date.now();
        const oneHourAgo = now - 3600000;
        const validCalls = rateLimit.call_history.filter(ts => ts > oneHourAgo);

        if (validCalls.length === 0) {
            return 0;
        }

        const oldestCall = Math.min(...validCalls);
        const resetTime = oldestCall + 3600000;
        const remainingMs = resetTime - now;

        return Math.max(0, Math.ceil(remainingMs / 60000)); // Minutes
    }

    async getAICache() {
        const result = await chrome.storage.local.get(['ai_cache']);
        return result.ai_cache || {};
    }

    async saveAICache(cache) {
        await chrome.storage.local.set({ ai_cache: cache });
    }

    async getRateLimitStatus() {
        const settings = await this.getAISettings();
        const rateLimit = settings.rate_limit || {
            max_calls: 10,
            call_history: []
        };

        const now = Date.now();
        const oneHourAgo = now - 3600000;
        const validCalls = rateLimit.call_history.filter(ts => ts > oneHourAgo);

        const resetMinutes = await this.getResetTime();

        return {
            current: validCalls.length,
            max: rateLimit.max_calls,
            resetMinutes: resetMinutes
        };
    }
}

// Initialize the background script
console.log('🚀 Initializing StickyNotesBackground...');
console.log('🔍 Service Worker context:', self);
console.log('🔍 Chrome runtime available:', !!chrome.runtime);
console.log('🔍 Chrome notifications available:', !!chrome.notifications);

const backgroundInstance = new StickyNotesBackground();
console.log('✅ StickyNotesBackground initialized:', backgroundInstance);
console.log('📋 Background instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(backgroundInstance)));

// Keep service worker alive
console.log('🔄 Setting up service worker keep-alive...');
chrome.runtime.onConnect.addListener(() => {
    console.log('🔗 Extension connected to service worker');
});

// Log when service worker starts/stops
console.log('✅ Background script fully loaded and ready');
