import { useState, useEffect } from 'react';
import DownloadProgressModal from '../ui-elements/DownloadProgressModal.jsx';
import { modelRegistry } from '../models/modelRegistry';
import { RefreshCw, MemoryStick, Cpu } from 'lucide-react';

function ModelSelector({ onSelect }) {
  const [config, setConfig] = useState({ ram: 16, vram: 8 });
  const [customModel, setCustomModel] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detail, setDetail] = useState(null);
  const [downloadedModels, setDownloadedModels] = useState([]);
  const [suggestedModels, setSuggestedModels] = useState([]);

  useEffect(() => {
    const unsubscribe = window.chatAPI?.onModelStatus((msg) => {
      console.log('Model status update:', msg, downloading);
      if (msg.model?.startsWith(downloading)) return;

      setStatus(msg.status);
      if (msg.progress !== undefined) {
        setProgress(msg.progress);
      }
      if (msg.detail){
        setDetail(msg.detail);
      }

      if (msg.status === 'done') {
        refreshDownloadedModels();
        onSelect(msg.model);
      }
    });

    detectHardware();
    refreshDownloadedModels();

    return () => {
      window.chatAPI?.onModelStatus?.(() => {});
    };
  }, []);

  const detectHardware = async () => {
    const hw = await window.chatAPI.getHardwareInfo();
    const rounded = {
      ram: hw.ram,
      vram: hw.vram,
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
      className={`p-3 rounded-lg shadow-sm border transition text-sm
        ${isCompatible
          ? 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-200 dark:border-blue-700'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
        }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <img src={model.logo} alt={model.company} className="w-8 h-8 rounded-md bg-white p-1 shadow-sm" />
        <div>
          <div className="font-semibold text-sm">{model.name}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{model.size} • {model.type}</div>
        </div>
      </div>

      <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
        <b>{model.vram}GB VRAM</b>, <b>{model.recommendedRAM}GB RAM</b>
      </div>

      {isDownloaded && (
        <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">
          ✅ Downloaded
        </div>
      )}

      <button
        disabled={!isCompatible}
        onClick={() => handleModelSelect(model.name)}
        className={`w-full px-3 py-1.5 rounded-md font-medium text-sm transition ${
          isCompatible
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-400 text-gray-100 cursor-not-allowed'
        }`}
      >
        {isDownloaded ? (isCompatible ? 'Select' : 'Incompatible') : (isCompatible ? 'Select' : 'Incompatible')}
      </button>
    </div>
  );

  const handleModelSelect = async (modelName) => {
    const isDownloaded = downloadedModels.some(
      (m) => (typeof m === 'string' ? m : m.name) === modelName
    );

    if (isDownloaded) {
      onSelect(modelName);
      return;
    }

    // Trigger download and show modal
    setDownloading(modelName);
    setStatus('starting');
    setProgress(null);
    setDetail(null);

    try {
      await window.chatAPI.downloadModel(modelName);
      // onModelStatus listener will trigger onSelect when done
    } catch (err) {
      console.error('Download error:', err);
      setStatus('error');
    }
  };


  return (
    <div className="p-6 text-gray-900 dark:text-white space-y-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-1">
        🧠 Select a Compatible LLM
      </h1>
      <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
      {/* RAM & VRAM Inputs */}
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
        <Cpu className="w-6 h-6 text-blue-500" />
        Hardware Info
      </h2>
      <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-4 ml-1">
        * Auto detected
      </p>

      <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm flex flex-wrap gap-6">
        {/* RAM Input */}
        <div className="flex flex-col">
          <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
            <MemoryStick className="w-4 h-4 mr-1 text-blue-500" />
            RAM (GB)
          </label>
          <input
            type="number"
            value={config.ram}
            onChange={(e) => {
              const val = +e.target.value;
              setConfig({ ...config, ram: val });
              updateSuggestions(val, config.vram);
            }}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* VRAM Input */}
        <div className="flex flex-col">
          <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
            <Cpu className="w-4 h-4 mr-1 text-purple-500" />
            VRAM (GB)
          </label>
          <input
            type="number"
            value={config.vram}
            onChange={(e) => {
              const val = +e.target.value;
              setConfig({ ...config, vram: val });
              updateSuggestions(config.ram, val);
            }}
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800 text-sm shadow focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          />
        </div>
      </div>

      
      {/* User Downloaded Models */}
      {downloadedModels.length > 0 && (
        <div>
          <div className="flex items-center justify-between mt-8 mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📥 Downloaded Models
            </h2>
            <button
              onClick={refreshDownloadedModels}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-300 hover:underline"
            >
              <RefreshCw size={16} className="animate-spin-once" />
              Refresh
            </button>
          </div>
          <hr className="border-1 border-gray-500 dark:border-gray-500 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {downloadedModels.map((downloaded) => {
              const name = typeof downloaded === 'string' ? downloaded : downloaded.name;
              const model = modelRegistry.find((m) => m.name === name);
              const key = `downloaded-${name}`;

              const isCompatible = model
                ? config.vram >= model.vram && config.ram >= model.recommendedRAM
                : true;

              if (model) {
                return renderModelCard(model, isCompatible, true);
              }

              return (
                <div
                  key={key}
                  className="p-3 rounded-lg border shadow-sm bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-100 text-sm"
                >
                  <div className="mb-1 font-semibold text-sm">{String(name)}</div>
                  {downloaded.sizeRaw && (
                    <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                      Requires <b>{downloaded.sizeRaw} VRAM</b>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    User Downloaded Model
                  </div>
                  <div className="text-green-600 dark:text-green-400 text-xs font-medium mb-1">
                    ✅ Downloaded
                  </div>
                  <button
                    onClick={() => onSelect(name)}
                    className="w-full px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {suggestedModels.slice(0, 7).map((model) =>
            renderModelCard(
              model,
              config.vram >= model.vram && config.ram >= model.recommendedRAM,
              false
            )
          )}
        </div>
      </div>

      {/* Custom Model Input */}
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

        {downloading && (
          <DownloadProgressModal
            modelName={downloading}
            status={status}
            progress={progress}
            onCancel={handleCancelDownload}
            detail={detail}
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
