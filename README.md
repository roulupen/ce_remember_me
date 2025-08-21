# Productivity Hub - Chrome Extension

A comprehensive productivity extension that transforms your new tab page into a powerful workspace featuring **Sticky Notes**, **Daily Task Tracker**, and **Advanced Bookmark Management** with modern themes and smart persistence.

## 🎯 Features Overview

**🔥 Three Powerful Modules:**
- 📝 **Sticky Notes** - Full-screen note management with titles and colors
- 📋 **Task Tracker** - Complete daily task management with notifications  
- 🔖 **Bookmarks** - Advanced bookmark organization with groups and sidebar
- 🌙 **Theme System** - Beautiful light and dark themes
- 💾 **Smart Persistence** - Remembers your preferences across sessions

---

## 📝 **Sticky Notes Module**

### Core Features
- ✅ **Titled Notes** - Add custom titles to organize your notes better
- ✅ **Full-screen workspace** - Clean, distraction-free interface
- ✅ **Drag and drop** - Move notes anywhere on the screen
- ✅ **Resize functionality** - Adjust size to fit your content
- ✅ **Auto-save** - Content automatically saved as you type
- ✅ **Position persistence** - Notes remember their location across sessions
- ✅ **Multiple colors** - Choose from 6 vibrant colors (yellow, blue, green, pink, purple, orange)
- ✅ **Theme aware** - Adapts colors and contrast for light/dark themes

### How to Use
- **Double-click anywhere** - Create a new sticky note instantly
- **Title editing** - Click title field to add custom note titles
- **Drag header** - Move notes by dragging the top bar
- **Resize handles** - Adjust note dimensions as needed
- **Individual delete** - Remove specific notes with the X button
- **Clear all** - Remove all notes with the clear button

---

## 📋 **Task Tracker Module**

### Core Features
- ✅ **5-Column Layout** - Past, Yesterday, Today, Tomorrow, and Future tasks
- ✅ **Smart Date Headers** - Dynamic date display for Yesterday, Today, and Tomorrow
- ✅ **Drag & Drop** - Move tasks between columns effortlessly
- ✅ **Priority System** - High, medium, and low priority with visual indicators
- ✅ **Task Management** - Complete CRUD operations (Create, Read, Update, Delete)
- ✅ **Task Completion** - Mark tasks as done/undone with visual feedback
- ✅ **Rich Notifications** - Chrome notifications with 30-second audio alerts
- ✅ **Task Highlighting** - Visual highlighting of tasks with active notifications
- ✅ **Persistent Banner** - In-app notification banner with countdown timer
- ✅ **Cross-Tab Sync** - Notifications work across all browser tabs

### How to Use
- **Add Task** - Click the "Add Task" button to create new tasks
- **Edit Tasks** - Click the edit (✏️) button to modify existing tasks
- **Delete Tasks** - Click the delete (🗑️) button to remove tasks
- **Complete Tasks** - Click the checkmark (✓) to mark as done
- **Set Reminders** - Add datetime reminders with browser notifications
- **Snooze Options** - 5-minute snooze directly from notifications
- **Drag Tasks** - Move tasks between date columns

---

## 🔖 **Bookmarks Module** ⭐ *New Feature*

### Core Features
- ✅ **Smart Sidebar** - Displays currently open browser tabs with favicons
- ✅ **Three Sidebar States** - Hidden, Collapsed (icons only), Expanded (full details)
- ✅ **Bookmark Groups** - Organize bookmarks into customizable groups (max 10)
- ✅ **Drag & Drop** - Move tabs from sidebar into bookmark groups
- ✅ **Inline Editing** - Edit bookmark and group names directly
- ✅ **Context Menus** - Right-click for additional options
- ✅ **Visual Feedback** - Success/error notifications for all operations
- ✅ **Auto-save** - All changes saved instantly to Chrome storage

### Sidebar Features
- **Current Tabs Display** - Shows all open browser tabs with favicons and titles
- **Editable Titles** - Click to edit tab titles (for bookmarking)
- **URL Editing** - Show/hide URL editing when needed
- **Drag to Bookmark** - Drag tabs into bookmark groups
- **Hover Tooltips** - In collapsed mode, hover over icons to see full details
- **Smart Toggle** - Small button positioned at sidebar border

