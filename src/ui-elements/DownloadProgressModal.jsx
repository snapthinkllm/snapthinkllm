import { useEffect } from 'react';
import { Download, X, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DownloadProgressModal({ modelName, status,  progress, detail, onCancel, onDone }) {
  const getStatusText = () => {
    if (status === 'done') return '✅ Download complete!';
    if (status === 'error') return '❌ Error downloading model.';
    return progress !== null ? `Downloading... ${progress.toFixed(1)}%` : 'Starting download...';
  };

  const getProgressWidth = () => {
    if (status === 'done') return '100%';
    if (status === 'error') return '0%';
    return `${progress ?? 0}%`;
  };

  // ✅ Auto-close modal on successful download after short delay
  useEffect(() => {
    if (status === 'done') {
      const timeout = setTimeout(() => {
        onDone?.();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-5 text-center border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <Download className="w-6 h-6" />
          Downloading {modelName}
        </div>

        {detail && (
          <pre className="text-sm font-mono text-green-500 bg-black/90 dark:bg-zinc-900 p-3 rounded-lg mt-3 border border-gray-700 overflow-x-auto whitespace-pre-wrap">
            {detail}
          </pre>
        )}
                
        <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </div>

        <div className="flex justify-center gap-4 pt-2">
          {status === 'done' && (
            <button
              onClick={onDone}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
            >
              <CheckCircle className="w-4 h-4" />
              Done
            </button>
          )}
          {status === 'error' && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
            >
              <AlertTriangle className="w-4 h-4" />
              Close
            </button>
          )}
          {status !== 'done' && status !== 'error' && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
