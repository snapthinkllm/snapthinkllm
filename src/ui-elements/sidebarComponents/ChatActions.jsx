// components/ChatActions.jsx
import { useState } from 'react';
import ConfirmModal from '../ConfirmModal';
import { Pencil, MessageSquarePlus } from 'lucide-react';

export default function ChatActions({
  sessions,
  chatId,
  newChat,
  switchChat,
  deleteChat,
  updateChatName,
  collapsed,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editedName, setEditedName] = useState('');

  const handleConfirm = () => {
    deleteChat(chatToDelete.id);
    setShowConfirm(false);
    setChatToDelete(null);
  };

  const startRename = (id, currentName) => {
    setEditingChatId(id);
    setEditedName(currentName);
  };

  const cancelRename = () => {
    setEditingChatId(null);
    setEditedName('');
  };

  const saveChatName = async (id) => {
    const name = editedName.trim();
    if (name && name !== sessions.find((s) => s.id === id)?.name) {
      await updateChatName(id, name);
    }
    cancelRename();
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    const tA = Number(a.id?.split('-')[1] || 0);
    const tB = Number(b.id?.split('-')[1] || 0);
    return tB - tA;
  });

  return (
    <>
      {!collapsed && (
        <button
          onClick={newChat}
          className="w-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white py-2 rounded-lg hover:from-[#4f46e5] hover:to-[#6366f1] shadow flex items-center justify-center"
        >
          <MessageSquarePlus size={18} />
          <span className="ml-2">New Chat</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mt-2">
        {sortedSessions.map((s) => (
        <div key={s.id} className="flex flex-col group">
        <div className="flex items-center justify-between">
            {editingChatId === s.id ? (
              <input
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => saveChatName(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveChatName(s.id);
                  if (e.key === 'Escape') cancelRename();
                }}
                className={`flex-1 text-sm px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  s.id === chatId
                    ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100'
                }`}
            />
            ) : (
            <button
                onClick={() => switchChat(s.id)}
                onDoubleClick={() => startRename(s.id, s.name)}
                className={`flex-1 text-left px-2 py-2 rounded-lg group-hover:pr-2 truncate ${
                s.id === chatId
                    ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
                }`}
            >
                {!collapsed && <span className="truncate">{s.name}</span>}
            </button>
            )}

              {!collapsed && editingChatId !== s.id && (
                <>
                  <button
                    className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-300 text-sm ml-2 hidden group-hover:inline"
                    title="Rename chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(s.id, s.name);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm ml-1"
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToDelete(s);
                      setShowConfirm(true);
                    }}
                  >
                    🗙
                  </button>
                </>
              )}
            </div>

            {/* 📄 Uploaded documents under chat */}
            {!collapsed && s.docs?.length > 0 && (
              <ul className="ml-4 mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {s.docs.map((doc) => (
                  <li key={doc.id} className="truncate">
                    📄 {doc.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        show={showConfirm}
        title={`Delete "${chatToDelete?.name}"?`}
        message="This action cannot be undone."
        onCancel={() => {
          setShowConfirm(false);
          setChatToDelete(null);
        }}
        onConfirm={handleConfirm}
      />
    </>
  );
}
