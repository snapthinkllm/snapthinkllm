import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, MessageSquarePlus, Grid } from 'lucide-react';
import ChatActions from './sidebarComponents/ChatActions.jsx';
import WorkspaceActions from './sidebarComponents/WorkspaceActions';
import SearchPanel from './sidebarComponents/SearchPanel';

export default function Sidebar({
  sessions,
  chatId,
  newChat,
  switchChat,
  deleteChat,
  updateChatName,
  collapsed,
  setCollapsed,
  searchDocuments,
}) {
  const [activePanel, setActivePanel] = useState('chat');
  const [searchResults, setSearchResults] = useState([]);

  const handleMiniIconClick = (panel) => {
    setActivePanel(panel);
    setCollapsed(false);
  };

  const handleSemanticSearch = async (query) => {
    const results = await searchDocuments(query);
    setSearchResults(results);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'chat':
        return (
          <ChatActions
            sessions={sessions}
            chatId={chatId}
            newChat={newChat}
            switchChat={switchChat}
            deleteChat={deleteChat}
            updateChatName={updateChatName}
            collapsed={collapsed}
          />
        );
      case 'search':
        return (
          <SearchPanel
            onSearch={handleSemanticSearch}
            searchResults={searchResults}
            collapsed={collapsed}
          />
        );
      case 'workspace':
        return <WorkspaceActions />;
      default:
        return null;
    }
  };

  return (
    <aside
      className={`transition-all duration-300 ${
        collapsed ? 'w-16 px-2' : 'w-64 p-4'
      } border-l border-gray-200 dark:border-gray-700 bg-[#f4f7fb] dark:bg-gray-800/80 backdrop-blur space-y-4 flex flex-col`}
    >
      {/* Collapse / Expand Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 shadow hover:bg-zinc-100 dark:hover:bg-zinc-600 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>

      {/* Mini icons (only when collapsed) */}
      {collapsed && (
        <div className="space-y-2 flex flex-col items-center">
          <button
            onClick={() => handleMiniIconClick('chat')}
            className="p-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white shadow hover:from-[#4f46e5] hover:to-[#6366f1]"
            title="Chat Actions"
          >
            <MessageSquarePlus size={18} />
          </button>

          <button onClick={() => handleMiniIconClick('workspace')} title="Workspace">
            <Grid size={18} />
          </button>

          <button
            onClick={() => handleMiniIconClick('search')}
            title="Semantic Search"
            className="p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Search size={18} />
          </button>
        </div>
      )}

      {/* Expanded panel buttons */}
      {!collapsed && (
        <div className="flex space-x-2 mb-2 px-2">
          <button
            onClick={() => setActivePanel('chat')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 transition ${
              activePanel === 'chat'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
            }`}
            title="Chats"
          >
            <MessageSquarePlus size={16} />
          </button>

          <button
            onClick={() => setActivePanel('workspace')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 transition ${
              activePanel === 'workspace'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
            }`}
            title="Workspace"
          >
            <Grid size={16} />
          </button>

          <button
            onClick={() => setActivePanel('search')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 transition ${
              activePanel === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200'
            }`}
            title="Search"
          >
            <Search size={16} />
          </button>
        </div>
      )}

      {/* Scrollable panel content */}
      <div className="flex-1 overflow-y-auto overflow-x-auto pr-1 scrollbar-thin scrollbar-thumb-blue-950 scrollbar-track-slate-900 ">{renderPanel()}</div>
    </aside>
  );
}
