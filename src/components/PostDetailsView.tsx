import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Film, Download, Share2, Bookmark, BookmarkCheck, Unlock, ChevronDown, ChevronUp, Send, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PostDetails, DownloadLink, MediaItem } from '../types';
import { getProxyUrl, cleanDisplayTitle } from '../utils/url';
import { ResolvableLink } from './ResolvableLink';
import { MediaGrid } from './MediaGrid';

interface PostDetailsViewProps {
  loading: boolean;
  error: string | null;
  details: PostDetails | null;
  selectedPostUrl: string | null;
  onBack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  relatedPosts?: MediaItem[];
  onRelatedPostClick?: (url: string) => void;
}

const DownloadGroup: React.FC<{ title: string, links: DownloadLink[] }> = ({ title, links }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-white dark:bg-slate-900/50 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl overflow-hidden shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
      >
        <span className="font-semibold text-indigo-900 dark:text-indigo-100 text-left">{title}</span>
        <div className="flex items-center gap-3 shrink-0 ml-4">
           <span className="text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-1 rounded-md">
             {links.length} {links.length === 1 ? 'Provider' : 'Providers'}
           </span>
           {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 grid gap-3 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
           {links.map((link, idx) => (
             <ResolvableLink 
                key={idx} 
                name={link.label || (link as any).name || "Download Link"} 
                url={link.url} 
                fileQuality={link.quality} 
                size={link.size} 
                audio={link.audio} 
                server={link.server} 
             />
           ))}
        </div>
      )}
    </div>
  );
}

let cachedLocknoteText: string | null = null;
let lastLocknoteFetchTime = 0;

