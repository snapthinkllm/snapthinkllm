import { useState } from 'react';

const knownModels = [
  { name: 'gemma3:4b', size: '4B', vram: 6, type: 'text', recommendedRAM: 8 },
  { name: 'llama3:8b', size: '8B', vram: 8, type: 'text', recommendedRAM: 16 },
  { name: 'codellama:7b', size: '7B', vram: 6, type: 'code', recommendedRAM: 12 },
  { name: 'mistral:7b', size: '7B', vram: 6, type: 'text', recommendedRAM: 8 },
  { name: 'llava:7b', size: '7B', vram: 10, type: 'vision+text', recommendedRAM: 16 },
];

function ModelSelector({ onSelect }) {
  const [config, setConfig] = useState({ ram: 16, vram: 8 });

  return (
    <div className="p-6 text-gray-900 dark:text-white space-y-6">
      <h1 className="text-3xl font-bold">🧠 Select an LLM Model</h1>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          RAM (GB):
          <input
            type="number"
            value={config.ram}
            onChange={(e) => setConfig({ ...config, ram: +e.target.value })}
            className="px-2 py-1 rounded border border-gray-400"
          />
        </label>
        <label className="flex items-center gap-2">
          VRAM (GB):
          <input
            type="number"
            value={config.vram}
            onChange={(e) => setConfig({ ...config, vram: +e.target.value })}
            className="px-2 py-1 rounded border border-gray-400"
          />
        </label>
      </div>

      <ul className="space-y-3">
        {knownModels.map((model) => {
          const isCompatible =
            config.vram >= model.vram && config.ram >= model.recommendedRAM;
          return (
            <li
              key={model.name}
              className={`p-4 rounded-lg shadow-md ${
                isCompatible ? 'bg-green-100 dark:bg-blue-900 ' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{model.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {model.size} • {model.type} • Needs {model.vram}GB VRAM & {model.recommendedRAM}GB RAM
                  </div>
                </div>
                <button
                  disabled={!isCompatible}
                  onClick={() => onSelect(model.name)}
                  className={`px-4 py-2 rounded ${
                    isCompatible
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-400 text-gray-100 cursor-not-allowed'
                  }`}
                >
                  {isCompatible ? 'Select' : 'Incompatible'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ModelSelector;
