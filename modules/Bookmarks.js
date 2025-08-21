// Bookmarks Module - Modern bookmark management with sidebar and groups
class Bookmarks {
    constructor() {
        this.bookmarkGroups = [];
        this.maxGroups = 10;
        this.sidebarState = 'collapsed'; // 'collapsed', 'visible' (only 2 states) 
        this.currentTabs = [];
        this.storage = chrome.storage.local;
        this.storageKey = 'bookmarks_data';
        this.draggedBookmark = null;
        this.draggedGroup = null;
        this.draggedTab = null;
        this.isRenderingSidebar = false; // Prevent concurrent renders
        this.lastToggleTime = 0; // Prevent rapid toggle spam
        this.eventListenerSetupCount = 0; // Track setup calls
        
        // Module initialized
    }

    async init() {
        // Initializing bookmarks module
        
        try {
            // Load saved data
            await this.loadBookmarks();
            
            // Get current Chrome tabs
            await this.loadCurrentTabs();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup group title editing
            this.setupGroupTitleEditing();
            
            console.log('[Bookmarks] === BOOKMARKS MODULE INIT COMPLETE ===');
            console.log('[Bookmarks] Initial sidebar state:', this.sidebarState);
            console.log('[Bookmarks] Event listeners attached:', Date.now());
            
            // Attach debug function to window for manual debugging
            window.debugBookmarksState = () => this.logCurrentState();
        } catch (error) {
            console.error('[Bookmarks] Initialization failed:', error);
            throw error;
        }
    }

    async loadBookmarks() {
        try {
            const data = await this.storage.get(this.storageKey);
            
            if (data[this.storageKey] && data[this.storageKey].groups) {
                this.bookmarkGroups = data[this.storageKey].groups;
                // Migrate old sidebarVisible property or use default collapsed state
                if (data[this.storageKey].sidebarState) {
                    // Handle legacy 3-state system - convert 'hidden' to 'collapsed'
                    this.sidebarState = data[this.storageKey].sidebarState === 'hidden' 
                        ? 'collapsed' 
                        : data[this.storageKey].sidebarState;
                } else if (data[this.storageKey].sidebarVisible !== undefined) {
                    this.sidebarState = data[this.storageKey].sidebarVisible ? 'visible' : 'collapsed';
                } else {
                    this.sidebarState = 'collapsed';
                }
            } else {
                // Create default bookmark group
                this.createDefaultGroup();
            }
            
            console.log('[Bookmarks] Loaded', this.bookmarkGroups.length, 'bookmark groups');
        } catch (error) {
            console.error('[Bookmarks] Error loading bookmarks:', error);
            this.createDefaultGroup();
        }
    }

    createDefaultGroup() {
        this.bookmarkGroups = [{
            id: this.generateId(),
            name: 'Default',
            bookmarks: [],
            color: '#3498db',
            created: Date.now()
        }];
    }

