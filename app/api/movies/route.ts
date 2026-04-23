import { NextRequest, NextResponse } from "next/server";
import { TMDBMovieRaw, TMDBMovieDetail, Movie } from "@/types";

// Obtiene el detalle completo de una lista de películas por ID desde TMDB.
// Descarta las películas con runtime inválido o menor a 30 minutos.
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

// Calcula el puntaje promedio de un conjunto de películas.
function avgRating(movies: Movie[]): number {
  return movies.reduce((sum, m) => sum + m.vote_average, 0) / movies.length;
}

// Algoritmo recursivo que encuentra todas las combinaciones de "size" películas
// cuya duración total no supere el presupuesto de tiempo indicado.
// Se detiene anticipadamente cuando ya se acumularon 60 resultados.
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
    // Salida anticipada una vez que se tienen suficientes resultados.
    if (results.length >= 60) return;
  }
}

// Genera combinaciones de películas agrupadas por cantidad (1, 2, 3... hasta maxMovies).
// Trabaja solo con las 25 películas mejor valoradas para mantener el espacio de búsqueda manejable.
// Retorna hasta 10 combinaciones por grupo, ordenadas de mayor a menor rating promedio.
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
    // Ordenar cada grupo por rating promedio de mayor a menor.
    combos.sort((a, b) => avgRating(b) - avgRating(a));

    // Ordena por rating promedio descendente y toma top 10
    validCombos.sort((a, b) => avgRating(b) - avgRating(a));
    bySize[size] = validCombos.slice(0, 10);
  }

  return bySize;
}

// Endpoint GET principal que recibe la duración en minutos, géneros y cantidad máxima de películas.
// Consulta TMDB, filtra por los parámetros recibidos y retorna combinaciones de películas
// agrupadas por cantidad que se ajusten a la duración del viaje.
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
    // Se usan IDs separados por pipe para que TMDB los trate como OR (coma = AND, pipe = OR).
    const genreParam = genreIds ? `&with_genres=${genreIds.replace(/,/g, "|")}` : "";

    // Se descargan las primeras 3 páginas de resultados de TMDB en paralelo.
    const fetchedPages = await Promise.all(
      pages.map((page) =>
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=es-AR&sort_by=popularity.desc&vote_count.gte=100${genreParam}&page=${page}`
        ).then((r) => r.json())
      )
    );

    // Se combinan todas las películas y se eliminan duplicados por ID, tomando los primeros 40.
    const rawMovies: TMDBMovieRaw[] = fetchedPages.flatMap((p) => p.results || []);
    const uniqueIds = [...new Set(rawMovies.map((m) => m.id))].slice(0, 60);

    // Se obtiene el detalle completo de cada película para obtener su runtime.
    const movies = await fetchMovieDetails(uniqueIds, apiKey);

    // Se generan las combinaciones posibles y se retornan al cliente.
    const bySize = findCombinationsBySize(movies, minutes, maxMovies);

    return NextResponse.json({ bySize, totalFetched: movies.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}