import { NextRequest, NextResponse } from "next/server";
import { TMDBMovieRaw, TMDBMovieDetail, Movie, Genre } from "@/types";

// ─── Configuración de APIs externas ───────────────────────────────────────────

const ORS_API_KEY = process.env.ORS_API_KEY || "";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface RouteInfo {
  durationMinutes: number;
  distanceKm: number;
  originLabel: string;
  destinationLabel: string;
}

interface RecommendResponse {
  route: RouteInfo;
  bySize: Record<number, Movie[][]>;
  totalMoviesFetched: number;
}

// ─── ORS: Geocodificación de texto a coordenadas ───────────────────────────────

async function geocodeCity(text: string): Promise<{ label: string; coordinates: [number, number] }> {
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(text)}&size=1&layers=locality&lang=es`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo buscar la ciudad "${text}". Verificá que esté bien escrita.`);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error(`No encontramos ninguna ciudad llamada "${text}". Probá con un nombre más específico o en otro idioma.`);
  return {
    label: feature.properties.label,
    coordinates: feature.geometry.coordinates,
  };
}

// ─── ORS: Cálculo de ruta entre dos coordenadas ────────────────────────────────

async function calculateRoute(
  originCoords: [number, number],
  destinationCoords: [number, number],
  originLabel: string,
  destinationLabel: string,
): Promise<{ durationMinutes: number; distanceKm: number }> {
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: ORS_API_KEY },
    body: JSON.stringify({ coordinates: [originCoords, destinationCoords] }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const code = errBody?.error?.code;

    // Códigos de error documentados de ORS
    const orsErrors: Record<number, string> = {
      2009: `No existe una ruta en auto entre "${originLabel}" y "${destinationLabel}". Puede que estén en continentes distintos o separadas por agua sin conexión vial.`,
      2010: `Las coordenadas de "${originLabel}" o "${destinationLabel}" no tienen acceso a una ruta en auto cercana.`,
      2099: `No se pudo calcular la ruta entre "${originLabel}" y "${destinationLabel}".`,
      2004: "El viaje es demasiado largo para calcularlo.",
    };

    throw new Error(
      orsErrors[code] ??
      `No se pudo calcular la ruta entre "${originLabel}" y "${destinationLabel}" (código ${code ?? res.status}).`
    );
  }

  const data = await res.json();
  const summary = data.routes?.[0]?.summary;
  if (!summary) throw new Error(`ORS no devolvió una ruta válida entre "${originLabel}" y "${destinationLabel}".`);

  return {
    durationMinutes: Math.round(summary.duration / 60),
    distanceKm: Math.round(summary.distance / 100) / 10,
  };
}

// ─── TMDB: Detalle de películas por ID ────────────────────────────────────────

async function fetchMovieDetails(ids: number[]): Promise<Movie[]> {
  const details = await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=es-AR`
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

// ─── TMDB: Búsqueda de películas por géneros (OR) ─────────────────────────────

async function fetchMoviePool(genreIds: string): Promise<Movie[]> {
  const pages = [1, 2, 3, 4];
  const genreParam = genreIds ? `&with_genres=${genreIds.replace(/,/g, "|")}` : "";

  const fetchedPages = await Promise.all(
    pages.map((page) =>
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=es-AR&sort_by=vote_average.desc&vote_count.gte=200${genreParam}&page=${page}`
      ).then((r) => r.json())
    )
  );

  const rawMovies: TMDBMovieRaw[] = fetchedPages.flatMap((p) => p.results || []);
  const uniqueIds = [...new Set(rawMovies.map((m) => m.id))].slice(0, 80);
  return fetchMovieDetails(uniqueIds);
}

