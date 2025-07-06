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

      <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
        {sortedSessions.map((s) => (
          <div
            key={s.id}
            className={`group rounded-xl px-3 py-2 transition-all ${
              s.id === chatId
                ? 'text-white shadow-md bg-gradient-to-r from-[#6366f1] to-[#818cf8]  rounded-lg hover:from-[#4f46e5] hover:to-[#6366f1] '
                : 'hover:bg-zinc-400 dark:hover:bg-zinc-500 text-black dark:text-zinc-100'
            }`}
          >
            <div className="flex justify-between items-center">
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
                  className={`w-full text-sm px-2 py-1 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    s.id === chatId
                      ? 'bg-purple-700 dark:text-white text-white'
                      : 'bg-white dark:bg-zinc-900 text-black dark:text-white'
                  }`}
                />
              ) : (
                <button
                  onClick={() => switchChat(s.id)}
                  onDoubleClick={() => startRename(s.id, s.name)}
                  className="flex-1 text-left truncate"
                >
                  <span
                    className={`font-medium text-sm truncate ${
                      s.id === chatId ? 'text-white' : ''
                    }`}
                  >
                    {s.name}
                  </span>
                </button>
              )}

              {!collapsed && editingChatId !== s.id && (
                <div className="flex gap-1 ml-2">
                  <button
                    className="text-gray-400 hover:text-blue-400 hidden group-hover:inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(s.id, s.name);
                    }}
                    title="Rename chat"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatToDelete(s);
                      setShowConfirm(true);
                    }}
                    title="Delete chat"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {!collapsed && s.docs?.length > 0 && (
                  <ul
                    className="mt-2 pl-2 border-l border-white/10 space-y-0.5 shadow-sm
                      bg-gradient-to-r from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-800
                      text-indigo-800 dark:text-indigo-200 rounded-lg transition-all"
                  >
                    <li className="text-xs font-medium text-indigo-800 dark:text-indigo-300">Session Documents:</li>
                    {s.docs.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center text-xs text-gray-600 dark:text-gray-300 truncate gap-1"
                      >
                        📄 <span className="truncate">{doc.name}</span>
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
