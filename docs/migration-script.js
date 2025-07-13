// Migration script to convert existing chats to notebooks
// Add this to electron.cjs as an IPC handler

ipcMain.handle('migrate-chats-to-notebooks', async () => {
  try {
    console.log('🔄 Starting migration from chats to notebooks...');
    
    const migratedNotebooks = [];
    
    // Check if chats directory exists
    if (!fs.existsSync(chatsDir)) {
      console.log('ℹ️ No chats directory found, skipping migration');
      return { success: true, migrated: 0 };
    }
    
    // Get all chat IDs
    const chatIds = fs.readdirSync(chatsDir).filter(f => {
      const stat = fs.statSync(path.join(chatsDir, f));
      return stat.isDirectory();
    });
    
    console.log(`📂 Found ${chatIds.length} chats to migrate`);
    
    // Load chat manifest for names
    const manifest = loadManifest();
    
    for (const chatId of chatIds) {
      try {
        const chatDir = path.join(chatsDir, chatId);
        const chatPath = path.join(chatDir, 'chat.json');
        
        if (!fs.existsSync(chatPath)) {
          console.log(`⚠️ Skipping ${chatId}: no chat.json found`);
          continue;
        }
        
        // Load chat data
        const chatData = JSON.parse(fs.readFileSync(chatPath, 'utf-8'));
        const messages = chatData.messages || [];
        const docs = chatData.docs || [];
        
        // Generate notebook ID and create directory
        const timestamp = Date.now();
        const notebookId = `notebook-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        const notebookDir = path.join(notebooksDir, notebookId);
        
        // Create notebook directory structure
        fs.mkdirSync(notebookDir, { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'docs'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'images'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'videos'), { recursive: true });
        fs.mkdirSync(path.join(notebookDir, 'outputs'), { recursive: true });
        
        // Determine title from manifest or first message
        let title = manifest[chatId] || 'Migrated Chat';
        if (title === chatId && messages.length > 0) {
          // Extract title from first user message
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            title = firstUserMessage.content.slice(0, 50).replace(/\n/g, ' ').trim();
            if (title.length === 50) title += '...';
          }
        }
        
        // Get creation date from first message or directory stats
        let createdAt = new Date().toISOString();
        if (messages.length > 0) {
          const firstMessage = messages[0];
          if (firstMessage.timestamp) {
            createdAt = firstMessage.timestamp;
          }
        } else {
          try {
            const stat = fs.statSync(chatDir);
            createdAt = stat.birthtime.toISOString();
          } catch (e) {
            // Use current time as fallback
          }
        }
        
        // Get last update time
        let updatedAt = createdAt;
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.timestamp) {
            updatedAt = lastMessage.timestamp;
          }
        }
        
        // Create notebook metadata
        const metadata = {
          id: notebookId,
          title,
          description: `Migrated from chat session: ${chatId}`,
          createdAt,
          updatedAt,
          thumbnail: null,
          tags: ['migrated', 'legacy-chat'],
          model: null, // Will be set when user selects a model
          plugins: {
            enabled: docs.length > 0 ? ['document-rag'] : [],
            settings: {}
          },
          stats: {
            totalMessages: messages.length,
            totalTokens: 0, // Will be calculated later
            totalFiles: docs.length,
            lastActive: updatedAt
          },
          migration: {
            originalChatId: chatId,
            migratedAt: new Date().toISOString(),
            version: '1.0'
          }
        };
        
        // Add IDs to messages if they don't have them
        const migratedMessages = messages.map((msg, index) => ({
          ...msg,
          id: msg.id || `msg-${timestamp}-${index}`,
          timestamp: msg.timestamp || createdAt
        }));
        
        // Copy document files if they exist
        const chatDocsDir = path.join(chatDir, 'docs');
        if (fs.existsSync(chatDocsDir)) {
          const docFiles = fs.readdirSync(chatDocsDir);
          docFiles.forEach(fileName => {
            const sourcePath = path.join(chatDocsDir, fileName);
            const targetPath = path.join(notebookDir, 'docs', fileName);
            fs.copyFileSync(sourcePath, targetPath);
          });
        }
        
        // Copy any media files
        const chatMediaDir = path.join(chatDir, 'media');
        if (fs.existsSync(chatMediaDir)) {
          const mediaFiles = fs.readdirSync(chatMediaDir);
          mediaFiles.forEach(fileName => {
            const sourcePath = path.join(chatMediaDir, fileName);
            const extension = path.extname(fileName).toLowerCase();
            
            let targetDir;
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
              targetDir = path.join(notebookDir, 'images');
            } else if (['.mp4', '.avi', '.mov', '.webm'].includes(extension)) {
              targetDir = path.join(notebookDir, 'videos');
            } else {
              targetDir = path.join(notebookDir, 'outputs');
            }
            
            const targetPath = path.join(targetDir, fileName);
            fs.copyFileSync(sourcePath, targetPath);
          });
        }
        
        // Save notebook metadata
        fs.writeFileSync(
          path.join(notebookDir, 'notebook.json'),
          JSON.stringify(metadata, null, 2)
        );
        
        // Save messages
        fs.writeFileSync(
          path.join(notebookDir, 'messages.json'),
          JSON.stringify({ messages: migratedMessages }, null, 2)
        );
        
        migratedNotebooks.push(metadata);
        
        console.log(`✅ Migrated chat ${chatId} -> notebook ${notebookId}: "${title}"`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate chat ${chatId}:`, error);
      }
    }
    
    console.log(`🎉 Migration completed! Migrated ${migratedNotebooks.length} chats to notebooks`);
    
    return { 
      success: true, 
      migrated: migratedNotebooks.length,
      notebooks: migratedNotebooks 
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
});

// Helper function to backup existing chats before migration
ipcMain.handle('backup-chats', async () => {
  try {
    const { dialog } = require('electron');
    const AdmZip = require('adm-zip');
    
    if (!fs.existsSync(chatsDir)) {
      return { success: false, message: 'No chats directory found' };
    }
    
    const result = await dialog.showSaveDialog({
      title: 'Backup Chats',
      defaultPath: `snapthink-chats-backup-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [
        { name: 'ZIP Archives', extensions: ['zip'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, canceled: true };
    }
    
    // Create zip archive
    const zip = new AdmZip();
    
    // Add entire chats directory
    zip.addLocalFolder(chatsDir, 'chats');
    
    // Write zip file
    zip.writeZip(result.filePath);
    
    console.log(`✅ Created chat backup: ${result.filePath}`);
    return { success: true, filePath: result.filePath };
    
  } catch (error) {
    console.error('❌ Error creating chat backup:', error);
    throw error;
  }
});
