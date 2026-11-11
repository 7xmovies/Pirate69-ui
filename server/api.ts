import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Wrapper for axios.get (Proxy removed)
 */
async function axiosGetWithFallback(url: string, options: any = {}) {
    try {
        const res = await axios.get(url, { ...options, timeout: 5000 });
        return res;
    } catch (err: any) {
        console.error(`Direct request failed (${err?.response?.status || err?.code}): ${url}`);
        
        // Fallback to FlareSolverr
        let flareUrl = process.env.FLARESOLVERR_URL;
        if (flareUrl && options.responseType !== 'arraybuffer') {
            if (!flareUrl.endsWith('/v1')) {
                flareUrl = flareUrl.replace(/\/$/, '') + '/v1';
            }
            console.log(`Attempting to bypass with FlareSolverr at ${flareUrl}...`);
            try {
                const payload = {
                    cmd: 'request.get',
                    url: url,
                    maxTimeout: 60000
                };
                const flareRes = await axios.post(flareUrl, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 65000
                });
                
                if (flareRes.data.status === 'ok' && flareRes.data.solution) {
                    // Mimic standard axios response structure
                    return {
                        data: flareRes.data.solution.response,
                        status: flareRes.data.solution.status,
                        headers: flareRes.data.solution.headers || {}
                    };
                } else {
                    throw new Error('FlareSolverr did not return an OK status');
                }
            } catch (flareErr: any) {
                console.error(`FlareSolverr failed:`, flareErr?.message);
                throw flareErr;
            }
        }
        
        throw err;
    }
}

const router = Router();

// Universal CORS & Preflight handling for all API callers
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

let cachedVegaDomain = '';
let cachedRogDomain = '';
let cachedXprimeDomain = '';
let lastResolveTime = 0;

