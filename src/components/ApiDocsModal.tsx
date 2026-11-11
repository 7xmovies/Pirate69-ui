import React, { useState } from 'react';
import { X, Copy, Check, Play, Terminal, BookOpen, Layers, Globe, Code, Zap, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiDocsModal({ isOpen, onClose }: ApiDocsModalProps) {
  const [activeTab, setActiveTab] = useState<'tester' | 'snippets' | 'reference'>('tester');
  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('Dead-End');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState('1');
  const [limit, setLimit] = useState('10');
  const [resolveLinks, setResolveLinks] = useState(true);
  const [deep, setDeep] = useState(false);
  const [directId, setDirectId] = useState('');
  const [directUrl, setDirectUrl] = useState('');

  const [snippetLang, setSnippetLang] = useState<'curl' | 'js' | 'python' | 'node'>('curl');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  // Build the live API query string
  const buildQueryUrl = (absolute = false) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = absolute ? `${origin}/api/unified` : '/api/unified';
    const params = new URLSearchParams();

    if (directUrl.trim()) {
      params.set('url', directUrl.trim());
      if (resolveLinks) params.set('resolve', 'true');
      return `${base}?${params.toString()}`;
    }

    if (directId.trim()) {
      params.set('id', directId.trim());
      if (resolveLinks) params.set('resolve', 'true');
      return `${base}?${params.toString()}`;
    }

    if (query.trim()) params.set('q', query.trim());
    if (source && source !== 'all') params.set('source', source);
    if (category.trim()) params.set('category', category.trim());
    if (page && page !== '1') params.set('page', page);
    if (limit && limit !== '20') params.set('limit', limit);
    if (resolveLinks) params.set('resolve', 'true');
    if (deep) params.set('deep', 'true');

    const str = params.toString();
    return str ? `${base}?${str}` : base;
  };

  const handleExecuteRequest = async () => {
    setLoading(true);
    setResponseData(null);
    setResponseStatus(null);
    const startTime = performance.now();

    try {
      const url = buildQueryUrl(false);
      const res = await fetch(url);
      const timeMs = Math.round(performance.now() - startTime);
      setResponseTime(timeMs);
      setResponseStatus(res.status);

      const json = await res.json();
      setResponseData(JSON.stringify(json, null, 2));
      toast.success(`Request completed in ${timeMs}ms with status ${res.status}`);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData(JSON.stringify({ error: err.message || 'Request failed' }, null, 2));
      toast.error('Failed to execute API request');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!responseData) return;
    navigator.clipboard.writeText(responseData);
    setCopied(true);
    toast.success('Response JSON copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEndpoint = () => {
    const fullUrl = buildQueryUrl(true);
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    toast.success('Endpoint URL copied!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const getSnippetCode = () => {
    const fullUrl = buildQueryUrl(true);
    switch (snippetLang) {
      case 'curl':
        return `curl -X GET "${fullUrl}" \\
  -H "Accept: application/json"`;
      case 'js':
        return `// Fetch media from Pirate69 Universal API
const response = await fetch("${fullUrl}");
const data = await response.json();

console.log("Found", data.total || data.results?.length, "results");
console.log(data);`;
      case 'python':
        return `import requests

url = "${fullUrl}"
response = requests.get(url)
data = response.json()

print(f"Status: {response.status_code}")
print(f"Total: {data.get('total', len(data.get('results', [])))}")
for item in data.get('results', []):
    print(f"- {item.get('title')} [{item.get('source')}]")`;
      case 'node':
        return `const axios = require('axios');

async function getMedia() {
  const { data } = await axios.get("${fullUrl}");
  console.log('Results:', data.results);
}

getMedia();`;
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getSnippetCode());
    setCopiedSnippet(true);
    toast.success('Code snippet copied!');
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Universal Developer API</h2>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  v1.0 • CORS Universal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Single unified endpoint for Hollywood, Bollywood, and Adult 18+ with real-time download link resolution.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'tester'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Live Query Runner & Explorer
          </button>
          <button
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'snippets'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            Code Snippets & Integration
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'reference'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            API Parameter Reference
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: LIVE TESTER */}
          {activeTab === 'tester' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Query Builder Column (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Query Parameters
                  </h3>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => { setDirectId(''); setDirectUrl(''); }}
                      className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        !directId && !directUrl
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Search / Catalog Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDirectId('dead-end-job-2026-season-1-netflix-dual-audio-hindi-web-dl-480p-720p-1080p');
                        setDirectUrl('');
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        directId || directUrl
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Direct ID / Link Mode
                    </button>
                  </div>

                  {!directId && !directUrl ? (
                    <>
                      {/* Search Keyword */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Query (<code className="text-indigo-300">q</code>)
                        </label>
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search title, movie, series... (leave empty for latest)"
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        />
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {['Dead-End', 'Deadpool', 'Netflix', 'Action'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setQuery(preset)}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              +{preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Source Selector */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Target Source (<code className="text-indigo-300">source</code>)
                        </label>
                        <select
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="all">🌟 All 3 Sources (Multi-source Aggregate)</option>
                          <option value="hollywood">🎬 Hollywood (Vegamovies)</option>
                          <option value="bollywood">🎥 Bollywood (Rogmovies)</option>
                          <option value="xprimehub">🔞 Adult 18+ (X-PrimeHub)</option>
                        </select>
                      </div>

                      {/* Category Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Genre / Category (<code className="text-indigo-300">category</code>)
                        </label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="e.g. Netflix, Action, Comedy, Horror"
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Pagination: Page & Limit */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Page (<code className="text-indigo-300">page</code>)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={page}
                            onChange={(e) => setPage(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Limit (<code className="text-indigo-300">limit</code>, max 50)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Direct ID Lookup */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Direct Movie ID (<code className="text-indigo-300">id</code>)
                        </label>
                        <input
                          type="text"
                          value={directId}
                          onChange={(e) => { setDirectId(e.target.value); setDirectUrl(''); }}
                          placeholder="e.g. dead-end-job-2026-season-1-netflix..."
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                        />
                      </div>

                      {/* Direct URL Resolver */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Direct Link Solver (<code className="text-indigo-300">url</code>)
                        </label>
                        <input
                          type="text"
                          value={directUrl}
                          onChange={(e) => { setDirectUrl(e.target.value); setDirectId(''); }}
                          placeholder="e.g. https://nexdrive.beer/genxfm784776517502/"
                          className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                        />
                      </div>
                    </>
                  )}

                  {/* Toggles */}
                  <div className="pt-2 border-t border-slate-700/60 space-y-2">
                    <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Auto-resolve Download Links (<code className="text-indigo-300">resolve=true</code>)
                      </span>
                      <input
                        type="checkbox"
                        checked={resolveLinks}
                        onChange={(e) => setResolveLinks(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900"
                      />
                    </label>

                    {!directId && !directUrl && (
                      <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                        <span>Deep detail mode (<code className="text-indigo-300">deep=true</code>)</span>
                        <input
                          type="checkbox"
                          checked={deep}
                          onChange={(e) => setDeep(e.target.checked)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-slate-900"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleExecuteRequest}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Executing API Call...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Send Live Request
                    </>
                  )}
                </button>
              </div>

              {/* Response Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* Live Request Preview Bar */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden text-xs">
                    <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-600 text-white">
                      GET
                    </span>
                    <span className="font-mono text-slate-300 truncate" title={buildQueryUrl(true)}>
                      {buildQueryUrl(false)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyEndpoint}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors flex-shrink-0"
                    title="Copy full URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Response Viewer */}
                <div className="flex-1 min-h-[380px] flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-medium">Response JSON</span>
                      {responseStatus && (
                        <span className={`px-2 py-0.5 font-mono font-semibold rounded ${
                          responseStatus >= 200 && responseStatus < 300
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {responseStatus} {responseStatus === 200 ? 'OK' : ''}
                        </span>
                      )}
                      {responseTime !== null && (
                        <span className="text-slate-400 font-mono">
                          {responseTime} ms
                        </span>
                      )}
                    </div>

                    {responseData && (
                      <button
                        onClick={handleCopyJson}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded font-medium transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy JSON'}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed">
                    {loading ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p>Querying multi-source catalogs & resolving mirrors...</p>
                      </div>
                    ) : responseData ? (
                      <pre className="text-emerald-300 whitespace-pre font-mono text-xs selection:bg-indigo-900 selection:text-white">
                        {responseData}
                      </pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 text-center">
                        <Terminal className="w-10 h-10 mb-3 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">Ready to test</p>
                        <p className="text-xs max-w-sm mt-1 text-slate-500">
                          Configure your query parameters on the left and click <strong>Send Live Request</strong> to see the response.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE SNIPPETS */}
          {activeTab === 'snippets' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Select Language:</span>
                  <div className="flex gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
                    {(['curl', 'js', 'python', 'node'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSnippetLang(lang)}
                        className={`px-3 py-1 text-xs font-medium rounded-md uppercase transition-all ${
                          snippetLang === lang
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'js' ? 'JavaScript' : lang === 'node' ? 'Node.js' : lang}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCopySnippet}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSnippet ? 'Copied' : 'Copy Snippet'}
                </button>
              </div>

              {/* Snippet Display */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs overflow-x-auto text-slate-200">
                <pre>{getSnippetCode()}</pre>
              </div>

              {/* Ready Use Cases */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Quick Integration Patterns</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
                    <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Multi-Source Search
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Search Hollywood, Bollywood, and Adult 18+ simultaneously with automatic interleaving:
                    </p>
                    <code className="block p-2 bg-slate-950 rounded text-slate-300 font-mono text-[11px] overflow-x-auto">
                      GET /api/unified?q=Deadpool&source=all
                    </code>
                  </div>

                  <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-1.5">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Auto-Resolve Download Links
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Bypass Nexdrive link pages directly into instant FastDL / G-Direct stream mirrors:
                    </p>
                    <code className="block p-2 bg-slate-950 rounded text-slate-300 font-mono text-[11px] overflow-x-auto">
                      GET /api/unified?url=https://nexdrive.beer/genxfm...&resolve=true
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API REFERENCE */}
          {activeTab === 'reference' && (
            <div className="space-y-6 text-sm">
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl text-xs space-y-1 text-indigo-200">
                <div className="font-semibold text-indigo-300 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Universal Endpoint: <code className="text-white bg-indigo-900/60 px-2 py-0.5 rounded">/api/unified</code>
                </div>
                <p>
                  Aliases: <code className="text-slate-300">/api/v1/unified</code>, <code className="text-slate-300">/api/v1/media</code>, <code className="text-slate-300">/api/v1/search</code>.
                  Both <code className="text-indigo-300">GET</code> and <code className="text-indigo-300">POST</code> methods are accepted. CORS is enabled globally (<code className="text-emerald-300">Access-Control-Allow-Origin: *</code>).
                </p>
              </div>

              {/* Parameters Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Default</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/30">
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">q / query</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">string</td>
                      <td className="px-4 py-2.5 text-slate-500">-</td>
                      <td className="px-4 py-2.5 text-slate-300">Search keyword for movie/show title. Leave empty or <code>*</code> to fetch freshest homepage releases.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">source</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">string</td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">all</td>
                      <td className="px-4 py-2.5 text-slate-300">
                        Target catalog: <code>all</code> (queries all 3 databases concurrently), <code>hollywood</code> (Vegamovies), <code>bollywood</code> (Rogmovies), <code>xprimehub</code> (Adult 18+).
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">category</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">string</td>
                      <td className="px-4 py-2.5 text-slate-500">-</td>
                      <td className="px-4 py-2.5 text-slate-300">Genre or platform filter (e.g. <code>Netflix</code>, <code>Action</code>, <code>Horror</code>, <code>Comedy</code>).</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">page</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">number</td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">1</td>
                      <td className="px-4 py-2.5 text-slate-300">Pagination page number.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">limit</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">number</td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">20</td>
                      <td className="px-4 py-2.5 text-slate-300">Items per page (max 50).</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">id</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">string</td>
                      <td className="px-4 py-2.5 text-slate-500">-</td>
                      <td className="px-4 py-2.5 text-slate-300">Specific movie ID or slug to fetch details and all download links directly.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">url</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">string</td>
                      <td className="px-4 py-2.5 text-slate-500">-</td>
                      <td className="px-4 py-2.5 text-slate-300">Directly resolve any Nexdrive link (e.g. <code>https://nexdrive.beer/genxfm...</code>) into grouped episodes and mirrors.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">resolve</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">boolean</td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">false</td>
                      <td className="px-4 py-2.5 text-slate-300">When <code>true</code>, automatically executes deep resolution for Nexdrive links into stream and download mirrors.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">deep</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">boolean</td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">false</td>
                      <td className="px-4 py-2.5 text-slate-300">When <code>true</code>, populates full synopsis, screenshots, and download link arrays in search list results.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* JSON Schema description */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Live JSON Schema (Search Mode)</h4>
                <pre className="text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded-lg overflow-x-auto">
{`{
  "success": true,
  "timestamp": "2026-11-10T12:00:00.000Z",
  "source": "all",
  "total": 142,
  "page": 1,
  "limit": 20,
  "hasMore": true,
  "results": [
    {
      "id": "dead-end-job-2026-season-1-netflix...",
      "title": "Dead-End Job (2026) Season 1 NetFlix",
      "source": "hollywood",
      "thumbnail": "https://img.vegamovies.futbol/...",
      "quality": "480p | 720p | 1080p",
      "isSeries": true,
      "downloadLinks": [
        {
          "name": "Episode 01 - FastDL",
          "url": "https://nexdrive.beer/...",
          "resolved": {
            "isSeries": true,
            "totalEpisodes": 8,
            "episodes": [ ... ]
          }
        }
      ]
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Universal API Status: <strong>Operational</strong></span>
          </div>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Raw JSON Specs <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
