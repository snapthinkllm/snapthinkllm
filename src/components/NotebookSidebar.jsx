import { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Image, 
  Video, 
  BarChart3,
  Search,
  Puzzle,
  Settings,
  Download,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';

function NotebookSidebar({ 
  notebook, 
  files, 
  collapsed, 
  setCollapsed, 
  searchDocuments
}) {
  const [activeTab, setActiveTab] = useState('files'); // files, plugins, settings
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Read-only notebook metadata for display
  const notebookTitle = notebook?.title || '';
  const notebookDescription = notebook?.description || '';
  const notebookTags = notebook?.tags?.join(', ') || '';
  const notebookModel = notebook?.model || '';

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      try {
        const results = await searchDocuments(searchTerm);
        console.log('Search results:', results);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const FilesList = ({ fileType, icon: Icon, files: fileList = [] }) => {
    // Ensure fileList is always an array
    const safeFileList = Array.isArray(fileList) ? fileList : [];
    
    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Icon className="h-4 w-4" />
          <span>{fileType}</span>
          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {safeFileList.length}
          </span>
        </div>
        
        {safeFileList.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-6">
            No {fileType.toLowerCase()} yet
          </p>
        ) : (
          <div className="space-y-1 ml-6">
            {safeFileList.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file?.name || 'Unknown file'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    {file?.size && <span>{formatFileSize(file.size)}</span>}
                    {file?.uploadedAt && <span>{formatDate(file.uploadedAt)}</span>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title="View file"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title="Download file"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-500"
                    title="Delete file"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const SearchResults = ({ results, onClear }) => (
    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Search Results
          </span>
          <span className="text-xs bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full text-blue-800 dark:text-blue-200">
            {results.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
        >
          Clear
        </button>
      </div>
      
      {results.length === 0 ? (
        <p className="text-xs text-blue-600 dark:text-blue-300 italic">
          No matches found
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              className="p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {result.fileName}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  {(result.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 overflow-hidden" style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                maxHeight: '3.6em',
                lineHeight: '1.2em'
              }}>
                {result.chunk}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const PluginsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Plugins</h4>
        <button
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="Add plugin"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {notebook?.plugins?.enabled?.length > 0 ? (
        <div className="space-y-2">
          {notebook.plugins.enabled.map((plugin, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="flex items-center space-x-2">
                <Puzzle className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {plugin.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Configure plugin"
                >
                  <Settings className="h-3 w-3" />
                </button>
                <button
                  className="p-1 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-500"
                  title="Disable plugin"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No plugins enabled
        </p>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
        <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Available Plugins</h5>
        <div className="space-y-1">
          {['Image Generator', 'Code Executor', 'Web Search'].map((plugin, index) => (
            <button
              key={index}
              className="w-full text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-3 w-3 text-green-500" />
                <span className="text-xs text-gray-700 dark:text-gray-300">{plugin}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const NotebookSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notebook Title
        </label>
        <input
          type="text"
          value={notebookTitle}
          className="w-full text-xs p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          placeholder="Enter title..."
          readOnly
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Title can be edited from the dashboard
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={notebookDescription}
          rows={3}
          className="w-full text-xs p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-none"
          placeholder="No description"
          readOnly
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Description can be edited from the dashboard
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags
        </label>
        <input
          type="text"
          value={notebookTags}
          className="w-full text-xs p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          placeholder="No tags"
          readOnly
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Tags can be edited from the dashboard
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Default Model
        </label>
        <select
          value={notebookModel}
          className="w-full text-xs p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          disabled
        >
          <option value="">No model selected</option>
          <option value="llama3.1:8b">Llama 3.1 8B</option>
          <option value="llama3.1:70b">Llama 3.1 70B</option>
          <option value="codellama:13b">CodeLlama 13B</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Model settings managed globally
        </p>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p><strong>Created:</strong> {notebook?.createdAt ? formatDate(notebook.createdAt) : 'Unknown'}</p>
          <p><strong>Updated:</strong> {notebook?.updatedAt ? formatDate(notebook.updatedAt) : 'Unknown'}</p>
          <p><strong>Messages:</strong> {notebook?.stats?.totalMessages || 0}</p>
          <p><strong>Files:</strong> {notebook?.stats?.totalFiles || 0}</p>
        </div>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div className="w-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-l border-gray-200 dark:border-gray-700 flex flex-col items-center py-4">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notebook Tools
          </h3>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeTab === 'files'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab('plugins')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeTab === 'plugins'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Plugins
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'files' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Clear results if search term is empty
                  if (!e.target.value.trim()) {
                    clearSearch();
                  }
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-10 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={!searchTerm.trim() || isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? '...' : 'Go'}
              </button>
            </div>

            {/* Search Results */}
            {showSearchResults && (
              <SearchResults 
                results={searchResults} 
                onClear={clearSearch}
              />
            )}

            {/* File Lists - only show when not showing search results */}
            {!showSearchResults && (
              <>
                <FilesList
                  fileType="Documents"
                  icon={FileText}
                  files={files.docs || []}
                />
                
                <FilesList
                  fileType="Images"
                  icon={Image}
                  files={files.images || []}
                />
                
                <FilesList
                  fileType="Videos"
                  icon={Video}
                  files={files.videos || []}
                />
                
                <FilesList
                  fileType="Outputs"
                  icon={BarChart3}
                  files={files.outputs || []}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'plugins' && <PluginsList />}
        
        {activeTab === 'settings' && <NotebookSettings />}
        
        {showSearchResults && (
          <div className="mt-4">
            <SearchResults 
              results={searchResults} 
              onClear={clearSearch} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default NotebookSidebar;
