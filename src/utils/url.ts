export const getProxyUrl = (url: string) => {
  if (!url) return '';
  // TMDB images are open, hotlink-friendly, and served via global CDN
  if (url.startsWith('https://image.tmdb.org') || url.startsWith('http://image.tmdb.org')) return url;
  if (url.startsWith('http')) return `/api/image?url=${encodeURIComponent(url)}`;
  return url;
};

export const cleanDisplayTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/^(?:download\b\s*[:–-]*\s*)+/i, '').trim();
};
