import React, { useState } from 'react';
import { Loader2, ExternalLink, Download, ChevronDown, ChevronUp } from 'lucide-react';

function getEpisodeLabel(filename: string, index: number, isSeason: boolean) {
  let epText = '';
  const sxxexxMatch = filename.match(/[S|s]\d+[E|e](\d+)/);
  if (sxxexxMatch) epText = `Ep ${parseInt(sxxexxMatch[1], 10)}`;
  else {
    const epMatch = filename.match(/[E|e]p(?:isode)?s?[:\s\.]*(\d+)/i) || filename.match(/[E|e](\d+)(?:\s|\.|-|_|\[|\])/i);
    if (epMatch) epText = `Ep ${parseInt(epMatch[1], 10)}`;
    else {
      const numMatch = filename.match(/(?:^|[^a-zA-Z0-9])0*(\d+)(?:v\d)?(?:\.\w{3,4})$/);
      if (numMatch) epText = `Ep ${numMatch[1]}`;
      else {
        const catchAllMatch = filename.match(/[\s\-]0*(\d{1,3})[\s\-\.]/);
        if (catchAllMatch) epText = `Ep ${parseInt(catchAllMatch[1], 10)}`;
      }
    }
  }

  if (isSeason && !epText) {
      epText = `Ep ${index + 1}`;
  }

  let server = '';
  const lowerName = filename.toLowerCase();
  if (lowerName.includes('g-direct') || lowerName.includes('fastdl')) server = 'G-Direct';
  else if (lowerName.includes('v-cloud')) server = 'V-Cloud';
  else if (lowerName.includes('filepress') || lowerName.includes('filebee')) server = 'Filepress';
  else if (lowerName.includes('vegadrive') || lowerName.includes('v-drive')) server = 'V-Drive';
  else {
     let cleanName = filename.replace(/⚡|G-Direct|\[Instant\]|\[Resumable\]|link|-|:|Episodes?/gi, '').trim();
     if (!cleanName) cleanName = `Link ${index + 1}`;
     server = cleanName.length > 15 ? cleanName.substring(0, 12) + '...' : cleanName;
  }

  if (isSeason) {
      if (epText && server && !server.includes(epText)) {
          return `${epText} • ${server}`;
      }
      return epText || server;
  }
  
  return server;
}

function getProviderColors(label: string) {
  const lower = label.toLowerCase();
  
  if (lower.includes('g-direct') || lower.includes('fastdl'))
    return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 border border-emerald-200 dark:border-emerald-500/30";
  if (lower.includes('v-cloud') || lower.includes('hubcloud'))
    return "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 border border-sky-200 dark:border-sky-500/30";
  if (lower.includes('filepress') || lower.includes('filebee'))
    return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/30";
  if (lower.includes('vegadrive') || lower.includes('v-drive'))
    return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/30";
  if (lower.includes('mega'))
    return "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30 border border-rose-200 dark:border-rose-500/30";
  if (lower.includes('gdflix') || lower.includes('gdtot') || lower.includes('pixeldrain'))
    return "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 dark:hover:bg-fuchsia-500/30 border border-fuchsia-200 dark:border-fuchsia-500/30";
    
  // Default light theme fallback
  return "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700";
}

