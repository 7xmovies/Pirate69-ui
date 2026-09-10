export const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return `/api/image?url=${encodeURIComponent(url)}`;
  return url;
};
