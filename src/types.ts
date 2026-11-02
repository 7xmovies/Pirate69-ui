export type SourceType = 'hollywood' | 'bollywood' | 'xprimehub' | 'vegamovies' | 'rogmovies' | 'github';

export interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  link: string;
  source?: string;
  category?: string;
  rating?: number;
  quality?: string;
  year?: string;
  mediaType?: string;
  isSeries?: boolean;
  season?: number;
  tmdbId?: number;
  imdbId?: string;
}

export interface GithubRepoInfo {
  repo: string;
  rawUrl: string;
  branch: string;
  counts: {
    hollywood: number;
    bollywood: number;
    xprimehub: number;
    total: number;
  };
  lastSynced?: string;
}

export interface SearchResponse {
  results: MediaItem[];
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
  total?: number;
  error?: string;
}

export interface DownloadLink {
  label: string;
  url: string;
  quality?: string;
  size?: string;
  audio?: string;
  server?: string;
  season?: number | null;
  episode?: number | null;
  isBatch?: boolean;
}

export interface PostDetails {
  id?: string;
  title: string;
  thumbnail: string;
  screenshots: string[];
  genres?: string[];
  description?: string;
  overview?: string;
  rating?: number;
  year?: string;
  quality?: string;
  season?: number;
  isSeries?: boolean;
  tmdbId?: number;
  imdbId?: string;
  mediaType?: string;
  downloadLinks: DownloadLink[];
}

export interface DetailsResponse {
  details?: PostDetails;
  error?: string;
}
