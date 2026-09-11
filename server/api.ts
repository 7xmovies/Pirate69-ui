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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const indexCache: Record<string, CacheEntry<any[]>> = {};
const chunkCache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory cache

const getCategoryName = (source: string) => {
    if (source === 'rogmovies' || source === 'bollywood') return 'bollywood';
    if (source === 'xprimehub') return 'xprimehub';
    return 'hollywood';
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

async function getGithubIndex(categoryName: string, forceRefresh = false): Promise<any[]> {
    // 1. Check local file if present
    const local = getLocalIndex(categoryName);
    if (local && local.length > 0) return local;

    // 2. Check memory cache
    const cached = indexCache[categoryName];
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    // 3. Fetch from remote raw GitHub URL
    try {
        const rawUrl = `${getRawGithubUrl()}/${categoryName}-index.json`;
        console.log(`[GitHub Repo] Fetching index from: ${rawUrl}`);
        const response = await axios.get(rawUrl, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Pirate69-App'
            },
            timeout: 12000
        });

        if (Array.isArray(response.data)) {
            indexCache[categoryName] = { data: response.data, timestamp: Date.now() };
            return response.data;
        }
    } catch (err: any) {
        console.warn(`[GitHub Repo] Could not fetch ${categoryName}-index.json:`, err.message);
    }
    return [];
}

async function getGithubChunk(categoryName: string, chunkId: number | string, forceRefresh = false): Promise<any> {
    const cacheKey = `${categoryName}-${chunkId}`;

    // 1. Check local file
    try {
        const localChunkFile = path.join(process.cwd(), 'data', categoryName, `chunk-${chunkId}.json`);
        if (fs.existsSync(localChunkFile)) {
            return JSON.parse(fs.readFileSync(localChunkFile, 'utf8'));
        }
    } catch (e) {}

    // 2. Check memory cache
    const cached = chunkCache[cacheKey];
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    // 3. Fetch from remote raw GitHub URL
    try {
        const rawUrl = `${getRawGithubUrl()}/${categoryName}/chunk-${chunkId}.json`;
        console.log(`[GitHub Repo] Fetching chunk from: ${rawUrl}`);
        const response = await axios.get(rawUrl, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'User-Agent': 'Pirate69-App'
            },
            timeout: 12000
        });

        if (response.data && typeof response.data === 'object') {
            chunkCache[cacheKey] = { data: response.data, timestamp: Date.now() };
            return response.data;
        }
    } catch (err: any) {
        console.warn(`[GitHub Repo] Could not fetch chunk ${categoryName}/${chunkId}:`, err.message);
    }
    return {};
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

async function findMovieInGithubChunks(targetUrlOrId: string): Promise<any | null> {
    try {
        const cleanTarget = targetUrlOrId.replace(/\/+$/, '');
        const slug = cleanTarget.split('/').pop() || cleanTarget;

        // Check local disk first
        const local = findMovieInLocalChunks(targetUrlOrId);
        if (local) return local;

        const categories = ['hollywood', 'bollywood', 'xprimehub'];
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
                if (movie) return { ...movie, category: cat };
            }
        }
    } catch (err: any) {
        console.error('Error finding movie in GitHub chunks:', err.message);
    }
    return null;
}

