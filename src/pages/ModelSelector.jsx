import { useState, useEffect } from 'react';
import DownloadProgressModal from '../ui-elements/DownloadProgressModal.jsx';
import { modelRegistry } from '../models/modelRegistry';


const knownModels = [
  { name: 'gemma3:4b', company: 'Google', size: '4B', vram: 6, type: 'text', recommendedRAM: 8, logo: './logos/gemma.png' },
  { name: 'gemma3:12b', company: 'Google', size: '12B', vram: 12, type: 'text', recommendedRAM: 16, logo: './logos/gemma.png' },
  { name: 'llama3:8b', company: 'Ollama', size: '8B', vram: 8, type: 'text', recommendedRAM: 16, logo: './logos/ollama.png' },
  { name: 'codellama:7b', company: 'Ollama', size: '7B', vram: 6, type: 'code', recommendedRAM: 12, logo: './logos/ollama.png' },
  { name: 'mistral:7b', company: 'MistralAI', size: '7B', vram: 12, type: 'text', recommendedRAM: 8, logo: './logos/mistral.png' },
  { name: 'deepseek-r1:7b', company: 'Deepseek', size: '7B', vram: 4.7, type: 'text', recommendedRAM: 8, logo: './logos/deepseek.png' },
];

function ModelSelector({ onSelect }) {
  const [config, setConfig] = useState({ ram: 16, vram: 8 });
  const [customModel, setCustomModel] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    const unsubscribe = window.chatAPI?.onModelStatus((msg) => {
      if (msg.model === downloading) {
        setStatus(msg.status);
        setProgress(msg.progress ?? null);
        if (msg.status === 'done') {
          setDownloading(null);
          setStatus(null);
          setProgress(null);
          onSelect(msg.model);
        }
      }
    });

    return () => {
      if (unsubscribe?.dispose) unsubscribe.dispose?.();
    };
  }, [downloading]);

  const groupedModels = modelRegistry.reduce((groups, model) => {
    if (!groups[model.company]) groups[model.company] = [];
    groups[model.company].push(model);
    return groups;
  }, {});

  const handleAddModel = async () => {
    const model = customModel.trim();
    if (!model) return;

    setDownloading(model);
    setStatus('starting');
    setProgress(null);

    try {
      await window.chatAPI.downloadModel(model);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleCancelDownload = () => {
    window.chatAPI.cancelDownload?.();
    setDownloading(null);
    setStatus(null);
    setProgress(null);
  };

  return (
    <div className="p-6 text-gray-900 dark:text-white space-y-6">
      <h1 className="text-3xl font-bold">🧠 Select a Compatible LLM</h1>

      {/* RAM & VRAM Inputs */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          RAM (GB):
          <input
            type="number"
            value={config.ram}
            onChange={(e) => setConfig({ ...config, ram: +e.target.value })}
            className="px-3 py-1 rounded border border-gray-400 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="flex items-center gap-2">
          VRAM (GB):
          <input
            type="number"
            value={config.vram}
            onChange={(e) => setConfig({ ...config, vram: +e.target.value })}
            className="px-3 py-1 rounded border border-gray-400 bg-white dark:bg-gray-800"
          />
        </label>
      </div>

      {/* Model cards */}
      {Object.entries(groupedModels).map(([company, models]) => (
        <div key={company}>
          <h2 className="text-xl font-semibold mt-8 mb-2">{company}</h2>
          <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => {
              const isCompatible = config.vram >= model.vram && config.ram >= model.recommendedRAM;

              return (
                <div
                  key={model.name}
                  className={`p-4 rounded-xl shadow-md border transition ${
                    isCompatible
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-200 dark:border-blue-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <img src={model.logo} alt={model.company} className="w-10 h-10 rounded-md bg-white p-1 shadow-sm" />
                    <div>
                      <div className="font-semibold">{model.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {model.size} • {model.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Requires <b>{model.vram}GB VRAM</b>, <b>{model.recommendedRAM}GB RAM</b>
                  </div>
                  <button
                    disabled={!isCompatible}
                    onClick={() => onSelect(model.name)}
                    className={`w-full px-3 py-2 rounded-md font-medium transition ${
                      isCompatible
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-400 text-gray-100 cursor-not-allowed'
                    }`}
                  >
                    {isCompatible ? 'Select' : 'Incompatible'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add custom model */}
      <div className="space-y-2">
        <label className="block font-medium">Add custom model name (Ollama)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g. mistral:7b-instruct"
            className="flex-1 px-3 py-2 border border-gray-400 rounded bg-white dark:bg-gray-800"
          />
          <button
            onClick={handleAddModel}
            disabled={!!downloading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {downloading ? 'Downloading...' : 'Pull'}
          </button>
        </div>

        {/* Download progress modal */}
        {downloading && (
          <DownloadProgressModal
            modelName={downloading}
            status={status}
            progress={progress}
            onCancel={handleCancelDownload}
            onDone={() => {
              setDownloading(null);
              setStatus(null);
              setProgress(null);
            }}
          />
        )}
      </div>

    </div>
  );
}

export default ModelSelector;
