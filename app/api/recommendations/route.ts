import { NextRequest, NextResponse } from "next/server";
import { TMDBMovieRaw, TMDBMovieDetail, Movie, GeocodingResult } from "@/types";

// ─── Geocodificación ──────────────────────────────────────────────────────────

// Convierte un texto de búsqueda en una lista de sugerencias de lugares usando ORS.
async function geocode(text: string, apiKey: string): Promise<GeocodingResult[]> {
  if (text.length < 3) return [];
  const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=5&lang=es&layers=locality`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  return (data.features || []).map(
    (f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
      label: f.properties.label,
      coordinates: f.geometry.coordinates,
    })
  );
}

// ─── Cálculo de ruta ──────────────────────────────────────────────────────────

// Calcula la duración y distancia de una ruta en auto entre dos coordenadas usando ORS.
async function calcRoute(
  originCoords: [number, number],
  destinationCoords: [number, number],
  apiKey: string
): Promise<{ durationMinutes: number; distanceKm: number }> {
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ coordinates: [originCoords, destinationCoords] }),
  });
  if (!res.ok) throw new Error("Route calculation failed");
  const data = await res.json();
  const segment = data.routes?.[0]?.summary;
  if (!segment) throw new Error("No route found");
  return {
    durationMinutes: Math.round(segment.duration / 60),
    distanceKm: Math.round(segment.distance / 100) / 10,
  };
}

// ─── Películas ────────────────────────────────────────────────────────────────

// Obtiene el detalle completo de una lista de IDs de películas desde TMDB.
// Descarta las que tienen runtime inválido o menor a 30 minutos.
async function fetchMovieDetails(ids: number[], apiKey: string): Promise<Movie[]> {
  const details = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=es-AR`
      );
      if (!res.ok) return null;
      const data: TMDBMovieDetail = await res.json();
      if (!data.runtime || data.runtime < 30) return null;
      return {
        id: data.id,
        title: data.title,
        overview: data.overview,
        runtime: data.runtime,
        poster_path: data.poster_path,
        vote_average: data.vote_average,
        release_date: data.release_date,
        genres: data.genres,
      } as Movie;
    })
  );
  return details.filter(Boolean) as Movie[];
}

