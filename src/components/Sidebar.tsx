import React, { useState } from 'react';
import { Home, Film, X, ChevronDown, List, Bookmark, History } from 'lucide-react';
import { SourceType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onHomeClick: () => void;
  onWatchlistClick: () => void;
  isWatchlistView: boolean;
  onHistoryClick: () => void;
  isHistoryView: boolean;
  activeSource?: SourceType;
  onSelectSource?: (source: SourceType) => void;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  categories, 
  activeCategory, 
  onSelectCategory, 
  onHomeClick, 
  onWatchlistClick, 
  isWatchlistView, 
  onHistoryClick, 
  isHistoryView,
  activeSource,
  onSelectSource
}: SidebarProps) {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading tracking-tight">
            Menu
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-100 dark:bg-slate-800 rounded-full transition-colors focus:outline-none"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1 scrollbar-hide">
          <button
            onClick={() => {
              onHomeClick();
              onClose();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              !activeCategory && !isWatchlistView && !isHistoryView
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            Home / Latest
          </button>

          <button
            onClick={() => {
              onWatchlistClick();
              onClose();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors mt-2 ${
              isWatchlistView
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-white'
            }`}
          >
            <Bookmark className="w-5 h-5" />
            My Watchlist
          </button>

          <button
            onClick={() => {
              onHistoryClick();
              onClose();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors mt-1 ${
              isHistoryView
                ? 'bg-indigo-600/10 text-indigo-400' 
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-white'
            }`}
          >
            <History className="w-5 h-5" />
            Recently Viewed
          </button>

          <div className="mt-6">
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources</h3>
            <div className="flex flex-col gap-1">
              {onSelectSource && (
                <>
                  <button
                    onClick={() => {
                      onSelectSource('hollywood');
                      onClose();
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                      activeSource === 'hollywood' || activeSource === 'vegamovies'
                        ? 'bg-indigo-600/10 text-indigo-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Film className="w-5 h-5 text-indigo-400" />
                    Hollywood Movies
                  </button>

                  <button
                    onClick={() => {
                      onSelectSource('bollywood');
                      onClose();
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                      activeSource === 'bollywood' || activeSource === 'rogmovies'
                        ? 'bg-orange-500/10 text-orange-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-orange-400'
                    }`}
                  >
                    <Film className="w-5 h-5 text-orange-400" />
                    Bollywood Movies
                  </button>

                  <button
                    onClick={() => {
                      onSelectSource('xprimehub');
                      onClose();
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                      activeSource === 'xprimehub'
                        ? 'bg-fuchsia-500/10 text-fuchsia-500 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-900 hover:text-fuchsia-500'
                    }`}
                  >
                    <Film className="w-5 h-5 text-fuchsia-400" />
                    X-Hub (18+)
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
