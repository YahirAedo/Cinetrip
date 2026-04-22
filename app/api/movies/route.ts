import { NextRequest, NextResponse } from "next/server";
import { TMDBMovieRaw, TMDBMovieDetail, Movie } from "@/types";

// Fetch runtime details for a list of movie IDs
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

// Simple combination finder: find combos of movies whose total runtime <= budget
function findBestCombinations(movies: Movie[], budget: number, maxMovies: number): Movie[][] {
  const sorted = [...movies].sort((a, b) => b.runtime - a.runtime);
  const results: Movie[][] = [];

  // Single movie: best fit (closest to budget without exceeding)
  const singles = sorted.filter((m) => m.runtime <= budget);
  if (singles.length > 0) {
    results.push([singles[0]]);
  }

  if (maxMovies >= 2) {
    // Pairs
    for (let i = 0; i < sorted.length && results.length < 5; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const total = sorted[i].runtime + sorted[j].runtime;
        if (total <= budget) {
          results.push([sorted[i], sorted[j]]);
          break;
        }
      }
    }
  }

  if (maxMovies >= 3) {
    // Triples
    for (let i = 0; i < sorted.length && results.length < 8; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        for (let k = j + 1; k < sorted.length; k++) {
          const total = sorted[i].runtime + sorted[j].runtime + sorted[k].runtime;
          if (total <= budget) {
            results.push([sorted[i], sorted[j], sorted[k]]);
            break;
          }
        }
      }
    }
  }

  // Deduplicate by movie id sets
  const seen = new Set<string>();
  return results.filter((combo) => {
    const key = combo
      .map((m) => m.id)
      .sort()
      .join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const minutes = parseInt(searchParams.get("minutes") || "0");
  const genreIds = searchParams.get("genres") || "";
  const maxMovies = parseInt(searchParams.get("maxMovies") || "2");

  if (!minutes || minutes < 30) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  try {
    // Fetch popular movies filtered by genre, multiple pages for variety
    const pages = [1, 2, 3];
    const genreParam = genreIds ? `&with_genres=${genreIds}` : "";

    const fetchedPages = await Promise.all(
      pages.map((page) =>
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=es-AR&sort_by=popularity.desc&vote_count.gte=100${genreParam}&page=${page}`
        ).then((r) => r.json())
      )
    );

    const rawMovies: TMDBMovieRaw[] = fetchedPages.flatMap((p) => p.results || []);
    const uniqueIds = [...new Set(rawMovies.map((m) => m.id))].slice(0, 40);

    // Get runtimes
    const movies = await fetchMovieDetails(uniqueIds, apiKey);

    // Find combinations
    const combinations = findBestCombinations(movies, minutes, maxMovies);

    return NextResponse.json({ combinations, totalFetched: movies.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}
