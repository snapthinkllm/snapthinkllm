import { useEffect, useState } from 'react';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Download, 
  Upload, 
  Trash2, 
  Settings,
  Search,
  BookOpen,
  Clock,
  Database
} from 'lucide-react';
import MigrationDialog from './MigrationDialog';

function NotebookDashboard({ onNotebookSelect, onCreateNotebook }) {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // updatedAt, createdAt, title
  const [sortOrder, setSortOrder] = useState('desc'); // desc, asc
  const [showMigration, setShowMigration] = useState(false);

  useEffect(() => {
    loadNotebooks();
  }, []);

  const loadNotebooks = async () => {
    try {
      setLoading(true);
      const notebookList = await window.notebookAPI.listNotebooks();
      setNotebooks(notebookList);
    } catch (error) {
      console.error('Failed to load notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = async () => {
    try {
      const notebook = await window.notebookAPI.createNotebook({
        title: 'New Notebook',
        description: ''
      });
      setNotebooks(prev => [notebook, ...prev]);
      onCreateNotebook?.(notebook.id);
    } catch (error) {
      console.error('Failed to create notebook:', error);
    }
  };

  const handleDeleteNotebook = async (notebookId, event) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this notebook? This action cannot be undone.')) {
      return;
    }

    try {
      await window.notebookAPI.deleteNotebook(notebookId);
      setNotebooks(prev => prev.filter(nb => nb.id !== notebookId));
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  const handleExportNotebook = async (notebookId, event) => {
    event.stopPropagation();
    
    try {
      await window.notebookAPI.exportNotebook(notebookId);
    } catch (error) {
      console.error('Failed to export notebook:', error);
    }
  };

  const handleImportNotebook = async () => {
    try {
      const notebook = await window.notebookAPI.importNotebook();
      if (notebook) {
        setNotebooks(prev => [notebook, ...prev]);
      }
    } catch (error) {
      console.error('Failed to import notebook:', error);
    }
  };

  const handleMigrationComplete = (migrationResult) => {
    // Refresh the notebooks list to show migrated notebooks
    loadNotebooks();
    
    // You could also show a success toast here if you have a toast system
    console.log('Migration completed:', migrationResult);
  };

  const filteredAndSortedNotebooks = notebooks
    .filter(notebook => 
      notebook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notebook.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notebook.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'title') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notebooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f7fb] via-[#e6edf7] to-[#dce8f2] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              SnapThink Notebooks
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMigration(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
            >
              <Database className="h-4 w-4" />
              <span>Migrate Chats</span>
            </button>
            
            <button
              onClick={handleImportNotebook}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            
            <button
              onClick={handleCreateNotebook}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>New Notebook</span>
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="createdAt-desc">Recently Created</option>
            <option value="title-asc">Name (A-Z)</option>
            <option value="title-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Notebooks Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredAndSortedNotebooks.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No notebooks found' : 'No notebooks yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Create your first notebook to get started'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateNotebook}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Notebook</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedNotebooks.map((notebook) => (
              <div
                key={notebook.id}
                onClick={() => onNotebookSelect(notebook.id)}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center relative">
                  {notebook.thumbnail ? (
                    <img
                      src={notebook.thumbnail}
                      alt={notebook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-12 w-12 text-blue-400 dark:text-blue-300" />
                  )}
                  
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={(e) => handleExportNotebook(notebook.id, e)}
                      className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Export notebook"
                    >
                      <Download className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                      className="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Delete notebook"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 truncate">
                    {notebook.title}
                  </h3>
                  
                  {notebook.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {notebook.description}
                    </p>
                  )}

                  {/* Tags */}
                  {notebook.tags && notebook.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {notebook.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {notebook.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          +{notebook.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(notebook.updatedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {notebook.stats?.totalMessages && (
                        <span>{notebook.stats.totalMessages} msgs</span>
                      )}
                      {notebook.stats?.totalFiles && (
                        <span>{notebook.stats.totalFiles} files</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Migration Dialog */}
      <MigrationDialog 
        isOpen={showMigration}
        onClose={() => setShowMigration(false)}
        onComplete={handleMigrationComplete}
      />
    </div>
  );
}

export default NotebookDashboard;
