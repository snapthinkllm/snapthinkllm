export default function ChatFooter({
  chatId,
  input,
  ragMode,
  setInput,
  setRagMode, 
  sendMessage,
  sendRAGQuestion,
  handleDocumentUpload,
  loading,
}) {
  const handleSend = () => {
    ragMode ? sendRAGQuestion(input) : sendMessage();
  };

  return (
    <footer className="p-4 bg-white/70 dark:bg-gray-800/80 backdrop-blur border-t border-gray-300 dark:border-gray-700">
      {/* Action buttons row above input */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm mb-2">
        {/* Upload button */}
        <label
          htmlFor="document-upload"
          className={`px-3 py-1 rounded-full transition-all ${
            chatId
              ? 'bg-gray-700 dark:bg-gray-700 text-stone-100 dark:text-stone-100 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-aFllowed'
          }`}
        >
          📄 Summarize PDF, markdown, txt
        </label>

        {/* 🧠 RAG Toggle */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold transition-colors ${
              ragMode ? 'text-purple-600' : 'text-gray-500'
            }`}>
              Ask the DOC
          </span>
          <button
            onClick={() => setRagMode(!ragMode)}
            className={`relative w-10 h-5 rounded-full transition-all ${
              ragMode ? 'bg-purple-600' : 'bg-gray-400'
            }`}
            title="Toggle RAG mode"
          >
            <span
              className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${
                ragMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <input
          type="file"
          id="document-upload"
          accept=".pdf,.txt,.md"
          onChange={handleDocumentUpload}
          className="hidden"
          disabled={!chatId}
        />
      </div>

      {/* Input and Send button */}
      <div className="flex items-center space-x-2">
        <input
          className={`flex-1 p-3 rounded-xl border bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm
            ${loading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
          placeholder={ragMode ? "Ask your document..." : "Type a message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) handleSend();
          }}
          disabled={!chatId || loading}
        />

        <button
          onClick={handleSend}
          className={`px-5 py-2 rounded-xl shadow-md transition duration-300 ${
            chatId && !loading
              ? ragMode
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                : 'bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] hover:from-[#0284c7] hover:to-[#4f46e5] text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
          disabled={!chatId || loading}
        >
            {ragMode ? 'Ask RAG' : 'Send'}
        </button>
      </div>
    </footer>
  );
}