async function fetchActualDomain(site: string) {
    try {
        const res1 = await axios.get(`https://vglist.fit/?re=${site}`, { maxRedirects: 0, validateStatus: () => true, timeout: 2000 });
        let url = res1.headers.location;
        
        if (!url) {
            const match = res1.data.match(/url=(https?:\/\/[^"]+)/i);
            if (match) url = match[1];
        }

        if (!url) return null;
        
        if (url.includes('vglist')) {
            const res2 = await axios.get(url, { validateStatus: () => true, timeout: 2000 });
            const match = res2.data.match(/url=(https?:\/\/[^"]+)/i);
            if (match) {
                url = match[1];
            } else {
                return null;
            }
        }
        
        if (url.endsWith('/')) url = url.slice(0, -1);

        // Special case for vegamovies which might return a landing page (e.g. 1vegamovies.sbs)
        if (site === 'vegamovies' && !url.includes('new')) {
            const step2Url = `${url}/?re=vg&t=2`;
            const step2Res = await axios.get(step2Url, { maxRedirects: 0, validateStatus: () => true, timeout: 2000 });
            if (step2Res.headers.location) {
                url = step2Res.headers.location;
                if (url.endsWith('/')) url = url.slice(0, -1);
            } else {
                const data = step2Res.data || '';
                const domainMatch = data.match(/https:\/\/(new[0-9]*\.vegamovies\.[a-z]+)/i) || 
                                    data.match(/https:\/\/([a-z0-9-]+\.vegamovies\.[a-z]+)/i);
                if (domainMatch) {
                    url = 'https://' + domainMatch[1];
                }
            }
        }
        
        return url;
    } catch (e: any) {
        console.error(`Failed to resolve ${site}:`, e.message);
        return null;
    }
}

async function resolveDomains() {
  const now = Date.now();
  if (now - lastResolveTime < 1000 * 60 * 60) { // Cache for 1 hour 
     return;
  }
  
  const rog = await fetchActualDomain('rogmovies');
  if (rog) {
      cachedRogDomain = rog;
      console.log('Auto-resolved Rogmovies:', cachedRogDomain);
  }

  const xprime = await fetchActualDomain('xprime');
  if (xprime) {
      cachedXprimeDomain = xprime;
      console.log('Auto-resolved XprimeHub:', cachedXprimeDomain);
  }

  const vega = await fetchActualDomain('vegamovies');
  if (vega) {
      cachedVegaDomain = vega;
      console.log('Auto-resolved Vegamovies:', cachedVegaDomain);
  }
  
  lastResolveTime = now;
}

async function getVegaDomain() {
    await resolveDomains();
    return cachedVegaDomain || process.env.VEGAMOVIES_DOMAIN || 'https://new2.vegamovies.futbol';
}

async function getRogDomain() {
    await resolveDomains();
    return cachedRogDomain || process.env.ROGMOVIES_DOMAIN || 'https://new2.rogmovies.click';
}

async function getXprimeDomain() {
    await resolveDomains();
    return cachedXprimeDomain || process.env.XPRIME_DOMAIN || 'https://xprimehub.pics';
}

import fs from 'fs';
import path from 'path';

// --- GITHUB REPOSITORY DATABASE INTEGRATION ---

let currentGithubRepo = process.env.GITHUB_REPO_URL || 'https://github.com/7xmovies/database';

function parseGithubRepo(input: string): { owner: string; repo: string; branch: string; rawBase: string } {
  let clean = (input || '').trim().replace(/\/+$/, '');
  if (!clean) clean = 'https://github.com/7xmovies/database';

  if (clean.includes('raw.githubusercontent.com')) {
    const parts = clean.replace(/^https?:\/\/raw\.githubusercontent\.com\//, '').split('/');
    const owner = parts[0] || '7xmovies';
    const repo = parts[1] || 'database';
    const branch = parts[2] || 'main';
    return { owner, repo, branch, rawBase: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}` };
  }

  clean = clean.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  const parts = clean.split('/');
  const owner = parts[0] || '7xmovies';
  const repo = parts[1] || 'database';
  const branch = parts[2] || 'main';
  return { owner, repo, branch, rawBase: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}` };
}

function getRawGithubUrl(): string {
  return parseGithubRepo(currentGithubRepo).rawBase;
}

// --- PERSISTENT & MULTI-TIER CACHE LAYER FOR GITHUB ---

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  lastModified?: string;
}

const CACHE_DIR = path.join(process.cwd(), 'data', '.github_cache');
const METADATA_FILE = path.join(CACHE_DIR, '_metadata.json');

// TTL definitions
const HOMEPAGE_TTL_MS = 30 * 60 * 1000;       // 30 minutes for homepage live feeds
const INDEX_TTL_MS = 60 * 60 * 1000;          // 60 minutes for index files
const CHUNK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for historical chunks

const memoryStore: Record<string, CacheEntry<any>> = {};
const inFlightRequests = new Map<string, Promise<any>>();

// Cache hit/miss metrics to monitor and reduce GitHub query load
export const githubCacheStats = {
  memoryHits: 0,
  diskHits: 0,
  networkFetches: 0,
  conditional304s: 0,
  staleFallbacks: 0,
  lastRefreshed: new Date().toISOString()
};

function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Error creating cache dir:', e);
  }
}

function getDiskMetadata(): Record<string, { timestamp: number; etag?: string; lastModified?: string }> {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function updateDiskMetadata(key: string, meta: { timestamp: number; etag?: string; lastModified?: string }) {
  try {
    ensureCacheDir();
    const current = getDiskMetadata();
    current[key] = meta;
    fs.writeFileSync(METADATA_FILE, JSON.stringify(current, null, 2), 'utf8');
  } catch (e) {}
}

function readFromDisk<T>(key: string): { data: T; meta?: { timestamp: number; etag?: string; lastModified?: string } } | null {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const meta = getDiskMetadata()[key];
      return { data, meta };
    }
  } catch (e) {}
  return null;
}

function writeToDisk<T>(key: string, data: T, etag?: string, lastModified?: string) {
  try {
    ensureCacheDir();
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(CACHE_DIR, `${safeKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    updateDiskMetadata(key, { timestamp: Date.now(), etag, lastModified });
  } catch (e) {
    console.error(`Failed to write disk cache for ${key}:`, e);
  }
}

function clearAllGithubCaches() {
  Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const f of files) {
        fs.unlinkSync(path.join(CACHE_DIR, f));
      }
    }
  } catch (e) {}
  githubCacheStats.lastRefreshed = new Date().toISOString();
}

async function fetchGithubFileWithSmartCache<T>(
  cacheKey: string,
  relativePath: string,
  ttlMs: number,
  forceRefresh = false
): Promise<T | null> {
  const now = Date.now();

  // 1. Check in-memory cache
  const inMem = memoryStore[cacheKey];
  if (!forceRefresh && inMem && (now - inMem.timestamp < ttlMs)) {
    githubCacheStats.memoryHits++;
    return inMem.data as T;
  }

  // 2. Check persistent disk cache (preserves cache across server restarts)
  if (!forceRefresh && !inMem) {
    const diskResult = readFromDisk<T>(cacheKey);
    if (diskResult && diskResult.meta && (now - diskResult.meta.timestamp < ttlMs)) {
      githubCacheStats.diskHits++;
      memoryStore[cacheKey] = {
        data: diskResult.data,
        timestamp: diskResult.meta.timestamp,
        etag: diskResult.meta.etag,
        lastModified: diskResult.meta.lastModified
      };
      return diskResult.data;
    }
  }

  // 3. Deduplicate concurrent in-flight requests for the exact same file
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  // 4. Execute fetch with conditional HTTP headers (ETag / If-Modified-Since)
  const fetchPromise = (async () => {
    const rawUrl = `${getRawGithubUrl()}/${relativePath}`;
    const diskEntry = readFromDisk<T>(cacheKey);
    const existingData: T | undefined = inMem ? inMem.data : diskEntry?.data;
    const existingEtag: string | undefined = inMem?.etag || diskEntry?.meta?.etag;
    const existingLastMod: string | undefined = inMem?.lastModified || diskEntry?.meta?.lastModified;

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Pirate69-App'
    };

    if (!forceRefresh && existingData !== undefined) {
      if (existingEtag) headers['If-None-Match'] = existingEtag;
      if (existingLastMod) headers['If-Modified-Since'] = existingLastMod;
    }

    try {
      console.log(`[GitHub Repo] Smart fetch: ${rawUrl}${headers['If-None-Match'] ? ' (conditional ETag)' : ''}`);
      const response = await axios.get(rawUrl, {
        headers,
        timeout: 15000,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304
      });

      // 304 Not Modified -> GitHub says file hasn't changed, reuse cache without downloading body!
      if (response.status === 304 && existingData !== undefined) {
        githubCacheStats.conditional304s++;
        const updatedMeta = {
          timestamp: Date.now(),
          etag: existingEtag,
          lastModified: existingLastMod
        };
        memoryStore[cacheKey] = {
          data: existingData,
          ...updatedMeta
        };
        updateDiskMetadata(cacheKey, updatedMeta);
        return existingData;
      }

      if (response.status === 200 && response.data) {
        githubCacheStats.networkFetches++;
        const newEtag = response.headers.etag as string | undefined;
        const newLastMod = response.headers['last-modified'] as string | undefined;

        memoryStore[cacheKey] = {
          data: response.data,
          timestamp: Date.now(),
          etag: newEtag,
          lastModified: newLastMod
        };

        // Write to persistent disk cache
        writeToDisk(cacheKey, response.data, newEtag, newLastMod);
        return response.data as T;
      }
    } catch (err: any) {
      console.warn(`[GitHub Repo] Fetch failed for ${relativePath}:`, err.message);

      // Fallback to existing stale data if available (e.g. rate limit 429, temporary network hiccup)
      if (existingData !== undefined) {
        githubCacheStats.staleFallbacks++;
        console.warn(`[GitHub Repo] Using existing stale cache for ${cacheKey}`);
        memoryStore[cacheKey] = {
          data: existingData,
          timestamp: Date.now(), // extend to prevent hammering failing GitHub
          etag: existingEtag,
          lastModified: existingLastMod
        };
        return existingData;
      }
    }

    return null;
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

const getCategoryName = (source: string) => {
    const s = (source || '').toLowerCase().trim();
    if (s === 'rogmovies' || s === 'bollywood') return 'bollywood';
    if (s === 'xprimehub' || s === 'xhub' || s === 'adult') return 'xprimehub';
    return 'hollywood';
};

const getHomepageFileName = (categoryName: string) => {
    if (categoryName === 'bollywood') return 'rogmovieshomepage.json';
    if (categoryName === 'xprimehub') return 'xprimehubhomepage.json';
    return 'vegamovieshomepage.json';
};

function getLocalIndex(categoryName: string): any[] | null {
    try {
        const indexFile = path.join(process.cwd(), 'data', `${categoryName}-index.json`);
        if (fs.existsSync(indexFile)) {
            return JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        }
    } catch (e) {
        console.error(`Failed to read local index for ${categoryName}`, e);
    }
    return null;
}

// Fetch live homepage snapshot feeds with smart multi-tier caching
async function getGithubHomepageFeed(categoryName: string, forceRefresh = false): Promise<any[]> {
    const fileName = getHomepageFileName(categoryName);
    const result = await fetchGithubFileWithSmartCache<any[]>(
        `homepage_${categoryName}`,
        fileName,
        HOMEPAGE_TTL_MS,
        forceRefresh
    );
    return Array.isArray(result) ? result : [];
}

// Fetch master search index with smart multi-tier caching
async function getGithubIndex(categoryName: string, forceRefresh = false): Promise<any[]> {
    // 1. Check local file if present
    const local = getLocalIndex(categoryName);
    if (local && local.length > 0) return local;

    const result = await fetchGithubFileWithSmartCache<any[]>(
        `index_${categoryName}`,
        `${categoryName}-index.json`,
        INDEX_TTL_MS,
        forceRefresh
    );
    return Array.isArray(result) ? result : [];
}

// Combine live homepage feed (freshest releases with complete links) and master index
async function getUnifiedCategoryData(categoryName: string, forceRefresh = false): Promise<any[]> {
    const [homepageFeed, masterIndex] = await Promise.all([
        getGithubHomepageFeed(categoryName, forceRefresh),
        getGithubIndex(categoryName, forceRefresh)
    ]);

    const seenIds = new Set<string>();
    const unified: any[] = [];

    // 1. Add homepage feed items first (these are the newest, page 1 releases)
    for (const item of (homepageFeed || [])) {
        if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            unified.push({ ...item, category: categoryName, isHomepageFeatured: true });
        }
    }

    // 2. Add remaining catalog items from master index
    const reversedIndex = Array.isArray(masterIndex) ? [...masterIndex].reverse() : [];
    for (const item of reversedIndex) {
        if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            unified.push({ ...item, category: categoryName });
        }
    }

    return unified;
}

// Aggregate and interleave movies across all 3 sources (Hollywood, Bollywood, and X-PrimeHub)
async function getMultiSourceMovies(sources: string[] = ['hollywood', 'bollywood', 'xprimehub'], forceRefresh = false): Promise<any[]> {
    const sourcePromises = sources.map(async (src) => {
        const data = await getUnifiedCategoryData(src, forceRefresh);
        return data.map(item => ({
            ...item,
            source: src,
            category: item.category || src
        }));
    });

    const sourceArrays = await Promise.all(sourcePromises);
    const maxLen = Math.max(...sourceArrays.map(arr => arr.length));
    const combined: any[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < maxLen; i++) {
        for (const arr of sourceArrays) {
            if (i < arr.length) {
                const item = arr[i];
                if (item && item.id && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    combined.push(item);
                }
            }
        }
    }

    return combined;
}

async function getGithubChunk(categoryName: string, chunkId: number | string, forceRefresh = false): Promise<any> {
    // 1. Check local file if cloned/mounted
    try {
        const localChunkFile = path.join(process.cwd(), 'data', categoryName, `chunk-${chunkId}.json`);
        if (fs.existsSync(localChunkFile)) {
            return JSON.parse(fs.readFileSync(localChunkFile, 'utf8'));
        }
    } catch (e) {}

    // 2. Fetch with persistent disk cache & 7-day TTL
    const result = await fetchGithubFileWithSmartCache<any>(
        `chunk_${categoryName}_${chunkId}`,
        `${categoryName}/chunk-${chunkId}.json`,
        CHUNK_TTL_MS,
        forceRefresh
    );
    return result && typeof result === 'object' ? result : {};
}

function findMovieInLocalChunks(targetUrlOrId: string): any | null {
    try {
        const cleanTarget = targetUrlOrId.replace(/\/+$/, '');
        const slug = cleanTarget.split('/').pop() || cleanTarget;

        const categories = ['hollywood', 'bollywood', 'xprimehub'];
        for (const cat of categories) {
            const index = getLocalIndex(cat);
            if (!index) continue;
            const entry = index.find((m: any) => 
                m.id === slug || 
                (m.sourceUrl && m.sourceUrl.replace(/\/+$/, '') === cleanTarget) ||
                (m.link && m.link.replace(/\/+$/, '') === cleanTarget) ||
                cleanTarget.includes(m.id)
            );

            if (entry && entry.chunk) {
                const chunkFile = path.join(process.cwd(), 'data', cat, `chunk-${entry.chunk}.json`);
                if (fs.existsSync(chunkFile)) {
                    const chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
                    const movie = chunkData[entry.id] || Object.values(chunkData).find((v: any) => v.id === entry.id || (v.sourceUrl && v.sourceUrl.includes(entry.id)));
                    if (movie) return { ...movie, category: cat };
                }
            }
        }
    } catch (err) {
        console.error('Error finding movie in local chunks:', err);
    }
    return null;
}

async function findMovieInDatabase(targetUrlOrId: string): Promise<any | null> {
    try {
        const cleanTarget = targetUrlOrId.replace(/\/+$/, '');
        const slug = cleanTarget.split('/').pop() || cleanTarget;
        const categories = ['hollywood', 'bollywood', 'xprimehub'];

        // 1. Check across all live homepage feeds first (zero network hop for chunk)
        for (const cat of categories) {
            const homepageFeed = await getGithubHomepageFeed(cat);
            if (Array.isArray(homepageFeed)) {
                const match = homepageFeed.find((m: any) => 
                    m.id === slug ||
                    m.id === targetUrlOrId ||
                    (m.sourceUrl && m.sourceUrl.replace(/\/+$/, '') === cleanTarget) ||
                    (m.link && m.link.replace(/\/+$/, '') === cleanTarget) ||
                    cleanTarget.includes(m.id) ||
                    (m.id && cleanTarget.includes(m.id))
                );
                if (match) {
                    console.log(`[Database Details] Found directly in homepage feed (${cat}): ${match.id}`);
                    return { ...match, category: cat };
                }
            }
        }

        // 2. Check local disk chunks if present
        const local = findMovieInLocalChunks(targetUrlOrId);
        if (local) return local;

        // 3. Check Master Index and partitioned chunk files
        for (const cat of categories) {
            const index = await getGithubIndex(cat);
            const entry = index.find((m: any) => 
                m.id === slug || 
                m.id === targetUrlOrId ||
                (m.sourceUrl && m.sourceUrl.replace(/\/+$/, '') === cleanTarget) ||
                (m.link && m.link.replace(/\/+$/, '') === cleanTarget) ||
                cleanTarget.includes(m.id) ||
                (m.id && cleanTarget.includes(m.id))
            );

            if (entry && entry.chunk) {
                const chunkData = await getGithubChunk(cat, entry.chunk);
                const movie = chunkData[entry.id] || 
                              Object.values(chunkData).find((v: any) => 
                                v.id === entry.id || 
                                (v.sourceUrl && v.sourceUrl.replace(/\/+$/, '') === cleanTarget) ||
                                (v.id && cleanTarget.includes(v.id))
                              );
                if (movie) return { ...movie, ...entry, category: cat };
            }
        }
    } catch (err: any) {
        console.error('Error finding movie in database:', err.message);
    }
    return null;
}

// GitHub Repo metadata endpoint
router.get('/github/info', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        const parsed = parseGithubRepo(currentGithubRepo);
        const [h, b, x, vHome, rHome, xHome] = await Promise.all([
            getGithubIndex('hollywood'),
            getGithubIndex('bollywood'),
            getGithubIndex('xprimehub'),
            getGithubHomepageFeed('hollywood'),
            getGithubHomepageFeed('bollywood'),
            getGithubHomepageFeed('xprimehub')
        ]);

        res.json({
            repo: `${parsed.owner}/${parsed.repo}`,
            url: `https://github.com/${parsed.owner}/${parsed.repo}`,
            branch: parsed.branch,
            rawUrl: parsed.rawBase,
            cacheStats: githubCacheStats,
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
                homepage: {
                    vegamovies: vHome.length,
                    rogmovies: rHome.length,
                    xprimehub: xHome.length
                },
                total: h.length + b.length + x.length
            },
            lastSynced: new Date().toISOString()
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to fetch GitHub info' });
    }
});

// GitHub Repo refresh / force sync endpoint
router.post('/github/refresh', async (req, res) => {
    try {
        clearAllGithubCaches();

        const [h, b, x, vHome, rHome, xHome] = await Promise.all([
            getGithubIndex('hollywood', true),
            getGithubIndex('bollywood', true),
            getGithubIndex('xprimehub', true),
            getGithubHomepageFeed('hollywood', true),
            getGithubHomepageFeed('bollywood', true),
            getGithubHomepageFeed('xprimehub', true)
        ]);

        const parsed = parseGithubRepo(currentGithubRepo);
        res.json({
            success: true,
            message: 'Successfully refreshed GitHub repository cache',
            repo: `${parsed.owner}/${parsed.repo}`,
            cacheStats: githubCacheStats,
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
                homepage: {
                    vegamovies: vHome.length,
                    rogmovies: rHome.length,
                    xprimehub: xHome.length
                },
                total: h.length + b.length + x.length
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to refresh GitHub cache' });
    }
});

// GitHub Repo configuration endpoint
router.post('/github/config', async (req, res) => {
    try {
        const { repoUrl } = req.body;
        if (!repoUrl) {
            return res.status(400).json({ error: 'repoUrl is required' });
        }

        currentGithubRepo = repoUrl;
        clearAllGithubCaches();

        const [h, b, x] = await Promise.all([
            getGithubIndex('hollywood', true),
            getGithubIndex('bollywood', true),
            getGithubIndex('xprimehub', true)
        ]);

        const parsed = parseGithubRepo(currentGithubRepo);
        res.json({
            success: true,
            message: `Updated GitHub repo to ${parsed.owner}/${parsed.repo}`,
            repo: `${parsed.owner}/${parsed.repo}`,
            cacheStats: githubCacheStats,
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
                total: h.length + b.length + x.length
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update GitHub configuration' });
    }
});

// Search within GitHub repository JSON
router.get('/json/search', async (req, res) => {
    try {
        const query = (req.query.q as string || '').toLowerCase();
        const source = req.query.source as string || 'vegamovies';
        const categoryName = getCategoryName(source);

        const indexData = await getGithubIndex(categoryName);
        let results = Array.isArray(indexData) ? [...indexData].reverse() : [];

        // Filter the results
        results = results.filter(movie => {
            if (query === '' || query === '*') return true;
            return (movie.title && movie.title.toLowerCase().includes(query)) || 
                   (movie.id && movie.id.toLowerCase().includes(query));
        });

        res.json({ results, total: results.length });
    } catch (error: any) {
        console.error('Error fetching search index:', error);
        res.status(500).json({ error: 'Failed to fetch search index' });
    }
});

router.get('/json/movie/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const source = req.query.source as string || 'vegamovies';
        const categoryName = getCategoryName(source);

        const indexData = await getGithubIndex(categoryName);
        const movieIndexEntry = indexData.find(m => m.id === id);
        
        if (!movieIndexEntry) {
            return res.status(404).json({ error: 'Movie not found in index' });
        }

        const chunkId = movieIndexEntry.chunk || 1;
        const chunkData = await getGithubChunk(categoryName, chunkId);
        const movieData = chunkData[id];

        if (movieData) {
            res.json(movieData);
        } else {
            res.status(404).json({ error: 'Movie details not found in chunk' });
        }
    } catch (error: any) {
        console.error(`Error fetching movie ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

function cleanMovieTitle(title: string): string {
  if (!title) return '';
  return title.replace(/^(?:download\b\s*[:–-]*\s*)+/i, '').trim();
}

// --- MOVIE DATABASE ROUTES (Pure JSON from GitHub) ---

// API route for querying Hollywood, Bollywood, or X-Hub from JSON database
router.get('/search', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const query = (req.query.q as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const source = (req.query.source as string || 'hollywood').toLowerCase().trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    let allMovies: any[] = [];
    let defaultSource = source;
    if (source === 'all') {
      allMovies = await getMultiSourceMovies();
      defaultSource = 'all';
    } else {
      const categoryName = getCategoryName(source);
      defaultSource = categoryName;
      allMovies = await getUnifiedCategoryData(categoryName);
    }

    console.log(`[Database Search] Source: ${source}, Query: "${query}", Filter: "${category}", Page: ${page}`);
    let filtered: any[] = [...allMovies];

    // 2. Filter by search query if provided
    const queryClean = (query === '*' ? '' : query).toLowerCase();
    if (queryClean) {
      filtered = filtered.filter(m => {
        const title = (m.title || m.cleanTitle || m.fullTitle || '').toLowerCase();
        const id = (m.id || '').toLowerCase();
        return title.includes(queryClean) || id.includes(queryClean);
      });
    }

    // 3. Filter by genre/category if specified (e.g. Action, Comedy, etc.)
    const catLower = category.toLowerCase();
    if (catLower && !['all', 'hollywood', 'bollywood', 'xprimehub', 'xhub', 'adult'].includes(catLower)) {
      filtered = filtered.filter(m => {
        if (m.categories && Array.isArray(m.categories)) {
          return m.categories.some((c: string) => c.toLowerCase() === catLower);
        }
        if (m.genres && Array.isArray(m.genres)) {
          return m.genres.some((g: string) => g.toLowerCase() === catLower);
        }
        const title = (m.title || m.cleanTitle || m.fullTitle || '').toLowerCase();
        return title.includes(catLower);
      });
    }

    // 3.5 Randomize results if requested
    const isRandom = req.query.random === 'true';
    if (isRandom && filtered.length > 0) {
      // Fisher-Yates shuffle
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }

    // 4. Pagination
    const pageSize = 24;
    const startIndex = (page - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const hasMore = startIndex + pageSize < filtered.length;

    return res.json({
      results: pageItems.map(m => {
        const itemSource = m.source || m.category || (defaultSource === 'all' ? 'hollywood' : defaultSource);
        return {
          id: m.id,
          title: cleanMovieTitle(m.cleanTitle || m.title || m.fullTitle || m.id),
          thumbnail: m.poster || m.thumbnail || '',
          link: m.sourceUrl || `github://${itemSource}/${m.id}`,
          source: itemSource,
          category: itemSource,
          rating: typeof m.rating === 'number' ? m.rating : undefined,
          quality: m.quality,
          year: m.year ? String(m.year) : undefined,
          mediaType: m.mediaType,
          isSeries: m.isSeries,
          season: m.season,
          tmdbId: m.tmdbId,
          imdbId: m.imdbId
        };
      }),
      page,
      totalPages,
      hasMore,
      total: filtered.length
    });
  } catch (error: any) {
    console.error('Error fetching movies from database:', error.message);
    res.status(500).json({ results: [], page: 1, totalPages: 1, hasMore: false, error: 'Failed to load movie database' });
  }
});

