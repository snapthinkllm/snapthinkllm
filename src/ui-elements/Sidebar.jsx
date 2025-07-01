import { useState } from 'react';
import ConfirmModal from './ConfirmModal'; // adjust the path if needed
import { Pencil } from 'lucide-react';

export default function Sidebar({
  sessions,
  chatId,
  newChat,
  switchChat,
  deleteChat,
  updateChatName
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
    await updateChatName(id, name);  // ✅ Use your existing function
  }
  cancelRename();
};


  return (
    <>
      <aside className="w-64 border-l border-gray-200 dark:border-gray-700 bg-[#f4f7fb] dark:bg-gray-800/80 backdrop-blur p-4 space-y-4 flex flex-col">
        <button
          onClick={newChat}
          className="w-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white py-2 rounded-lg hover:from-[#4f46e5] hover:to-[#6366f1] shadow"
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between group">
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
                  className={`flex-1 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    s.id === chatId
                      ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                      : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100'
                  }`}
                />
              ) : (
                <button
                  onClick={() => switchChat(s.id)}
                  onDoubleClick={() => startRename(s.id, s.name)}
                  className={`flex-1 text-left px-4 py-2 rounded-lg group-hover:pr-2 truncate ${
                    s.id === chatId
                      ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                </button>
              )}

              {editingChatId !== s.id && (
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
          ))}
        </div>
      </aside>

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
