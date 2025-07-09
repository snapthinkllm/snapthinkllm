import {
  FileText,
  StickyNote,
  SendHorizonal,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

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

  const inputRef = useRef(null);

  useEffect(() => {
    if (chatId && !loading) {
      inputRef.current.focus();
    }
  }, [chatId, loading]);


  const handleSend = () => {
    if (!input.trim()) return;
    ragMode ? sendRAGQuestion(input) : sendMessage();
  };

  function adjustTextareaHeight(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = `${textarea.scrollHeight}px`; // Adjust to content
  }

  return (
    <footer className="p-4 bg-gray/1000 dark:bg-gray-800/80 backdrop-blur border-t border-gray-300 dark:border-gray-700">
      

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 p-2 shadow-sm space-y-2">
            {/* Textarea */}
            <textarea
            ref={inputRef}
            className="w-full p-2 text-sm bg-transparent text-black dark:text-white resize-none outline-none min-h-[48px] max-h-[120px] leading-snug
                placeholder:font-semibold  placeholder:text-gray-500 dark:placeholder:text-gray-400"
            placeholder={ragMode ? 'Ask your document...' : 'Ask anything'}
            value={input}
            onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(e.target);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !loading) {
                e.preventDefault();
                handleSend();
                }
            }}
            disabled={!chatId || loading}
            />

            {/* Toolbar buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs sm:text-sm">
            {/* Left side: Upload + Summarize */}
            <div className="flex items-center gap-2">
                {/* Upload */}
                <label
                htmlFor="document-upload"
                className={`inline-flex items-center gap-1 px-2 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-colors
                  ${chatId
                    ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800 cursor-pointer'
                    : 'bg-zinc-100 text-zinc-500 cursor-not-allowed'}`}
                >
                Upload
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
                className={`inline-flex items-center gap-1 px-2 py-1.5 text-sm font-semibold rounded-lg shadow-sm transition-colors
                  ${chatId
                    ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800 cursor-pointer'
                    : 'bg-zinc-100 text-zinc-500 cursor-not-allowed'}`}
                >
                Summarize
                </button>
            </div>

            {/* Right side: Ask DOC toggle + Send */}
            <div className="flex items-center gap-3">
                {/* RAG Toggle */}
                <div className="flex items-center gap-2">
                <span className={`font-semibold ${ragMode ? 'text-purple-600' : 'text-black-300'}`}>
                    Use Doc
                </span>
                <button
                    onClick={() => setRagMode(!ragMode)}
                    disabled={!docUploaded}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-300
                      ${ragMode ? 'bg-purple-400' : 'bg-gray-300 dark:bg-gray-600'}
                      ${!docUploaded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title="Toggle document-assisted answering"
                >
                    <span
                    className={`absolute left-1 top-1 w-3 h-3 bg-black rounded-full shadow-md transition-transform ${
                        ragMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                    />
                </button>
                </div>

                {/* Send Button */}
                <button
                onClick={handleSend}
                disabled={!chatId || loading || !input.trim()}
                className={`p-2.5 rounded-full shadow-md transition-all duration-200
                    ${chatId && !loading && input.trim()
                    ? 'bg-black hover:bg-black-700 text-white'
                    : 'bg-black-100 text-zinc-400 cursor-not-allowed'}
                `}
                title={ragMode ? 'Ask Document' : 'Send Message'}
                >
                <SendHorizonal className="w-5 h-5 transform -rotate-90" />
                </button>
            </div>
            </div>
        </div>

      <div className="text-center text-xs mt-2 text-gray-600 dark:text-gray-400 font-mono italic">
         SnapThink LLM may occasionally be inaccurate or make mistakes.
      </div>
    </footer>
  );
}
