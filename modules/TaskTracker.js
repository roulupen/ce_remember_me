// TaskTracker.js - Daily Task Tracker functionality module
class TaskTracker {
    constructor() {
        this.tasks = [];
        this.currentEditingTask = null;
        this.draggedTask = null;
        this.util = window.Utility; // Use global utility instance
        this.reminders = new Map(); // Store active reminders
        this.ringingTasks = new Set(); // Track locally ringing tasks
        this.notificationBanner = null; // Current notification banner
        this.notificationTimer = null; // Timer for banner countdown
        this.dateColumns = {
            'past': null, // Special case for past tasks
            'yesterday': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            'today': new Date(),
            'tomorrow': new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            'future': null // Special case for future tasks
        };
    }

    // Initialize task tracker functionality
    async init() {
        this.setupEventListeners();
        await this.loadTasksData();
        this.setupDateHeaders();
        this.setupNotificationPermission();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.closest('.tab-btn').dataset.tab);
            });
        });

        // Task management
        document.getElementById('add-task-btn')?.addEventListener('click', () => {
            this.openTaskModal();
        });

        document.getElementById('save-task')?.addEventListener('click', () => {
            this.saveTask();
        });

        document.getElementById('cancel-task')?.addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('close-task-modal')?.addEventListener('click', () => {
            this.closeTaskModal();
        });

        // Setup drag and drop for all task columns
        this.setupDragAndDrop();

        // Close modal when clicking outside
        document.getElementById('task-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
    }

    setupDateHeaders() {
        const today = new Date();
        const options = { month: 'short', day: 'numeric' };
        
        // Update date headers for yesterday
        const yesterdayElement = document.getElementById('date-yesterday');
        const yesterdayOption = document.getElementById('option-yesterday');
        if (yesterdayElement && this.dateColumns.yesterday) {
            const dateText = this.dateColumns.yesterday.toLocaleDateString('en-US', options);
            yesterdayElement.textContent = `Yesterday (${dateText})`;
            if (yesterdayOption) {
                yesterdayOption.textContent = `Yesterday (${dateText})`;
            }
        }

        // Set today's date specifically
        const todayElement = document.getElementById('date-today');
        const todayOption = document.getElementById('option-today');
        if (todayElement) {
            todayElement.textContent = `Today (${today.toLocaleDateString('en-US', options)})`;
        }
        if (todayOption) {
            todayOption.textContent = `Today (${today.toLocaleDateString('en-US', options)})`;
        }

        // Set tomorrow's date
        const tomorrowElement = document.getElementById('date-tomorrow');
        const tomorrowOption = document.getElementById('option-tomorrow');
        if (tomorrowElement) {
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            tomorrowElement.textContent = `Tomorrow (${tomorrow.toLocaleDateString('en-US', options)})`;
        }
        if (tomorrowOption) {
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
            tomorrowOption.textContent = `Tomorrow (${tomorrow.toLocaleDateString('en-US', options)})`;
        }
    }

    async setupNotificationPermission() {
        try {
            // Check if notifications are supported
            if ('Notification' in window) {
                console.log('🔔 Notification API available, current permission:', Notification.permission);
                
                if (Notification.permission === 'default') {
                    console.log('🔔 Requesting notification permission...');
                    const permission = await Notification.requestPermission();
                    console.log('🔔 Notification permission result:', permission);
                    
                    if (permission === 'granted') {
                        this.util.showSuccess('Notifications enabled for task reminders!');
                    } else if (permission === 'denied') {
                        this.util.showWarning('Notifications blocked. Task reminders will only show in-app.');
                    }
                } else if (Notification.permission === 'granted') {
                    console.log('✅ Notifications already permitted');
                } else {
                    console.log('❌ Notifications denied');
                    this.util.showWarning('Notifications blocked. Enable them in browser settings for task reminders.');
                }
            } else {
                console.log('❌ Notification API not available');
                this.util.showWarning('Browser notifications not supported.');
            }
        } catch (error) {
            console.error('❌ Error setting up notifications:', error);
            this.util.showError('Failed to setup notifications: ' + error.message);
        }
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');

        // Load tasks if switching to tasks tab
        if (tabId === 'tasks-tab') {
            this.renderTasks();
        }
    }

    // Load tasks data without rendering
    async loadTasksData() {
        try {
            console.log('Loading tasks data from storage...');
            const response = await this.util.sendMessageToBackground({ action: 'getTasks' });
            if (response.success) {
                this.tasks = response.data || [];
                console.log('Loaded', this.tasks.length, 'tasks from storage');
                
                // Debug: Log tasks with reminders
                this.tasks.forEach(task => {
                    if (task.reminder) {
                        console.log('📅 Task with reminder:', {
                            id: task.id,
                            title: task.title,
                            reminder: task.reminder,
                            reminderDate: new Date(task.reminder)
                        });
                    }
                });
                
                this.setupReminders();
            } else {
                console.error('Failed to load tasks data:', response);
            }
        } catch (error) {
            console.error('Error loading tasks data:', error);
        }
    }

    renderTasks() {
        console.log('Rendering tasks...');
        
        // Clear all task lists
        Object.keys(this.dateColumns).forEach(dateKey => {
            const container = document.getElementById(`tasks-${dateKey}`);
            if (container) {
                container.innerHTML = '';
            }
        });

        // Group tasks by date
        const tasksByDate = this.groupTasksByDate();

        // Render tasks in each column
        Object.keys(tasksByDate).forEach(dateKey => {
            const tasks = tasksByDate[dateKey];
            const container = document.getElementById(`tasks-${dateKey}`);
            
            if (container) {
                tasks.forEach(task => {
                    this.createTaskElement(task, container);
                });
            }

            // Update task count
            this.updateTaskCount(dateKey, tasks.length);
        });

        console.log('Finished rendering all tasks');
    }

    groupTasksByDate() {
        const groups = {
            'past': [],
            'yesterday': [],
            'today': [],
            'tomorrow': [],
            'future': []
        };

        this.tasks.forEach(task => {
            let dateKey = task.dateCategory || 'today';
            
            // Migrate old column names to new structure
            if (dateKey === 'day-minus-2' || dateKey === 'day-minus-1') {
                dateKey = dateKey === 'day-minus-1' ? 'yesterday' : 'past';
                // Update the task's dateCategory for future consistency
                task.dateCategory = dateKey;
            } else if (dateKey === 'day-plus-2') {
                dateKey = 'future';
                task.dateCategory = dateKey;
            }
            
            if (groups[dateKey]) {
                groups[dateKey].push(task);
            } else {
                groups['future'].push(task);
            }
        });

        // Sort tasks within each group by priority and creation date
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const aPriority = priorityOrder[a.priority] || 2;
                const bPriority = priorityOrder[b.priority] || 2;
                
                if (aPriority !== bPriority) {
                    return bPriority - aPriority; // Higher priority first
                }
                
                return new Date(b.createdAt) - new Date(a.createdAt); // Newer first
            });
        });

        return groups;
    }

    createTaskElement(task, container) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item priority-${task.priority || 'medium'}`;
        taskElement.dataset.taskId = task.id;
        taskElement.draggable = true;
        
        if (task.completed) {
            taskElement.classList.add('completed');
        }

        const reminderHtml = task.reminder ? `
            <div class="task-reminder">
                <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                </svg>
                ${this.formatReminderTime(task.reminder)}
            </div>
        ` : '';

        taskElement.innerHTML = `
            <div class="task-header">
                <h4 class="task-title">${this.util.escapeHtml(task.title)}</h4>
                <div class="task-actions">
                    <button class="task-action-btn task-complete-btn ${task.completed ? 'completed' : ''}" 
                            data-action="toggle-completion" data-task-id="${task.id}"
                            title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        ${task.completed ? '↶' : '✓'}
                    </button>
                    <button class="task-action-btn task-edit-btn" 
                            data-action="edit-task" data-task-id="${task.id}"
                            title="Edit task">
                        ✏
                    </button>
                    <button class="task-action-btn task-delete-btn" 
                            data-action="delete-task" data-task-id="${task.id}"
                            title="Delete task">
                        🗑
                    </button>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${this.util.escapeHtml(task.description)}</p>` : ''}
            ${reminderHtml}
        `;

        // Add drag event listeners
        taskElement.addEventListener('dragstart', (e) => {
            // Don't allow dragging if the user clicked on an action button
            if (e.target.classList.contains('task-action-btn') || 
                e.target.closest('.task-action-btn') || 
                e.target.closest('.task-actions')) {
                e.preventDefault();
                return false;
            }
            
            this.draggedTask = task;
            taskElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', taskElement.outerHTML);
        });

        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
            this.draggedTask = null;
        });

        // Prevent drag from starting when clicking on action buttons
        const actionButtons = taskElement.querySelectorAll('.task-action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            button.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });

            // Add click event listeners for task actions
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const action = button.getAttribute('data-action');
                const taskId = button.getAttribute('data-task-id');
                
                console.log(`🔘 Task action clicked: ${action} for task ${taskId}`);
                
                switch (action) {
                    case 'toggle-completion':
                        this.toggleTaskCompletion(taskId);
                        break;
                    case 'edit-task':
                        this.editTask(taskId);
                        break;
                    case 'delete-task':
                        this.deleteTask(taskId);
                        break;
                    default:
                        console.warn('Unknown task action:', action);
                }
            });
        });

        container.appendChild(taskElement);
    }

    setupDragAndDrop() {
        // Setup drop zones for all task columns
        document.querySelectorAll('.task-column').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', (e) => {
                if (!column.contains(e.relatedTarget)) {
                    column.classList.remove('drag-over');
                }
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                if (this.draggedTask) {
                    const newDateCategory = column.dataset.date;
                    this.moveTask(this.draggedTask.id, newDateCategory);
                }
            });
        });

        // Setup drag and drop within task lists for reordering
        document.querySelectorAll('.task-list').forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(list, e.clientY);
                const dragging = document.querySelector('.dragging');
                
                if (afterElement == null) {
                    list.appendChild(dragging);
                } else {
                    list.insertBefore(dragging, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async moveTask(taskId, newDateCategory) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            const oldCategory = task.dateCategory;
            task.dateCategory = newDateCategory;
            task.updatedAt = Date.now();

            // Update in background storage
            await this.util.sendMessageToBackground({
                action: 'updateTask',
                task: task
            });

            // Update local array
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = task;
            }

            // Re-render tasks
            this.renderTasks();
            
            this.util.showSuccess(`Task moved to ${this.getDateCategoryDisplayName(newDateCategory)}`);
            console.log(`Task ${taskId} moved from ${oldCategory} to ${newDateCategory}`);
        } catch (error) {
            console.error('Error moving task:', error);
            this.util.showError('Failed to move task');
        }
    }

    getDateCategoryDisplayName(category) {
        const names = {
            'past': 'past',
            'yesterday': 'yesterday',
            'today': 'today',
            'tomorrow': 'tomorrow',
            'future': 'future'
        };
        return names[category] || category;
    }

    updateTaskCount(dateKey, count) {
        const countElement = document.querySelector(`[data-date="${dateKey}"] .task-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Task CRUD operations
    openTaskModal(task = null) {
        this.currentEditingTask = task;
        const modal = document.getElementById('task-modal');
        const titleEl = modal.querySelector('#task-modal-title');
        const titleInput = modal.querySelector('#task-title');
        const descInput = modal.querySelector('#task-description');
        const prioritySelect = modal.querySelector('#task-priority');
        const dateSelect = modal.querySelector('#task-date');
        const reminderInput = modal.querySelector('#task-reminder');

        if (task) {
            console.log('📝 Editing task:', task);
            console.log('📝 Task reminder value:', task.reminder);
            console.log('📝 Task reminder type:', typeof task.reminder);
            
            titleEl.textContent = 'Edit Task';
            titleInput.value = task.title || '';
            descInput.value = task.description || '';
            prioritySelect.value = task.priority || 'medium';
            dateSelect.value = task.dateCategory || 'today';
            
            if (task.reminder) {
                const reminderDate = new Date(task.reminder);
                console.log('📝 Reminder date object:', reminderDate);
                console.log('📝 Is valid date:', !isNaN(reminderDate.getTime()));
                
                if (!isNaN(reminderDate.getTime())) {
                    // For datetime-local input, we need to format as YYYY-MM-DDTHH:mm
                    // and account for local timezone
                    const year = reminderDate.getFullYear();
                    const month = String(reminderDate.getMonth() + 1).padStart(2, '0');
                    const day = String(reminderDate.getDate()).padStart(2, '0');
                    const hours = String(reminderDate.getHours()).padStart(2, '0');
                    const minutes = String(reminderDate.getMinutes()).padStart(2, '0');
                    
                    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                    console.log('📝 Setting reminder input to (local time):', localDateTimeString);
                    reminderInput.value = localDateTimeString;
                    
                    // Verify it was set
                    setTimeout(() => {
                        console.log('📝 Reminder input value after setting:', reminderInput.value);
                    }, 100);
                } else {
                    console.warn('⚠️ Invalid reminder date, clearing field');
                    reminderInput.value = '';
                }
            } else {
                console.log('📝 No reminder set, clearing field');
                reminderInput.value = '';
            }
        } else {
            console.log('📝 Creating new task');
            titleEl.textContent = 'Add Task';
            titleInput.value = '';
            descInput.value = '';
            prioritySelect.value = 'medium';
            dateSelect.value = 'today';
            reminderInput.value = '';
        }

        modal.classList.add('active');
        titleInput.focus();
    }

    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.remove('active');
        this.currentEditingTask = null;
    }

    async saveTask() {
        const titleInput = document.getElementById('task-title');
        const descInput = document.getElementById('task-description');
        const prioritySelect = document.getElementById('task-priority');
        const dateSelect = document.getElementById('task-date');
        const reminderInput = document.getElementById('task-reminder');

        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        const priority = prioritySelect.value;
        const dateCategory = dateSelect.value;
        const reminder = reminderInput.value ? new Date(reminderInput.value).getTime() : null;

        if (!title) {
            this.util.showError('Please enter a task title');
            titleInput.focus();
            return;
        }

        const task = {
            title: title,
            description: description,
            priority: priority,
            dateCategory: dateCategory,
            reminder: reminder,
            completed: false
        };

        if (this.currentEditingTask) {
            // Update existing task
            task.id = this.currentEditingTask.id;
            task.createdAt = this.currentEditingTask.createdAt;
            task.updatedAt = Date.now();
        } else {
            // Create new task
            task.id = this.util.generateId();
            task.createdAt = Date.now();
            task.updatedAt = Date.now();
        }

        try {
            const response = await this.util.sendMessageToBackground({ 
                action: 'saveTask', 
                task: task 
            });
            
            if (response.success) {
                // Update local array
                if (this.currentEditingTask) {
                    const index = this.tasks.findIndex(t => t.id === task.id);
                    if (index !== -1) {
                        this.tasks[index] = task;
                    }
                } else {
                    this.tasks.push(task);
                }

                // Setup reminder if specified
                if (task.reminder) {
                    this.setupTaskReminder(task);
                }

                this.renderTasks();
                this.closeTaskModal();
                this.util.showSuccess(this.currentEditingTask ? 'Task updated' : 'Task created');
            } else {
                throw new Error(response.error || 'Failed to save task');
            }
        } catch (error) {
            console.error('Error saving task:', error);
            this.util.showError('Failed to save task');
        }
    }

    editTask(taskId) {
        console.log('🔧 Edit task called for ID:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            console.log('✅ Task found, opening modal:', task.title);
            console.log('📝 Full task data:', task);
            console.log('📝 Task reminder specifically:', task.reminder);
            this.openTaskModal(task);
        } else {
            console.error('❌ Task not found:', taskId);
            console.log('Available tasks:', this.tasks.map(t => ({ id: t.id, title: t.title, reminder: t.reminder })));
        }
    }

    async deleteTask(taskId) {
        console.log('🗑️ Delete task called for ID:', taskId);
        
        if (!confirm('Are you sure you want to delete this task?')) {
            console.log('❌ User cancelled deletion');
            return;
        }

        try {
            console.log('🔄 Sending delete request to background...');
            const response = await this.util.sendMessageToBackground({ 
                action: 'deleteTask', 
                taskId: taskId 
            });
            
            if (response.success) {
                console.log('✅ Task deleted successfully from storage');
                // Remove from local array
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                
                // Clear any active reminder
                if (this.reminders.has(taskId)) {
                    clearTimeout(this.reminders.get(taskId));
                    this.reminders.delete(taskId);
                }

                this.renderTasks();
                this.util.showSuccess('Task deleted');
            } else {
                throw new Error(response.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('❌ Error deleting task:', error);
            this.util.showError('Failed to delete task');
        }
    }

    async toggleTaskCompletion(taskId) {
        console.log('✅ Toggle completion called for ID:', taskId);
        
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                console.error('❌ Task not found:', taskId);
                return;
            }

            console.log('🔄 Toggling task completion from', task.completed, 'to', !task.completed);
            task.completed = !task.completed;
            task.updatedAt = Date.now();

            const response = await this.util.sendMessageToBackground({
                action: 'updateTask',
                task: task
            });

            if (response.success) {
                console.log('✅ Task completion updated successfully');
                // Update local array
                const index = this.tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    this.tasks[index] = task;
                }

                this.renderTasks();
                this.util.showSuccess(task.completed ? 'Task completed!' : 'Task marked as incomplete');
            } else {
                throw new Error(response.error || 'Failed to update task');
            }
        } catch (error) {
            console.error('❌ Error toggling task completion:', error);
            this.util.showError('Failed to update task');
        }
    }

    // Reminder system
    setupReminders() {
        this.tasks.forEach(task => {
            if (task.reminder && !task.completed) {
                this.setupTaskReminder(task);
            }
        });
    }

    setupTaskReminder(task) {
        if (!task.reminder || task.completed) return;

        const reminderTime = new Date(task.reminder).getTime();
        const currentTime = Date.now();
        const delay = reminderTime - currentTime;

        // Clear existing reminder for this task
        if (this.reminders.has(task.id)) {
            clearTimeout(this.reminders.get(task.id));
        }

        if (delay > 0) {
            const timeoutId = setTimeout(() => {
                this.showTaskReminder(task);
                this.reminders.delete(task.id);
            }, delay);

            this.reminders.set(task.id, timeoutId);
            console.log(`Reminder set for task "${task.title}" in ${Math.round(delay / 1000)} seconds`);
        } else if (delay > -60000) { // Show if less than 1 minute past due
            this.showTaskReminder(task);
        }
    }

    async showTaskReminder(task) {
        console.log('🔔 Showing task reminder for:', task.title);
        
        // Always show in-app notification first
        this.util.showNotification(`⏰ Task Reminder: ${task.title}`, 'warning', 8000);
        
        try {
            // Use background script for rich Chrome notifications with sound
            console.log('🔔 Requesting rich notification from background script...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'showTaskNotification',
                task: task
            });
            
            if (response.success) {
                console.log('✅ Rich notification requested successfully');
            } else {
                console.error('❌ Failed to request rich notification:', response.error);
                this.fallbackToWebNotification(task);
            }
            
        } catch (error) {
            console.error('❌ Error requesting rich notification:', error);
            this.fallbackToWebNotification(task);
        }
    }

    // Fallback to web notification if background notification fails
    fallbackToWebNotification(task) {
        console.log('🔔 Using fallback web notification...');
        
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notification = new Notification('⏰ Task Reminder', {
                    body: `Don't forget: ${task.title}`,
                    icon: '/icons/icon48.png',
                    tag: `task-${task.id}`,
                    requireInteraction: true,
                    silent: false
                });

                notification.onclick = () => {
                    console.log('🔔 Fallback notification clicked');
                    window.focus();
                    this.switchTab('tasks-tab');
                    notification.close();
                };

                // Auto-close after 10 seconds
                setTimeout(() => {
                    try {
                        notification.close();
                    } catch (e) {
                        // Ignore error if already closed
                    }
                }, 10000);
                
            } catch (error) {
                console.error('❌ Failed to create fallback notification:', error);
            }
        } else {
            console.log('🔔 Web notifications not available or not permitted');
        }
    }

    formatReminderTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        let dateStr;
        if (taskDate.getTime() === today.getTime()) {
            dateStr = 'Today';
        } else if (taskDate.getTime() === tomorrow.getTime()) {
            dateStr = 'Tomorrow';
        } else {
            dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        const timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        return `${dateStr} at ${timeStr}`;
    }

    // Helper methods
    isTasksTabActive() {
        const tasksTab = document.getElementById('tasks-tab');
        return tasksTab && tasksTab.classList.contains('active');
    }

    // Test notification method for debugging
    async testNotification() {
        console.log('🧪 Testing rich notification system...');
        const testTask = {
            id: 'test-' + Date.now(),
            title: 'Test Rich Notification with Sound',
            description: 'This is a test of the new notification system with 30-second sound',
            reminder: Date.now() + (2 * 60 * 1000) // 2 minutes from now
        };
        
        // Add to tasks array for testing
        this.tasks.push(testTask);
        
        // Save the test task
        try {
            const response = await this.util.sendMessageToBackground({ 
                action: 'saveTask', 
                task: testTask 
            });
            
            if (response.success) {
                console.log('✅ Test task saved with reminder');
                this.util.showSuccess('Test task created with 2-minute reminder. Try editing it to test reminder field.');
                await this.loadTasksData(); // Refresh to show the new task
            }
        } catch (error) {
            console.error('❌ Error saving test task:', error);
        }
    }

    // Test simple Chrome notification
    async testSimpleNotification() {
        console.log('🧪 Testing simple Chrome notification...');
        
        try {
            // First check permissions
            await this.checkNotificationDiagnostics();
            
            const response = await chrome.runtime.sendMessage({
                action: 'testSimpleNotification'
            });
            
            if (response.success) {
                console.log('✅ Simple notification test requested successfully');
                this.util.showSuccess('Simple notification test sent to background script');
            } else {
                console.error('❌ Failed to request simple notification test:', response.error);
                this.util.showError('Failed to test simple notification: ' + response.error);
            }
            
        } catch (error) {
            console.error('❌ Error requesting simple notification test:', error);
            this.util.showError('Error testing simple notification: ' + error.message);
        }
    }

    // Test basic connection to background script
    async testConnection() {
        console.log('🧪 Testing connection to background script...');
        
        try {
            // Check if chrome.runtime is available
            console.log('🔍 Chrome runtime available:', !!chrome.runtime);
            console.log('🔍 Chrome runtime ID:', chrome.runtime.id);
            
            // Try to wake up the service worker first
            console.log('🔄 Attempting to wake service worker...');
            
            console.log('📤 Sending testConnection message...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'testConnection'
            });
            
            console.log('📡 Raw connection test response:', response);
            console.log('📡 Response type:', typeof response);
            console.log('📡 Response success property:', response?.success);
            console.log('📡 Response error property:', response?.error);
            console.log('📡 Response message property:', response?.message);
            
            if (response && response.success) {
                console.log('✅ Background script connection successful');
                this.util.showSuccess('Background script connected: ' + (response.message || 'OK'));
                
                // Now test notification
                await this.testSimpleNotification();
            } else if (response && response.error) {
                console.error('❌ Background script connection failed:', response.error);
                this.util.showError('Connection failed: ' + response.error);
            } else if (response === undefined) {
                console.error('❌ No response from background script (service worker may be inactive)');
                this.util.showError('No response - service worker may be inactive. Try reloading the extension.');
            } else {
                console.error('❌ Unexpected response format:', response);
                this.util.showError('Unexpected response: ' + JSON.stringify(response));
            }
            
        } catch (error) {
            console.error('❌ Error testing connection:', error);
            console.error('❌ Error details:', error.message, error.stack);
            
            if (error.message.includes('Extension context invalidated')) {
                this.util.showError('Extension context invalidated - reload the extension');
            } else if (error.message.includes('Could not establish connection')) {
                this.util.showError('Could not connect to background script - service worker may be inactive');
            } else {
                this.util.showError('Connection error: ' + error.message);
            }
        }
    }

    // Comprehensive notification diagnostics
    async checkNotificationDiagnostics() {
        console.log('🔍 Running notification diagnostics...');
        
        try {
            // Check background script permissions
            const response = await chrome.runtime.sendMessage({
                action: 'checkNotificationPermissions'
            });
            
            if (response.success) {
                console.log('🔍 Background script permission check:', response.data);
                
                // Check frontend notification API
                const frontendStatus = {
                    notificationAPI: 'Notification' in window,
                    permission: window.Notification ? window.Notification.permission : 'not available',
                    chromeRuntime: !!chrome.runtime,
                    chromeNotifications: !!chrome.notifications
                };
                
                console.log('🔍 Frontend notification status:', frontendStatus);
                
                // Combine results and show summary
                const summary = `
🔍 **Notification Diagnostics**:
- Chrome notifications API: ${response.data.chromeNotificationsAPI ? '✅' : '❌'}
- Manifest permission: ${response.data.hasNotificationPermission ? '✅' : '❌'}
- Web Notification API: ${frontendStatus.notificationAPI ? '✅' : '❌'}
- Web permission: ${frontendStatus.permission}
- Chrome runtime: ${frontendStatus.chromeRuntime ? '✅' : '❌'}
                `;
                
                console.log(summary);
                this.util.showNotification('Check console for detailed diagnostics', 'info', 5000);
                
            } else {
                console.error('❌ Failed to check permissions:', response.error);
            }
            
        } catch (error) {
            console.error('❌ Error running diagnostics:', error);
        }
    }

    // Handle task ringing started
    handleTaskRingingStarted(message) {
        console.log('🔔 Handling task ringing started:', message.taskId);
        
        const { taskId, task, notificationId } = message;
        
        // Add to ringing tasks
        this.ringingTasks.add(taskId);
        
        // Highlight the task
        this.highlightRingingTask(taskId);
        
        // Show notification banner
        this.showNotificationBanner(task, notificationId);
        
        // Switch to tasks tab if not already there
        if (!this.isTasksTabActive()) {
            this.switchTab('tasks-tab');
        }
    }

    // Handle task ringing stopped
    handleTaskRingingStopped(message) {
        console.log('🔕 Handling task ringing stopped:', message.taskId);
        
        const { taskId } = message;
        
        // Remove from ringing tasks
        this.ringingTasks.delete(taskId);
        
        // Remove highlight
        this.removeTaskHighlight(taskId);
        
        // Hide notification banner
        this.hideNotificationBanner();
    }

    // Highlight ringing task
    highlightRingingTask(taskId) {
        console.log('✨ Highlighting ringing task:', taskId);
        
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('notification-ringing');
            
            // Scroll task into view
            taskElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // Remove task highlight
    removeTaskHighlight(taskId) {
        console.log('🔄 Removing highlight from task:', taskId);
        
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.remove('notification-ringing');
        }
    }

    // Show notification banner
    showNotificationBanner(task, notificationId) {
        console.log('📢 Showing notification banner for:', task.title);
        
        // Remove existing banner
        this.hideNotificationBanner();
        
        // Create banner HTML
        const banner = document.createElement('div');
        banner.className = 'notification-banner';
        banner.innerHTML = `
            <div class="notification-banner-content">
                <div class="notification-banner-icon">🔔</div>
                <div class="notification-banner-text">
                    <div class="notification-banner-title">Task Reminder</div>
                    <div class="notification-banner-subtitle">${this.util.escapeHtml(task.title)}</div>
                </div>
            </div>
            <div class="notification-banner-actions">
                <div class="notification-banner-time" id="banner-countdown">30s</div>
                <button class="notification-banner-btn" data-action="complete" data-task-id="${task.id}">
                    ✓ Mark Done
                </button>
                <button class="notification-banner-btn" data-action="snooze" data-task-id="${task.id}">
                    ⏰ Snooze 5min
                </button>
                <button class="notification-banner-btn stop-btn" data-action="stop" data-task-id="${task.id}">
                    🔇 Stop Sound
                </button>
            </div>
        `;
        
        // Add event listeners to banner buttons
        banner.querySelectorAll('.notification-banner-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                const taskId = btn.getAttribute('data-task-id');
                this.handleBannerAction(action, taskId);
            });
        });
        
        // Add banner to page
        document.body.appendChild(banner);
        this.notificationBanner = banner;
        
        // Add padding to main content
        const tabContent = document.querySelector('.tab-content.active');
        if (tabContent) {
            tabContent.classList.add('banner-active');
        }
        
        // Start countdown timer
        this.startBannerCountdown(30);
    }

    // Hide notification banner
    hideNotificationBanner() {
        if (this.notificationBanner) {
            console.log('📢 Hiding notification banner');
            
            this.notificationBanner.remove();
            this.notificationBanner = null;
            
            // Remove padding from main content
            const tabContent = document.querySelector('.tab-content.active');
            if (tabContent) {
                tabContent.classList.remove('banner-active');
            }
            
            // Clear countdown timer
            if (this.notificationTimer) {
                clearInterval(this.notificationTimer);
                this.notificationTimer = null;
            }
        }
    }

    // Start banner countdown
    startBannerCountdown(seconds) {
        let remaining = seconds;
        const countdownEl = document.getElementById('banner-countdown');
        
        this.notificationTimer = setInterval(() => {
            remaining--;
            if (countdownEl) {
                countdownEl.textContent = `${remaining}s`;
            }
            
            if (remaining <= 0) {
                this.hideNotificationBanner();
            }
        }, 1000);
    }

    // Handle banner button actions
    async handleBannerAction(action, taskId) {
        console.log('🎯 Banner action:', action, 'for task:', taskId);
        
        try {
            switch (action) {
                case 'complete':
                    await this.toggleTaskCompletion(taskId);
                    this.hideNotificationBanner();
                    break;
                    
                case 'snooze':
                    await this.snoozeTask(taskId, 5); // 5 minutes
                    this.hideNotificationBanner();
                    break;
                    
                case 'stop':
                    await this.stopTaskNotificationSound(taskId);
                    this.hideNotificationBanner();
                    break;
            }
        } catch (error) {
            console.error('❌ Error handling banner action:', error);
        }
    }

    // Stop notification sound for specific task
    async stopTaskNotificationSound(taskId) {
        console.log('🔇 Stopping notification sound for task:', taskId);
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'stopNotificationSound',
                taskId: taskId
            });
            
            if (response.success) {
                console.log('✅ Notification sound stopped successfully');
                this.util.showSuccess('Notification sound stopped');
            } else {
                console.error('❌ Failed to stop notification sound:', response.error);
            }
        } catch (error) {
            console.error('❌ Error stopping notification sound:', error);
        }
    }

    // Snooze task for specified minutes
    async snoozeTask(taskId, minutes) {
        console.log('⏰ Snoozing task for', minutes, 'minutes:', taskId);
        
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.reminder = Date.now() + (minutes * 60 * 1000);
            task.updatedAt = Date.now();
            
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'updateTask',
                    task: task
                });
                
                if (response.success) {
                    console.log('✅ Task snoozed successfully');
                    this.util.showSuccess(`Task snoozed for ${minutes} minutes`);
                    await this.loadTasksData(); // Refresh display
                } else {
                    console.error('❌ Failed to snooze task:', response.error);
                }
            } catch (error) {
                console.error('❌ Error snoozing task:', error);
            }
        }
    }
}

// Export for use in main newtab.js
window.TaskTracker = TaskTracker;