// API route for extracting movie details from JSON database chunks or live feeds
router.get('/details', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const url = (req.query.url as string || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'URL or movie ID is required' });
    }

    console.log(`[Database Details] Looking up movie details for: ${url}`);

    // Lookup movie details across homepage feeds and chunk files
    const cachedMovie = await findMovieInDatabase(url);
    if (cachedMovie) {
      return res.json({
        details: {
          id: cachedMovie.id,
          title: cleanMovieTitle(cachedMovie.cleanTitle || cachedMovie.fullTitle || cachedMovie.title || cachedMovie.id),
          thumbnail: cachedMovie.poster || cachedMovie.thumbnail || '',
          overview: cachedMovie.overview || cachedMovie.description || '',
          description: cachedMovie.overview || cachedMovie.description || '',
          rating: typeof cachedMovie.rating === 'number' ? cachedMovie.rating : undefined,
          year: cachedMovie.year ? String(cachedMovie.year) : undefined,
          quality: cachedMovie.quality,
          season: cachedMovie.season,
          isSeries: cachedMovie.isSeries,
          tmdbId: cachedMovie.tmdbId,
          imdbId: cachedMovie.imdbId,
          mediaType: cachedMovie.mediaType,
          screenshots: cachedMovie.screenshots || [],
          genres: cachedMovie.categories || cachedMovie.genres || [],
          downloadLinks: (cachedMovie.downloadLinks || []).map((dl: any) => ({
            label: dl.label || dl.name || 'Download Now',
            name: dl.label || dl.name || 'Download Now',
            url: dl.url,
            quality: dl.quality,
            size: dl.size,
            audio: dl.audio,
            server: dl.server,
            season: dl.season,
            episode: dl.episode,
            isBatch: dl.isBatch
          }))
        }
      });
    }

    // If not found in any database source
    return res.status(404).json({ error: 'Movie details not found in database.' });
  } catch (error: any) {
    console.error('Database details lookup error:', error.message);
    res.status(500).json({ error: 'Failed to extract movie details.' });
  }
});