function avgRating(movies: Movie[]): number {
  return movies.reduce((sum, m) => sum + m.vote_average, 0) / movies.length;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomCombinations<T>(items: T[], size: number, count: number): T[][] {
  const combinations: T[][] = [];
  const used = new Set<string>();
  while (combinations.length < count) {
    const combo = shuffle([...items]).slice(0, size);
    const key = combo.map((item) => (item as { id: number }).id).sort().join("-");
    if (!used.has(key)) {
      used.add(key);
      combinations.push(combo);
    }
    if (used.size >= Math.min(count * 2, items.length ** size)) break;
  }
  return combinations;
}

// Genera combinaciones de películas agrupadas por cantidad, ordenadas por rating promedio.
function findCombinationsBySize(
  movies: Movie[],
  budget: number,
  maxMovies: number
): Record<number, Movie[][]> {
  const candidates = shuffle(
    [...movies].sort((a, b) => b.vote_average - a.vote_average).slice(0, 50)
  );
  const bySize: Record<number, Movie[][]> = {};
  for (let size = 1; size <= maxMovies; size++) {
    const combos = getRandomCombinations(candidates, size, 50);
    const valid = combos
      .filter((combo) => combo.reduce((s, m) => s + m.runtime, 0) <= budget)
      .sort((a, b) => avgRating(b) - avgRating(a))
      .slice(0, 10);
    bySize[size] = valid;
  }
  return bySize;
}

// ─── Géneros ──────────────────────────────────────────────────────────────────

// Obtiene la lista de géneros cinematográficos desde TMDB en español.
async function fetchGenres(apiKey: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=es-AR`
  );
  if (!res.ok) throw new Error("Failed to fetch genres");
  const data = await res.json();
  return data.genres || [];
}

// ─── Endpoint unificado ───────────────────────────────────────────────────────

/**
 * POST /api/recommendations
 *
 * Acepta un body JSON con los siguientes campos:
 *
 * Para obtener géneros (sin otros campos):
 *   { action: "genres" }
 *
 * Para autocompletar una ubicación:
 *   { action: "geocode", text: string }
 *
 * Para calcular ruta y obtener películas en un solo paso:
 *   {
 *     action: "search",
 *     originCoords?: [lng, lat],       // si se quiere calcular ruta
 *     destinationCoords?: [lng, lat],  // si se quiere calcular ruta
 *     manualMinutes?: number,          // alternativa a las coordenadas
 *     genres?: number[],
 *     maxMovies?: number
 *   }
 *
 * Respuesta de "search":
 *   {
 *     durationMinutes: number,
 *     distanceKm?: number,
 *     bySize: Record<number, Movie[][]>,
 *     totalFetched: number
 *   }
 */
export async function POST(request: NextRequest) {
  const tmdbKey = process.env.TMDB_API_KEY;
  const orsKey = process.env.ORS_API_KEY;

  if (!tmdbKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  // ── Acción: géneros ──────────────────────────────────────────────────────────
  if (action === "genres") {
    try {
      const genres = await fetchGenres(tmdbKey);
      return NextResponse.json({ genres });
    } catch {
      return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
    }
  }

  // ── Acción: geocodificación ──────────────────────────────────────────────────
  if (action === "geocode") {
    if (!orsKey) {
      return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
    }
    const text = body.text as string | undefined;
    if (!text || text.length < 3) {
      return NextResponse.json({ results: [] });
    }
    try {
      const results = await geocode(text, orsKey);
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
    }
  }

  // ── Acción: búsqueda de películas (con ruta opcional) ────────────────────────
  if (action === "search") {
    const { originCoords, destinationCoords, manualMinutes, genres, maxMovies } = body as {
      originCoords?: [number, number];
      destinationCoords?: [number, number];
      manualMinutes?: number;
      genres?: number[];
      maxMovies?: number;
    };

    let durationMinutes: number | null = null;
    let distanceKm: number | undefined;

    // Si se pasan coordenadas, se calcula la ruta primero.
    if (originCoords && destinationCoords) {
      if (!orsKey) {
        return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
      }
      try {
        const route = await calcRoute(originCoords, destinationCoords, orsKey);
        durationMinutes = route.durationMinutes;
        distanceKm = route.distanceKm;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Route calculation failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } else if (manualMinutes && manualMinutes >= 30) {
      // Si no hay coordenadas, se usa el tiempo manual.
      durationMinutes = manualMinutes;
    }

    if (!durationMinutes || durationMinutes < 30) {
      return NextResponse.json(
        { error: "Se necesitan coordenadas de ruta o al menos 30 minutos manuales" },
        { status: 400 }
      );
    }

    try {
      const maxM = Math.min(maxMovies ?? 2, 5);
      const genreParam =
        genres && genres.length > 0 ? `&with_genres=${genres.join("|")}` : "";

      // Se descargan las primeras 5 páginas de TMDB en paralelo.
      const pages = await Promise.all(
        [1, 2, 3, 4, 5].map((page) =>
          fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&language=es-AR&sort_by=popularity.desc&vote_count.gte=100${genreParam}&page=${page}`
          ).then((r) => r.json())
        )
      );

      const rawMovies: TMDBMovieRaw[] = pages.flatMap((p) => p.results || []);
      const uniqueIds = [...new Set(rawMovies.map((m) => m.id))].slice(0, 100);
      const movies = await fetchMovieDetails(uniqueIds, tmdbKey);
      const bySize = findCombinationsBySize(movies, durationMinutes, maxM);

      return NextResponse.json({
        durationMinutes,
        ...(distanceKm !== undefined && { distanceKm }),
        bySize,
        totalFetched: movies.length,
      });
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'action debe ser "genres", "geocode" o "search"' },
    { status: 400 }
  );
}