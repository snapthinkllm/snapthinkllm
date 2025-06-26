// ui-elements/ChatHeader.jsx
export default function ChatHeader({
  darkMode,
  setDarkMode,
  handleExport,
  handleImport,
  setModelSelected,
}) {
  return (
    <header className="p-4 bg-white/80 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight text-[#1e4b6d] dark:text-slate-100">
        SnapThink LLM
      </h1>
      <div className="flex items-center gap-2">
        <button
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={() => setDarkMode(!darkMode)}
          className="p-1 rounded-full bg-stone-300 hover:bg-slate-600 text-white shadow transition"
        >
          {darkMode ? '🌞' : '🌙'}
        </button>

        <button
          title="Open Chat Folder"
          onClick={() => window.chatAPI.showChatFolder()}
          className="p-1 rounded-full bg-yellow-600 hover:bg-yellow-700 text-white shadow transition"
        >
          📁
        </button>
 
        <button
          title="Export Current Chat"
          onClick={handleExport}
          className="p-1 rounded-full bg-green-600 hover:bg-green-700 text-white shadow transition"
        >
          📤
        </button>

        <button
          title="Import Chat"
          onClick={handleImport}
          className="p-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow transition"
        >
          📥
        </button>

        <button
          title="Change Model"
          onClick={() => setModelSelected(null)}
          className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white shadow transition"
        >
          🔄
        </button>
      </div>
    </header>
  );
}