export function PostDetailsView({ loading, error, details, selectedPostUrl, onBack, isInWatchlist, onToggleWatchlist, relatedPosts, onRelatedPostClick }: PostDetailsViewProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [notification, setNotification] = useState<string>("Click the button below to unlock and reveal the high-speed download links.");

  useEffect(() => {
    const now = Date.now();
    if (cachedLocknoteText && (now - lastLocknoteFetchTime < 30 * 60 * 1000)) {
      setNotification(cachedLocknoteText);
      return;
    }

    fetch('https://raw.githubusercontent.com/Imtiaz9800/Notification/main/locknote.txt', { cache: 'default' })
      .then(res => res.text())
      .then(text => {
        if (text) {
          cachedLocknoteText = text;
          lastLocknoteFetchTime = Date.now();
          setNotification(text);
        }
      })
      .catch(err => console.error("Failed to fetch notification:", err));
  }, []);

  // Update Document Meta for SEO when viewing details
  useEffect(() => {
    if (details && details.title) {
      const displayTitle = cleanDisplayTitle(details.title);
      document.title = `${displayTitle} - Download on Pirate69`;
      
      let description = `Download ${displayTitle} in high quality on Pirate69.`;
      if (details.description) {
        description = details.description.substring(0, 160);
      }
      
      const setMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          if (name.startsWith('og:') || name.startsWith('twitter:')) {
            el.setAttribute('property', name);
          } else {
            el.setAttribute('name', name);
          }
          document.head.appendChild(el);
        }
        if (el) el.setAttribute('content', content);
      };
      
      setMeta('description', description);
      setMeta('og:title', `${displayTitle} - Pirate69`);
      setMeta('og:description', description);
      if (details.thumbnail) {
        setMeta('og:image', details.thumbnail);
        setMeta('twitter:image', details.thumbnail);
      }
    } else {
      document.title = "Pirate69 - Ultimate Movies & TV Shows Download Hub";
    }
  }, [details]);

  const groupedLinks = React.useMemo(() => {
    if (!details?.downloadLinks) return [];
    const groups: { [key: string]: typeof details.downloadLinks } = {};
    
    details.downloadLinks.forEach(link => {
       let groupName = link.quality || 'Standard';
       const name = link.label || (link as any).name || '';
       
       const seasonMatch = name.match(/Season\s\d+/i) || name.match(/S\d+/i);
       if (seasonMatch) {
          groupName = `${groupName} (${seasonMatch[0].toUpperCase()})`;
       }
       
       if (!groups[groupName]) {
         groups[groupName] = [];
       }
       groups[groupName].push(link);
    });
    
    return Object.entries(groups).map(([title, links]) => ({ title, links }));
  }, [details]);

  const handleShare = async () => {
    if (!details) return;
    const displayTitle = cleanDisplayTitle(details.title);
    const shareData = {
      title: displayTitle,
      text: `Check out ${displayTitle} on Pirate69`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
         if (err.name !== 'AbortError') {
             copyToClipboard();
         }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-slate-600 dark:text-slate-400 animate-spin" />
          <p className="text-slate-500 font-medium">Extracting details...</p>
       </div>
     )
  }

  if (error) {
     return (
       <div className="py-12">
         <button onClick={onBack} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-white transition-colors mb-8">
           <ArrowLeft className="w-5 h-5" /> Back to Search
         </button>
         <div className="max-w-2xl mx-auto p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-center">
           {error}
         </div>
       </div>
     )
  }

  if (!details) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-white transition-colors">
           <ArrowLeft className="w-5 h-5" /> Back to Search Results
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleWatchlist} 
            className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 border ${isInWatchlist ? 'border-indigo-500/50 text-indigo-400' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'} rounded-lg transition-colors font-medium`}
          >
             {isInWatchlist ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
             <span className="hidden sm:inline">{isInWatchlist ? 'Saved' : 'Watchlist'}</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium">
             <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share Link</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Left Column: Thumbnail */}
         <div className="lg:col-span-3 max-w-xs mx-auto lg:max-w-none w-full">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl sticky top-24">
              {details.thumbnail ? (
                <img 
                  src={getProxyUrl(details.thumbnail)} 
                  alt={cleanDisplayTitle(details.title)}
                  referrerPolicy="no-referrer"
                  className="w-full rounded-xl object-cover aspect-[2/3]"
                />
              ) : (
                <div className="w-full aspect-[2/3] flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <Film className="w-16 h-16 text-slate-800" />
                </div>
              )}
            </div>
         </div>

         {/* Right Column: Details & Links */}
         <div className="lg:col-span-9 space-y-12">
            <div>
               <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white leading-tight mb-3 font-heading">
                 {cleanDisplayTitle(details.title)}
               </h1>

               {/* Metadata Badges */}
               <div className="flex flex-wrap items-center gap-2 mb-4">
                 {typeof details.rating === 'number' && details.rating > 0 && (
                   <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-md">
                     ★ {details.rating.toFixed(1)} TMDB
                   </span>
                 )}
                 {details.year && (
                   <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                     {details.year}
                   </span>
                 )}
                 {details.quality && (
                   <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                     {details.quality}
                   </span>
                 )}
                 {details.isSeries && (
                   <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                     Series{details.season ? ` • Season ${details.season}` : ''}
                   </span>
                 )}
                 {details.imdbId && (
                   <a 
                     href={`https://www.imdb.com/title/${details.imdbId}`} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#F5C518] text-black hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                   >
                     IMDb ↗
                   </a>
                 )}
                 {details.genres && details.genres.map((g, idx) => (
                   <span key={idx} className="px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 rounded-md">
                     {g}
                   </span>
                 ))}
               </div>

               {/* Overview / Synopsis */}
               {(details.overview || details.description) && (
                 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6">
                   <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1.5">Overview</h3>
                   <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                     {details.overview || details.description}
                   </p>
                 </div>
               )}
            </div>

            {/* Download Links */}
            {details.downloadLinks && details.downloadLinks.length > 0 && (
              <div>
                 <h2 className="text-2xl font-medium text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
                   <Download className="w-6 h-6 text-emerald-500" /> Download Links
                 </h2>
                 
                 {!isUnlocked ? (
                   <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-950 p-6 sm:p-8 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center text-center space-y-5">
                     {/* Background Glows */}
                     <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/15 blur-[60px] rounded-full pointer-events-none" />
                     <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />

                     {/* Badges */}
                     <div className="flex flex-wrap items-center justify-center gap-2 relative z-10">
                       <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                         <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                         <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Notice Board</span>
                       </div>
                       <span className="px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1">
                         <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Direct High-Speed Download
                       </span>
                     </div>

                     {/* Highlighted Message Card */}
                     <div className="relative z-10 w-full max-w-lg p-5 rounded-2xl bg-slate-950/70 border border-indigo-500/20 shadow-inner group hover:border-indigo-500/40 transition-colors">
                       <div className="flex items-start gap-3 text-left">
                         <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 animate-pulse shadow-sm shadow-indigo-400/50" />
                         <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed whitespace-pre-wrap tracking-normal">
                           {notification}
                         </p>
                       </div>
                     </div>

                     {/* Action Buttons */}
                     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto relative z-10 pt-1">
                       <button
                         onClick={() => setIsUnlocked(true)}
                         className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm sm:text-base cursor-pointer"
                       >
                         <Unlock className="w-5 h-5" />
                         <span>Unlock Download Links</span>
                       </button>
                       <a
                         href="https://t.me/piratedcult"
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#229ED9] hover:to-[#0088cc] text-white font-semibold rounded-xl shadow-lg shadow-[#229ED9]/30 hover:shadow-[#229ED9]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm sm:text-base"
                       >
                         <Send className="w-5 h-5" />
                         <span>Join Telegram</span>
                       </a>
                     </div>
                   </div>
                 ) : (
                   <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {groupedLinks.map((group, groupIdx) => (
                        <DownloadGroup key={groupIdx} title={group.title} links={group.links} />
                      ))}
                   </div>
                 )}
              </div>
            )}

            {/* Screenshots */}
            {details.screenshots && details.screenshots.length > 0 && (
              <div>
                 <h2 className="text-2xl font-medium text-slate-900 dark:text-slate-100 mb-6">Screenshots</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {details.screenshots.map((src, idx) => (
                       <div key={idx} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                         <img 
                           src={getProxyUrl(src)} 
                           alt={`Screenshot ${idx + 1}`} 
                           loading="lazy"
                           referrerPolicy="no-referrer"
                           className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                         />
                       </div>
                    ))}
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Related Posts */}
      {relatedPosts && relatedPosts.length > 0 && onRelatedPostClick && (
        <div className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
           <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">You May Also Like</h2>
           <MediaGrid results={relatedPosts} onPostClick={onRelatedPostClick} />
        </div>
      )}
    </div>
  );
}
