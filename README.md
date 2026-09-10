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
   git clone https://github.com/7xmovies/Pirate69-ui.git
   cd Pirate69-ui
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

## 🌍 Where to Deploy for Free

Because this project consists of a Vite React frontend and an Express/Node.js backend, you need a platform that supports full-stack web applications. Here are the best free options:

### 1. Vercel (Recommended)
This repository is **already pre-configured** for Vercel (it contains `vercel.json` and an `api/` directory for serverless functions).
- **Cost**: Free (Hobby Tier).
- **How**: 
  1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
  2. Click "Add New Project" and select your `Pirate69-ui` repository.
  3. Leave the framework preset as Vite. Vercel will automatically build the frontend and deploy the `api/` folder as serverless functions.
  4. Click **Deploy**.

### 2. Render.com
Render is a great alternative that runs the app exactly as it runs on your local machine using the `npm start` command.
- **Cost**: Free (Web Service Tier).
- **How**:
  1. Go to [Render.com](https://render.com) and create an account.
  2. Click "New +" and select **Web Service**.
  3. Connect your GitHub account and select this repository.
  4. Build Command: `npm install && npm run build`
  5. Start Command: `npm start`
  6. Click **Create Web Service**. (Note: Free instances spin down after 15 minutes of inactivity and take ~50 seconds to wake up).


### 4. Netlify
This repository is also **pre-configured** for Netlify (via `netlify.toml` and the `netlify/functions/` directory).
- **Cost**: Free (Starter Tier).
- **How**:
  1. Go to [Netlify.com](https://netlify.com) and sign in.
  2. Click **"Add new site"** -> **"Import an existing project"**.
  3. Select your `Pirate69-ui` repository from GitHub.
  4. Netlify will automatically detect the settings from `netlify.toml` (Build command: `npm run build`, Publish directory: `dist`).
  5. Click **Deploy Site**.

### 3. Koyeb
Koyeb offers a generous free tier for running Docker containers and Node.js applications.
- **Cost**: Free (Eco Tier).
- **How**: Similar to Render, connect your GitHub, set the build and start commands, and deploy. Koyeb's free tier has the advantage of not sleeping (unlike Render).

---

## ⚠️ Disclaimer

This project is created for educational and demonstration purposes only. The application does not host media files on its servers and only indexes publicly available metadata.

## 📄 License

This project is licensed under the MIT License.
