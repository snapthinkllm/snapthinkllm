import {
  FileText,
  StickyNote,
  SendHorizonal,
} from 'lucide-react';

export default function ChatFooter({
  chatId,
  input,
  ragMode,
  setInput,
  setRagMode,
  sendMessage,
  sendRAGQuestion,
  handleDocumentUpload,
  handleSummarizeDoc,
  loading,
  docUploaded,
  setDocUploaded,
}) {
  const onDocumentUpload = async (e) => {
    await handleDocumentUpload(e);
    setDocUploaded(true);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    ragMode ? sendRAGQuestion(input) : sendMessage();
  };

  return (
    <footer className="p-4 bg-white/70 dark:bg-gray-800/80 backdrop-blur border-t border-gray-300 dark:border-gray-700">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-start gap-4 text-sm mb-2">
        {/* Upload */}
        <label
          htmlFor="document-upload"
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
            chatId
              ? 'bg-gray-700 dark:bg-gray-700 text-white hover:bg-gray-600 cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FileText className="w-4 h-4" />
          Upload Document
        </label>
        <input
          type="file"
          id="document-upload"
          accept=".pdf,.txt,.md"
          onChange={onDocumentUpload}
          className="hidden"
          disabled={!chatId}
        />

        {/* Summarize */}
        <button
          onClick={handleSummarizeDoc}
          disabled={!docUploaded || !chatId}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
            docUploaded
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <StickyNote className="w-4 h-4" />
          Summarize
        </button>

        {/* RAG Toggle */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${
              ragMode ? 'text-purple-600' : 'text-gray-500'
            }`}
          >
            Ask the DOC
          </span>
          <button
            onClick={() => setRagMode(!ragMode)}
            disabled={!docUploaded}
            className={`relative w-10 h-5 rounded-full transition-all ${
              ragMode ? 'bg-purple-600' : 'bg-gray-400'
            } ${!docUploaded ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Toggle RAG mode"
          >
            <span
              className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${
                ragMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Input + Send */}
      <div className="flex items-center space-x-2">
        <input
          className={`flex-1 p-3 rounded-xl border bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm ${
            loading ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          placeholder={ragMode ? 'Ask your document...' : 'Type a message...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) handleSend();
          }}
          disabled={!chatId || loading}
        />

        <button
          onClick={handleSend}
          disabled={!chatId || loading}
          className={`flex items-center gap-1 px-5 py-2 rounded-xl shadow-md transition duration-300 ${
            chatId && !loading
              ? ragMode
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                : 'bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] hover:from-[#0284c7] hover:to-[#4f46e5] text-white'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          <SendHorizonal className="w-4 h-4" />
          {ragMode ? 'Ask RAG' : 'Send'}
        </button>
      </div>

      <div className="text-center text-xs mt-2 text-gray-600 dark:text-gray-400 font-mono italic">
         SnapThink LLM may occasionally be inaccurate or make mistakes.
      </div>
    </footer>
  );
}