const FALLBACK_POSTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#0f172a"/>
  <rect x="12" y="12" width="276" height="426" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <circle cx="150" cy="190" r="32" fill="#334155"/>
  <path d="M120 270L145 240L160 255L180 230L200 270H120Z" fill="#475569"/>
  <text x="150" y="320" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16" font-weight="600">Pirate69</text>
  <text x="150" y="345" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="13">Poster Unavailable</text>
</svg>`;

async function getCandidateImageUrls(originalUrl: string): Promise<string[]> {
  const candidates: string[] = [];

  // Check for base64 encoded direct image in query parameter 'u' (e.g. ?u=aHR0cHM6Ly9pb...)
  try {
    const parsed = new URL(originalUrl);
    const uParam = parsed.searchParams.get('u');
    if (uParam) {
      const decoded = Buffer.from(uParam, 'base64').toString('utf8');
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        candidates.push(decoded);
      }
    }
  } catch (e) {}

  candidates.push(originalUrl);
  try {
    const parsed = new URL(originalUrl);
    const lowerHost = parsed.hostname.toLowerCase();

    if (lowerHost.includes('vegamovies')) {
      const vegaDomain = await getVegaDomain();
      try {
        const vegaParsed = new URL(vegaDomain);
        const activeHost = vegaParsed.hostname;
        const hostParts = activeHost.split('.');
        const activeTld = hostParts[hostParts.length - 1];

        const imgHostActive = `img.vegamovies.${activeTld}`;
        if (lowerHost !== imgHostActive) {
          const u1 = new URL(originalUrl);
          u1.hostname = imgHostActive;
          candidates.push(u1.toString());
        }

        if (lowerHost !== activeHost) {
          const u2 = new URL(originalUrl);
          u2.hostname = activeHost;
          candidates.push(u2.toString());
        }

        const origParts = lowerHost.split('.');
        if (origParts.length >= 2) {
          origParts[origParts.length - 1] = activeTld;
          const newHost = origParts.join('.');
          if (newHost !== lowerHost) {
            const u3 = new URL(originalUrl);
            u3.hostname = newHost;
            candidates.push(u3.toString());
          }
        }
      } catch (e) {}
    } else if (lowerHost.includes('rogmovies')) {
      const rogDomain = await getRogDomain();
      try {
        const rogParsed = new URL(rogDomain);
        if (lowerHost !== rogParsed.hostname) {
          const u1 = new URL(originalUrl);
          u1.hostname = rogParsed.hostname;
          candidates.push(u1.toString());
        }
      } catch (e) {}
    } else if (lowerHost.includes('xprime')) {
      const xprimeDomain = await getXprimeDomain();
      try {
        const xprimeParsed = new URL(xprimeDomain);
        if (lowerHost !== xprimeParsed.hostname) {
          const u1 = new URL(originalUrl);
          u1.hostname = xprimeParsed.hostname;
          candidates.push(u1.toString());
        }
      } catch (e) {}
    }
  } catch (e) {}

  return Array.from(new Set(candidates));
}

// API route for proxying images to bypass hotlinking protections
router.get('/image', async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const vegaDomain = await getVegaDomain();
    const rogDomain = await getRogDomain();
    const xprimeDomain = await getXprimeDomain();

    let referer = vegaDomain.endsWith('/') ? vegaDomain : `${vegaDomain}/`;
    if (url.includes('rogmovies')) {
      referer = rogDomain.endsWith('/') ? rogDomain : `${rogDomain}/`;
    } else if (url.includes('xprime')) {
      referer = xprimeDomain.endsWith('/') ? xprimeDomain : `${xprimeDomain}/`;
    }

    const candidateUrls = await getCandidateImageUrls(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    };

    let response: any = null;
    let fetchError: any = null;

    for (const targetUrl of candidateUrls) {
      try {
        response = await axios.get(targetUrl, {
          responseType: 'stream',
          timeout: 6000,
          headers
        });
        if (response && response.status === 200) {
          break;
        }
      } catch (err: any) {
        fetchError = err;
      }
    }

    if (response && response.status === 200) {
      res.set('Content-Type', response.headers['content-type'] as string || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000');
      return response.data.pipe(res);
    }

    console.warn(`[Image Proxy] Could not load image from candidates for: ${url} (${fetchError?.message || 'Failed'})`);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(FALLBACK_POSTER_SVG);
  } catch (error: any) {
    console.warn('[Image Proxy] Error serving image:', error.message);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(FALLBACK_POSTER_SVG);
  }
});

// --- NEXDRIVE & FASTDL SOLVER ENGINE ---

export async function resolveFastDLDirectUrl(fastdlUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(fastdlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://nexdrive.beer/'
      },
      timeout: 8000
    });
    const match = res.data.match(/https:\/\/video-downloads\.googleusercontent\.com\/[^"'\s&]+/i);
    if (match) {
      return match[0];
    }
  } catch (err: any) {
    console.warn(`[FastDL Resolver] Failed to resolve ${fastdlUrl}:`, err.message);
  }
  return null;
}

export interface NexdriveMirror {
  name: string;
  server: string;
  url: string;
  directDownloadUrl?: string;
  episode?: number;
  episodeName?: string;
}

export interface NexdriveEpisode {
  episodeName: string;
  episodeNumber?: number;
  mirrors: NexdriveMirror[];
}

export interface NexdriveSolveResult {
  success: boolean;
  inputUrl: string;
  title: string;
  isSeries: boolean;
  totalMirrors: number;
  totalEpisodes?: number;
  mirrors: NexdriveMirror[];
  episodes?: NexdriveEpisode[];
  error?: string;
}

function extractEpisodeInfo(text: string): { episodeNumber: number; episodeName: string } | null {
  if (!text) return null;
  const clean = text.replace(/⚡/g, '').trim();

  // S01E02, S1 E02
  const sxxexx = clean.match(/S\d+\s*[E|e](\d+)/i);
  if (sxxexx) {
    const num = parseInt(sxxexx[1], 10);
    return { episodeNumber: num, episodeName: `Episode ${num}` };
  }

  // -:Episodes: 03:- or -:Episodes: 1:- or Episode 03 or Episodes: 1 or Ep. 05
  const ep = clean.match(/(?:Episode|Ep)s?[:\s\.\-_]*0*(\d+)/i);
  if (ep) {
    const num = parseInt(ep[1], 10);
    return { episodeNumber: num, episodeName: `Episode ${num}` };
  }

  // E01 or E1
  const eOnly = clean.match(/(?:^|[^a-zA-Z0-9])E0*(\d+)(?:[^a-zA-Z0-9]|$)/i);
  if (eOnly) {
    const num = parseInt(eOnly[1], 10);
    return { episodeNumber: num, episodeName: `Episode ${num}` };
  }

  return null;
}

export async function solveNexdriveUrl(targetUrl: string, deepResolve: boolean = true): Promise<NexdriveSolveResult> {
  if (!targetUrl || (!targetUrl.includes('nexdrive') && !targetUrl.includes('fastdl'))) {
    throw new Error('Valid Nexdrive or FastDL URL is required');
  }

  // If already a FastDL link directly
  if (targetUrl.includes('fastdl')) {
    const directUrl = await resolveFastDLDirectUrl(targetUrl);
    return {
      success: true,
      inputUrl: targetUrl,
      title: 'FastDL Direct Mirror',
      isSeries: false,
      totalMirrors: 1,
      mirrors: [{
        name: 'G-Direct [Instant]',
        server: 'G-Direct',
        url: targetUrl,
        directDownloadUrl: directUrl || undefined
      }]
    };
  }

  const response = await axiosGetWithFallback(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 10000
  });

  const $ = cheerio.load(response.data);
  const rawTitle = $('h1.entry-title, h1.post-title, title').first().text().trim() || 'Download Links';
  const cleanTitle = rawTitle.replace(/–\s*Nexdrive.*$/i, '').replace(/\s*-\s*Nexdrive.*$/i, '').trim();

  const mirrors: NexdriveMirror[] = [];
  const episodesMap = new Map<string, NexdriveMirror[]>();

  $('a').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().toLowerCase();
    
    const isTarget = href && !href.includes('nexdrive') && (
      href.includes('vcloud') || text.includes('v-cloud') ||
      href.includes('fastdl') || text.includes('g-direct') ||
      href.includes('vegadrive') || text.includes('v-drive') ||
      href.includes('filebee') || text.includes('filepress') ||
      href.includes('hubcloud') || text.includes('hubcloud')
    );

    if (isTarget) {
      let server = 'Mirror';
      if (href.includes('fastdl') || text.includes('g-direct')) server = 'G-Direct';
      else if (href.includes('filebee') || text.includes('filepress')) server = 'Filepress';
      else if (href.includes('vcloud') || text.includes('v-cloud')) server = 'V-Cloud';
      else if (href.includes('vegadrive') || text.includes('v-drive')) server = 'V-Drive';
      else if (href.includes('hubcloud')) server = 'HubCloud';

      let epInfo: { episodeNumber: number; episodeName: string } | null = null;

      // 1. Check anchor text itself
      epInfo = extractEpisodeInfo($(el).text());

      // 2. Walk parent containers and preceding siblings to find episode header (e.g. <h4>-:Episodes: 03:-</h4>)
      if (!epInfo) {
        let curr = $(el).parent();
        let steps = 0;
        while (curr.length > 0 && steps < 8) {
          let prev = curr.prev();
          while (prev.length > 0) {
            const hText = prev.text().trim();
            epInfo = extractEpisodeInfo(hText);
            if (epInfo) break;
            prev = prev.prev();
          }
          if (epInfo) break;
          curr = curr.parent();
          steps++;
        }
      }

      const epName = epInfo ? epInfo.episodeName : '';
      const mirrorName = $(el).text().replace(/⚡/g, '').trim() || server;
      const mirrorObj: NexdriveMirror = {
        name: epName ? `${epName} - ${mirrorName}` : mirrorName,
        server,
        url: href,
        episode: epInfo ? epInfo.episodeNumber : undefined,
        episodeName: epName || undefined
      };

      mirrors.push(mirrorObj);

      if (epName) {
        if (!episodesMap.has(epName)) {
          episodesMap.set(epName, []);
        }
        episodesMap.get(epName)!.push({
          name: mirrorName,
          server,
          url: href,
          episode: epInfo ? epInfo.episodeNumber : undefined,
          episodeName: epName
        });
      }
    }
  });

  // Deep resolve FastDL if requested (up to 3 mirrors to prevent timeouts)
  if (deepResolve) {
    let resolvedCount = 0;
    for (const m of mirrors) {
      if (m.server === 'G-Direct' && m.url.includes('fastdl') && resolvedCount < 3) {
        const direct = await resolveFastDLDirectUrl(m.url);
        if (direct) {
          m.directDownloadUrl = direct;
          resolvedCount++;
        }
      }
    }
  }

  const isSeries = episodesMap.size > 0;
  const episodes: NexdriveEpisode[] = Array.from(episodesMap.entries()).map(([episodeName, epMirrors]) => ({
    episodeName,
    episodeNumber: epMirrors[0]?.episode,
    mirrors: epMirrors
  }));

  return {
    success: true,
    inputUrl: targetUrl,
    title: cleanTitle,
    isSeries,
    totalMirrors: mirrors.length,
    totalEpisodes: isSeries ? episodes.length : undefined,
    mirrors,
    episodes: isSeries ? episodes : undefined
  };
}

// Public API Documentation & Info Endpoint
router.get('/nexdrive', (req, res) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    status: 'online',
    name: 'Pirate69 Nexdrive Solver & Direct Video CDN API',
    version: '1.0.0',
    description: 'Solve and bypass Nexdrive gateway pages to extract G-Direct (FastDL), Filepress, V-Cloud, and direct unthrottled Google Video CDN download streams.',
    cors: 'Enabled (Access-Control-Allow-Origin: *)',
    endpoints: {
      solve_get: `${baseUrl}/api/nexdrive/solve?url={nexdrive_url}&deep=true`,
      solve_post: `${baseUrl}/api/nexdrive/solve`
    },
    sample_url: `${baseUrl}/api/nexdrive/solve?url=https://nexdrive.beer/genxfm784776518071/&deep=true`,
    docs: 'https://github.com/7xmovies/Pirate69-ui/blob/main/NEXDRIVE_SOLVER_API.md'
  });
});

