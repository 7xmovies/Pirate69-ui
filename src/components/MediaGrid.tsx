import React from 'react';
import { Film, ExternalLink } from 'lucide-react';
import { MediaItem } from '../types';
import { getProxyUrl } from '../utils/url';

interface MediaGridProps {
  results: MediaItem[];
  onPostClick: (url: string) => void;
}

export function MediaGrid({ results, onPostClick }: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {results.map((item, index) => (
        <button
          key={item.id || index}
          onClick={() => onPostClick(item.link)}
          className="group text-left flex flex-col bg-white dark:bg-slate-900/40 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:ring-offset-slate-950 backdrop-blur-sm"
        >
          {/* Thumbnail Container */}
          <div className="relative aspect-[2/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {item.category && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow-md uppercase tracking-wider backdrop-blur-md ${
                  item.category === 'hollywood' 
                    ? 'bg-indigo-600/90 text-white' 
                    : item.category === 'bollywood'
                    ? 'bg-orange-600/90 text-white'
                    : 'bg-emerald-600/90 text-white'
                }`}>
                  {item.category}
                </span>
              </div>
            )}
            {item.thumbnail ? (
              <img
                src={getProxyUrl(item.thumbnail)}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-700"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h18"/><path d="M3 17h18"/></svg>';
                  (e.target as HTMLImageElement).parentElement?.appendChild(icon);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Film className="w-12 h-12 text-slate-700" />
              </div>
            )}
            {/* Overlay for hover */}
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <div className="p-3 bg-indigo-600 rounded-full text-white flex items-center gap-2 font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                Extract Details <ExternalLink className="w-4 h-4" />
              </div>
            </div>
          </div>
          
          {/* Content Container */}
          <div className="p-3 sm:p-5 flex flex-col flex-grow justify-between gap-3 sm:gap-4">
            <h3 className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 line-clamp-3 leading-snug group-hover:text-indigo-300 transition-colors">
              {item.title}
            </h3>
          </div>
        </button>
      ))}
    </div>
  );
}
