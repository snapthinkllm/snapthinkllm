export default function Sidebar({ sessions, chatId, newChat, switchChat }) {
  return (
    <aside className="w-64 h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-[#f4f7fb] dark:bg-gray-800/80 backdrop-blur p-4 space-y-4">
      <button
        onClick={newChat}
        className="w-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white py-2 rounded-lg hover:from-[#4f46e5] hover:to-[#6366f1] shadow"
      >
        + New Chat
      </button>
      <div className="space-y-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => switchChat(s.id)}
            className={`w-full text-left px-4 py-2 rounded-lg ${
              s.id === chatId
                ? 'bg-[#d6dfff] dark:bg-purple-600 text-black dark:text-white font-semibold'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