// Dedicated Nexdrive Solver API Endpoint (GET)
// Example: GET /api/nexdrive/solve?url=https://nexdrive.beer/genxfm784776518071/&deep=true
router.get('/nexdrive/solve', async (req, res) => {
  try {
    const url = (req.query.url as string || '').trim();
    const deep = req.query.deep !== 'false';
    if (!url) {
      return res.status(400).json({ success: false, error: 'url parameter is required' });
    }

    const result = await solveNexdriveUrl(url, deep);
    res.json(result);
  } catch (error: any) {
    console.error('Nexdrive solver error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Failed to solve Nexdrive URL' });
  }
});

// Dedicated Nexdrive Solver API Endpoint (POST)
// Example: POST /api/nexdrive/solve with JSON { "url": "https://nexdrive.beer/genxfm...", "deep": true }
router.post('/nexdrive/solve', async (req, res) => {
  try {
    const { url, deep } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url string in request body is required' });
    }

    const result = await solveNexdriveUrl(url.trim(), deep !== false);
    res.json(result);
  } catch (error: any) {
    console.error('Nexdrive solver error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Failed to solve Nexdrive URL' });
  }
});

// API route to resolve Nexdrive links (used by frontend ResolvableLink)
router.get('/resolve-link', async (req, res) => {
  try {
    const url = (req.query.url as string || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('nexdrive') && !url.includes('fastdl')) {
      return res.json({ resolvedUrl: url });
    }

    console.log(`Resolving Nexdrive link: ${url}`);
    const solved = await solveNexdriveUrl(url, true);

    if (solved.mirrors.length === 1) {
      const single = solved.mirrors[0];
      return res.json({ 
        resolvedUrl: single.directDownloadUrl || single.url,
        directDownloadUrl: single.directDownloadUrl,
        mirrors: solved.mirrors 
      });
    } else if (solved.mirrors.length > 1) {
      return res.json({ 
        resolvedUrls: solved.mirrors.map(m => ({ 
          name: m.name, 
          url: m.directDownloadUrl || m.url,
          originalMirrorUrl: m.url,
          directDownloadUrl: m.directDownloadUrl,
          server: m.server,
          episode: m.episode,
          episodeName: m.episodeName
        })),
        isSeries: solved.isSeries,
        totalEpisodes: solved.totalEpisodes,
        episodes: solved.episodes,
        mirrors: solved.mirrors
      });
    } else {
      return res.json({ resolvedUrl: url });
    }
  } catch (error: any) {
    console.error('Link resolver error:', error.message);
    res.status(500).json({ error: 'Failed to resolve link.', originalUrl: req.query.url });
  }
});