export function ResolvableLink({ name, url, fileQuality, size, audio, server }: { name: string, url: string, fileQuality?: string, size?: string, audio?: string, server?: string, key?: React.Key }) {
  const [resolving, setResolving] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedList, setResolvedList] = useState<{name: string, url: string}[] | null>(null);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const isNexdrive = url.includes('nexdrive');

  // Attempt to extract quality (e.g., 480p, 720p, 1080p, 2160p, 4k)
  const qualityMatch = name.match(/(480p|720p|1080p|2160p|4k)/i);
  const quality = fileQuality || (qualityMatch ? qualityMatch[1].toUpperCase() : null);
  const isSeason = name.toLowerCase().includes('season') || name.toLowerCase().includes('batch') || name.toLowerCase().includes('episodes');

  // Determine colors based on quality and season
  let theme = {
    button: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20 text-white",
    border: "hover:border-indigo-500/50",
    text: "text-indigo-400",
    bg: "hover:bg-indigo-950/30",
    textHover: "group-hover/link:text-indigo-300",
    iconHover: "group-hover/link:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
  };

  if (isSeason) {
      if (quality === '480P') {
         theme = { button: "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20 text-white", border: "hover:border-cyan-500/50", text: "text-cyan-400", bg: "hover:bg-cyan-950/30", textHover: "group-hover/link:text-cyan-300", iconHover: "group-hover/link:text-cyan-400", badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" };
      } else if (quality === '720P') {
         theme = { button: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white", border: "hover:border-blue-500/50", text: "text-blue-400", bg: "hover:bg-blue-950/30", textHover: "group-hover/link:text-blue-300", iconHover: "group-hover/link:text-blue-400", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" };
      } else if (quality === '1080P' || quality === '2160P' || quality === '4K') {
         theme = { button: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20 text-white", border: "hover:border-indigo-500/50", text: "text-indigo-400", bg: "hover:bg-indigo-950/30", textHover: "group-hover/link:text-indigo-300", iconHover: "group-hover/link:text-indigo-400", badge: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" };
      } else {
         theme = { button: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white", border: "hover:border-blue-500/50", text: "text-blue-400", bg: "hover:bg-blue-950/30", textHover: "group-hover/link:text-blue-300", iconHover: "group-hover/link:text-blue-400", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" };
      }
  } else {
      if (quality === '480P') {
        theme = { button: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 text-white", border: "hover:border-emerald-500/50", text: "text-emerald-400", bg: "hover:bg-emerald-950/30", textHover: "group-hover/link:text-emerald-300", iconHover: "group-hover/link:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" };
      } else if (quality === '720P') {
        theme = { button: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20 text-white", border: "hover:border-blue-500/50", text: "text-blue-400", bg: "hover:bg-blue-950/30", textHover: "group-hover/link:text-blue-300", iconHover: "group-hover/link:text-blue-400", badge: "bg-blue-500/10 text-blue-300 border-blue-500/20" };
      } else if (quality === '1080P') {
        theme = { button: "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20 text-white", border: "hover:border-purple-500/50", text: "text-purple-400", bg: "hover:bg-purple-950/30", textHover: "group-hover/link:text-purple-300", iconHover: "group-hover/link:text-purple-400", badge: "bg-purple-500/10 text-purple-300 border-purple-500/20" };
      } else if (quality === '2160P' || quality === '4K') {
        theme = { button: "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20 text-white", border: "hover:border-rose-500/50", text: "text-rose-400", bg: "hover:bg-rose-950/30", textHover: "group-hover/link:text-rose-300", iconHover: "group-hover/link:text-rose-400", badge: "bg-rose-500/10 text-rose-300 border-rose-500/20" };
      }
  }

  const handleResolve = async () => {
    if (resolvedUrl) {
      window.open(resolvedUrl, '_blank');
      return;
    }

    if (!isNexdrive) {
      window.open(url, '_blank');
      return;
    }

    try {
      setResolving(true);
      setError(false);
      const res = await fetch(`/api/resolve-link?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      
      if (data.resolvedUrls && data.resolvedUrls.length > 0) {
        setResolvedList(data.resolvedUrls);
      } else if (data.resolvedUrl) {
        setResolvedUrl(data.resolvedUrl);
        window.open(data.resolvedUrl, '_blank');
      } else {
        setError(true);
        window.open(url, '_blank'); // fallback
      }
    } catch (err) {
      setError(true);
      window.open(url, '_blank'); // fallback
    } finally {
      setResolving(false);
    }
  };

  const uniqueEpisodesCount = resolvedList ? new Set(resolvedList.map((ep, idx) => {
      const match = ep.name.match(/[E|e]p(?:isode)?s?[:\s\.]*(\d+)/i) || ep.name.match(/[E|e](\d+)(?:\s|\.|-|_|\[|\])/i);
      return match ? parseInt(match[1], 10) : idx;
  })).size : 0;

  const groupedLinks = React.useMemo(() => {
    if (!resolvedList) return [];
    
    if (!isSeason) {
      return [{ title: null, links: resolvedList }];
    }

    const groups = new Map<number, typeof resolvedList>();
    resolvedList.forEach((ep, idx) => {
      const match = ep.name.match(/[E|e]p(?:isode)?s?[:\s\.]*(\d+)/i) || ep.name.match(/[E|e](\d+)(?:\s|\.|-|_|\[|\])/i);
      const epNum = match ? parseInt(match[1], 10) : (idx + 1);
      
      if (!groups.has(epNum)) {
        groups.set(epNum, []);
      }
      groups.get(epNum)!.push(ep);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([epNum, links]) => ({
        title: `Episode ${epNum}`,
        links
      }));
  }, [resolvedList, isSeason]);

  if (resolvedList) {
    return (
      <div className={`bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-4 group transition-colors ${theme.border}`}>
         <div 
           className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
           onClick={() => setIsExpanded(!isExpanded)}
         >
           <span className="text-slate-800 dark:text-slate-200 font-medium leading-snug flex items-center flex-wrap gap-2">
             <span className={`px-2 py-0.5 text-xs font-semibold border rounded-md uppercase tracking-wider ${theme.badge}`}>
               {isSeason ? 'SEASON PACK' : (quality || 'LINK')}
             </span>
             {name}
           </span>
           <div className="flex items-center gap-3">
             <span className={`text-sm ${theme.text} font-medium shrink-0 bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800`}>
               {isSeason ? `${uniqueEpisodesCount} Episodes (${resolvedList.length} Links)` : `${resolvedList.length} Mirrors`} Available
             </span>
             <button className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
               {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
             </button>
           </div>
         </div>
         
         {isExpanded && (
           <div className="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
             {groupedLinks.map((group, groupIdx) => (
               <div key={groupIdx} className="flex flex-col gap-3">
                 {group.title && (
                   <div className="flex items-center gap-3">
                     <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                       {group.title}
                     </span>
                     <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                   </div>
                 )}
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {group.links.map((ep, idx) => {
                      const label = getEpisodeLabel(ep.name, idx, isSeason);
                      const providerTheme = getProviderColors(label);
                      return (
                        <a 
                          key={idx}
                          href={ep.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium text-sm shadow-sm ${providerTheme}`}
                        >
                          <span className="truncate pr-2">{label}</span>
                          <Download className="w-4 h-4 shrink-0 opacity-80" />
                        </a>
                      );
                    })}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-colors ${theme.border}`}>
       <span className="text-slate-700 dark:text-slate-300 font-medium leading-snug pr-4 flex-1 flex flex-col gap-2">
         <div className="flex flex-col sm:flex-row sm:items-center gap-2">
           <span className={`px-2 py-0.5 text-xs font-semibold border rounded-md uppercase tracking-wider shrink-0 w-fit ${theme.badge}`}>
             {isSeason ? 'SEASON PACK' : (quality || 'LINK')}
           </span>
           <span>{name}</span>
         </div>
         {(size || audio || server) && (
           <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
             {server && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Server: {server}</span>}
             {size && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Size: {size}</span>}
             {audio && <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">Audio: {audio}</span>}
           </div>
         )}
         {resolvedUrl && <div className={`text-xs mt-1 truncate ${theme.text}`}>{resolvedUrl}</div>}
       </span>
       
       <button 
         onClick={handleResolve}
         disabled={resolving}
         className={`shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-wait ${theme.button}`}
       >
         {resolving ? (
           <><Loader2 className="w-4 h-4 animate-spin" /> Resolving...</>
         ) : resolvedUrl ? (
           <><Download className="w-4 h-4" /> Download Ready</>
         ) : isNexdrive ? (
           <><Download className="w-4 h-4" /> {quality ? `${quality} Download` : 'Download Now'}</>
         ) : (
           <><ExternalLink className="w-4 h-4" /> Open Link</>
         )}
       </button>
    </div>
  );
}
