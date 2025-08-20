# Productivity Hub - Chrome Extension

A comprehensive productivity extension that transforms your new tab page into a powerful workspace featuring **Sticky Notes** and **Daily Task Tracker** with advanced notification system.

## 🎯 Features

### 📝 **Sticky Notes**
- **Titled Notes** - Add custom titles to organize your notes better
- **Full-screen workspace** - Clean, distraction-free interface
- **Windows-style design** - Authentic look and feel with familiar design
- **Drag and drop** - Move notes anywhere on the screen
- **Resize functionality** - Adjust size to fit your content
- **Auto-save** - Content automatically saved as you type
- **Position persistence** - Notes remember their location across sessions
- **Multiple colors** - Choose from 6 vibrant colors (yellow, blue, green, pink, purple, orange)

### 📋 **Daily Task Tracker**
- **5-Column Layout** - Past, Yesterday, Today, Tomorrow, and Future tasks
- **Smart Date Headers** - Dynamic date display for Yesterday, Today, and Tomorrow
- **Drag & Drop** - Move tasks between columns effortlessly
- **Priority System** - High, medium, and low priority with visual indicators
- **Task Management** - Complete CRUD operations (Create, Read, Update, Delete)
- **Task Completion** - Mark tasks as done/undone with visual feedback
- **Task Migration** - Automatic migration from old column structures

### 🔔 **Advanced Notification System**
- **Rich Chrome Notifications** - System-level notifications with action buttons
- **30-Second Audio Alerts** - Pleasant notification sounds that play for 30 seconds
- **Task Highlighting** - Visual highlighting of tasks with active notifications
- **Persistent Banner** - In-app notification banner with countdown timer
- **Multiple Stop Options** - Stop sound, mark done, or snooze notifications
- **Cross-Tab Sync** - Notifications work across all browser tabs
- **Auto-Focus** - Automatically switches to Tasks tab when notification triggers

### 🎮 **Easy Controls**

#### Sticky Notes
- **Double-click anywhere** - Create a new sticky note instantly
- **Title editing** - Click title field to add custom note titles
- **Drag header** - Move notes by dragging the top bar
- **Resize handles** - Adjust note dimensions as needed
- **Individual delete** - Remove specific notes with the X button

#### Task Tracker
- **Add Task** - Click the "Add Task" button to create new tasks
- **Edit Tasks** - Click the edit (✏️) button to modify existing tasks
- **Delete Tasks** - Click the delete (🗑️) button to remove tasks
- **Complete Tasks** - Click the checkmark (✓) to mark as done
- **Set Reminders** - Add datetime reminders with browser notifications
- **Snooze Options** - 5-minute snooze directly from notifications

### 💾 **Smart Storage & Sync**
- **Real-time sync** - Changes appear instantly across all new tabs
- **Cross-session persistence** - Data survives browser restarts
- **Automatic backup** - Content safely stored in browser storage
- **Data migration** - Seamless updates to new data structures
- **Error recovery** - Robust error handling and data validation

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

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

4. **Verify Installation**
   - Open a new tab to see your productivity workspace
   - Look for the extension icon in the toolbar
   - Grant notification permissions when prompted

### Method 2: Chrome Web Store (Future)
*This extension will be available on the Chrome Web Store soon.*

## 📁 Project Structure

```
browser_plugin/
├── manifest.json              # Extension configuration (Manifest V3)
├── newtab.html               # Main productivity interface
├── newtab.css                # Comprehensive styling and animations
├── newtab.js                 # App initialization and coordination
├── background.js             # Storage, sync, and notification management
├── notification-sound.js     # Audio notification system
├── modules/
│   ├── StickyNotes.js        # Sticky notes functionality with titles
│   ├── TaskTracker.js        # Complete task management system
│   └── Utility.js            # Helper functions and utilities
├── icons/
│   ├── icon16.png            # Extension icon (16x16)
│   ├── icon32.png            # Extension icon (32x32)
│   ├── icon48.png            # Extension icon (48x48)
│   └── icon128.png           # Extension icon (128x128)
└── README.md                 # This documentation
```

## 🛠️ Technical Details

### Architecture
- **Manifest V3** - Latest Chrome extension standard with service workers
- **Modular JavaScript** - Clean, maintainable ES6+ code structure
- **Chrome Storage API** - Fast, reliable data persistence
- **Chrome Notifications API** - Rich system notifications with actions
- **Web Audio API** - Generated notification sounds
- **Service Worker** - Background processing and notification management

### Key Components

#### `StickyNotes.js`
- Note creation with custom titles
- Advanced drag and drop functionality
- Position and size management with validation
- Real-time content and title saving
- Cross-tab synchronization with conflict resolution

#### `TaskTracker.js`
- Complete task lifecycle management
- 5-column date-based organization
- Drag and drop between columns
- Priority-based visual indicators
- Reminder system with datetime picker
- Notification highlighting and banner management

#### `background.js`
- Comprehensive data persistence for notes and tasks
- Rich Chrome notification creation and management
- Cross-tab message broadcasting
- Notification sound coordination
- Data migration and validation

#### `notification-sound.js`
- Web Audio API sound generation
- 30-second notification audio loops
- Pleasant two-tone notification sounds
- Cross-tab sound synchronization

### Browser Compatibility
- **Chrome 88+** (Manifest V3 support)
- **Chromium-based browsers** (Edge, Brave, etc.)
- **Notification permissions** required for full functionality

## 🎨 Customization

### Note Colors & Themes
The extension supports 6 built-in colors:
- **Yellow** - Classic sticky note color (default)
- **Blue** - Cool and calming
- **Green** - Fresh and natural
- **Pink** - Warm and friendly
- **Purple** - Creative and unique
- **Orange** - Energetic and vibrant

