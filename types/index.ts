// Resultado de una ruta calculada por OpenRouteService.
// Incluye duración en segundos y minutos, distancia en km y un resumen legible.
export interface RouteResult {
  durationSeconds: number;
  durationMinutes: number;
  distanceKm: number;
  summary: string;
}

// Representa una película con todos sus datos relevantes.
// El campo runtime está en minutos y genres es opcional (viene del detalle de TMDB).
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

// Género cinematográfico tal como lo devuelve TMDB.
export interface Genre {
  id: number;
  name: string;
}

// Modo de ingreso de la duración del viaje:
// "route" calcula la ruta automáticamente, "manual" permite ingresar los minutos a mano.
export type TripMode = "route" | "manual";

// Estado de una recomendación generada por la app.
// Contiene las películas sugeridas, el tiempo total de reproducción,
// los minutos del viaje y cuántos minutos sobran.
export interface RecommendationResult {
  movies: Movie[];
  totalRuntime: number;
  tripMinutes: number;
  leftoverMinutes: number;
}

// Forma de la respuesta de la API de listado de películas de TMDB.
export interface TMDBMovieListResponse {
  results: TMDBMovieRaw[];
  total_pages: number;
  total_results: number;
}

// Película tal como viene en los resultados de búsqueda/descubrimiento de TMDB.
// No incluye runtime; eso se obtiene del endpoint de detalle.
export interface TMDBMovieRaw {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

// Detalle completo de una película obtenido del endpoint de TMDB para un ID específico.
// Incluye runtime y la lista de géneros con nombre.
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

// Resultado de geocodificación de OpenRouteService.
// Contiene el nombre legible del lugar y sus coordenadas [longitud, latitud].
export interface GeocodingResult {
  label: string;
  coordinates: [number, number]; // [lng, lat]
}
