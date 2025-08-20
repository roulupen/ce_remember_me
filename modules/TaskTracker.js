// TaskTracker.js - Daily Task Tracker functionality module
class TaskTracker {
    constructor() {
        this.tasks = [];
        this.currentEditingTask = null;
        this.draggedTask = null;
        this.util = window.Utility; // Use global utility instance
        this.reminders = new Map(); // Store active reminders
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
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.log('Notification permission request failed:', error);
            }
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
                            onclick="taskTracker.toggleTaskCompletion('${task.id}')"
                            title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        ${task.completed ? '↶' : '✓'}
                    </button>
                    <button class="task-action-btn task-edit-btn" 
                            onclick="taskTracker.editTask('${task.id}')"
                            title="Edit task">
                        ✏
                    </button>
                    <button class="task-action-btn task-delete-btn" 
                            onclick="taskTracker.deleteTask('${task.id}')"
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
            this.draggedTask = task;
            taskElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', taskElement.outerHTML);
        });

        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
            this.draggedTask = null;
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
            titleEl.textContent = 'Edit Task';
            titleInput.value = task.title || '';
            descInput.value = task.description || '';
            prioritySelect.value = task.priority || 'medium';
            dateSelect.value = task.dateCategory || 'today';
            if (task.reminder) {
                const reminderDate = new Date(task.reminder);
                reminderInput.value = reminderDate.toISOString().slice(0, 16);
            } else {
                reminderInput.value = '';
            }
        } else {
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
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.openTaskModal(task);
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const response = await this.util.sendMessageToBackground({ 
                action: 'deleteTask', 
                taskId: taskId 
            });
            
            if (response.success) {
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
            console.error('Error deleting task:', error);
            this.util.showError('Failed to delete task');
        }
    }

    async toggleTaskCompletion(taskId) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            task.completed = !task.completed;
            task.updatedAt = Date.now();

            const response = await this.util.sendMessageToBackground({
                action: 'updateTask',
                task: task
            });

            if (response.success) {
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
            console.error('Error toggling task completion:', error);
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

    showTaskReminder(task) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Task Reminder', {
                body: `Don't forget: ${task.title}`,
                icon: 'icons/icon48.png',
                tag: `task-${task.id}`,
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                this.switchTab('tasks-tab');
                notification.close();
            };

            // Auto-close after 10 seconds
            setTimeout(() => {
                notification.close();
            }, 10000);
        }

        // Also show in-app notification
        this.util.showNotification(`Task Reminder: ${task.title}`, 'warning', 5000);
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
}

// Export for use in main newtab.js
window.TaskTracker = TaskTracker;
