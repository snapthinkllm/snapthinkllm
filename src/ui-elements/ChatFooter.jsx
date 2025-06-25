// ui-elements/ChatFooter.jsx
export default function ChatFooter({
  chatId,
  input,
  ragMode,
  setInput,
  sendMessage,
  sendRAGQuestion,
  handleDocumentUpload,
}) {
  return (
    <footer className="p-4 bg-white/70 dark:bg-gray-800/80 backdrop-blur border-t border-gray-300 dark:border-gray-700">
      {/* Action buttons row above input */}
      <div className="flex justify-start mb-2 gap-4 text-sm">
        <label
          htmlFor="document-upload"
          className={`px-3 py-1 rounded-full transition-all ${
            chatId
              ? 'bg-gray-700 dark:bg-gray-700 text-stone-100 dark:text-stone-100 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          📄 Summarize PDF, markdown, txt
        </label>
        {ragMode && (
            <button
                onClick={() => sendRAGQuestion(input)}
                className="px-4 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow"
            >
                🧠 Ask Document
            </button>
            )}
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
          className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#87a0c9] dark:focus:ring-lime-400"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={!chatId}
        />
        <button
          onClick={sendMessage}
          className={`px-5 py-2 rounded-xl shadow-md transition duration-300 ${
            chatId
              ? 'bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] hover:from-[#0284c7] hover:to-[#4f46e5] text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
          disabled={!chatId}
        >
          Send
        </button>
      </div>
    </footer>
  );
}
