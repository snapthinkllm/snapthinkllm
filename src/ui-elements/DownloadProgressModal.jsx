export default function DownloadProgressModal({ modelName, status, progress, onCancel, onDone }) {
  const getStatusText = () => {
    if (status === 'done') return '✅ Download complete!';
    if (status === 'error') return '❌ Error downloading model.';
    return progress !== null ? `Downloading... ${progress.toFixed(1)}%` : 'Downloading...';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm space-y-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          ⏳ Downloading {modelName}
        </h2>

        <div className="relative w-full bg-gray-300 dark:bg-gray-600 rounded h-4 overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full transition-all duration-300 ${
              status === 'done'
                ? 'bg-green-500'
                : status === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress ?? 80}%` }}
          />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">{getStatusText()}</div>

        {status === 'done' && (
          <button
            onClick={onDone}
            className="mt-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
          >
            Done
          </button>
        )}

        {status !== 'done' && status !== 'error' && (
          <button
            onClick={onCancel}
            className="mt-2 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