### Task Priority Colors
- **High Priority** - Red border and indicators
- **Medium Priority** - Orange border and indicators  
- **Low Priority** - Green border and indicators

### Styling Customization
You can customize the appearance by modifying `newtab.css`:
- Note dimensions and positioning
- Task column layouts and responsive breakpoints
- Color schemes and themes
- Animation timing and effects
- Notification banner styling

## 📝 Usage Guide

### Getting Started with Sticky Notes
1. **Open a new tab** - Your productivity workspace appears
2. **Click "Notes" tab** - Access the sticky notes interface
3. **Double-click anywhere** - Create your first note
4. **Add a title** - Click the title field to organize your notes
5. **Start typing** - Content saves automatically
6. **Drag to move** - Position notes where you want them

### Getting Started with Task Tracker
1. **Click "Tasks" tab** - Access the daily task tracker
2. **Click "Add Task"** - Create your first task
3. **Fill in details** - Title, description, priority, and date
4. **Set reminders** - Optional datetime notifications
5. **Organize tasks** - Drag between Past, Yesterday, Today, Tomorrow, Future
6. **Manage tasks** - Edit, complete, or delete as needed

### Notification System
1. **Set reminders** - Add datetime when creating/editing tasks
2. **Grant permissions** - Allow notifications when prompted
3. **Receive alerts** - Rich notifications with sound for 30 seconds
4. **Take action** - Mark done, snooze, or stop sound from notification
5. **Visual feedback** - Highlighted tasks and persistent banner

### Best Practices
- **Keep notes concise** - Sticky notes work best for short reminders
- **Use descriptive titles** - Organize notes with clear, meaningful titles
- **Organize tasks by date** - Use the 5-column system effectively
- **Set realistic reminders** - Don't overwhelm yourself with notifications
- **Use priority levels** - Visual indicators help focus on important tasks
- **Regular cleanup** - Archive completed tasks to stay organized

## 🐛 Troubleshooting

### Common Issues

#### Notifications Not Working
- **Check permissions** - Ensure notifications are allowed in Chrome settings
- **System settings** - Verify OS-level notification permissions
- **Service worker** - Reload extension if background script is inactive
- **Console errors** - Check browser console for error messages

#### Notes Not Saving
- **Check storage permissions** - Ensure extension has storage access
- **Clear browser cache** - Sometimes helps with storage issues
- **Reload extension** - Go to chrome://extensions/ and reload

#### Tasks Not Appearing
- **Verify installation** - Check if extension is active
- **Check tab switching** - Ensure you're on the Tasks tab
- **Data migration** - Old task data should migrate automatically

#### Performance Issues
- **Too many items** - Consider archiving old notes and completed tasks
- **Browser memory** - Restart Chrome if sluggish
- **Extension conflicts** - Disable other new tab extensions

### Debug Mode
Open Chrome DevTools (F12) on the new tab page to:
- View console logs and errors
- Inspect elements and styling
- Monitor storage operations
- Debug notification system
- Test background script communication

## 🤝 Contributing

### Reporting Issues
1. **Check existing issues** - Search for similar problems
2. **Provide details** - Include browser version, OS, and steps to reproduce
3. **Screenshots** - Visual examples help with UI issues
4. **Console logs** - Include any error messages
5. **Notification logs** - Check both foreground and background console

### Feature Requests
- **Describe the feature** - What functionality would you like?
- **Use cases** - How would this improve productivity?
- **Implementation ideas** - Any technical suggestions?

### Code Contributions
1. **Fork the repository** - Create your own copy
2. **Make changes** - Implement features or fixes
3. **Test thoroughly** - Test both notes and tasks functionality
4. **Submit pull request** - Describe your changes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔄 Version History

### v2.0.0 (Current)
- ✅ **Daily Task Tracker** - Complete task management system
- ✅ **Rich Notifications** - Chrome notifications with 30-second audio
- ✅ **Task Highlighting** - Visual feedback for active notifications
- ✅ **Notification Banner** - Persistent in-app notifications with actions
- ✅ **Tabbed Interface** - Clean separation between Notes and Tasks
- ✅ **5-Column Layout** - Past, Yesterday, Today, Tomorrow, Future
- ✅ **Drag & Drop Tasks** - Move tasks between date columns
- ✅ **Priority System** - Visual priority indicators
- ✅ **Reminder System** - Datetime-based task notifications
- ✅ **Note Titles** - Custom titles for better organization

### v1.0.0 (Previous)
- ✅ Full-screen sticky notes workspace
- ✅ Drag and drop functionality
- ✅ Auto-save and persistence
- ✅ Multiple note colors
- ✅ Windows-style design
- ✅ Cross-tab synchronization

### Future Versions
- 🔮 **Calendar Integration** - Sync with Google Calendar
- 🔮 **Export/Import** - Backup and restore functionality
- 🔮 **Themes** - Dark mode and custom themes
- 🔮 **Search** - Find notes and tasks quickly
- 🔮 **Categories** - Tag and categorize items
- 🔮 **Keyboard Shortcuts** - Power user features
- 🔮 **Recurring Tasks** - Automatic task repetition
- 🔮 **Time Tracking** - Built-in productivity tracking

## 📞 Support

For questions, issues, or suggestions:
- **GitHub Issues** - Technical problems and feature requests
- **Documentation** - Check this README for common questions
- **Community** - Share productivity tips with other users

---

**Made with ❤️ for productivity enthusiasts**

*Transform your new tab into the ultimate productivity workspace with sticky notes, task management, and smart notifications!*