// --- UNIFIED API SPECIFICATION & HANDLER ---

function getApiDocumentation(req: any) {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}/api`;

  return {
    name: 'Pirate69 Universal Media API',
    version: '1.0.0',
    description: 'Unified REST API to search, discover, and resolve download links across Hollywood (Vegamovies), Bollywood (Rogmovies), and Adult 18+ (X-PrimeHub) catalogs.',
    cors: 'Enabled (Access-Control-Allow-Origin: *)',
    endpoints: {
      unified: {
        path: '/api/unified',
        aliases: ['/api/v1/unified', '/api/v1/media', '/api/v1/search', '/api/v1'],
        methods: ['GET', 'POST'],
        description: 'Single endpoint to search, list releases, inspect details, and resolve download links across all 3 catalogs simultaneously.',
        parameters: {
          q: {
            type: 'string',
            description: 'Search query keyword (e.g. "Dead-End Job", "Deadpool", "Oppenheimer"). Leave empty or "*" for newest releases.',
            required: false,
            example: 'Dead-End Job'
          },
          source: {
            type: 'string',
            enum: ['all', 'hollywood', 'bollywood', 'xprimehub'],
            default: 'all',
            description: 'Source catalog. Use "all" to query all 3 databases concurrently.',
            required: false
          },
          category: {
            type: 'string',
            description: 'Genre/category filter (e.g. Action, Comedy, Netflix, Sci-Fi, Horror, Drama)',
            required: false,
            example: 'Netflix'
          },
          page: {
            type: 'number',
            default: 1,
            description: 'Page number for pagination',
            required: false
          },
          limit: {
            type: 'number',
            default: 20,
            max: 50,
            description: 'Number of items per page',
            required: false
          },
          id: {
            type: 'string',
            description: 'Lookup specific movie details and download links by ID or slug',
            required: false,
            example: 'dead-end-job-2026-season-1-netflix'
          },
          url: {
            type: 'string',
            description: 'Directly resolve a download/mirror URL (e.g. Nexdrive link) or movie page link',
            required: false,
            example: 'https://nexdrive.beer/genxfm784776517502/'
          },
          resolve: {
            type: 'boolean',
            default: false,
            description: 'When true, automatically parses Nexdrive links into direct episode/server mirrors and Google CDN stream URLs',
            required: false
          },
          deep: {
            type: 'boolean',
            default: false,
            description: 'When true, includes full overview, screenshots, and download links directly in list responses',
            required: false
          }
        },
        exampleRequests: [
          `${baseUrl}/unified?q=Dead-End&source=all`,
          `${baseUrl}/unified?source=hollywood&category=Netflix&page=1&limit=10`,
          `${baseUrl}/unified?url=https://nexdrive.beer/genxfm784776517502/`,
          `${baseUrl}/unified?id=dead-end-job-2026-season-1-netflix&resolve=true`
        ]
      },
      sources: {
        hollywood: 'Vegamovies catalog (Hollywood, Dual Audio, Netflix, Amazon Prime, Disney+)',
        bollywood: 'Rogmovies catalog (Bollywood, South Hindi Dubbed, Indian Web Series)',
        xprimehub: 'X-PrimeHub catalog (Adult 18+ Web Series & Movies)'
      }
    }
  };
}

