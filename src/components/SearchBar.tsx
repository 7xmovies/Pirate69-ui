import React from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { SourceType } from '../types';

interface SearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  onClear?: () => void;
  source?: SourceType;
}

export function SearchBar({ query, setQuery, onSearch, loading, onClear, source }: SearchBarProps) {
  const handleClear = () => {
    setQuery('');
    if (onClear) onClear();
  };

  const getPlaceholder = () => {
    if (source === 'bollywood' || source === 'rogmovies') return 'Search Bollywood movies, series...';
    if (source === 'xprimehub') return 'Search X-Hub (18+) movies, series...';
    return 'Search Hollywood movies, series...';
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
      <form onSubmit={onSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={getPlaceholder()}
          className="block w-full pl-14 pr-36 py-4 bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-lg shadow-xl shadow-slate-200/50 dark:shadow-black/20 backdrop-blur-md font-medium"
          disabled={loading}
        />
        <div className="absolute inset-y-2 right-2 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors focus:outline-none"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white dark:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-900/20 flex items-center justify-center min-w-[100px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>
    </div>
  );
}
