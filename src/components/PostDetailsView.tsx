import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Film, Download, Share2, Bookmark, BookmarkCheck, Unlock, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PostDetails, DownloadLink } from '../types';
import { getProxyUrl } from '../utils/url';
import { ResolvableLink } from './ResolvableLink';

interface PostDetailsViewProps {
  loading: boolean;
  error: string | null;
  details: PostDetails | null;
  selectedPostUrl: string | null;
  onBack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
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

export function PostDetailsView({ loading, error, details, selectedPostUrl, onBack, isInWatchlist, onToggleWatchlist }: PostDetailsViewProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [notification, setNotification] = useState<string>("Click the button below to unlock and reveal the high-speed download links.");

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Imtiaz9800/Notification/main/locknote.txt')
      .then(res => res.text())
      .then(text => {
        if (text) setNotification(text);
      })
      .catch(err => console.error("Failed to fetch notification:", err));
  }, []);

  // Update Document Meta for SEO when viewing details
  useEffect(() => {
    if (details && details.title) {
      document.title = `${details.title} - Download on Pirate69`;
      
      let description = `Download ${details.title} in high quality on Pirate69.`;
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
        el.setAttribute('content', content);
      };
      
      setMeta('description', description);
      setMeta('og:title', `${details.title} - Pirate69`);
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
    const shareData = {
      title: details.title,
      text: `Check out ${details.title} on Pirate69`,
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
         <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl sticky top-24">
              {details.thumbnail ? (
                <img 
                  src={getProxyUrl(details.thumbnail)} 
                  alt={details.title}
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
         <div className="lg:col-span-8 space-y-12">
            <div>
               <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white leading-tight mb-4 font-heading">
                 {details.title}
               </h1>
            </div>

            {/* Download Links */}
            {details.downloadLinks && details.downloadLinks.length > 0 && (
              <div>
                 <h2 className="text-2xl font-medium text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-3">
                   <Download className="w-6 h-6 text-emerald-500" /> Download Links
                 </h2>
                 
                 {!isUnlocked ? (
                   <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                     <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notice Board</h3>
                     <p className="text-slate-600 dark:text-slate-400 max-w-md whitespace-pre-wrap">
                       {notification}
                     </p>
                     <div className="flex flex-col sm:flex-row gap-4 mt-4">
                       <button
                         onClick={() => setIsUnlocked(true)}
                         className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"
                       >
                         <Unlock className="w-5 h-5" />
                         Unlock Links
                       </button>
                       <a
                         href="https://t.me/piratedcult"
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 px-6 py-3 bg-[#229ED9] hover:bg-[#1f8ec4] text-white font-medium rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#229ED9]/30"
                       >
                         <Send className="w-5 h-5" />
                         Join Telegram
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
    </div>
  );
}
