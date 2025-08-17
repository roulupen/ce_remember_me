# Sticky Notes - Chrome Extension

A simple and elegant sticky notes extension that replaces your new tab page with a clean workspace for organizing thoughts, reminders, and quick notes.

## 🎯 Features

### ✨ Core Functionality
- **Full-screen sticky notes workspace** - Clean, distraction-free interface
- **Windows-style sticky notes** - Authentic look and feel with familiar design
- **Drag and drop** - Move notes anywhere on the screen
- **Resize notes** - Adjust size to fit your content
- **Auto-save** - Content automatically saved as you type
- **Position persistence** - Notes remember their location across sessions
- **Multiple colors** - Choose from 6 vibrant colors (yellow, blue, green, pink, purple, orange)

### 🎮 Easy Controls
- **Double-click anywhere** - Create a new sticky note instantly
- **Floating action buttons** - Quick access to add notes and clear all
- **Individual delete** - Remove specific notes with the X button
- **Drag header** - Move notes by dragging the top bar
- **Resize handles** - Adjust note dimensions as needed

### 💾 Smart Storage
- **Real-time sync** - Changes appear instantly across all new tabs
- **Cross-session persistence** - Notes survive browser restarts
- **Automatic backup** - Content safely stored in browser storage
- **No data loss** - Robust error handling and recovery

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
   - Open a new tab to see your sticky notes workspace
   - Look for the extension icon in the toolbar

### Method 2: Chrome Web Store (Future)
*This extension will be available on the Chrome Web Store soon.*

## 📁 Project Structure

```
browser_plugin/
├── manifest.json              # Extension configuration
├── newtab.html               # Main sticky notes interface
├── newtab.css                # Styling and animations
├── newtab.js                 # App initialization
├── background.js             # Storage and sync management
├── modules/
│   ├── StickyNotes.js        # Core sticky notes functionality
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
- **Manifest V3** - Latest Chrome extension standard
- **Modular JavaScript** - Clean, maintainable code structure
- **Local Storage** - Fast, reliable data persistence
- **Service Worker** - Efficient background processing

### Key Components

#### `StickyNotes.js`
- Note creation, editing, and deletion
- Drag and drop functionality
- Position and size management
- Real-time content saving

#### `Utility.js`
- Storage operations
- DOM manipulation helpers
- Event handling utilities
- Error management

#### `background.js`
- Data persistence
- Cross-tab synchronization
- Storage management
- Message handling

### Browser Compatibility
- **Chrome 88+** (Manifest V3 support)
- **Chromium-based browsers** (Edge, Brave, etc.)

## 🎨 Customization

### Note Colors
The extension supports 6 built-in colors:
- **Yellow** - Classic sticky note color (default)
- **Blue** - Cool and calming
- **Green** - Fresh and natural
- **Pink** - Warm and friendly
- **Purple** - Creative and unique
- **Orange** - Energetic and vibrant

### Styling
You can customize the appearance by modifying `newtab.css`:
- Note dimensions and positioning
- Color schemes and themes
- Animation timing and effects
- Typography and fonts

## 🔧 Development

### Prerequisites
- Chrome browser (version 88+)
- Basic knowledge of HTML, CSS, and JavaScript
- Text editor or IDE

### Local Development
1. **Clone or download** the project files
2. **Make changes** to the source files
3. **Reload the extension** in `chrome://extensions/`
4. **Test changes** by opening a new tab

### Building Icons
If you need to regenerate the extension icons:
```bash
cd icons/
python create_simple_icons.py
```

### Code Structure
- **HTML** - Minimal structure with floating containers
- **CSS** - Responsive design with smooth animations
- **JavaScript** - ES6+ with async/await patterns
- **Storage** - Chrome Storage API for persistence

## 📝 Usage Tips

### Getting Started
1. **Open a new tab** - Your sticky notes workspace appears
2. **Double-click anywhere** - Create your first note
3. **Start typing** - Content saves automatically
4. **Drag to move** - Position notes where you want them

### Best Practices
- **Keep notes concise** - Sticky notes work best for short reminders
- **Use colors** - Organize by category or priority
- **Position strategically** - Place important notes where you'll see them
- **Regular cleanup** - Remove completed tasks to stay organized

### Keyboard Shortcuts
- **Double-click** - Create new note
- **Escape** - Finish editing (blur focus)
- **Tab** - Navigate between notes
- **Enter** - New line within note

## 🐛 Troubleshooting

### Common Issues

#### Notes Not Saving
- **Check storage permissions** - Ensure extension has storage access
- **Clear browser cache** - Sometimes helps with storage issues
- **Reload extension** - Go to chrome://extensions/ and reload

#### Notes Not Appearing
- **Verify installation** - Check if extension is active
- **Check new tab override** - Extension should replace default new tab
- **Console errors** - Open DevTools to check for JavaScript errors

#### Performance Issues
- **Too many notes** - Consider clearing old notes
- **Browser memory** - Restart Chrome if sluggish
- **Extension conflicts** - Disable other new tab extensions

### Debug Mode
Open Chrome DevTools (F12) on the new tab page to:
- View console logs and errors
- Inspect note elements and styling
- Monitor storage operations
- Debug JavaScript functionality

## 🤝 Contributing

### Reporting Issues
1. **Check existing issues** - Search for similar problems
2. **Provide details** - Include browser version, OS, and steps to reproduce
3. **Screenshots** - Visual examples help with UI issues
4. **Console logs** - Include any error messages

### Feature Requests
- **Describe the feature** - What functionality would you like?
- **Use cases** - How would this improve the experience?
- **Implementation ideas** - Any technical suggestions?

### Code Contributions
1. **Fork the repository** - Create your own copy
2. **Make changes** - Implement features or fixes
3. **Test thoroughly** - Ensure everything works
4. **Submit pull request** - Describe your changes

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Full-screen sticky notes workspace
- ✅ Drag and drop functionality
- ✅ Auto-save and persistence
- ✅ Multiple note colors
- ✅ Windows-style design
- ✅ Floating action buttons
- ✅ Cross-tab synchronization

### Future Versions
- 🔮 Note categories and tags
- 🔮 Import/export functionality
- 🔮 Keyboard shortcuts
- 🔮 Theme customization
- 🔮 Note templates
- 🔮 Search functionality

## 📞 Support

For questions, issues, or suggestions:
- **GitHub Issues** - Technical problems and feature requests
- **Documentation** - Check this README for common questions
- **Community** - Share tips and tricks with other users

---

**Made with ❤️ for productivity enthusiasts**

*Transform your new tab into a powerful sticky notes workspace!*