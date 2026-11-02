import React, { useState } from 'react';
import { X, Link2, Download, Copy, Check, ExternalLink, Loader2, Zap, Film, Layers, Code } from 'lucide-react';
import { toast } from 'sonner';

interface Mirror {
  name: string;
  server: string;
  url: string;
  directDownloadUrl?: string;
}

interface Episode {
  episodeName: string;
  mirrors: Mirror[];
}

interface SolveResponse {
  success: boolean;
  inputUrl: string;
  title: string;
  isSeries: boolean;
  totalMirrors: number;
  mirrors: Mirror[];
  episodes?: Episode[];
  error?: string;
}

interface NexdriveSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NexdriveSolverModal: React.FC<NexdriveSolverModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mirrors' | 'json'>('mirrors');

  if (!isOpen) return null;

  const handleSolve = async (targetUrl?: string) => {
    const inputToUse = (targetUrl || url).trim();
    if (!inputToUse) {
      toast.error('Please enter a Nexdrive or FastDL URL');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/nexdrive/solve?url=${encodeURIComponent(inputToUse)}&deep=true`);
      const data = await res.json();

      if (data.success) {
        setResult(data);
        toast.success(`Successfully extracted ${data.totalMirrors} mirror(s)!`);
      } else {
        toast.error(data.error || 'Failed to resolve Nexdrive URL');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while solving link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handlePasteSample = () => {
    const sample = 'https://nexdrive.beer/genxfm784776518071/';
    setUrl(sample);
    handleSolve(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Nexdrive URL Solver
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                  Live API
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bypass ad-pages & extract direct Google CDN mirrors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Input Form */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Paste Nexdrive or FastDL Link
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://nexdrive.beer/genxfm..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSolve();
                  }}
                />
              </div>
              <button
                onClick={() => handleSolve()}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Solving...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Solve Link
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Supports all Nexdrive domains & FastDL mirrors</span>
              <button
                type="button"
                onClick={handlePasteSample}
                className="text-indigo-500 hover:text-indigo-400 font-medium underline underline-offset-2"
              >
                Try sample link
              </button>
            </div>
          </div>

          {/* Result Section */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-indigo-400" />
                    {result.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Found {result.totalMirrors} unblocked mirror(s) {result.isSeries && 'across episodes'}
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    onClick={() => setActiveTab('mirrors')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      activeTab === 'mirrors' 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Mirrors
                  </button>
                  <button
                    onClick={() => setActiveTab('json')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      activeTab === 'json' 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> API JSON
                  </button>
                </div>
              </div>

              {activeTab === 'mirrors' ? (
                <div className="space-y-3">
                  {result.mirrors.map((mirror, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md uppercase ${
                            mirror.server === 'G-Direct' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : mirror.server === 'Filepress'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {mirror.server}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {mirror.name}
                          </span>
                        </div>

                        {mirror.directDownloadUrl && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            ⚡ Direct Google CDN Ready
                          </span>
                        )}
                      </div>

                      {/* Direct Google CDN Stream Button if extracted */}
                      {mirror.directDownloadUrl && (
                        <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <Download className="w-4 h-4 shrink-0" />
                            <span className="truncate">1-Click Direct Google Download</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopy(mirror.directDownloadUrl!)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Copy direct CDN link"
                            >
                              {copiedUrl === mirror.directDownloadUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={mirror.directDownloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                              Download <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Mirror link info */}
                      <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                        <span className="truncate font-mono">{mirror.url}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(mirror.url)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Copy mirror URL"
                          >
                            {copiedUrl === mirror.url ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={mirror.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => handleCopy(JSON.stringify(result, null, 2))}
                    className="absolute top-3 right-3 px-2.5 py-1 text-xs bg-slate-800 text-slate-300 hover:text-white rounded-md flex items-center gap-1 border border-slate-700"
                  >
                    <Copy className="w-3 h-3" /> Copy JSON
                  </button>
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-72 border border-slate-800">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">API: /api/nexdrive/solve?url=...</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
