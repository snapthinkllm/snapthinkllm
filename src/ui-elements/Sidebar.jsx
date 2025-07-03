import { useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Grid } from 'lucide-react';
import ChatActions from './sidebarComponents/ChatActions.jsx';
import WorkspaceActions from './sidebarComponents/WorkspaceActions'; // placeholder for other features

export default function Sidebar({
  sessions,
  chatId,
  newChat,
  switchChat,
  deleteChat,
  updateChatName,
  collapsed,
  setCollapsed
}) {
  const [activePanel, setActivePanel] = useState('chat'); // or 'workspace', 'settings', etc.

  const handleMiniIconClick = (panel) => {
    setActivePanel(panel);
    setCollapsed(false);
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
      case 'workspace':
        return <WorkspaceActions />; // swap in your real component
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

          {/* You can add more mini icons here */}
          {/* <button onClick={() => handleMiniIconClick('workspace')} title="Workspaces">...</button> */}
        </div>
      )}

      {/* Expanded panel */}
      {!collapsed && renderPanel()}
    </aside>
  );
}
