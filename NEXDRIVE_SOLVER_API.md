# 🚀 Nexdrive Link Solver & Direct CDN Extractor

Comprehensive technical documentation on the architecture, reverse-engineering methodology, and API usage for solving **Nexdrive** gateway links into direct, high-speed download mirrors and unthrottled Google Video CDN streams.

---

## 📌 1. Background & Problem Statement

Movie indexing networks (including VegaMovies, RogMovies, and VegaDrive) do not expose final download files directly on their post pages. Instead, they route users through intermediate gateways such as:
```text
https://nexdrive.beer/genxfm784776518071/
https://nexdrive.fit/genxfm...
https://nexdrive.click/genxfm...
```

### Why Sites Use Nexdrive Gateways:
1. **Ad Monetization**: Gateways force users to view ads, popunders, and timers.
2. **DMCA Obfuscation**: Prevents direct crawlers from finding the underlying Google Drive or Cloud storage containers.
3. **Dynamic Mirror Switching**: Allows the site owners to rotate destination mirrors (`FastDL`, `V-Cloud`, `Filepress`) without re-editing thousands of published blog posts.

---

## 🔬 2. How Nexdrive Works Under the Hood

When a request is sent to `https://nexdrive.beer/genxfm{id}/`:

1. **LiteSpeed / WordPress Container**:
   - The server inspects the incoming `User-Agent`.
   - If an automated bot without modern browser headers accesses the page, it may receive a generic landing or shortener challenge.
   - When provided with standard browser headers, it returns a static HTML page containing styled `<button>` elements wrapped inside `<a>` tags.

2. **Extracted Mirror Providers**:
   Inside the HTML, target mirrors appear as outbound anchor tags:
   - **G-Direct / Instant (`fastdl.beer` or `fastdl.*`)**: High-speed mirror backed by Google Cloud storage.
   - **Filepress / G-Drive (`filebee.top` or `filepress.*`)**: Google Drive cloud clone.
   - **V-Cloud / Resumable (`vcloud.lol` or `vcloud.*`)**: CDN file storage.
   - **HubCloud / VegaDrive (`hubcloud.one`, `vegadrive.*`)**: Multi-host cloud resolver.

---

## ⚡ 3. The FastDL Deep Resolution Breakthrough (Direct Google Video CDN)

In standard usage, a user clicking **G-Direct** is sent to:
```text
https://fastdl.beer/embed.php?download=VcDJ2OJi0ltqQhx84nrh9ui3B
```
This page usually displays a 5-second countdown timer and redirects to `dl.php`.

### The Reverse-Engineering Discovery:
Inspecting the HTML of `fastdl.beer/embed.php?download=...` reveals that the direct download link is **already pre-computed and stored in an inline JavaScript variable**:
```html
<script>
  var reurl = "https://fastdl.beer/dl.php?link=https://video-downloads.googleusercontent.com/ADGPM2nr9IU0Uv3VWQQj6OcWKRxMmcT3PJ1lmTUStd-VyQvwg3ReO2h0MKXPR80KhAyQ2AAhkj0qk9xI7zGS8i9WK2wIkT07dVWl9BThXrebDrfadnwevjPLEz6Z5-S1X_RNKad8O07WyhMVXVeu23mIKDQbBZDPvmquL2MxBois92tFbq8rLI9ZDxI0uvaW3b1fcuPrS20TsbmS-gqWTVpobuD6j4uSkF1ke1yWqYh7lxl5PZJUIFt9_-evgOK9mRlt_l-l0c84osiVPthecdzkHllMjWft_A";
</script>
```

When you extract the `https://video-downloads.googleusercontent.com/...` URL and send a `HEAD` or `GET` request:
```http
HTTP/2 200
Content-Type: video/mkv
Content-Length: 245847783 (245 MB)
Content-Disposition: attachment; filename="It.Welcome.To.Derry.S01E01.A.Story.Of.Derry.720p.WEB-DL.English.ESubs.x264.mkv"
Server: UploadServer
```

**Result:** Users get **1-click, ad-free, direct file downloads** streaming straight from Google's high-bandwidth CDN without touching intermediate timer pages!

---

## 🛠️ 4. API Specification

The API is mounted on your application server and supports both `GET` and `POST` methods.

### Endpoint: `/api/nexdrive/solve`

#### Method: `GET`
```text
GET /api/nexdrive/solve?url={encoded_nexdrive_url}&deep={true|false}
```

#### Query Parameters:
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | **Yes** | — | The full Nexdrive or FastDL URL to solve. |
| `deep` | `boolean` | No | `true` | When `true`, automatically resolves `fastdl` mirrors down to the direct `googleusercontent.com` stream. Set to `false` for raw mirror URLs only. |

---

#### Method: `POST`
```text
POST /api/nexdrive/solve
Content-Type: application/json
```

#### Request Body:
```json
{
  "url": "https://nexdrive.beer/genxfm784776518071/",
  "deep": true
}
```

---

### Response Schema (`200 OK`)

