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
                case 'showTaskNotification':
                    await this.showTaskNotification(message.task);
                    sendResponse({ success: true });
                    break;
                case 'closeTaskNotification':
                    await this.closeTaskNotification(message.notificationId);
                    sendResponse({ success: true });
                    break;
                case 'testSimpleNotification':
                    await this.testSimpleNotification();
                    sendResponse({ success: true });
                    break;
                case 'checkNotificationPermissions':
                    const permissionStatus = await this.checkNotificationPermissions();
                    sendResponse({ success: true, data: permissionStatus });
                    break;
                case 'testConnection':
                    console.log('✅ Test connection received successfully');
                    console.log('📤 Sending success response...');
                    const testResponse = { success: true, message: 'Background script connected' };
                    console.log('📤 Response object:', testResponse);
                    sendResponse(testResponse);
                    console.log('✅ Response sent');
                    break;
                case 'stopNotificationSound':
                    await this.stopNotificationSoundForTask(message.taskId);
                    sendResponse({ success: true });
                    break;
                case 'getActiveRingingTasks':
                    sendResponse({ success: true, data: Array.from(this.activeRingingTasks) });
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