### Bookmark Management
- **Group Creation** - Create up to 10 bookmark groups with custom names
- **Color Coding** - Assign colors to groups for visual organization
- **Inline Actions** - Edit/delete buttons appear on hover
- **Batch Operations** - Delete entire groups with confirmation
- **Smart Validation** - Prevents empty names and duplicate groups

### How to Use
- **Toggle Sidebar** - Click the toggle button to show/hide/collapse sidebar
- **Create Groups** - Click the "+" button to add new bookmark groups
- **Drag Tabs** - Drag current tabs from sidebar into bookmark groups
- **Edit Names** - Click edit button or right-click for edit options
- **Open Bookmarks** - Click any bookmark to open in new tab
- **Organize** - Use different groups for work, personal, research, etc.

---

## 🌙 **Theme System** ⭐ *New Feature*

### Core Features
- ✅ **Light Theme** - Clean, bright interface for daytime use
- ✅ **Dark Theme** - Modern, easy-on-eyes interface for low-light use
- ✅ **Instant Switching** - Toggle between themes with single click
- ✅ **Persistence** - Remembers your theme preference across sessions
- ✅ **Comprehensive Coverage** - All modules and elements properly themed
- ✅ **Smart Contrast** - Optimized readability in both themes

### Theme Colors

#### Light Theme
- **Background**: Light blue-gray gradient (#f5f7fa → #c3cfe2)
- **Text**: Dark blue-gray (#2c3e50) with excellent contrast
- **Accents**: Vibrant blue (#3498db) for interactive elements
- **Cards**: Clean white backgrounds with subtle borders

#### Dark Theme  
- **Background**: Deep dark gradient (#1a1a2e → #16213e)
- **Text**: Light gray (#ecf0f1) with perfect readability
- **Accents**: Bright blue (#5dade2) for interactive elements
- **Cards**: Dark translucent backgrounds with subtle borders

### How to Use
- **Toggle Button** - Click sun/moon icon in top-right corner
- **Instant Switch** - Theme changes immediately across all modules
- **Visual Feedback** - Notification confirms theme change
- **Automatic Saving** - Your preference is remembered for future sessions

---

## 💾 **Smart Persistence System**

### What's Saved
- ✅ **Current Tab** - Remembers your last active tab (Notes/Tasks/Bookmarks)
- ✅ **Theme Preference** - Your light/dark theme choice
- ✅ **Bookmark Groups** - All bookmark data and organization
- ✅ **Sidebar State** - Collapsed/expanded preference
- ✅ **Sticky Notes** - Content, position, size, and colors
- ✅ **Tasks** - All task data, priorities, and completion states

### How It Works
- **Automatic Saving** - Changes saved instantly to Chrome local storage
- **Fast Loading** - Preferences applied before UI renders (no flash)
- **Cross-Session** - Everything persists across browser restarts
- **Data Migration** - Seamless updates when extension is upgraded

---

## 🚀 Installation

### Load Unpacked Extension (Development)

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `browser_plugin` folder
   - Extension will be installed and activated

4. **Grant Permissions**
   - **Tabs permission** - For bookmark sidebar functionality
   - **Storage permission** - For saving data and preferences
   - **Notifications** - For task reminder alerts
   - **Host permissions** - For accessing tab information (URLs, favicons)

5. **Verify Installation**
   - Open a new tab to see your productivity workspace
   - All three modules should be accessible via tab navigation
   - Theme toggle should appear in top-right corner

---

## 📁 Project Structure

```
browser_plugin/
├── manifest.json              # Extension configuration (Manifest V3)
├── newtab.html               # Main productivity interface
├── newtab.css                # Comprehensive styling with theme system
├── newtab.js                 # App initialization and theme management
├── background.js             # Storage, sync, and notification management
├── notification-sound.js     # Audio notification system
├── modules/
│   ├── StickyNotes.js        # Sticky notes functionality with titles
│   ├── TaskTracker.js        # Complete task management system
│   ├── Bookmarks.js          # Advanced bookmark management ⭐ NEW
│   └── Utility.js            # Helper functions and utilities
├── icons/
│   ├── icon16.png            # Extension icon (16x16)
│   ├── icon32.png            # Extension icon (32x32)
│   ├── icon48.png            # Extension icon (48x48)
│   └── icon128.png           # Extension icon (128x128)
└── README.md                 # This documentation
```

---

## 🛠️ Technical Details

### Architecture
- **Manifest V3** - Latest Chrome extension standard with service workers
- **Modular JavaScript** - Clean, maintainable ES6+ code structure
- **Chrome Storage API** - Fast, reliable data persistence
- **Chrome Tabs API** - Access to browser tab information for bookmarks
- **Chrome Notifications API** - Rich system notifications with actions
- **Web Audio API** - Generated notification sounds
- **CSS Custom Properties** - Dynamic theming system
- **CSP Compliant** - Content Security Policy adherent code

### Key Components

#### `newtab.js` - Main App Controller
- Application initialization and coordination
- Theme management and persistence
- Tab switching with persistence
- Cross-module communication
- Error handling and recovery

#### `StickyNotes.js` - Note Management
- Note creation with custom titles and content
- Advanced drag and drop functionality
- Position and size management with validation
- Real-time content and title saving
- Cross-tab synchronization with conflict resolution
- Theme-aware styling and colors

#### `TaskTracker.js` - Task Management
- Complete task lifecycle management
- 5-column date-based organization
- Drag and drop between columns
- Priority-based visual indicators
- Reminder system with datetime picker
- Notification highlighting and banner management
- Theme-aware UI elements

#### `Bookmarks.js` - Bookmark Organization ⭐ *New*
- Current browser tabs sidebar with favicon display
- Bookmark group creation and management (up to 10 groups)
- Drag and drop from tabs to bookmarks
- Inline edit/delete functionality for bookmarks and groups
- Context menus with comprehensive options
- Three-state sidebar (hidden/collapsed/visible)
- Smart toggle button with proper positioning

#### `background.js` - Service Worker
- Comprehensive data persistence for all modules
- Rich Chrome notification creation and management
- Cross-tab message broadcasting
- Notification sound coordination
- Data migration and validation

#### `notification-sound.js` - Audio System
- Web Audio API sound generation
- 30-second notification audio loops
- Pleasant two-tone notification sounds
- Cross-tab sound synchronization

### Browser Compatibility
- **Chrome 88+** (Manifest V3 support)
- **Chromium-based browsers** (Edge, Brave, etc.)
- **Required Permissions**:
  - `storage` - For saving data and preferences
  - `notifications` - For task reminder alerts
  - `tabs` - For bookmark sidebar functionality
  - `alarms` - For notification scheduling
  - `activeTab` - For current tab interaction
  - Host permissions (`*://*/*`) - For tab URL and favicon access

---

## 🎨 Customization & Themes

### Built-in Themes
- **Light Theme** - Clean, bright interface optimized for daytime use
- **Dark Theme** - Modern, dark interface perfect for low-light environments
- **Auto-persistence** - Theme choice remembered across sessions
- **Comprehensive coverage** - All UI elements properly themed

### Note Colors
- **Yellow** - Classic sticky note color (default)
- **Blue** - Cool and calming
- **Green** - Fresh and natural
- **Pink** - Warm and friendly
- **Purple** - Creative and unique
- **Orange** - Energetic and vibrant

### Bookmark Group Colors
- **10 color options** - Assign unique colors to different bookmark groups
- **Visual organization** - Color-coded headers for quick identification
- **Theme adaptive** - Colors work well in both light and dark themes

### Task Priority Colors
- **High Priority** - Red border and indicators
- **Medium Priority** - Orange border and indicators  
- **Low Priority** - Green border and indicators

---

## 📝 Usage Guide

### Getting Started

#### First Time Setup
1. **Install the extension** - Follow installation instructions above
2. **Grant permissions** - Allow tabs, storage, and notifications
3. **Choose your theme** - Click sun/moon icon to switch between light/dark
4. **Select your starting module** - Notes, Tasks, or Bookmarks

#### Sticky Notes
1. **Click "Notes" tab** - Access the sticky notes interface
2. **Double-click anywhere** - Create your first note
3. **Add a title** - Click the title field to organize your notes
4. **Start typing** - Content saves automatically as you type
5. **Drag to move** - Position notes where you want them
6. **Resize notes** - Drag corners to adjust size
7. **Change colors** - Use the color picker for visual organization

#### Task Tracker
1. **Click "Tasks" tab** - Access the daily task tracker
2. **Click "Add Task"** - Create your first task
3. **Fill in details** - Title, description, priority, and due date
4. **Set reminders** - Add datetime notifications for important tasks
5. **Organize tasks** - Drag between Past, Yesterday, Today, Tomorrow, Future columns
6. **Manage tasks** - Use inline edit/delete buttons or completion checkmarks
7. **Handle notifications** - Respond to task reminders with built-in actions

#### Bookmarks Management ⭐ *New*
1. **Click "Bookmarks" tab** - Access the bookmark management interface
2. **Toggle sidebar** - Click the border button to show current tabs
3. **Create groups** - Click "+" to add new bookmark groups (up to 10)
4. **Drag tabs** - Drag current browser tabs into bookmark groups
5. **Edit names** - Use inline edit buttons or right-click context menus
6. **Organize** - Assign colors and names to different groups
7. **Quick access** - Click any bookmark to open in a new tab

### Advanced Features

#### Theme Switching
- **Toggle anytime** - Click sun/moon button in header
- **Instant preview** - See changes immediately across all modules
- **Automatic saving** - Theme preference saved automatically
- **Visual feedback** - Notification confirms theme change

#### Tab Persistence
- **Automatic memory** - Extension remembers your last active tab
- **Seamless workflow** - Opens to your preferred module every time
- **No setup needed** - Works automatically from first use

#### Bookmark Sidebar States
- **Collapsed Mode** - Shows only favicons with hover tooltips
- **Expanded Mode** - Shows full tab titles and URLs
- **Hidden Mode** - Complete sidebar hiding (not recommended)
- **Smart toggle** - Button always accessible at sidebar border

---

## 🎮 User Interface Guide

### Navigation
- **Tab Buttons** - Switch between Notes, Tasks, and Bookmarks
- **Theme Toggle** - Sun/moon button in top-right corner
- **Module-specific controls** - Each tab has its own action buttons

### Interaction Patterns

#### Hover Actions
- **Bookmark items** - Hover to reveal edit/delete buttons
- **Group headers** - Hover to reveal group action buttons
- **Sidebar icons** - Hover in collapsed mode for tooltips

#### Right-Click Menus
- **Bookmark items** - Edit or delete individual bookmarks
- **Group headers** - Edit name, add bookmark, change color, or delete group
- **Context-aware** - Different options based on what you right-click

#### Inline Editing
- **Click edit button** - Enters edit mode with input fields
- **Save/Cancel** - Green checkmark to save, red X to cancel
- **Keyboard shortcuts** - Enter to save, Escape to cancel
- **Smart validation** - Prevents empty names and duplicates

#### Drag & Drop
- **Sticky Notes** - Drag by header to reposition
- **Tasks** - Drag between date columns
- **Tabs to Bookmarks** - Drag from sidebar into bookmark groups
- **Visual feedback** - Clear indicators during drag operations

---

## 🔧 Advanced Features

### Smart Notifications
- **Rich Chrome notifications** - System-level alerts with custom actions
- **30-second audio alerts** - Pleasant notification sounds
- **Multiple stop options** - Stop sound, mark done, or snooze
- **Auto-focus** - Switches to Tasks tab when notification triggers
- **Persistent banner** - In-app notification with countdown timer

### Data Management
- **Real-time sync** - Changes appear instantly across all new tabs
- **Automatic backup** - Content safely stored in browser storage
- **Data migration** - Seamless updates to new data structures
- **Error recovery** - Robust error handling and data validation
- **Cross-session persistence** - Data survives browser restarts

### Performance Optimizations
- **Lazy loading** - Modules initialize only when needed
- **Efficient rendering** - Smart DOM updates and minimal reflows
- **Debounced saving** - Prevents excessive storage operations
- **Memory management** - Proper cleanup and garbage collection

---

## 🐛 Troubleshooting

### Common Issues

#### Bookmarks Sidebar Not Showing Tabs
- **Check permissions** - Ensure "tabs" permission is granted
- **Host permissions** - Verify `*://*/*` permission for tab access
- **Reload extension** - Go to chrome://extensions/ and reload
- **Console check** - Look for permission errors in browser console

#### Theme Not Switching Properly
- **Button location** - Look for sun/moon icon in top-right corner
- **Console check** - Run `debugTheme()` in browser console
- **Reset theme** - Run `toggleTheme()` in console to force switch
- **Storage clear** - Clear extension data if theme gets stuck

#### Tab Persistence Not Working
- **Storage permissions** - Ensure extension can save preferences
- **Console check** - Run `debugTab()` to see current state
- **Manual switch** - Run `switchToTab('bookmarks-tab')` in console
- **Data reset** - Clear extension storage if needed

#### Notifications Not Working
- **Check permissions** - Ensure notifications are allowed in Chrome settings
- **System settings** - Verify OS-level notification permissions
- **Service worker** - Reload extension if background script is inactive
- **Console errors** - Check browser console for error messages

#### Performance Issues
- **Too many items** - Consider archiving old notes and completed tasks
- **Browser memory** - Restart Chrome if sluggish
- **Extension conflicts** - Disable other new tab extensions
- **Clear storage** - Reset extension data if issues persist

### Debug Tools

#### Browser Console Commands
```javascript
// Theme debugging
debugTheme()              // Show current theme state
toggleTheme()             // Manually toggle theme

// Tab debugging  
debugTab()                // Show current tab state
switchToTab('tasks-tab')  // Manually switch tabs

// Module debugging
debugBookmarksState()     // Show bookmark module state
debugApp()                // Show complete app state
```

#### Debug Mode
Open Chrome DevTools (F12) on the new tab page to:
- View detailed console logs for each module
- Inspect elements and styling changes
- Monitor storage operations and data flow
- Debug notification system and audio
- Test background script communication

---

## 🏗️ Development Notes

### Code Organization
- **Modular architecture** - Each feature in separate modules
- **Clean separation** - UI, data, and business logic properly separated
- **Event-driven** - Modules communicate via events and callbacks
- **Extensible design** - Easy to add new modules and features

### CSS Architecture
- **CSS Custom Properties** - Dynamic theming with CSS variables
- **BEM methodology** - Consistent naming conventions
- **Responsive design** - Works across all screen sizes
- **Glassmorphism** - Modern UI design with backdrop filters

### Performance Considerations
- **Efficient DOM updates** - Minimal reflows and repaints
- **Debounced operations** - Prevents excessive API calls
- **Memory management** - Proper cleanup and resource management
- **CSP compliance** - Content Security Policy adherent code

---

## ⚡ Quick Start Checklist

### Initial Setup
- [ ] Install extension in Chrome
- [ ] Grant all requested permissions (tabs, storage, notifications)
- [ ] Choose your preferred theme (light/dark)
- [ ] Test each module to ensure everything works

### Customize Your Workspace
- [ ] Create your first sticky note with a title
- [ ] Add a few tasks with different priorities and dates
- [ ] Set up bookmark groups for your workflows
- [ ] Organize browser tabs using the bookmark sidebar
- [ ] Test theme switching and verify persistence

### Optimize Your Workflow
- [ ] Organize notes by color and position
- [ ] Set up task reminders for important deadlines
- [ ] Create bookmark groups for different projects/topics
- [ ] Learn keyboard shortcuts for faster editing
- [ ] Configure sidebar to your preferred state (collapsed/expanded)

---

**Made with ❤️ for productivity enthusiasts**

*Transform your new tab into the ultimate productivity workspace with sticky notes, advanced task management, intelligent bookmark organization, and beautiful themes!*