async function handleUnifiedApi(req: any, res: any) {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
    const q = (params.q || params.query || '').trim();
    const source = (params.source || 'all').toLowerCase().trim();
    const category = (params.category || '').trim();
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 20));
    const id = (params.id || '').trim();
    const url = (params.url || '').trim();
    const resolveLinks = params.resolve === 'true' || params.resolve === true || params.resolve === '1';
    const deep = params.deep === 'true' || params.deep === true || params.deep === '1';

    // 1. If direct URL is provided (e.g. Nexdrive solver or movie link)
    if (url) {
      if (url.includes('nexdrive') || url.includes('fastdl')) {
        const solved = await solveNexdriveUrl(url, resolveLinks);
        return res.json({
          success: true,
          type: 'resolver',
          originalUrl: url,
          isSeries: solved.isSeries,
          totalEpisodes: solved.totalEpisodes,
          episodes: solved.episodes,
          mirrors: solved.mirrors
        });
      }

      // Check if it's a movie page URL
      const movie = await findMovieInDatabase(url);
      if (movie) {
        let downloadLinks = (movie.downloadLinks || []).map((dl: any) => ({
          name: dl.label || dl.name || 'Download Now',
          url: dl.url,
          quality: dl.quality,
          size: dl.size,
          audio: dl.audio,
          server: dl.server,
          season: dl.season,
          episode: dl.episode
        }));

        if (resolveLinks && downloadLinks.length > 0) {
          for (let i = 0; i < Math.min(4, downloadLinks.length); i++) {
            const dl = downloadLinks[i];
            if (dl.url && dl.url.includes('nexdrive')) {
              try {
                const solved = await solveNexdriveUrl(dl.url, false);
                dl.resolved = {
                  isSeries: solved.isSeries,
                  totalEpisodes: solved.totalEpisodes,
                  episodes: solved.episodes,
                  mirrors: solved.mirrors
                };
              } catch (e) {}
            }
          }
        }

        return res.json({
          success: true,
          type: 'movie_details',
          item: {
            id: movie.id,
            title: cleanMovieTitle(movie.cleanTitle || movie.fullTitle || movie.title || movie.id),
            source: movie.category || 'hollywood',
            thumbnail: movie.poster || movie.thumbnail || '',
            overview: movie.overview || movie.description || '',
            rating: typeof movie.rating === 'number' ? movie.rating : undefined,
            year: movie.year ? String(movie.year) : undefined,
            quality: movie.quality,
            isSeries: movie.isSeries,
            season: movie.season,
            genres: movie.categories || movie.genres || [],
            screenshots: movie.screenshots || [],
            downloadLinks
          }
        });
      }
    }

    // 2. If specific ID is requested
    if (id) {
      const movie = await findMovieInDatabase(id);
      if (!movie) {
        return res.status(404).json({ success: false, error: `Movie with id '${id}' not found.` });
      }

      let downloadLinks = (movie.downloadLinks || []).map((dl: any) => ({
        name: dl.label || dl.name || 'Download Now',
        url: dl.url,
        quality: dl.quality,
        size: dl.size,
        audio: dl.audio,
        server: dl.server,
        season: dl.season,
        episode: dl.episode
      }));

      if (resolveLinks && downloadLinks.length > 0) {
        for (let i = 0; i < Math.min(4, downloadLinks.length); i++) {
          const dl = downloadLinks[i];
          if (dl.url && dl.url.includes('nexdrive')) {
            try {
              const solved = await solveNexdriveUrl(dl.url, false);
              dl.resolved = {
                isSeries: solved.isSeries,
                totalEpisodes: solved.totalEpisodes,
                episodes: solved.episodes,
                mirrors: solved.mirrors
              };
            } catch (e) {}
          }
        }
      }

      return res.json({
        success: true,
        type: 'movie_details',
        item: {
          id: movie.id,
          title: cleanMovieTitle(movie.cleanTitle || movie.fullTitle || movie.title || movie.id),
          source: movie.category || 'hollywood',
          thumbnail: movie.poster || movie.thumbnail || '',
          overview: movie.overview || movie.description || '',
          rating: typeof movie.rating === 'number' ? movie.rating : undefined,
          year: movie.year ? String(movie.year) : undefined,
          quality: movie.quality,
          isSeries: movie.isSeries,
          season: movie.season,
          genres: movie.categories || movie.genres || [],
          screenshots: movie.screenshots || [],
          downloadLinks
        }
      });
    }

    // 3. Search / Query across catalogs
    let allMovies: any[] = [];
    if (source === 'all') {
      allMovies = await getMultiSourceMovies(['hollywood', 'bollywood', 'xprimehub']);
    } else {
      const catName = getCategoryName(source);
      allMovies = await getUnifiedCategoryData(catName);
    }

    let filtered = [...allMovies];

    // Filter by query if provided
    const queryClean = (q === '*' ? '' : q).toLowerCase();
    if (queryClean) {
      filtered = filtered.filter(m => {
        const title = (m.title || m.cleanTitle || m.fullTitle || '').toLowerCase();
        const mid = (m.id || '').toLowerCase();
        return title.includes(queryClean) || mid.includes(queryClean);
      });
    }

    // Filter by category if provided
    const catLower = category.toLowerCase();
    if (catLower && !['all', 'hollywood', 'bollywood', 'xprimehub', 'xhub', 'adult'].includes(catLower)) {
      filtered = filtered.filter(m => {
        if (m.categories && Array.isArray(m.categories)) {
          return m.categories.some((c: string) => c.toLowerCase() === catLower);
        }
        if (m.genres && Array.isArray(m.genres)) {
          return m.genres.some((g: string) => g.toLowerCase() === catLower);
        }
        const title = (m.title || m.cleanTitle || m.fullTitle || '').toLowerCase();
        return title.includes(catLower);
      });
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const pageItems = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const hasMore = startIndex + limit < total;

    // Map output items
    const results = await Promise.all(
      pageItems.map(async (m, index) => {
        const itemSource = m.source || m.category || (source === 'all' ? 'hollywood' : source);
        let detailedData: any = null;

        if (deep || (resolveLinks && index < 3)) {
          detailedData = await findMovieInDatabase(m.id);
        }

        let downloadLinks = (detailedData?.downloadLinks || m.downloadLinks || []).map((dl: any) => ({
          name: dl.label || dl.name || 'Download Now',
          url: dl.url,
          quality: dl.quality,
          size: dl.size,
          audio: dl.audio,
          server: dl.server
        }));

        if (resolveLinks && index < 3 && downloadLinks.length > 0) {
          for (let i = 0; i < Math.min(2, downloadLinks.length); i++) {
            const dl = downloadLinks[i];
            if (dl.url && dl.url.includes('nexdrive')) {
              try {
                const solved = await solveNexdriveUrl(dl.url, false);
                dl.resolved = {
                  isSeries: solved.isSeries,
                  totalEpisodes: solved.totalEpisodes,
                  episodes: solved.episodes,
                  mirrors: solved.mirrors
                };
              } catch (e) {}
            }
          }
        }

        return {
          id: m.id,
          title: cleanMovieTitle(m.cleanTitle || m.title || m.fullTitle || m.id),
          source: itemSource,
          category: itemSource,
          thumbnail: m.poster || m.thumbnail || '',
          rating: typeof m.rating === 'number' ? m.rating : undefined,
          quality: m.quality,
          year: m.year ? String(m.year) : undefined,
          isSeries: m.isSeries,
          season: m.season,
          genres: detailedData?.genres || detailedData?.categories || m.categories || m.genres || [],
          overview: deep ? (detailedData?.overview || detailedData?.description || m.overview || '') : undefined,
          screenshots: deep ? (detailedData?.screenshots || m.screenshots || []) : undefined,
          downloadLinks: (deep || resolveLinks) ? downloadLinks : undefined,
          sourceUrl: m.sourceUrl || undefined
        };
      })
    );

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      source,
      query: q || undefined,
      category: category || undefined,
      page,
      limit,
      totalPages,
      total,
      hasMore,
      results
    });
  } catch (err: any) {
    console.error('Unified API error:', err);
    res.status(500).json({ success: false, error: err.message || 'Unified API internal error' });
  }
}