// GitHub Repo metadata endpoint
router.get('/github/info', async (req, res) => {
    try {
        const parsed = parseGithubRepo(currentGithubRepo);
        const [h, b, x] = await Promise.all([
            getGithubIndex('hollywood'),
            getGithubIndex('bollywood'),
            getGithubIndex('xprimehub')
        ]);

        res.json({
            repo: `${parsed.owner}/${parsed.repo}`,
            url: `https://github.com/${parsed.owner}/${parsed.repo}`,
            branch: parsed.branch,
            rawUrl: parsed.rawBase,
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
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
        Object.keys(indexCache).forEach(k => delete indexCache[k]);
        Object.keys(chunkCache).forEach(k => delete chunkCache[k]);

        const [h, b, x] = await Promise.all([
            getGithubIndex('hollywood', true),
            getGithubIndex('bollywood', true),
            getGithubIndex('xprimehub', true)
        ]);

        const parsed = parseGithubRepo(currentGithubRepo);
        res.json({
            success: true,
            message: 'Successfully refreshed GitHub repository cache',
            repo: `${parsed.owner}/${parsed.repo}`,
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
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
        Object.keys(indexCache).forEach(k => delete indexCache[k]);
        Object.keys(chunkCache).forEach(k => delete chunkCache[k]);

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
            counts: {
                hollywood: h.length,
                bollywood: b.length,
                xprimehub: x.length,
                total: h.length + b.length + x.length
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update GitHub config' });
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

// --- MOVIE DATABASE ROUTES (Pure JSON from GitHub) ---

// API route for querying Hollywood, Bollywood, or X-Hub from JSON database
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const source = (req.query.source as string || 'hollywood').toLowerCase().trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const categoryName = getCategoryName(source);

    console.log(`[Database Search] Category: ${categoryName}, Query: "${query}", Filter: "${category}", Page: ${page}`);

    // 1. Fetch index data for the selected category (hollywood-index.json, bollywood-index.json, or xprimehub-index.json)
    const indexData = await getGithubIndex(categoryName);
    // Reverse the array so the newest items (added to the end of the JSON) appear first
    let filtered: any[] = Array.isArray(indexData) ? [...indexData].reverse() : [];

    // 2. Filter by search query if provided
    const queryClean = (query === '*' ? '' : query).toLowerCase();
    if (queryClean) {
      filtered = filtered.filter(m => {
        const title = (m.title || m.cleanTitle || '').toLowerCase();
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
        const title = (m.title || m.cleanTitle || '').toLowerCase();
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
      results: pageItems.map(m => ({
        id: m.id,
        title: m.title || m.cleanTitle || m.id,
        thumbnail: m.poster || m.thumbnail || '',
        link: m.sourceUrl || `github://${categoryName}/${m.id}`,
        source: categoryName,
        category: categoryName
      })),
      page,
      totalPages,
      hasMore,
      total: filtered.length
    });
  } catch (error: any) {
    console.error('Error fetching movies from database index:', error.message);
    res.status(500).json({ results: [], page: 1, totalPages: 1, hasMore: false, error: 'Failed to load movie database' });
  }
});

// API route for extracting movie details from JSON database chunks
router.get('/details', async (req, res) => {
  try {
    const url = (req.query.url as string || '').trim();
    if (!url) {
      return res.status(400).json({ error: 'URL or movie ID is required' });
    }

    console.log(`[Database Details] Looking up movie details for: ${url}`);

    // Lookup movie details directly in GitHub chunk files
    const cachedMovie = await findMovieInGithubChunks(url);
    if (cachedMovie) {
      return res.json({
        details: {
          title: cachedMovie.fullTitle || cachedMovie.cleanTitle || cachedMovie.title || cachedMovie.id,
          thumbnail: cachedMovie.poster || cachedMovie.thumbnail || '',
          screenshots: cachedMovie.screenshots || [],
          genres: cachedMovie.categories || [],
          downloadLinks: (cachedMovie.downloadLinks || []).map((dl: any) => ({
            label: dl.label || dl.name || 'Download Now',
            name: dl.label || dl.name || 'Download Now',
            url: dl.url,
            quality: dl.quality,
            size: dl.size,
            audio: dl.audio,
            server: dl.server
          }))
        }
      });
    }

    // If not found in any chunk
    return res.status(404).json({ error: 'Movie details not found in database chunks.' });
  } catch (error: any) {
    console.error('Database details lookup error:', error.message);
    res.status(500).json({ error: 'Failed to extract movie details.' });
  }
});

// API route for proxying images to bypass hotlinking protections
router.get('/image', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).send('URL is required');
    }

    const vegaDomain = await getVegaDomain();
    const rogDomain = await getRogDomain();
    const xprimeDomain = await getXprimeDomain();
    
    let referer = vegaDomain.endsWith('/') ? vegaDomain : `${vegaDomain}/`;
    if (url.includes('rogmovies')) {
      referer = rogDomain.endsWith('/') ? rogDomain : `${rogDomain}/`;
    } else if (url.includes('xprime')) {
      referer = xprimeDomain.endsWith('/') ? xprimeDomain : `${xprimeDomain}/`;
    }

    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    res.set('Content-Type', response.headers['content-type'] as string);
    res.set('Cache-Control', 'public, max-age=31536000');
    response.data.pipe(res);
  } catch (error: any) {
    console.error('Image proxy error:', error.message);
    res.status(404).send('Image not found');
  }
});

// API route to resolve Nexdrive links
router.get('/resolve-link', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('nexdrive')) {
      return res.json({ resolvedUrl: url }); // Return original if not nexdrive
    }

    console.log(`Resolving Nexdrive link: ${url}`);
    const response = await axiosGetWithFallback(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const $ = cheerio.load(response.data);
    let resolvedUrl = url; // Default to original if we can't find a better one
    
    // Find all valid target links (V-Cloud, G-Direct, V-Drive, Filepress)
    const validLinks: { name: string, url: string }[] = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().toLowerCase();
      
      const isTarget = href && !href.includes('nexdrive') && (
        href.includes('vcloud') || text.includes('v-cloud') ||
        href.includes('fastdl') || text.includes('g-direct') ||
        href.includes('vegadrive') || text.includes('v-drive') ||
        href.includes('filebee') || text.includes('filepress')
      );

      if (isTarget) {
        
        let epName = $(el).text().trim() || 'Link';
        let prev = $(el).parent().prev();
        while(prev.length > 0) {
            const hText = prev.text().trim();
            if (hText.includes('Episode') || hText.includes('Ep')) {
                epName = `${hText} - ${epName}`;
                break;
            }
            prev = prev.prev();
        }
        
        // Clean up the name for single movie mirrors
        epName = epName.replace(/⚡/g, '').trim();
        
        validLinks.push({ name: epName, url: href });
      }
    });

    if (validLinks.length === 1) {
      resolvedUrl = validLinks[0].url;
      res.json({ resolvedUrl });
    } else if (validLinks.length > 1) {
       res.json({ resolvedUrls: validLinks }); 
    } else {
       res.json({ resolvedUrl });
    }
  } catch (error: any) {
    console.error('Link resolver error:', error.message);
    res.status(500).json({ error: 'Failed to resolve link.', originalUrl: req.query.url });
  }
});

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
