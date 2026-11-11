import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

/**
 * ============================================================================
 * BULK SCRAPER CONFIGURATION
 * ============================================================================
 * 
 * IMPORTANT: Because VegaMovies uses Cloudflare, standard 'axios' will often get 
 * a 403 Forbidden error. To run this scraper successfully, you should either:
 * 
 * Option A: Run FlareSolverr (https://github.com/FlareSolverr/FlareSolverr) locally 
 *           and route these axios requests through it.
 * Option B: Rewrite the axios parts of this script to use Puppeteer with the 
 *           puppeteer-extra-plugin-stealth plugin.
 * ============================================================================
 */

const args = process.argv.slice(2);
const sourceArg = args[0] || 'vegamovies';

// Listen for the "stop button" (Ctrl+C) in the terminal
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stop signal received! Scraping paused.');
    console.log('✅ Progress up to the last fully completed page has already been saved to history.');
    console.log('You can resume anytime by running the script again.');
    process.exit(0);
});

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'scraper-history.json');

function getHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    return {};
}

function updateHistory(category, page) {
    const history = getHistory();
    // Only update if it's the highest page we've scraped
    if (!history[category] || page > history[category]) {
        history[category] = page;
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    }
}

if (sourceArg === 'history') {
    const history = getHistory();
    console.log("📊 Scraper History (Last scraped pages):");
    if (Object.keys(history).length === 0) {
        console.log("No history found.");
    } else {
        Object.entries(history).forEach(([cat, page]) => {
            console.log(` - ${cat}: Page ${page}`);
        });
    }
    process.exit(0);
}

let CATEGORY = 'hollywood';
let BASE_URL = 'https://new2.vegamovies.futbol';

if (sourceArg === 'rogmovies') {
    CATEGORY = 'bollywood';
    BASE_URL = 'https://new2.rogmovies.click';
} else if (sourceArg === 'xprimehub') {
    CATEGORY = 'xprimehub';
    BASE_URL = 'https://xprimehub.pics';
}

let START_PAGE = parseInt(args[1]);
if (isNaN(START_PAGE)) {
    const history = getHistory();
    START_PAGE = (history[CATEGORY] || 0) + 1;
}
let END_PAGE = parseInt(args[2]);
if (isNaN(END_PAGE)) {
    END_PAGE = START_PAGE + 9; // Default to scraping 10 pages
}
let CONCURRENCY = parseInt(args[3]) || 5;

// How many movies should be in a single chunk file?
const MOVIES_PER_CHUNK = 100;

// Paths
const INDEX_FILE = path.join(DATA_DIR, `${CATEGORY}-index.json`);
const CHUNK_DIR = path.join(DATA_DIR, CATEGORY);

// Ensure directories exist
if (!fs.existsSync(CHUNK_DIR)) fs.mkdirSync(CHUNK_DIR, { recursive: true });

// Helper to delay between requests (avoids rate limits)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate a clean ID from a URL
function generateIdFromUrl(url) {
    const parts = url.split('/').filter(Boolean);
    let slug = parts[parts.length - 1];
    return slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/**
 * Reads the current index file.
 */
function readIndex() {
    if (fs.existsSync(INDEX_FILE)) {
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    }
    return [];
}

/**
 * Saves the index file.
 */
function saveIndex(data) {
    fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2));
}

/**
 * Figures out which chunk file to write to.
 */
function getTargetChunkFile(indexData) {
    let maxChunkId = 1;
    let countInMaxChunk = 0;

    indexData.forEach(item => {
        if (item.chunk > maxChunkId) {
            maxChunkId = item.chunk;
        }
    });

    // Count how many movies are in the current max chunk
    countInMaxChunk = indexData.filter(item => item.chunk === maxChunkId).length;

    // If it's full, move to the next chunk
    if (countInMaxChunk >= MOVIES_PER_CHUNK) {
        maxChunkId++;
    }

    return maxChunkId;
}

/**
 * Saves a single movie to its chunk file.
 */
function saveMovieToChunk(chunkId, id, detailData) {
    const chunkFile = path.join(CHUNK_DIR, `chunk-${chunkId}.json`);
    let chunkData = {};

    if (fs.existsSync(chunkFile)) {
        chunkData = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
    }

    chunkData[id] = detailData;
    fs.writeFileSync(chunkFile, JSON.stringify(chunkData, null, 2));
}

/**
 * Scrape a specific movie page to get download links
 */