```json
{
  "success": true,
  "inputUrl": "https://nexdrive.beer/genxfm784776518071/",
  "title": "A Story of Derry (2026) S01 English 720p x264 | Episodes | [240MB/E] | G-Direct",
  "isSeries": false,
  "totalMirrors": 2,
  "mirrors": [
    {
      "name": "G-Direct [Instant]",
      "server": "G-Direct",
      "url": "https://fastdl.beer/embed.php?download=VcDJ2OJi0ltqQhx84nrh9ui3B",
      "directDownloadUrl": "https://video-downloads.googleusercontent.com/ADGPM2nr9IU0Uv3VWQQj6OcWKRxMmcT3PJ1lmTUStd-VyQvwg3ReO2h0MKXPR80KhAyQ2AAhkj0qk9xI7zGS8i9WK2wIkT07dVWl9BThXrebDrfadnwevjPLEz6Z5-S1X_RNKad8O07WyhMVXVeu23mIKDQbBZDPvmquL2MxBois92tFbq8rLI9ZDxI0uvaW3b1fcuPrS20TsbmS-gqWTVpobuD6j4uSkF1ke1yWqYh7lxl5PZJUIFt9_-evgOK9mRlt_l-l0c84osiVPthecdzkHllMjWft_A"
    },
    {
      "name": "Filepress [G-Drive]",
      "server": "Filepress",
      "url": "https://filebee.top/file/6ae8462ed02558973a0421c9"
    }
  ]
}
```

#### Multi-Episode Series Response:
For TV series pages containing multiple episodes, the API automatically groups mirrors by episode:
```json
{
  "success": true,
  "inputUrl": "https://nexdrive.beer/genxfm...",
  "title": "Dexter: Resurrection Season 2",
  "isSeries": true,
  "totalMirrors": 8,
  "mirrors": [ ... ],
  "episodes": [
    {
      "episodeName": "Episode 01",
      "mirrors": [
        { "name": "G-Direct [Instant]", "server": "G-Direct", "url": "..." },
        { "name": "Filepress", "server": "Filepress", "url": "..." }
      ]
    },
    {
      "episodeName": "Episode 02",
      "mirrors": [ ... ]
    }
  ]
}
```

---

## 💻 5. Integration Code Examples

### 1. cURL
```bash
curl -s "https://your-domain.com/api/nexdrive/solve?url=https://nexdrive.beer/genxfm784776518071/&deep=true"
```

### 2. Python (Requests)
```python
import requests

def solve_nexdrive(nexdrive_url: str):
    api_url = "https://your-domain.com/api/nexdrive/solve"
    payload = {
        "url": nexdrive_url,
        "deep": True
    }
    
    response = requests.post(api_url, json=payload, timeout=15)
    data = response.json()
    
    if data.get("success"):
        print(f"🎬 Title: {data['title']}")
        for mirror in data["mirrors"]:
            print(f"\nServer: {mirror['server']}")
            print(f"Mirror URL: {mirror['url']}")
            if "directDownloadUrl" in mirror:
                print(f"⚡ Direct 1-Click Stream: {mirror['directDownloadUrl']}")
    else:
        print(f"Error: {data.get('error')}")

# Example usage
solve_nexdrive("https://nexdrive.beer/genxfm784776518071/")
```

### 3. Node.js / JavaScript (Fetch)
```javascript
async function resolveNexdrive(nexdriveUrl) {
  const endpoint = `https://your-domain.com/api/nexdrive/solve?url=${encodeURIComponent(nexdriveUrl)}&deep=true`;
  const res = await fetch(endpoint);
  const data = await res.json();

  if (data.success) {
    console.log(`Resolved: ${data.title}`);
    console.log(`Found ${data.totalMirrors} mirrors.`);
    return data.mirrors;
  } else {
    throw new Error(data.error);
  }
}
```

### 4. Telegram Bot (Node.js Telegraf snippet)
```javascript
bot.command('solve', async (ctx) => {
  const url = ctx.message.text.split(' ')[1];
  if (!url) return ctx.reply('Please provide a Nexdrive link. Usage: /solve <url>');

  ctx.reply('⏳ Solving Nexdrive link...');
  try {
    const res = await fetch(`https://your-domain.com/api/nexdrive/solve?url=${encodeURIComponent(url)}&deep=true`);
    const data = await res.json();

    if (!data.success) return ctx.reply(`❌ Failed: ${data.error}`);

    let msg = `🎬 *${data.title}*\n\n`;
    data.mirrors.forEach((m) => {
      msg += `🔹 *${m.server}*: [Open Link](${m.directDownloadUrl || m.url})\n`;
    });

    ctx.replyWithMarkdown(msg);
  } catch (err) {
    ctx.reply('❌ An error occurred while resolving.');
  }
});
```

---

## 🛡️ 6. Reliability & Edge-Case Handling

1. **User-Agent & Referer Headers**:
   Both Nexdrive and FastDL reject requests without standard desktop User-Agents. Our solver sends:
   - `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`
   - `Referer`: `https://nexdrive.beer/` (required by FastDL to return the video embed script).

2. **FlareSolverr Integration Fallback**:
   If Nexdrive ever activates Cloudflare Turnstile or 5-second JS challenges, `axiosGetWithFallback()` in `server/api.ts` automatically routes the request through FlareSolverr (if configured via `FLARESOLVERR_URL`) to pass the challenge transparently.

3. **Concurrency Limiting**:
   To prevent timeouts on multi-episode posts with 30+ mirrors, deep Google CDN resolution is performed on primary `G-Direct` mirrors concurrently with a 6-second timeout ceiling.
