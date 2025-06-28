import { useState, useEffect } from 'react';
import DownloadProgressModal from '../ui-elements/DownloadProgressModal.jsx';
import { modelRegistry } from '../models/modelRegistry';

function ModelSelector({ onSelect }) {
  const [config, setConfig] = useState({ ram: 16, vram: 8 });
  const [customModel, setCustomModel] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);

  const [downloadedModels, setDownloadedModels] = useState([]);
  const [suggestedModels, setSuggestedModels] = useState([]);

  useEffect(() => {
    // Model status listener
    const unsubscribe = window.chatAPI?.onModelStatus((msg) => {
      if (msg.model === downloading) {
        setStatus(msg.status);
        setProgress(msg.progress ?? null);
        if (msg.status === 'done') {
          setDownloading(null);
          setStatus(null);
          setProgress(null);
          refreshDownloadedModels();
          onSelect(msg.model);
        }
      }
    });

    detectHardware();
    refreshDownloadedModels();

    return () => {
      if (unsubscribe?.dispose) unsubscribe.dispose?.();
    };
  }, []);

  const detectHardware = async () => {
    const hw = await window.chatAPI.getHardwareInfo();
    const rounded = {
      ram: hw.ram,
      vram: hw.vram, // Round MB to GB
    };
    setConfig(rounded);
    updateSuggestions(rounded.ram, rounded.vram);
  };

  const refreshDownloadedModels = async () => {
    const list = await window.chatAPI.getDownloadedModels();
    console.log('Downloaded models:', list);
    setDownloadedModels(list);
  };

  const updateSuggestions = (ram, vram) => {
    const suggested = modelRegistry.filter(
      (m) => ram >= m.recommendedRAM && vram >= m.vram
    );
    setSuggestedModels(suggested);
  };

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

  const renderModelCard = (model, isCompatible, isDownloaded = false) => (
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

      <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
        Requires <b>{model.vram}GB VRAM</b>, <b>{model.recommendedRAM}GB RAM</b>
      </div>

      {isDownloaded && (
        <div className="text-green-600 dark:text-green-400 text-xs font-semibold mb-2">
          ✅ Downloaded
        </div>
      )}

      <button
        disabled={!isCompatible}
        onClick={() => onSelect(model.name)}
        className={`w-full px-3 py-2 rounded-md font-medium transition ${
          isCompatible
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-400 text-gray-100 cursor-not-allowed'
        }`}
      >
        {isDownloaded ? isCompatible ?' Select': 'Incompatible' : isCompatible ? 'Select' : 'Incompatible'}
      </button>
    </div>
  );

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
            onChange={(e) => {
              const val = +e.target.value;
              setConfig({ ...config, ram: val });
              updateSuggestions(val, config.vram);
            }}
            className="px-3 py-1 rounded border border-gray-400 bg-white dark:bg-gray-800"
          />
        </label>
        <label className="flex items-center gap-2">
          VRAM (GB):
          <input
            type="number"
            value={config.vram}
            onChange={(e) => {
              const val = +e.target.value;
              setConfig({ ...config, vram: val });
              updateSuggestions(config.ram, val);
            }}
            className="px-3 py-1 rounded border border-gray-400 bg-white dark:bg-gray-800"
          />
        </label>
      </div>

      {/* Downloaded Models */}
      {downloadedModels.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mt-8 mb-2">📥 Downloaded Models</h2>
          <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloadedModels.map((models) => {
              const model = modelRegistry.find((m) => m.name === models.name);
              console.log('Rendering downloaded model:', model, models.name);
              const isCompatible = model
                ? config.vram >= model.vram && config.ram >= model.recommendedRAM
                : true;

              return model
                ? renderModelCard(model, isCompatible, true)
                : (
                  <div
                    key={typeof models.name === 'string' ? models.name : `custom-${Date.now()}-${Math.random()}`}
                    className="p-4 rounded-xl border shadow-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-100"
                  >
                    <div className="mb-2 font-semibold">{String(models.name)}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Requires <b>{models.sizeRaw} VRAM</b>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      User Downloaded model
                    </div>
                    <div className="text-green-600 dark:text-green-400 text-xs font-semibold mb-2">
                      ✅ Downloaded
                    </div>
                    <button
                      onClick={() => onSelect(models.name)}
                      className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                       Select
                    </button>
                  </div>
                );
            })}
          </div>
        </div>
      )}


      {/* Suggested Starter Models */}
      <div>
        <h2 className="text-xl font-semibold mt-8 mb-2">💡 Suggested Starter Models</h2>
        <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestedModels.map((model) =>
            renderModelCard(
              model,
              config.vram >= model.vram && config.ram >= model.recommendedRAM,
              false
            )
          )}
        </div>
      </div>
            
      {/* Add custom model */}
      <div className="space-y-2 mt-8">
        <h2 className="text-xl font-semibold mt-8 mb-2"><label className="block font-medium">Pull a new model from Ollama</label></h2>
        <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
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
