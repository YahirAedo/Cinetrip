import { NextRequest, NextResponse } from "next/server";
import { TMDBMovieRaw, TMDBMovieDetail, Movie } from "@/types";

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

function findCombosOfSize(
  movies: Movie[],
  budget: number,
  size: number,
  start: number,
  current: Movie[],
  results: Movie[][]
): void {
  if (current.length === size) {
    const total = current.reduce((s, m) => s + m.runtime, 0);
    if (total <= budget) results.push([...current]);
    return;
  }
  const remaining = size - current.length;
  for (let i = start; i <= movies.length - remaining; i++) {
    current.push(movies[i]);
    findCombosOfSize(movies, budget, size, i + 1, current, results);
    current.pop();
    // Early exit once we have plenty of results
    if (results.length >= 60) return;
  }
}

function getRandomCombinations<T>(
  items: T[],
  size: number,
  count: number
): T[][] {
  const combinations: T[][] = [];
  const used = new Set<string>(); // Para evitar duplicados

  while (combinations.length < count) {
    const combo = shuffle([...items]).slice(0, size);
    const key = combo.map(item => (item as any).id).sort().join('-'); // Usa ID único para evitar duplicados
    if (!used.has(key)) {
      used.add(key);
      combinations.push(combo);
    }
    if (used.size >= Math.min(count * 2, items.length ** size)) break; // Evita bucles infinitos
  }

  return combinations;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function findCombinationsBySize(
  movies: Movie[],
  budget: number,
  maxMovies: number
): Record<number, Movie[][]> {
  const candidates = shuffle([...movies]
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 50)
  );

  const bySize: Record<number, Movie[][]> = {};

  for (let size = 1; size <= maxMovies; size++) {
    // Genera 50 combinaciones aleatorias en lugar de todas las posibles
    const combos = getRandomCombinations(candidates, size, 50);

    // Filtra por duración total <= budget
    const validCombos = combos.filter(combo =>
      combo.reduce((sum, m) => sum + m.runtime, 0) <= budget
    );

    // Ordena por rating promedio descendente y toma top 10
    validCombos.sort((a, b) => avgRating(b) - avgRating(a));
    bySize[size] = validCombos.slice(0, 10);
  }

  return bySize;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const minutes = parseInt(searchParams.get("minutes") || "0");
  const genreIds = searchParams.get("genres") || "";
  const maxMovies = Math.min(parseInt(searchParams.get("maxMovies") || "2"), 5);

  if (!minutes || minutes < 30) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  try {
    const pages = [1, 2, 3];
    // Use pipe-separated genre IDs so TMDB treats them as OR (comma = AND, pipe = OR)
    const genreParam = genreIds ? `&with_genres=${genreIds.replace(/,/g, "|")}` : "";

    const fetchedPages = await Promise.all(
      pages.map((page) =>
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=es-AR&sort_by=popularity.desc&vote_count.gte=100${genreParam}&page=${page}`
        ).then((r) => r.json())
      )
    );

    const rawMovies: TMDBMovieRaw[] = fetchedPages.flatMap((p) => p.results || []);
    const uniqueIds = [...new Set(rawMovies.map((m) => m.id))].slice(0, 60);

    const movies = await fetchMovieDetails(uniqueIds, apiKey);

    const bySize = findCombinationsBySize(movies, minutes, maxMovies);

    return NextResponse.json({ bySize, totalFetched: movies.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}