// ─── Algoritmo: combinaciones de exactamente `size` películas dentro del presupuesto ──

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findCombosOfSize(movies: Movie[], budget: number, size: number): Movie[][] {
  const top = [...movies].sort((a, b) => b.vote_average - a.vote_average).slice(0, 50);
  const allResults: Movie[][] = [];
  const seen = new Set<string>();

  // Hacemos varias pasadas con el pool shuffleado para forzar variedad
  const PASSES = 6;
  const LIMIT_PER_PASS = 5;

  for (let pass = 0; pass < PASSES; pass++) {
    // En la primera pasada usamos el orden por rating, el resto aleatorio
    const pool = pass === 0 ? top : shuffle(top);

    function backtrack(start: number, current: Movie[], remainingTime: number, passResults: Movie[][]) {
      if (current.length === size) {
        const key = [...current].map((m) => m.id).sort().join(",");
        if (!seen.has(key)) {
          seen.add(key);
          passResults.push([...current]);
        }
        return;
      }
      if (passResults.length >= LIMIT_PER_PASS) return;
      const needed = size - current.length;
      for (let i = start; i <= pool.length - needed; i++) {
        if (pool[i].runtime <= remainingTime) {
          current.push(pool[i]);
          backtrack(i + 1, current, remainingTime - pool[i].runtime, passResults);
          current.pop();
        }
        if (passResults.length >= LIMIT_PER_PASS) return;
      }
    }

    const passResults: Movie[][] = [];
    backtrack(0, [], budget, passResults);
    allResults.push(...passResults);
  }

  // En lugar de ordenar por rating, reordenar priorizando variedad:
  // se elige greedy el combo que tenga menos películas ya vistas
  const ordered: Movie[][] = [];
  const movieAppearances = new Map<number, number>();

  const remaining = [...allResults];

  while (remaining.length > 0) {
    // Buscar el combo cuyos IDs tienen menor cantidad de apariciones acumuladas
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const score = remaining[i].reduce((s, m) => s + (movieAppearances.get(m.id) ?? 0), 0);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    chosen.forEach((m) => movieAppearances.set(m.id, (movieAppearances.get(m.id) ?? 0) + 1));
  }

  return ordered;
}

// ─── Endpoint principal ────────────────────────────────────────────────────────
//
// Recibe: origin (string), destination (string), genres (string CSV), maxMovies (number)
// Orquesta: geocodificación → cálculo de ruta → búsqueda de películas → combinaciones
// Devuelve: info de la ruta + combinaciones de películas agrupadas por cantidad

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originText = searchParams.get("origin") || "";
  const destinationText = searchParams.get("destination") || "";
  const manualMinutes = parseInt(searchParams.get("minutes") || "0");
  const genreIds = searchParams.get("genres") || "";
  const maxMovies = Math.min(parseInt(searchParams.get("maxMovies") || "2"), 5);

  const isManual = !originText && !destinationText;

  if (!isManual && (!originText || !destinationText)) {
    return NextResponse.json({ error: "Origen y destino son obligatorios" }, { status: 400 });
  }

  if (isManual && (!manualMinutes || manualMinutes < 30)) {
    return NextResponse.json({ error: "Ingresá al menos 30 minutos" }, { status: 400 });
  }

  try {
    let durationMinutes: number;
    let routeInfo = null;

    if (isManual) {
      // Modo manual: no se llama a ORS, se usa el tiempo directo
      durationMinutes = manualMinutes;
    } else {
      // Modo ruta: geocodificación + cálculo de ruta (ORS)
      const [originResult, destinationResult] = await Promise.all([
        geocodeCity(originText),
        geocodeCity(destinationText),
      ]);

      const routeData = await calculateRoute(
        originResult.coordinates,
        destinationResult.coordinates,
        originResult.label,
        destinationResult.label,
      );

      durationMinutes = routeData.durationMinutes;
      routeInfo = {
        durationMinutes: routeData.durationMinutes,
        distanceKm: routeData.distanceKm,
        originLabel: originResult.label,
        destinationLabel: destinationResult.label,
      };
    }

    // TMDB: igual para ambos modos
    const movies = await fetchMoviePool(genreIds);

    const bySize: Record<number, Movie[][]> = {};
    for (let size = 1; size <= maxMovies; size++) {
      bySize[size] = findCombosOfSize(movies, durationMinutes, size);
    }

    return NextResponse.json({
      route: routeInfo,
      bySize,
      totalMoviesFetched: movies.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
