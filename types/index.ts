// Types for route data from OpenRouteService
export interface RouteResult {
  durationSeconds: number;
  durationMinutes: number;
  distanceKm: number;
  summary: string;
}

// Types for TMDB movie
export interface Movie {
  id: number;
  title: string;
  overview: string;
  runtime: number; // in minutes
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
  genres?: Genre[];
}

export interface Genre {
  id: number;
  name: string;
}

// Trip input modes
export type TripMode = "route" | "manual";

// App state for recommendations
export interface RecommendationResult {
  movies: Movie[];
  totalRuntime: number;
  tripMinutes: number;
  leftoverMinutes: number;
}

// TMDB API response shapes
export interface TMDBMovieListResponse {
  results: TMDBMovieRaw[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieRaw {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  overview: string;
  runtime: number;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genres: Genre[];
}

// ORS Geocoding
export interface GeocodingResult {
  label: string;
  coordinates: [number, number]; // [lng, lat]
}
