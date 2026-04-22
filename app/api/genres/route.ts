import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=es-AR`
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}