async function scrapeMoviePage(url) {
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const downloadLinks = [];

    // Custom selector logic for links
    $('a[href*="vcloud"], a[href*="nexdrive"], a.elementor-button, a.xp-download-btn, a:has(button)').each((i, el) => {
        const linkText = $(el).text().trim() || $(el).find('button').text().trim();
        const linkUrl = $(el).attr('href');
        
        if (linkUrl && linkUrl.includes('http')) {
            downloadLinks.push({
                label: linkText || "Download Link",
                url: linkUrl
            });
        }
    });

    return {
        fullTitle: $('h1').text().trim(),
        downloadLinks: downloadLinks
    };
}

/**
 * Main Crawler Loop
 */
async function runScraper() {
    console.log(`🚀 Starting Turbo Bulk Scraper for ${CATEGORY} (Concurrency: ${CONCURRENCY} workers)`);
    
    let indexData = readIndex();
    const existingIds = new Set(indexData.map(m => m.id));

    for (let page = START_PAGE; page <= END_PAGE; page++) {
        const pageUrl = page === 1 ? BASE_URL : `${BASE_URL}/page/${page}/`;
        console.log(`\n📄 Scraping Page ${page}: ${pageUrl}`);

        try {
            const response = await axios.get(pageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: 20000
            });
            
            const $ = cheerio.load(response.data);
            const movieArticles = $('article, .post-item, .poster-card');

            const moviesOnPage = [];

            movieArticles.each((i, el) => {
                let link = $(el).find('h2 a, h3 a').attr('href') || $(el).find('a').attr('href');
                if (!link) {
                    link = $(el).closest('a').attr('href') || $(el).parent('a').attr('href') || ($(el).is('a') ? $(el).attr('href') : null);
                }
                
                let title = $(el).find('h2 a, h3 a, h2, h3, .post-title, .title').first().text().trim();
                if (!title) title = $(el).find('img').attr('alt')?.trim();
                
                let poster = $(el).find('img').attr('src');
                if (!poster) poster = $(el).find('img').attr('data-src');

                if (title && link) {
                    moviesOnPage.push({ title, link, poster });
                }
            });

            console.log(`Found ${moviesOnPage.length} items on page ${page}.`);

            // Filter out existing movies upfront
            const newMovies = moviesOnPage.filter(movie => {
                const id = generateIdFromUrl(movie.link);
                if (existingIds.has(id)) {
                    console.log(`  [SKIP] Already indexed: ${movie.title}`);
                    return false;
                }
                return true;
            });

            if (newMovies.length === 0) {
                console.log(`  ℹ️ All movies on page ${page} are already indexed.`);
            } else {
                console.log(`⚡ Scraping ${newMovies.length} new movies concurrently (${CONCURRENCY} workers)...`);

                let currentIndex = 0;
                const workerCount = Math.min(CONCURRENCY, newMovies.length);

                const workers = Array.from({ length: workerCount }, async (_, workerId) => {
                    // Stagger worker start by 250ms to prevent instant burst
                    await delay(workerId * 250);

                    while (currentIndex < newMovies.length) {
                        const idx = currentIndex++;
                        const movie = newMovies[idx];
                        const id = generateIdFromUrl(movie.link);

                        try {
                            console.log(`  [RUN] [${idx + 1}/${newMovies.length}] Scraping: ${movie.title}`);
                            
                            // Scrape movie details
                            const details = await scrapeMoviePage(movie.link);
                            
                            // Synchronous critical section for atomic chunk/index write
                            const targetChunk = getTargetChunkFile(indexData);

                            const indexEntry = {
                                id,
                                title: movie.title,
                                poster: movie.poster,
                                chunk: targetChunk
                            };
                            
                            saveMovieToChunk(targetChunk, id, {
                                id,
                                fullTitle: details.fullTitle,
                                cleanTitle: movie.title,
                                poster: movie.poster,
                                sourceUrl: movie.link,
                                downloadLinks: details.downloadLinks
                            });

                            indexData.push(indexEntry);
                            saveIndex(indexData);
                            existingIds.add(id);

                            console.log(`  [DONE] [${idx + 1}/${newMovies.length}] Saved -> chunk-${targetChunk}.json (${details.downloadLinks.length} links)`);
                            
                            // Brief polite pause before next item in worker
                            await delay(400 + Math.floor(Math.random() * 300));
                        } catch (err) {
                            console.error(`  [ERROR] [${idx + 1}/${newMovies.length}] Failed ${movie.title}: ${err.message}`);
                        }
                    }
                });

                await Promise.all(workers);
            }
            
            // Brief pause before next page
            await delay(1000);
            
            // Update history
            updateHistory(CATEGORY, page);
            
        } catch (error) {
            console.error(`❌ Error scraping page ${page}:`, error.message);
            console.log("If this says 403 Forbidden, Cloudflare blocked you! You must use FlareSolverr or Puppeteer Stealth.");
            break;
        }
    }
    
    console.log(`\n✅ Scraping Complete! Total indexed: ${indexData.length}`);
}

runScraper();
