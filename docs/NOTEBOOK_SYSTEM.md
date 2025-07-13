# SnapThink Notebook System

## Overview

SnapThink has been upgraded to use a notebook-based architecture that provides better organization, file management, and collaboration features compared to the previous chat session system.

## Key Features

### 📓 Notebook-Based Organization
- Each notebook is a self-contained workspace
- Better organization with metadata, tags, and descriptions
- Visual dashboard with notebook cards and thumbnails

### 📁 Advanced File Management
- Organized file structure: `docs/`, `images/`, `videos/`, `outputs/`
- Automatic file categorization based on type
- Visual file browser in sidebar
- Easy upload, view, and delete operations

### 🔧 Plugin System
- Modular plugin architecture
- Configurable settings per plugin
- Enable/disable plugins per notebook
- Built-in plugins: Python Runner, Document RAG, Chart Generator

### 📦 Import/Export
- Export notebooks as `.snap` files (ZIP format)
- Import shared notebooks from `.snap` files
- Complete backup and restore functionality

### 🔄 Migration Support
- Seamless migration from old chat sessions
- Automatic backup before migration
- Preserves all messages and files
- Enhanced organization post-migration

## Folder Structure

```
notebooks/
├── notebook-{timestamp}-{uuid}/
│   ├── notebook.json          # Metadata and settings
│   ├── messages.json          # Chat history
│   ├── docs/                  # Uploaded documents
│   │   ├── sales-data.csv
│   │   ├── research-paper.pdf
│   │   └── ...
│   ├── images/                # Generated/uploaded images
│   │   ├── chart-output.png
│   │   ├── diagram.jpg
│   │   └── ...
│   ├── videos/                # Generated/uploaded videos
│   │   ├── demo.mp4
│   │   └── ...
│   └── outputs/               # Generated code outputs
│       ├── analysis-results.txt
│       ├── model-weights.pkl
│       └── ...
```

## Components

### NotebookDashboard
- Main entry point showing all notebooks as cards
- Search and filter functionality
- Create, import, delete, and export operations
- Migration wizard for existing chats

### NotebookWorkspace
- Individual notebook interface
- Refactored from the original App.jsx
- Integrated chat interface with model selection
- Real-time message updates and file management

### NotebookSidebar
- Three-tab interface: Files, Plugins, Settings
- File browser with type-based organization
- Plugin management and configuration
- Notebook settings and metadata editing

### MigrationDialog
- Guided migration process from chat sessions
- Automatic backup creation
- Progress tracking and error handling
- Completion summary with statistics

## Data Schema

### notebook.json
```json
{
  "id": "notebook-{timestamp}-{uuid}",
  "title": "My Data Analysis Project",
  "description": "Analyzing sales data for Q4 2024",
  "createdAt": "2024-01-12T14:30:00Z",
  "updatedAt": "2024-01-12T16:45:00Z",
  "thumbnail": "images/preview.png",
  "tags": ["data-science", "sales"],
  "model": "llama3.1:8b",
  "plugins": {
    "enabled": ["python-runner", "document-rag"],
    "settings": { ... }
  },
  "stats": {
    "totalMessages": 25,
    "totalTokens": 15420,
    "totalFiles": 3,
    "lastActive": "2024-01-12T16:45:00Z"
  }
}
```

### messages.json
```json
{
  "messages": [
    {
      "id": "msg-{timestamp}",
      "role": "user|assistant",
      "content": "Message content...",
      "timestamp": "2024-01-12T14:30:00Z",
      "mediaFiles": [...],
      "sources": [...],
      "outputs": [...]
    }
  ]
}
```

## API Reference

### Electron IPC Handlers

#### Notebook Management
- `list-notebooks` - Get all notebooks with metadata
- `create-notebook` - Create new notebook with structure
- `load-notebook` - Load notebook data and files
- `save-notebook` - Save notebook messages and update metadata
- `update-notebook` - Update notebook metadata
- `delete-notebook` - Delete notebook and all files

#### Import/Export
- `export-notebook` - Export notebook as .snap file
- `import-notebook` - Import notebook from .snap file

#### File Management
- `add-notebook-file` - Add file to notebook directory
- `remove-notebook-file` - Remove file from notebook

#### Migration
- `migrate-chats-to-notebooks` - Convert chat sessions to notebooks
- `backup-chats` - Create backup of chat sessions

### React Hooks

#### useNotebookManager
Handles notebook operations:
- `loadNotebook()` - Load notebook data
- `saveNotebook(messages)` - Save messages
- `updateNotebookTitle(title)` - Update title
- `updateNotebookMetadata(metadata)` - Update metadata
- `addFileToNotebook(file, type)` - Add file
- `removeFileFromNotebook(fileName, type)` - Remove file

## Usage Guide

### Creating a New Notebook
1. Click "New Notebook" on the dashboard
2. Notebook is created with default structure
3. Title auto-updates from first message
4. Configure plugins and settings as needed

### Working with Files
1. Upload files via chat interface or sidebar
2. Files automatically categorized by type
3. Use sidebar to browse, view, and manage files
4. RAG automatically enabled for document uploads

### Configuring Plugins
1. Go to notebook sidebar → Plugins tab
2. Enable/disable desired plugins
3. Configure plugin settings
4. Settings saved per notebook

### Exporting/Sharing
1. Click export button on notebook card
2. Choose location for .snap file
3. Share .snap file with others
4. Recipients can import via "Import" button

### Migration from Chat Sessions
1. Click "Migrate Chats" on dashboard
2. Follow guided process to backup first
3. Automatic conversion preserves all data
4. Enhanced organization in notebook format

## Development

### Adding New Plugins
1. Create plugin configuration in `notebook.json`
2. Add plugin component to NotebookSidebar
3. Implement plugin logic in workspace
4. Update plugin settings schema

### Extending File Types
1. Update file categorization logic in IPC handlers
2. Add new file type handling in NotebookSidebar
3. Update file display components as needed
4. Consider new folder structure additions

### Custom Metadata
1. Extend `notebook.json` schema
2. Update create/update IPC handlers
3. Add UI components for new metadata
4. Ensure migration compatibility

## Migration Notes

- Original chat sessions remain intact as backup
- All messages and files are preserved
- Enhanced metadata and organization
- Plugin configurations start fresh
- Tags added for identification (migrated, legacy-chat)
- Original chat ID stored in migration metadata

## Performance Considerations

- Files stored directly in notebook folders
- Lazy loading of notebook content
- Efficient file organization by type
- Minimal data transfer between processes
- Indexed metadata for fast searching

## Future Enhancements

- Collaboration features with real-time sync
- Version control for notebook changes
- Advanced plugin marketplace
- Cloud storage integration
- Notebook templates and sharing community
- Advanced analytics and insights dashboard
