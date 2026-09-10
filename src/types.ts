export type SourceType = 'hollywood' | 'bollywood' | 'xprimehub' | 'vegamovies' | 'rogmovies' | 'github';

export interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  link: string;
  source?: string;
  category?: string;
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
  error?: string;
}

export interface DownloadLink {
  label: string;
  url: string;
  quality?: string;
  size?: string;
  audio?: string;
  server?: string;
}

export interface PostDetails {
  title: string;
  thumbnail: string;
  screenshots: string[];
  genres?: string[];
  downloadLinks: DownloadLink[];
}

export interface DetailsResponse {
  details?: PostDetails;
  error?: string;
}
