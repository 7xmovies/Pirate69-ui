# Pirate69 v2 🏴‍☠️

![Pirate69](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

Pirate69 is a modern, full-stack media search and metadata aggregation platform built with React, TypeScript, and Express. It connects to partitioned static JSON databases and live sources to retrieve titles, posters, metadata, and direct download links.

---

## ✨ Features

*   **Partitioned Database Architecture**: Seamlessly reads from [`7xmovies/database`](https://github.com/7xmovies/database) using 2-tier indexes and chunk files.
*   **Instant Chunk Loading**: Movie cards resolve direct download links from local database chunks in milliseconds without waiting on upstream scrapers.
*   **Multi-Source Fallback**: Searches local database indexes first and gracefully merges with live upstream feeds.
*   **Built-in API & Fetch Guide Modal**: Interactive sandbox and copyable code snippets for developers and AI agents directly inside the UI.
*   **Watchlist & History**: Local persistence for saved titles and viewing history.
*   **Automated Background Scraper**: CLI tool that scrapes pages, writes to chunks of 100 movies, and automatically syncs with GitHub.

---

## 🤖 Guide for AI Agents & Automated Workflows

If an AI agent needs to query or integrate with Pirate69, use either the HTTP API or query the database repository directly:

### 1. HTTP API Endpoints (Local/Server)
- `GET /api/search?q={query}`: Searches movies across all categories (returns combined database and live results).
- `GET /api/details?url={sourceUrl}`: Resolves full movie details, resolutions, and direct download links.
- `GET /api/scrape/history`: Returns scraper progress and current page counts.
- `POST /api/scrape/auto`: Triggers an automated 10-page scrape cycle that commits and pushes data to GitHub.

### 2. Querying the Database Repository Directly
The static database is hosted at: `https://raw.githubusercontent.com/7xmovies/database/main`
- Search `hollywood-index.json`, `bollywood-index.json`, or `xprimehub-index.json` to find the target movie and its `chunk` number.
- Fetch `{category}/chunk-{chunk}.json` to extract full download links without exceeding LLM context windows.
- For complete schema specs and function calling definitions, refer to the [Database README](https://github.com/7xmovies/database#readme).

---

## 🚀 Tech Stack

*   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion
*   **Backend**: Node.js, Express, Cheerio, Axios
*   **Database**: Git-backed partitioned JSON (`7xmovies/database`)

---

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/7xmovies/Pirate69-v2.git
   cd Pirate69-v2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Server will start on `http://localhost:3000`.

4. **Run the Scraper:**
   ```bash
   # Scrape next 10 pages following history
   node scripts/bulk-scraper.js --auto

   # Scrape specific page ranges
   node scripts/bulk-scraper.js --source vegamovies --start 1 --end 5
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

---

## ⚠️ Disclaimer

This project is created for educational and demonstration purposes only. The application does not host media files on its servers and only indexes publicly available metadata.

## 📄 License

This project is licensed under the MIT License.