// Unified API Routes
router.all('/unified', handleUnifiedApi);
router.all('/v1/unified', handleUnifiedApi);
router.all('/v1/media', handleUnifiedApi);
router.all('/v1/search', handleUnifiedApi);
router.all('/v1', handleUnifiedApi);
router.get('/', (req, res) => res.json(getApiDocumentation(req)));
router.get('/docs', (req, res) => res.json(getApiDocumentation(req)));

// Dynamic Sitemap Generation
router.get('/sitemap.xml', async (req, res) => {
    try {
        const [hollywood, bollywood, xprimehub] = await Promise.all([
            getGithubIndex('hollywood'),
            getGithubIndex('bollywood'),
            getGithubIndex('xprimehub')
        ]);

        const baseUrl = req.protocol + '://' + req.get('host');
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Add static routes
        xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

        // Add dynamic routes for movies
        // We will limit to the first 500 from each to keep generation fast, or include all if they aren't huge.
        // But Netlify functions might timeout if we return 20,000 URLs. Let's just output them.
        const addEntries = (entries: any[], source: string) => {
            if (!Array.isArray(entries)) return;
            // Get newest 1000 items per category to keep sitemap manageable
            const recent = entries.slice(0, 1000);
            for (const item of recent) {
                if (!item.id) continue;
                xml += `  <url>\n`;
                xml += `    <loc>${baseUrl}/movie/${source}/${encodeURIComponent(item.id)}</loc>\n`;
                xml += `    <changefreq>weekly</changefreq>\n`;
                xml += `    <priority>0.8</priority>\n`;
                xml += `  </url>\n`;
            }
        };

        addEntries(hollywood, 'hollywood');
        addEntries(bollywood, 'bollywood');
        addEntries(xprimehub, 'xprimehub');

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap generation failed:', error);
        res.status(500).send('Error generating sitemap');
    }
});

export default router;