    async loadCurrentTabs() {
        console.log('[Bookmarks] === LOAD CURRENT TABS START ===');
        try {
            console.log('[Bookmarks] Attempting to load current tabs...');
            console.log('[Bookmarks] Chrome object available:', !!chrome);
            console.log('[Bookmarks] Chrome.tabs available:', !!chrome?.tabs);
            console.log('[Bookmarks] Previous tabs count:', this.currentTabs.length);
            
            // Always reset tabs array first to prevent duplicates
            this.currentTabs = [];
            console.log('[Bookmarks] Tabs array reset to empty');
            
            if (chrome?.tabs) {
                // Use chrome.tabs.query with proper permissions
                this.currentTabs = await new Promise((resolve, reject) => {
                    chrome.tabs.query({}, (tabs) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(tabs || []);
                        }
                    });
                });
                console.log('[Bookmarks] Successfully loaded', this.currentTabs.length, 'current tabs');
                if (this.currentTabs.length > 0) {
                    console.log('[Bookmarks] Sample tab full object:', this.currentTabs[0]);
                    console.log('[Bookmarks] Sample tab properties:', {
                        title: this.currentTabs[0].title,
                        url: this.currentTabs[0].url,
                        favIconUrl: this.currentTabs[0].favIconUrl,
                        id: this.currentTabs[0].id,
                        windowId: this.currentTabs[0].windowId
                    });
                }
            } else {
                console.warn('[Bookmarks] Chrome tabs API not available, using mock data');
                // Add some mock tabs for testing
                this.addMockTabs();
                console.log('[Bookmarks] Mock tabs added, count:', this.currentTabs.length);
            }
        } catch (error) {
            console.error('[Bookmarks] Error loading current tabs:', error);
            console.error('[Bookmarks] Error details:', error.message);
            // Add some mock tabs for testing
            this.addMockTabs();
            console.log('[Bookmarks] Fallback mock tabs added, count:', this.currentTabs.length);
        }
        
        console.log('[Bookmarks] === LOAD CURRENT TABS COMPLETE ===');
        console.log('[Bookmarks] Final tabs count:', this.currentTabs.length);
    }

    addMockTabs() {
        console.log('[Bookmarks] Adding exactly 3 mock tabs for testing...');
        // Ensure we completely replace any existing tabs
        this.currentTabs = [
            {
                id: 1,
                title: "Google",
                url: "https://www.google.com",
                favIconUrl: "https://www.google.com/favicon.ico"
            },
            {
                id: 2,
                title: "GitHub",
                url: "https://github.com",
                favIconUrl: "https://github.com/favicon.ico"
            },
            {
                id: 3,
                title: "Stack Overflow",
                url: "https://stackoverflow.com",
                favIconUrl: "https://stackoverflow.com/favicon.ico"
            }
        ];
        console.log('[Bookmarks] Mock tabs set. Total count:', this.currentTabs.length);
    }

    setupEventListeners() {
        this.eventListenerSetupCount++;
        console.log('[Bookmarks] === SETTING UP EVENT LISTENERS ===');
        console.log('[Bookmarks] Setup call count:', this.eventListenerSetupCount);
        
        if (this.eventListenerSetupCount > 1) {
            console.warn('[Bookmarks] WARNING: Event listeners being set up multiple times!');
        }
        
        // Sidebar toggle - Fixed to handle clicks on button and its children (SVG)
        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('#toggle-sidebar-btn');
            if (toggleBtn) {
                console.log('[Bookmarks] === TOGGLE BUTTON CLICKED ===');
                console.log('[Bookmarks] Click event details:', {
                    target: e.target.tagName,
                    targetId: e.target.id,
                    targetClass: e.target.className,
                    buttonFound: !!toggleBtn,
                    buttonId: toggleBtn?.id,
                    currentState: this.sidebarState,
                    timestamp: Date.now(),
                    eventType: e.type
                });
                e.preventDefault();
                e.stopPropagation();
                this.toggleSidebar();
            }
            if (e.target.id === 'add-bookmark-group-btn') {
                this.showAddGroupModal();
            }
            if (e.target.closest('.sidebar-tab-item')) {
                this.handleTabClick(e);
            }
            // Handle inline bookmark buttons first (with higher specificity)
            if (e.target.closest('.bookmark-edit-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.enterBookmarkEditMode(e.target.closest('.bookmark-edit-btn'));
            } else if (e.target.closest('.bookmark-delete-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const bookmarkId = e.target.closest('.bookmark-delete-btn').dataset.bookmarkId;
                this.deleteBookmark(bookmarkId);
            } else if (e.target.closest('.bookmark-save-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.saveBookmarkEdit(e.target.closest('.bookmark-save-btn'));
            } else if (e.target.closest('.bookmark-cancel-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.cancelBookmarkEdit(e.target.closest('.bookmark-cancel-btn'));
            } 
            // Handle inline group buttons
            else if (e.target.closest('.group-edit-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.enterGroupEditMode(e.target.closest('.group-edit-btn'));
            } else if (e.target.closest('.group-delete-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const groupId = e.target.closest('.group-delete-btn').dataset.groupId;
                this.deleteGroup(groupId);
            } else if (e.target.closest('.group-save-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.saveGroupEdit(e.target.closest('.group-save-btn'));
            } else if (e.target.closest('.group-cancel-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.cancelGroupEdit(e.target.closest('.group-cancel-btn'));
            } 
            // Handle bookmark and group clicks
            else if (e.target.closest('.clean-bookmark-item')) {
                // Only handle bookmark click if it's not on the action buttons
                if (!e.target.closest('.bookmark-actions')) {
                    this.handleBookmarkClick(e);
                }
            }
            if (e.target.closest('.clean-group-header')) {
                // Only handle group header click if it's not on the action buttons
                if (!e.target.closest('.group-actions')) {
                    this.handleGroupHeaderClick(e);
                }
            }
            if (e.target.closest('.group-action-btn')) {
                this.handleGroupAction(e);
            }
        });

        // Double click to add bookmark
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('.clean-bookmarks-list')) {
                const groupId = e.target.closest('.clean-bookmark-group').dataset.groupId;
                this.showAddBookmarkModal(groupId);
            }
        });

        // Context menu for bookmarks
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.clean-bookmark-item')) {
                e.preventDefault();
                this.showBookmarkContextMenu(e);
            } else if (e.target.closest('.clean-group-header')) {
                e.preventDefault();
                this.showGroupContextMenu(e);
            }
        });

        // Keyboard shortcuts for inline editing
        document.addEventListener('keydown', (e) => {
            // Handle keyboard shortcuts in bookmark edit mode
            if (e.target.closest('.bookmark-edit-mode')) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const saveBtn = e.target.closest('.bookmark-edit-mode').querySelector('.bookmark-save-btn');
                    if (saveBtn) {
                        this.saveBookmarkEdit(saveBtn);
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    const cancelBtn = e.target.closest('.bookmark-edit-mode').querySelector('.bookmark-cancel-btn');
                    if (cancelBtn) {
                        this.cancelBookmarkEdit(cancelBtn);
                    }
                }
            }
            // Handle keyboard shortcuts in group edit mode
            else if (e.target.closest('.group-edit-mode')) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const saveBtn = e.target.closest('.group-edit-mode').querySelector('.group-save-btn');
                    if (saveBtn) {
                        this.saveGroupEdit(saveBtn);
                    }
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    const cancelBtn = e.target.closest('.group-edit-mode').querySelector('.group-cancel-btn');
                    if (cancelBtn) {
                        this.cancelGroupEdit(cancelBtn);
                    }
                }
            }
        });

        // Drag and drop
        document.addEventListener('dragstart', (e) => this.handleDragStart(e));
        document.addEventListener('dragover', (e) => this.handleDragOver(e));
        document.addEventListener('drop', (e) => this.handleDrop(e));
        document.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    toggleSidebar() {
        const now = Date.now();
        console.log('[Bookmarks] === TOGGLE SIDEBAR START ===');
        console.log('[Bookmarks] Toggle requested at:', now);
        console.log('[Bookmarks] Last toggle time:', this.lastToggleTime);
        console.log('[Bookmarks] Time since last toggle:', now - this.lastToggleTime, 'ms');
        console.log('[Bookmarks] Current state before toggle:', this.sidebarState);
        console.log('[Bookmarks] Is rendering sidebar:', this.isRenderingSidebar);
        
        // Prevent rapid-fire toggle (minimum 300ms between toggles)
        if (now - this.lastToggleTime < 300) {
            console.log('[Bookmarks] Toggle blocked - too rapid (< 300ms)');
            return;
        }
        
        // Prevent toggle during sidebar rendering to avoid race conditions
        if (this.isRenderingSidebar) {
            console.log('[Bookmarks] Toggle blocked - sidebar currently rendering');
            return;
        }
        
        this.lastToggleTime = now;
        
        const previousState = this.sidebarState;
        
        // Toggle between only 2 states: collapsed ↔ visible  
        // (Never fully hide the sidebar - always show at least icons)
        if (this.sidebarState === 'visible') {
            this.sidebarState = 'collapsed';  // Show icons only
        } else {
            this.sidebarState = 'visible';    // Show full sidebar
        }
        
        console.log('[Bookmarks] State changed from', previousState, 'to', this.sidebarState);
        
        // Sidebar state changed
        this.updateSidebarVisibility();
        this.saveBookmarks();
        
        console.log('[Bookmarks] === TOGGLE SIDEBAR COMPLETE ===');
    }

    updateSidebarVisibility() {
        console.log('[Bookmarks] === UPDATE SIDEBAR VISIBILITY START ===');
        console.log('[Bookmarks] Target state:', this.sidebarState);
        
        const sidebar = document.getElementById('bookmarks-sidebar');
        const mainContent = document.getElementById('bookmarks-main-content');
        const toggleBtn = document.getElementById('toggle-sidebar-btn');
        
        console.log('[Bookmarks] DOM elements found:', {
            sidebar: !!sidebar,
            mainContent: !!mainContent,
            toggleBtn: !!toggleBtn,
            sidebarClasses: sidebar?.className,
            mainContentClasses: mainContent?.className
        });
        
        if (sidebar && mainContent && toggleBtn) {
            // Reset all classes
            const prevSidebarClasses = sidebar.className;
            const prevMainClasses = mainContent.className;
            
            sidebar.classList.remove('visible', 'collapsed');
            mainContent.classList.remove('sidebar-visible', 'sidebar-collapsed');
            
            if (this.sidebarState === 'visible') {
                // Full sidebar with titles and URLs
                sidebar.classList.add('visible');
                mainContent.classList.add('sidebar-visible');
                toggleBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 1.146a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 1.854a.5.5 0 0 1 0-.708z"/>
                    </svg>
                `;
                toggleBtn.title = 'Collapse to Icons';
                console.log('[Bookmarks] Applied VISIBLE state classes');
            } else {
                // Collapsed - show only icons with tooltips
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
                toggleBtn.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.354 1.146a.5.5 0 0 0-.708 0l-6 6a.5.5 0 0 0 0 .708l6 6a.5.5 0 0 0 .708-.708L5.707 8l5.647-5.646a.5.5 0 0 0 0-.708z"/>
                    </svg>
                `;
                toggleBtn.title = 'Expand Sidebar';
                console.log('[Bookmarks] Applied COLLAPSED state classes');
            }
            
            console.log('[Bookmarks] Class changes:', {
                sidebar: `"${prevSidebarClasses}" → "${sidebar.className}"`,
                mainContent: `"${prevMainClasses}" → "${mainContent.className}"`,
                buttonTitle: toggleBtn.title
            });
        } else {
            console.error('[Bookmarks] Missing DOM elements for sidebar visibility update!');
        }
        
        console.log('[Bookmarks] === UPDATE SIDEBAR VISIBILITY COMPLETE ===');
    }

    async renderBookmarks() {
        // Rendering bookmarks UI
        
        // Render sidebar
        await this.renderSidebar();
        
        // Render main content
        this.renderMainContent();
        
        // Sidebar visibility is updated inside renderSidebar after DOM is ready
    }

    async renderSidebar() {
        console.log('[Bookmarks] === RENDER SIDEBAR START ===');
        console.log('[Bookmarks] Render sidebar requested at:', new Date().toISOString());
        
        // Prevent concurrent renders
        if (this.isRenderingSidebar) {
            console.log('[Bookmarks] RENDER BLOCKED - Already rendering sidebar');
            return;
        }
        
        this.isRenderingSidebar = true;
        console.log('[Bookmarks] Sidebar render lock acquired');
        
        try {
            const sidebar = document.getElementById('bookmarks-sidebar');
            if (!sidebar) {
                console.error('[Bookmarks] CRITICAL: Sidebar element not found!');
                return;
            }
            
            console.log('[Bookmarks] Sidebar element found, starting render process');

            // Clear sidebar completely to avoid CSP issues with cached content
            sidebar.innerHTML = '';
            sidebar.innerHTML = '<div class="sidebar-loading">Loading tabs...</div>';
            console.log('[Bookmarks] Sidebar cleared and loading message set');

            // Refresh current tabs (this will reset the array)
            await this.loadCurrentTabs();
            console.log('[Bookmarks] Current tabs loaded for rendering:', this.currentTabs.length);
            
            // Tabs loaded for rendering

            let tabsHTML = '';
            if (this.currentTabs && this.currentTabs.length > 0) {
                // Generating HTML for tabs
                
                tabsHTML = this.currentTabs.map((tab, index) => {
                    const favicon = tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzY2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMmE2IDYgMCAwIDEgNiA2djJhNiA2IDAgMCAxLTYgNiA2IDYgMCAwIDEtNi02VjhhNiA2IDAgMCAxIDYtNnoiLz4KPC9zdmc+';
                    const title = tab.title || tab.url || `Tab ${tab.id}` || `Browser Tab ${index + 1}`;
                    const url = tab.url || `chrome://tab/${tab.id}`;
                    
                    // Processing tab
                    
                    return `
                        <div class="sidebar-tab-item" data-tab-id="${tab.id}" data-url="${this.escapeHtml(url)}" data-favicon="${this.escapeHtml(favicon)}" draggable="true" title="Drag to bookmark group or click to switch">
                            <img src="${favicon}" alt="favicon" class="tab-favicon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzY2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMmE2IDYgMCAwIDEgNiA2djJhNiA2IDAgMCExLTYgNiA2IDYgMCAwIDEtNi02VjhhNiA2IDAgMCExIDYtNnoiLz4KPC9zdmc+'">
                            <div class="tab-info">
                                <input type="text" class="tab-title-input" value="${this.escapeHtml(title)}" data-original-title="${this.escapeHtml(title)}" title="Click to edit title">
                                <div class="tab-url-section hidden">
                                    <label class="url-label">URL:</label>
                                    <input type="url" class="tab-url-input" value="${this.escapeHtml(url)}" data-original-url="${this.escapeHtml(url)}" placeholder="Enter URL..." title="Edit URL">
                                </div>
                            </div>
                            <div class="tab-tooltip">${this.escapeHtml(title)}<br><small>${this.escapeHtml(url)}</small></div>
                        </div>
                    `;
                }).join('');
                
                // Generated HTML
            } else {
                // No tabs to render
            }

            const sidebarHTML = `
                <!-- Toggle Sidebar Button -->
                <button id="toggle-sidebar-btn" class="sidebar-toggle-btn" title="Toggle Sidebar">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 1.146a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 1.854a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>
                <div class="sidebar-header">
                    <h3 class="sidebar-title">Current Tabs</h3>
                    <span class="sidebar-count">${this.currentTabs?.length || 0}</span>
                </div>
                <div class="sidebar-content">
                    ${tabsHTML || '<div class="sidebar-empty">No tabs available<br><small>Check console for details</small></div>'}
                </div>
            `;
            
            // Set the HTML all at once
            console.log('[Bookmarks] Setting sidebar HTML (length:', sidebarHTML.length, ')');
            sidebar.innerHTML = sidebarHTML;
            console.log('[Bookmarks] Sidebar HTML set successfully');
            
            // Verify toggle button was created
            const toggleBtn = document.getElementById('toggle-sidebar-btn');
            console.log('[Bookmarks] Toggle button created:', !!toggleBtn);
            
            // Update sidebar visibility and toggle button after rendering
            console.log('[Bookmarks] Calling updateSidebarVisibility...');
            this.updateSidebarVisibility();
            
            console.log('[Bookmarks] === RENDER SIDEBAR COMPLETE ===');
            
        } catch (error) {
            console.error('[Bookmarks] ERROR during sidebar render:', error);
            console.error('[Bookmarks] Error stack:', error.stack);
        } finally {
            this.isRenderingSidebar = false;
            console.log('[Bookmarks] Sidebar render lock released');
        }
    }

    renderMainContent() {
        const mainContent = document.getElementById('bookmarks-main-content');
        if (!mainContent) return;

        // Clear any existing content to prevent CSP issues with cached HTML
        mainContent.innerHTML = '';
        
        const groupsHTML = this.bookmarkGroups.map(group => this.renderBookmarkGroup(group)).join('');

        // Create the content using safe DOM methods to avoid CSP violations
        const floatingActions = document.createElement('div');
        floatingActions.className = 'floating-actions';
        
        const groupsCounter = document.createElement('div');
        groupsCounter.className = 'groups-counter';
        groupsCounter.title = `${this.bookmarkGroups.length} of ${this.maxGroups} groups`;
        groupsCounter.textContent = `${this.bookmarkGroups.length}/${this.maxGroups}`;
        
        const addGroupBtn = document.createElement('button');
        addGroupBtn.id = 'add-bookmark-group-btn';
        addGroupBtn.className = 'floating-add-group';
        addGroupBtn.title = 'Add new group';
        if (this.bookmarkGroups.length >= this.maxGroups) {
            addGroupBtn.disabled = true;
        }
        addGroupBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
        `;
        
        floatingActions.appendChild(groupsCounter);
        floatingActions.appendChild(addGroupBtn);
        
        const cleanGroupsContainer = document.createElement('div');
        cleanGroupsContainer.className = 'clean-groups-container';
        cleanGroupsContainer.innerHTML = groupsHTML;
        
        mainContent.appendChild(floatingActions);
        mainContent.appendChild(cleanGroupsContainer);
    }

    renderBookmarkGroup(group) {
        const bookmarksHTML = group.bookmarks.map(bookmark => this.renderBookmark(bookmark)).join('');
        
        return `
            <div class="clean-bookmark-group" data-group-id="${group.id}" style="border-top: 3px solid ${group.color}">
                <div class="clean-group-header">
                    <div class="group-content">
                        <div class="group-display-mode">
                            <div class="group-title-display" title="${this.escapeHtml(group.name)}">${this.escapeHtml(group.name)}</div>
                            <div class="group-stats">${group.bookmarks.length} item${group.bookmarks.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="group-edit-mode hidden">
                            <div class="group-input-group">
                                <label class="group-input-label">Group Name:</label>
                                <input type="text" class="group-title-input" value="${this.escapeHtml(group.name)}" data-original-title="${this.escapeHtml(group.name)}" placeholder="Enter group name..." maxlength="30">
                            </div>
                            <div class="group-edit-actions">
                                <button class="group-save-btn" data-group-id="${group.id}" title="Save changes">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                    </svg>
                                    Save
                                </button>
                                <button class="group-cancel-btn" data-group-id="${group.id}" title="Cancel editing">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                    </svg>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="group-actions">
                        <button class="group-edit-btn" data-group-id="${group.id}" title="Edit group name">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L7.5 12.207l-3 .647.647-3L12.146.146zM11.207 2L2 11.207l.5 2.5 2.5-.5L14.207 4 12 1.793z"/>
                            </svg>
                        </button>
                        <button class="group-delete-btn" data-group-id="${group.id}" title="Delete group">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-4.5Z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="clean-bookmarks-list" data-group-id="${group.id}">
                    ${bookmarksHTML || '<div class="group-empty-message">Drop tabs here or double-click to add bookmarks</div>'}
                </div>
            </div>
        `;
    }

    renderBookmark(bookmark) {
        const favicon = bookmark.favicon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzk5OSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMmE2IDYgMCAwIDEgNiA2djJhNiA2IDAgMCAxLTYgNiA2IDYgMCAwIDEtNi02VjhhNiA2IDAgMCAxIDYtNnoiLz4KPC9zdmc+';
        
        return `
            <div class="clean-bookmark-item" data-bookmark-id="${bookmark.id}" data-url="${bookmark.url}" draggable="true" title="Click to open bookmark">
                <img src="${favicon}" alt="favicon" class="bookmark-favicon" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzY2NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMmE2IDYgMCAwIDEgNiA2djJhNiA2IDAgMCAxLTYgNiA2IDYgMCAwIDEtNi02VjhhNiA2IDAgMCAxIDYtNnoiLz4KPC9zdmc+'">
                <div class="bookmark-content">
                    <div class="bookmark-display-mode">
                        <div class="bookmark-title-display" title="${this.escapeHtml(bookmark.title)}">${this.escapeHtml(bookmark.title)}</div>
                        <div class="bookmark-url-display" title="${this.escapeHtml(bookmark.url)}">${this.escapeHtml(bookmark.url)}</div>
                    </div>
                    <div class="bookmark-edit-mode hidden">
                        <div class="bookmark-input-group">
                            <label class="bookmark-input-label">Title:</label>
                            <input type="text" class="bookmark-title-input" value="${this.escapeHtml(bookmark.title)}" data-original-title="${this.escapeHtml(bookmark.title)}" placeholder="Enter title..." maxlength="100">
                        </div>
                        <div class="bookmark-input-group">
                            <label class="bookmark-input-label">URL:</label>
                            <input type="url" class="bookmark-url-input" value="${this.escapeHtml(bookmark.url)}" data-original-url="${this.escapeHtml(bookmark.url)}" placeholder="Enter URL...">
                        </div>
                        <div class="bookmark-edit-actions">
                            <button class="bookmark-save-btn" data-bookmark-id="${bookmark.id}" title="Save changes">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                                </svg>
                                Save
                            </button>
                            <button class="bookmark-cancel-btn" data-bookmark-id="${bookmark.id}" title="Cancel editing">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                </svg>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
                <div class="bookmark-actions">
                    <button class="bookmark-edit-btn" data-bookmark-id="${bookmark.id}" title="Edit bookmark">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L7.5 12.207l-3 .647.647-3L12.146.146zM11.207 2L2 11.207l.5 2.5 2.5-.5L14.207 4 12 1.793z"/>
                        </svg>
                    </button>
                    <button class="bookmark-delete-btn" data-bookmark-id="${bookmark.id}" title="Delete bookmark">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-4.5Z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    handleTabClick(e) {
        const tabItem = e.target.closest('.sidebar-tab-item');
        const titleInput = e.target.closest('.tab-title-input');
        const urlInput = e.target.closest('.tab-url-input');
        
        // Handle title input editing
        if (titleInput) {
            e.stopPropagation();
            titleInput.focus();
            titleInput.select();
            return;
        }
        
        // Handle URL input editing
        if (urlInput) {
            e.stopPropagation();
            urlInput.focus();
            urlInput.select();
            return;
        }
        
        // Don't switch tabs if we're in editing mode
        if (tabItem && tabItem.classList.contains('editing-mode')) {
            return;
        }
        
        // Handle tab switching (only if not dragging and not editing)
        if (tabItem && !tabItem.classList.contains('dragging')) {
            const tabId = parseInt(tabItem.dataset.tabId);
            if (tabId && chrome?.tabs?.update) {
                try {
                    chrome.tabs.update(tabId, { active: true }, (tab) => {
                        if (chrome.runtime.lastError) {
                            console.error('[Bookmarks] Error switching tab:', chrome.runtime.lastError);
                            // For mock tabs, just log the action
                            console.log('[Bookmarks] Would switch to tab:', tabItem.dataset.url);
                        } else {
                            console.log('[Bookmarks] Switched to tab:', tab?.title);
                        }
                    });
                } catch (error) {
                    console.error('[Bookmarks] Tab switching error:', error);
                    console.log('[Bookmarks] Would switch to tab:', tabItem.dataset.url);
                }
            } else {
                // Fallback for mock tabs - just show the URL
                console.log('[Bookmarks] Mock tab clicked:', tabItem.dataset.url);
                if (tabItem.dataset.url) {
                    window.open(tabItem.dataset.url, '_blank');
                }
            }
        }
    }

    handleBookmarkClick(e) {
        const bookmarkItem = e.target.closest('.clean-bookmark-item');
        const titleInput = e.target.closest('.bookmark-title-input');
        const urlInput = e.target.closest('.bookmark-url-input');
        
        // Handle title input editing
        if (titleInput) {
            e.stopPropagation();
            this.showBookmarkUrlSection(titleInput);
            titleInput.focus();
            titleInput.select();
            return;
        }
        
        // Handle URL input editing
        if (urlInput) {
            e.stopPropagation();
            urlInput.focus();
            urlInput.select();
            return;
        }
        
        // Don't open URL if we're in editing mode
        if (bookmarkItem && bookmarkItem.classList.contains('editing-mode')) {
            return;
        }
        
        if (bookmarkItem) {
            const url = bookmarkItem.dataset.url;
            if (url) {
                // Open in new tab
                if (chrome?.tabs?.create) {
                    try {
                        chrome.tabs.create({ url: url, active: false }, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.error('[Bookmarks] Error creating tab:', chrome.runtime.lastError);
                                // Fallback to window.open
                                window.open(url, '_blank');
                            } else {
                                console.log('[Bookmarks] Opened bookmark in new tab:', tab?.title);
                            }
                        });
                    } catch (error) {
                        console.error('[Bookmarks] Tab creation error:', error);
                        window.open(url, '_blank');
                    }
                } else {
                    // Fallback when Chrome API not available
                    window.open(url, '_blank');
                }
            }
        }
    }

    showBookmarkUrlSection(titleInput) {
        const urlSection = titleInput.parentNode.querySelector('.bookmark-url-section');
        if (urlSection) {
            urlSection.classList.remove('hidden');
            urlSection.classList.add('editing');
        }
        // Add editing class to bookmark item
        const bookmarkItem = titleInput.closest('.clean-bookmark-item');
        if (bookmarkItem) {
            bookmarkItem.classList.add('editing-mode');
        }
    }

    hideBookmarkUrlSection(input) {
        const urlSection = input.closest('.bookmark-content').querySelector('.bookmark-url-section');
        if (urlSection) {
            urlSection.classList.add('hidden');
            urlSection.classList.remove('editing');
        }
        // Remove editing class from bookmark item
        const bookmarkItem = input.closest('.clean-bookmark-item');
        if (bookmarkItem) {
            bookmarkItem.classList.remove('editing-mode');
        }
    }

    handleGroupHeaderClick(e) {
        const groupTitle = e.target.closest('.clean-group-title');
        if (groupTitle) {
            e.stopPropagation();
            groupTitle.focus();
            groupTitle.select();
        }
    }

    handleGroupAction(e) {
        e.stopPropagation();
        const groupId = e.target.closest('.clean-bookmark-group').dataset.groupId;
        const action = e.target.closest('.group-action-btn').dataset.action;
        
        switch (action) {
            case 'add-bookmark':
                this.showAddBookmarkModal(groupId);
                break;
            case 'change-color':
                this.showColorPicker(groupId);
                break;
            case 'delete-group':
                this.deleteGroup(groupId);
                break;
        }
    }

    showBookmarkContextMenu(e) {
        const bookmarkItem = e.target.closest('.clean-bookmark-item');
        if (!bookmarkItem) return;
        
        const bookmarkId = bookmarkItem.dataset.bookmarkId;
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;

        // Remove any existing context menu
        const existingMenu = document.querySelector('.bookmark-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'bookmark-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="edit">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L7.5 12.207l-3 .647.647-3L12.146.146zM11.207 2L2 11.207l.5 2.5 2.5-.5L14.207 4 12 1.793z"/>
                </svg>
                Edit Bookmark
            </div>
            <div class="context-menu-item" data-action="delete">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-4.5Z"/>
                </svg>
                Delete Bookmark
            </div>
        `;

        // Position menu
        menu.style.position = 'fixed';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.style.zIndex = '2000';
        
        document.body.appendChild(menu);

        // Handle menu clicks
        menu.addEventListener('click', (menuEvent) => {
            const action = menuEvent.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'edit') {
                this.showEditBookmarkModal(bookmarkId);
            } else if (action === 'delete') {
                this.deleteBookmark(bookmarkId);
            }
            menu.remove();
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 10);
    }

    showGroupContextMenu(e) {
        const groupHeader = e.target.closest('.clean-group-header');
        if (!groupHeader) return;
        
        const groupId = groupHeader.closest('.clean-bookmark-group').dataset.groupId;
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (!group) return;

        // Remove any existing context menu
        const existingMenu = document.querySelector('.group-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'group-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="edit-group">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L7.5 12.207l-3 .647.647-3L12.146.146zM11.207 2L2 11.207l.5 2.5 2.5-.5L14.207 4 12 1.793z"/>
                </svg>
                Edit Group Name
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="add-bookmark">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Add Bookmark
            </div>
            <div class="context-menu-item" data-action="change-color">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.433 10.07C14.133 10.585 16 11.15 16 8a8 8 0 1 0-8 8c1.996 0 1.826-1.504 1.649-3.08-.124-1.101-.252-2.237.351-2.92.465-.527 1.42-.237 2.433.07zM8 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
                Change Color
            </div>
            ${this.bookmarkGroups.length > 1 ? `
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" data-action="delete-group">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84L14.962 3.5H15.5a.5.5 0 0 0 0-1h-4.5Z"/>
                </svg>
                Delete Group
            </div>` : ''}
        `;

        // Position menu
        menu.style.position = 'fixed';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.style.zIndex = '2000';
        
        document.body.appendChild(menu);

        // Handle menu clicks
        menu.addEventListener('click', (menuEvent) => {
            const action = menuEvent.target.closest('.context-menu-item')?.dataset.action;
            if (action === 'edit-group') {
                // Find the edit button for this group and trigger edit mode
                const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
                const editBtn = groupElement?.querySelector('.group-edit-btn');
                if (editBtn) {
                    console.log('[Bookmarks] Context menu edit triggered for group:', groupId);
                    this.enterGroupEditMode(editBtn);
                } else {
                    console.error('[Bookmarks] Group edit button not found for:', groupId);
                }
            } else if (action === 'add-bookmark') {
                this.showAddBookmarkModal(groupId);
            } else if (action === 'change-color') {
                this.showColorPicker(groupId);
            } else if (action === 'delete-group') {
                this.deleteGroup(groupId);
            }
            menu.remove();
        });

        // Close menu on outside click
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 10);
    }

    showAddGroupModal() {
        if (this.bookmarkGroups.length >= this.maxGroups) {
            alert(`Maximum ${this.maxGroups} groups allowed`);
            return;
        }

        const groupName = prompt('Enter group name:', 'New Group');
        if (groupName && groupName.trim()) {
            this.addBookmarkGroup(groupName.trim());
        }
    }

    addBookmarkGroup(name) {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085'];
        const newGroup = {
            id: this.generateId(),
            name: name,
            bookmarks: [],
            color: colors[this.bookmarkGroups.length % colors.length],
            created: Date.now()
        };

        this.bookmarkGroups.push(newGroup);
        this.saveBookmarks();
        this.renderMainContent();
    }

    deleteGroup(groupId) {
        console.log('[Bookmarks] === DELETE GROUP START ===');
        console.log('[Bookmarks] Group ID to delete:', groupId);
        
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (!group) {
            console.error('[Bookmarks] Group not found:', groupId);
            this.showTemporaryMessage('Error: Group not found', 'error');
            return;
        }
        
        // Prevent deleting the last group - better UX approach
        if (this.bookmarkGroups.length <= 1) {
            this.showTemporaryMessage('Cannot delete the last bookmark group. At least one group is required.', 'warning');
            console.log('[Bookmarks] Delete blocked - cannot delete last group');
            return;
        }
        
        console.log('[Bookmarks] Group found:', {
            name: group.name,
            bookmarksCount: group.bookmarks.length,
            totalGroups: this.bookmarkGroups.length
        });

        // Enhanced confirmation dialog
        let confirmMessage = `Delete "${group.name}" group?`;
        if (group.bookmarks.length > 0) {
            confirmMessage = `Delete "${group.name}" group and all ${group.bookmarks.length} bookmarks?\n\n⚠️ This action cannot be undone.`;
        }
        
        if (!confirm(confirmMessage)) {
            console.log('[Bookmarks] Delete cancelled by user');
            return;
        }

        // Perform deletion
        const initialCount = this.bookmarkGroups.length;
        const deletedBookmarksCount = group.bookmarks.length;
        const groupName = group.name;
        
        this.bookmarkGroups = this.bookmarkGroups.filter(g => g.id !== groupId);
        
        // Double-check we still have groups (should not happen with our check above)
        if (this.bookmarkGroups.length === 0) {
            this.createDefaultGroup();
            console.log('[Bookmarks] Created default group as fallback');
        }
        
        console.log('[Bookmarks] Group deleted successfully:', {
            deletedGroup: groupName,
            previousCount: initialCount,
            newCount: this.bookmarkGroups.length,
            deletedBookmarks: deletedBookmarksCount
        });
        
        this.saveBookmarks();
        this.renderMainContent();
        
        // Show success message
        let successMessage = `Group "${groupName}" deleted successfully`;
        if (deletedBookmarksCount > 0) {
            successMessage += ` (${deletedBookmarksCount} bookmarks removed)`;
        }
        this.showTemporaryMessage(successMessage, 'success');
        
        console.log('[Bookmarks] === DELETE GROUP COMPLETE ===');
    }

    showAddBookmarkModal(groupId, prefill = {}) {
        const modal = this.createModal('Add Bookmark', `
            <div class="form-group">
                <label for="bookmark-title">Title</label>
                <input type="text" id="bookmark-title" placeholder="Bookmark title..." value="${prefill.title || ''}" maxlength="100">
            </div>
            <div class="form-group">
                <label for="bookmark-url">URL</label>
                <input type="url" id="bookmark-url" placeholder="https://..." value="${prefill.url || ''}" required>
            </div>
            <div class="form-group">
                <label for="bookmark-group">Group</label>
                <select id="bookmark-group">
                    ${this.bookmarkGroups.map(group => 
                        `<option value="${group.id}" ${group.id === groupId ? 'selected' : ''}>${group.name}</option>`
                    ).join('')}
                </select>
            </div>
        `, () => {
            const title = document.getElementById('bookmark-title').value.trim();
            const url = document.getElementById('bookmark-url').value.trim();
            const selectedGroupId = document.getElementById('bookmark-group').value;

            if (url && this.isValidUrl(url)) {
                this.addBookmark(selectedGroupId, {
                    title: title || this.extractTitleFromUrl(url),
                    url: url,
                    favicon: prefill.favicon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`
                });
                this.closeModal(modal);
            } else {
                alert('Please enter a valid URL');
            }
        });
    }

    addBookmark(groupId, bookmarkData) {
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (!group) return;

        const newBookmark = {
            id: this.generateId(),
            title: bookmarkData.title,
            url: bookmarkData.url,
            favicon: bookmarkData.favicon,
            created: Date.now()
        };

        group.bookmarks.push(newBookmark);
        this.saveBookmarks();
        this.renderMainContent();
    }

    showEditBookmarkModal(bookmarkId) {
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;

        const modal = this.createModal('Edit Bookmark', `
            <div class="form-group">
                <label for="edit-bookmark-title">Title</label>
                <input type="text" id="edit-bookmark-title" placeholder="Bookmark title..." value="${bookmark.title}" maxlength="100">
            </div>
            <div class="form-group">
                <label for="edit-bookmark-url">URL</label>
                <input type="url" id="edit-bookmark-url" placeholder="https://..." value="${bookmark.url}" required>
            </div>
        `, () => {
            const title = document.getElementById('edit-bookmark-title').value.trim();
            const url = document.getElementById('edit-bookmark-url').value.trim();

            if (url && this.isValidUrl(url)) {
                bookmark.title = title || this.extractTitleFromUrl(url);
                bookmark.url = url;
                bookmark.favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`;
                
                this.saveBookmarks();
                this.renderMainContent();
                this.closeModal(modal);
            } else {
                alert('Please enter a valid URL');
            }
        });
    }

    deleteBookmark(bookmarkId) {
        console.log('[Bookmarks] === DELETE BOOKMARK START ===');
        console.log('[Bookmarks] Bookmark ID to delete:', bookmarkId);
        
        let deletedBookmark = null;
        let parentGroup = null;
        
        // Find and delete the bookmark
        for (let group of this.bookmarkGroups) {
            const index = group.bookmarks.findIndex(b => b.id === bookmarkId);
            if (index !== -1) {
                deletedBookmark = group.bookmarks[index];
                parentGroup = group;
                
                console.log('[Bookmarks] Bookmark found:', {
                    title: deletedBookmark.title,
                    url: deletedBookmark.url,
                    groupName: group.name,
                    groupBookmarksCount: group.bookmarks.length
                });
                
                // Confirm deletion
                if (!confirm(`Delete bookmark "${deletedBookmark.title}"?\n\n⚠️ This action cannot be undone.`)) {
                    console.log('[Bookmarks] Delete cancelled by user');
                    return;
                }
                
                // Remove bookmark from group
                group.bookmarks.splice(index, 1);
                
                console.log('[Bookmarks] Bookmark deleted successfully:', {
                    deletedTitle: deletedBookmark.title,
                    remainingInGroup: group.bookmarks.length,
                    groupName: group.name
                });
                
                this.saveBookmarks();
                this.renderMainContent();
                
                // Show success message
                this.showTemporaryMessage(`Bookmark "${deletedBookmark.title}" deleted successfully`, 'success');
                
                console.log('[Bookmarks] === DELETE BOOKMARK COMPLETE ===');
                return;
            }
        }
        
        // If we get here, bookmark was not found
        console.error('[Bookmarks] Bookmark not found:', bookmarkId);
        this.showTemporaryMessage('Error: Bookmark not found', 'error');
    }

    // Inline edit mode methods
    enterBookmarkEditMode(editBtn) {
        console.log('[Bookmarks] === ENTER EDIT MODE ===');
        const bookmarkId = editBtn.dataset.bookmarkId;
        const bookmarkItem = editBtn.closest('.clean-bookmark-item');
        
        if (!bookmarkItem) {
            console.error('[Bookmarks] Bookmark item not found for edit');
            return;
        }
        
        console.log('[Bookmarks] Entering edit mode for bookmark:', bookmarkId);
        
        // Exit edit mode for any other bookmarks first
        this.exitAllEditModes();
        
        // Show edit mode, hide display mode
        const displayMode = bookmarkItem.querySelector('.bookmark-display-mode');
        const editMode = bookmarkItem.querySelector('.bookmark-edit-mode');
        const actions = bookmarkItem.querySelector('.bookmark-actions');
        
        if (displayMode && editMode && actions) {
            displayMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            actions.style.opacity = '0.3'; // Dim action buttons during edit
            
            // Focus on title input
            const titleInput = editMode.querySelector('.bookmark-title-input');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
            
            console.log('[Bookmarks] Edit mode activated for:', bookmarkId);
        }
    }
    
    saveBookmarkEdit(saveBtn) {
        console.log('[Bookmarks] === SAVE BOOKMARK EDIT ===');
        const bookmarkId = saveBtn.dataset.bookmarkId;
        const bookmarkItem = saveBtn.closest('.clean-bookmark-item');
        
        if (!bookmarkItem) {
            console.error('[Bookmarks] Bookmark item not found for save');
            return;
        }
        
        const editMode = bookmarkItem.querySelector('.bookmark-edit-mode');
        const titleInput = editMode.querySelector('.bookmark-title-input');
        const urlInput = editMode.querySelector('.bookmark-url-input');
        
        const newTitle = titleInput.value.trim();
        const newUrl = urlInput.value.trim();
        
        console.log('[Bookmarks] Saving bookmark changes:', {
            bookmarkId,
            newTitle,
            newUrl
        });
        
        // Validate inputs
        if (!newTitle) {
            this.showTemporaryMessage('Title cannot be empty', 'warning');
            titleInput.focus();
            return;
        }
        
        if (!newUrl) {
            this.showTemporaryMessage('URL cannot be empty', 'warning');
            urlInput.focus();
            return;
        }
        
        if (!this.isValidUrl(newUrl)) {
            this.showTemporaryMessage('Please enter a valid URL', 'warning');
            urlInput.focus();
            return;
        }
        
        // Find and update the bookmark
        let updated = false;
        for (let group of this.bookmarkGroups) {
            const bookmark = group.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) {
                const oldTitle = bookmark.title;
                const oldUrl = bookmark.url;
                
                bookmark.title = newTitle;
                bookmark.url = newUrl;
                bookmark.modified = Date.now();
                
                console.log('[Bookmarks] Bookmark updated:', {
                    id: bookmarkId,
                    oldTitle,
                    newTitle,
                    oldUrl,
                    newUrl
                });
                
                updated = true;
                break;
            }
        }
        
        if (updated) {
            this.saveBookmarks();
            this.renderMainContent();
            this.showTemporaryMessage(`Bookmark "${newTitle}" updated successfully`, 'success');
        } else {
            console.error('[Bookmarks] Bookmark not found for update:', bookmarkId);
            this.showTemporaryMessage('Error: Bookmark not found', 'error');
        }
        
        console.log('[Bookmarks] === SAVE BOOKMARK EDIT COMPLETE ===');
    }
    
    cancelBookmarkEdit(cancelBtn) {
        console.log('[Bookmarks] === CANCEL BOOKMARK EDIT ===');
        const bookmarkId = cancelBtn.dataset.bookmarkId;
        const bookmarkItem = cancelBtn.closest('.clean-bookmark-item');
        
        if (!bookmarkItem) {
            console.error('[Bookmarks] Bookmark item not found for cancel');
            return;
        }
        
        console.log('[Bookmarks] Cancelling edit mode for bookmark:', bookmarkId);
        
        // Reset inputs to original values
        const editMode = bookmarkItem.querySelector('.bookmark-edit-mode');
        const titleInput = editMode.querySelector('.bookmark-title-input');
        const urlInput = editMode.querySelector('.bookmark-url-input');
        
        titleInput.value = titleInput.dataset.originalTitle || '';
        urlInput.value = urlInput.dataset.originalUrl || '';
        
        // Exit edit mode
        this.exitEditMode(bookmarkItem);
        
        console.log('[Bookmarks] Edit cancelled for:', bookmarkId);
    }
    
    // Helper methods for edit mode management
    exitAllEditModes() {
        const allBookmarkItems = document.querySelectorAll('.clean-bookmark-item');
        allBookmarkItems.forEach(item => this.exitEditMode(item));
        
        const allGroupHeaders = document.querySelectorAll('.clean-group-header');
        allGroupHeaders.forEach(header => this.exitGroupEditMode(header));
    }
    
    exitEditMode(bookmarkItem) {
        const displayMode = bookmarkItem.querySelector('.bookmark-display-mode');
        const editMode = bookmarkItem.querySelector('.bookmark-edit-mode');
        const actions = bookmarkItem.querySelector('.bookmark-actions');
        
        if (displayMode && editMode && actions) {
            displayMode.classList.remove('hidden');
            editMode.classList.add('hidden');
            actions.style.opacity = '1'; // Restore action buttons
        }
    }

    // Group edit mode methods
    enterGroupEditMode(editBtn) {
        console.log('[Bookmarks] === ENTER GROUP EDIT MODE ===');
        const groupId = editBtn.dataset.groupId;
        const groupHeader = editBtn.closest('.clean-group-header');
        
        if (!groupHeader) {
            console.error('[Bookmarks] Group header not found for edit');
            return;
        }
        
        console.log('[Bookmarks] Entering edit mode for group:', groupId);
        
        // Exit edit mode for any other groups/bookmarks first
        this.exitAllEditModes();
        
        // Show edit mode, hide display mode
        const displayMode = groupHeader.querySelector('.group-display-mode');
        const editMode = groupHeader.querySelector('.group-edit-mode');
        const actions = groupHeader.querySelector('.group-actions');
        
        if (displayMode && editMode && actions) {
            displayMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            actions.style.opacity = '0.3'; // Dim action buttons during edit
            
            // Focus on title input
            const titleInput = editMode.querySelector('.group-title-input');
            if (titleInput) {
                setTimeout(() => {
                    titleInput.focus();
                    titleInput.select(); // Select all text for easy editing
                }, 100);
            }
            
            console.log('[Bookmarks] Group edit mode activated for:', groupId);
        }
    }
    
    saveGroupEdit(saveBtn) {
        console.log('[Bookmarks] === SAVE GROUP EDIT ===');
        const groupId = saveBtn.dataset.groupId;
        const groupHeader = saveBtn.closest('.clean-group-header');
        
        if (!groupHeader) {
            console.error('[Bookmarks] Group header not found for save');
            return;
        }
        
        const editMode = groupHeader.querySelector('.group-edit-mode');
        const titleInput = editMode.querySelector('.group-title-input');
        
        const newName = titleInput.value.trim();
        
        console.log('[Bookmarks] Saving group changes:', {
            groupId,
            newName
        });
        
        // Validate input
        if (!newName) {
            this.showTemporaryMessage('Group name cannot be empty', 'warning');
            titleInput.focus();
            return;
        }
        
        // Check for duplicate names
        const existingGroup = this.bookmarkGroups.find(g => g.id !== groupId && g.name.toLowerCase() === newName.toLowerCase());
        if (existingGroup) {
            this.showTemporaryMessage('A group with this name already exists', 'warning');
            titleInput.focus();
            titleInput.select();
            return;
        }
        
        // Find and update the group
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (group) {
            const oldName = group.name;
            group.name = newName;
            group.modified = Date.now();
            
            console.log('[Bookmarks] Group updated:', {
                id: groupId,
                oldName,
                newName
            });
            
            this.saveBookmarks();
            this.renderMainContent();
            this.showTemporaryMessage(`Group renamed to "${newName}"`, 'success');
        } else {
            console.error('[Bookmarks] Group not found for update:', groupId);
            this.showTemporaryMessage('Error: Group not found', 'error');
        }
        
        console.log('[Bookmarks] === SAVE GROUP EDIT COMPLETE ===');
    }
    
    cancelGroupEdit(cancelBtn) {
        console.log('[Bookmarks] === CANCEL GROUP EDIT ===');
        const groupId = cancelBtn.dataset.groupId;
        const groupHeader = cancelBtn.closest('.clean-group-header');
        
        if (!groupHeader) {
            console.error('[Bookmarks] Group header not found for cancel');
            return;
        }
        
        console.log('[Bookmarks] Cancelling edit mode for group:', groupId);
        
        // Reset input to original value
        const editMode = groupHeader.querySelector('.group-edit-mode');
        const titleInput = editMode.querySelector('.group-title-input');
        
        titleInput.value = titleInput.dataset.originalTitle || '';
        
        // Exit edit mode
        this.exitGroupEditMode(groupHeader);
        
        console.log('[Bookmarks] Group edit cancelled for:', groupId);
    }
    
    exitGroupEditMode(groupHeader) {
        const displayMode = groupHeader.querySelector('.group-display-mode');
        const editMode = groupHeader.querySelector('.group-edit-mode');
        const actions = groupHeader.querySelector('.group-actions');
        
        if (displayMode && editMode && actions) {
            displayMode.classList.remove('hidden');
            editMode.classList.add('hidden');
            actions.style.opacity = '1'; // Restore action buttons
        }
    }

    showColorPicker(groupId) {
        const colors = [
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', 
            '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085'
        ];

        const colorOptions = colors.map(color => 
            `<div class="color-option" data-color="${color}" style="background-color: ${color}"></div>`
        ).join('');

        const modal = this.createModal('Choose Group Color', `
            <div class="color-picker">
                ${colorOptions}
            </div>
        `);

        // Handle color selection
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-option')) {
                const selectedColor = e.target.dataset.color;
                this.updateGroupColor(groupId, selectedColor);
                this.closeModal(modal);
            }
        });
    }

    updateGroupColor(groupId, color) {
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (group) {
            group.color = color;
            this.saveBookmarks();
            this.renderMainContent();
        }
    }

    // Drag and drop functionality
    handleDragStart(e) {
        const bookmarkItem = e.target.closest('.clean-bookmark-item');
        const tabItem = e.target.closest('.sidebar-tab-item');
        
        if (bookmarkItem) {
            this.draggedBookmark = bookmarkItem.dataset.bookmarkId;
            this.draggedTab = null;
            bookmarkItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        } else if (tabItem) {
            // Get current values from inputs (in case they're being edited)
            const titleInput = tabItem.querySelector('.tab-title-input');
            const urlInput = tabItem.querySelector('.tab-url-input');
            
            this.draggedTab = {
                url: urlInput ? urlInput.value.trim() || tabItem.dataset.url : tabItem.dataset.url,
                title: titleInput ? titleInput.value.trim() : 'Untitled',
                favicon: tabItem.dataset.favicon
            };
            this.draggedBookmark = null;
            tabItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        const groupContent = e.target.closest('.clean-bookmarks-list');
        if (groupContent && (this.draggedBookmark || this.draggedTab)) {
            e.dataTransfer.dropEffect = this.draggedBookmark ? 'move' : 'copy';
            groupContent.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const groupContent = e.target.closest('.clean-bookmarks-list');
        
        if (groupContent) {
            const targetGroupId = groupContent.dataset.groupId;
            
            if (this.draggedBookmark) {
                // Moving existing bookmark
                this.moveBookmark(this.draggedBookmark, targetGroupId);
            } else if (this.draggedTab) {
                // Adding tab as new bookmark
                this.addBookmark(targetGroupId, {
                    title: this.draggedTab.title,
                    url: this.draggedTab.url,
                    favicon: this.draggedTab.favicon
                });
            }
            
            groupContent.classList.remove('drag-over');
        }
    }

    handleDragEnd(e) {
        const bookmarkItem = e.target.closest('.clean-bookmark-item');
        const tabItem = e.target.closest('.sidebar-tab-item');
        
        if (bookmarkItem) {
            bookmarkItem.classList.remove('dragging');
        }
        
        if (tabItem) {
            tabItem.classList.remove('dragging');
        }
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        this.draggedBookmark = null;
        this.draggedTab = null;
    }

    moveBookmark(bookmarkId, targetGroupId) {
        const bookmark = this.findAndRemoveBookmark(bookmarkId);
        if (bookmark) {
            const targetGroup = this.bookmarkGroups.find(g => g.id === targetGroupId);
            if (targetGroup) {
                targetGroup.bookmarks.push(bookmark);
                this.saveBookmarks();
                this.renderMainContent();
            }
        }
    }

    findAndRemoveBookmark(bookmarkId) {
        for (let group of this.bookmarkGroups) {
            const index = group.bookmarks.findIndex(b => b.id === bookmarkId);
            if (index !== -1) {
                return group.bookmarks.splice(index, 1)[0];
            }
        }
        return null;
    }

    findBookmark(bookmarkId) {
        for (let group of this.bookmarkGroups) {
            const bookmark = group.bookmarks.find(b => b.id === bookmarkId);
            if (bookmark) return bookmark;
        }
        return null;
    }

    // Utility functions
    createModal(title, content, onSave = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content bookmark-modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${onSave ? `
                <div class="modal-footer">
                    <button type="button" class="btn-secondary modal-cancel">Cancel</button>
                    <button type="button" class="btn-primary modal-save">Save</button>
                </div>` : ''}
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel')?.addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-save')?.addEventListener('click', () => onSave && onSave());

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        return modal;
    }

    closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    truncateUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const path = urlObj.pathname;
            
            if (path.length > 20) {
                return domain + path.substring(0, 20) + '...';
            }
            return domain + path;
        } catch (e) {
            return url.length > 30 ? url.substring(0, 30) + '...' : url;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '').replace(/\..+$/, '');
        } catch (e) {
            return 'Bookmark';
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    generateId() {
        return 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveBookmarks() {
        try {
            const data = {
                groups: this.bookmarkGroups,
                sidebarState: this.sidebarState,
                lastModified: Date.now()
            };
            
            await this.storage.set({ [this.storageKey]: data });
            // Data saved successfully
        } catch (error) {
            console.error('[Bookmarks] Error saving bookmarks:', error);
        }
    }

    // Handle group title editing
    setupGroupTitleEditing() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('clean-group-title')) {
                const groupId = e.target.closest('.clean-bookmark-group').dataset.groupId;
                const newName = e.target.value.trim();
                
                if (newName) {
                    this.updateGroupName(groupId, newName);
                } else {
                    e.target.value = this.bookmarkGroups.find(g => g.id === groupId)?.name || 'Group';
                }
            }
        });

        // Handle tab and bookmark title editing
        document.addEventListener('focus', (e) => {
            if (e.target.classList.contains('tab-title-input')) {
                // Show URL section when editing title
                const urlSection = e.target.parentNode.querySelector('.tab-url-section');
                if (urlSection) {
                    urlSection.classList.remove('hidden');
                    urlSection.classList.add('editing');
                }
                // Add editing class to tab item
                const tabItem = e.target.closest('.sidebar-tab-item');
                if (tabItem) {
                    tabItem.classList.add('editing-mode');
                }
            }
            
            if (e.target.classList.contains('bookmark-title-input')) {
                // Show URL section when editing bookmark title
                this.showBookmarkUrlSection(e.target);
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('tab-title-input')) {
                const newTitle = e.target.value.trim();
                if (!newTitle) {
                    e.target.value = e.target.dataset.originalTitle;
                }
                // Hide URL section after editing
                setTimeout(() => {
                    const urlSection = e.target.parentNode.querySelector('.tab-url-section');
                    if (urlSection && !urlSection.contains(document.activeElement)) {
                        urlSection.classList.add('hidden');
                        urlSection.classList.remove('editing');
                        // Remove editing class from tab item
                        const tabItem = e.target.closest('.sidebar-tab-item');
                        if (tabItem) {
                            tabItem.classList.remove('editing-mode');
                        }
                    }
                }, 200); // Small delay to allow URL input to get focus
            }
            
            if (e.target.classList.contains('tab-url-input')) {
                const newUrl = e.target.value.trim();
                if (!newUrl) {
                    e.target.value = e.target.dataset.originalUrl;
                }
                // Hide URL section after editing
                const urlSection = e.target.closest('.tab-url-section');
                if (urlSection) {
                    urlSection.classList.add('hidden');
                    urlSection.classList.remove('editing');
                    // Remove editing class from tab item
                    const tabItem = e.target.closest('.sidebar-tab-item');
                    if (tabItem) {
                        tabItem.classList.remove('editing-mode');
                    }
                }
            }
            
            if (e.target.classList.contains('bookmark-title-input')) {
                const newTitle = e.target.value.trim();
                if (!newTitle) {
                    e.target.value = e.target.dataset.originalTitle;
                }
                // Hide URL section after editing (with delay for URL input focus)
                setTimeout(() => {
                    const urlSection = e.target.parentNode.querySelector('.bookmark-url-section');
                    if (urlSection && !urlSection.contains(document.activeElement)) {
                        this.hideBookmarkUrlSection(e.target);
                    }
                }, 200);
            }
            
            if (e.target.classList.contains('bookmark-url-input')) {
                const newUrl = e.target.value.trim();
                if (!newUrl) {
                    e.target.value = e.target.dataset.originalUrl;
                }
                this.hideBookmarkUrlSection(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.target.classList.contains('tab-title-input') || 
                 e.target.classList.contains('tab-url-input') || 
                 e.target.classList.contains('bookmark-title-input') || 
                 e.target.classList.contains('bookmark-url-input')) && 
                e.key === 'Enter') {
                e.target.blur();
            }
        });
    }

    updateGroupName(groupId, newName) {
        const group = this.bookmarkGroups.find(g => g.id === groupId);
        if (group) {
            group.name = newName;
            this.saveBookmarks();
        }
    }

    // Public method to refresh sidebar tabs
    async refreshSidebar() {
        console.log('[Bookmarks] === REFRESH SIDEBAR REQUESTED ===');
        // renderSidebar already calls loadCurrentTabs, so just call render
        await this.renderSidebar();
    }

    // Debug method to check initialization
    debugBookmarks() {
        console.log('[Bookmarks] === DEBUG INFO ===');
        console.log('Chrome tabs API:', !!chrome?.tabs ? '✅ Available' : '❌ Not Available');
        console.log('Current tabs count:', this.currentTabs?.length || 0);
        console.log('Is rendering sidebar:', this.isRenderingSidebar ? '⚠️ Yes' : '✅ No');
        
        // Check sample tab data
        if (this.currentTabs?.length > 0) {
            const sampleTab = this.currentTabs[0];
            console.log('Sample tab data:', {
                id: sampleTab.id,
                hasTitle: !!sampleTab.title,
                hasUrl: !!sampleTab.url,
                hasFavicon: !!sampleTab.favIconUrl,
                title: sampleTab.title?.substring(0, 50) || 'undefined',
                url: sampleTab.url?.substring(0, 50) || 'undefined'
            });
            
            if (!sampleTab.title && !sampleTab.url) {
                console.warn('⚠️ Tab properties are undefined - check host permissions in manifest.json');
                console.log('💡 Extension may need to be reloaded after adding host_permissions');
            }
        }
        
        const sidebar = document.getElementById('bookmarks-sidebar');
        if (sidebar) {
            const renderedItems = sidebar.querySelectorAll('.sidebar-tab-item').length;
            console.log('Items in DOM:', renderedItems);
            console.log('Expected items:', this.currentTabs?.length || 0);
            if (renderedItems !== (this.currentTabs?.length || 0)) {
                console.warn('⚠️ Mismatch between data and rendered items!');
            }
        }
        console.log('[Bookmarks] === END DEBUG ===');
    }
    
    // Debug method to log current state - called via window.debugBookmarksState()
    logCurrentState() {
        console.log('[Bookmarks] === CURRENT STATE DEBUG ===');
        console.log('[Bookmarks] Sidebar state:', this.sidebarState);
        console.log('[Bookmarks] Is rendering sidebar:', this.isRenderingSidebar);
        console.log('[Bookmarks] Last toggle time:', this.lastToggleTime);
        console.log('[Bookmarks] Event listener setup count:', this.eventListenerSetupCount);
        console.log('[Bookmarks] Current tabs count:', this.currentTabs.length);
        console.log('[Bookmarks] Bookmark groups count:', this.bookmarkGroups.length);
        
        // Check DOM elements
        const sidebar = document.getElementById('bookmarks-sidebar');
        const mainContent = document.getElementById('bookmarks-main-content');
        const toggleBtn = document.getElementById('toggle-sidebar-btn');
        
        console.log('[Bookmarks] DOM elements:', {
            sidebar: !!sidebar,
            mainContent: !!mainContent,
            toggleBtn: !!toggleBtn,
            sidebarClasses: sidebar?.className,
            mainContentClasses: mainContent?.className,
            toggleBtnTitle: toggleBtn?.title
        });
        
        console.log('[Bookmarks] === END STATE DEBUG ===');
    }
    
    // Show temporary success/error messages
    showTemporaryMessage(message, type = 'info') {
        console.log(`[Bookmarks] Showing ${type} message:`, message);
        
        // Remove any existing messages first
        const existingMessage = document.querySelector('.bookmark-temp-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `bookmark-temp-message ${type}`;
        messageEl.innerHTML = `
            <div class="temp-message-content">
                <div class="temp-message-icon">
                    ${type === 'success' ? '✓' : type === 'error' ? '⚠️' : type === 'warning' ? '⚠️' : 'ℹ️'}
                </div>
                <div class="temp-message-text">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        // Style the message
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            min-width: 250px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
            color: white;
            ${type === 'success' ? 'background: rgba(46, 204, 113, 0.9);' : ''}
            ${type === 'error' ? 'background: rgba(231, 76, 60, 0.9);' : ''}
            ${type === 'warning' ? 'background: rgba(243, 156, 18, 0.9);' : ''}
            ${type === 'info' ? 'background: rgba(52, 152, 219, 0.9);' : ''}
        `;
        
        // Style the content
        const contentEl = messageEl.querySelector('.temp-message-content');
        contentEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        const iconEl = messageEl.querySelector('.temp-message-icon');
        iconEl.style.cssText = `
            font-size: 16px;
            flex-shrink: 0;
        `;
        
        const textEl = messageEl.querySelector('.temp-message-text');
        textEl.style.cssText = `
            flex: 1;
            line-height: 1.4;
        `;
        
        // Add animation styles if not already present
        if (!document.querySelector('#bookmark-temp-message-styles')) {
            const styles = document.createElement('style');
            styles.id = 'bookmark-temp-message-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to DOM
        document.body.appendChild(messageEl);
        
        // Auto-remove after delay
        const delay = type === 'error' ? 5000 : 3000; // Errors show longer
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.remove();
                    }
                }, 300);
            }
        }, delay);
        
        // Make it clickable to dismiss
        messageEl.addEventListener('click', () => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.remove();
                    }
                }, 300);
            }
        });
        
        // Add hover effect
        messageEl.style.cursor = 'pointer';
        messageEl.title = 'Click to dismiss';
    }
}

// CSP-safe refresh function
window.refreshBookmarksExtension = function() {
    if (window.bookmarks) {
        console.log('[Bookmarks] Refreshing extension to clear any cached content...');
        // Clear all content first
        const mainContent = document.getElementById('bookmarks-main-content');
        const sidebar = document.getElementById('bookmarks-sidebar');
        if (mainContent) mainContent.innerHTML = '';
        if (sidebar) sidebar.innerHTML = '';
        // Re-render everything
        window.bookmarks.renderBookmarks();
        console.log('[Bookmarks] Extension refreshed successfully');
    }
};
