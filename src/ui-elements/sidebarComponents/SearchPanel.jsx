import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchPanel({ onSearch, searchResults, collapsed }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  if (collapsed) return null; // 🔒 hide when sidebar is collapsed

  return (
    <div className="p-3 text-sm text-gray-700 dark:text-gray-200  flex flex-col">
      <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Search uploaded docs..."
          className="flex-1 px-0.5 py-2 rounded-md border dark:bg-zinc-800 dark:border-zinc-600 dark:text-white"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md"
          title="Search"
        >
          <Search size={18} />
        </button>
      </form>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Semantic search is isolated to documents uploaded in this chat session for better user experience.
      </p>

      <div className="overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-amber-600 scrollbar-track-slate-900">
        {searchResults?.length > 0 && (
          <ul className="space-y-2">
            {searchResults.map((res, i) => (
              <li key={i} className="bg-zinc-100 dark:bg-slate-700 p-2 rounded shadow-sm">
                <div className="font-medium text-blue-700 dark:text-white italic">{res.fileName}</div>
                <hr className="my-2 border-gray-300 dark:border-blue-300" />
                <div className="text-xs break-words whitespace-pre-wrap font-mono">
                  {res.chunk.slice(0, 200)}...
                </div>
                <div className="text-[10px] text-grey-500 dark:text-gray-300 italic">Score: {res.score.toFixed(3)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
