import {
  Sun,
  Moon,
  Folder,
  Upload,
  Download,
  RefreshCw,
} from 'lucide-react';

export default function ChatHeader({
  darkMode,
  setDarkMode,
  handleExport,
  handleImport,
  setModelSelected,
}) {
  const iconClass = 'w-5 h-5 hover:scale-110 transition-transform';

  return (
    <header className="p-4 bg-white/80 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-tight text-[#1e4b6d] dark:text-slate-100">
        SnapThink LLM
      </h1>
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={() => setDarkMode(!darkMode)}
          className="text-gray-800 dark:text-white hover:text-blue-500"
        >
          {darkMode ? <Sun className={iconClass} /> : <Moon className={iconClass} />}
        </button>

        {/* Open Chat Folder */}
        <button
          title="Open Chat Folder"
          onClick={() => window.chatAPI.showChatFolder()}
          className="text-gray-800 dark:text-white hover:text-yellow-500"
        >
          <Folder className={iconClass} />
        </button>

        {/* Export Chat */}
        <button
          title="Export Current Chat"
          onClick={handleExport}
          className="text-gray-800 dark:text-white hover:text-green-500"
        >
          <Upload className={iconClass} />
        </button>

        {/* Import Chat */}
        <button
          title="Import Chat"
          onClick={handleImport}
          className="text-gray-800 dark:text-white hover:text-purple-500"
        >
          <Download className={iconClass} />
        </button>

        {/* Change Model */}
        <button
          title="Change Model"
          onClick={() => setModelSelected(null)}
          className="text-gray-800 dark:text-white hover:text-red-500"
        >
          <RefreshCw className={iconClass} />
        </button>
      </div>
    </header>
  );
}
