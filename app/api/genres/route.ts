import { NextResponse } from "next/server";

// Endpoint GET que obtiene la lista de géneros cinematográficos desde TMDB.
// Retorna los géneros en español (es-AR) para poblar el filtro de géneros en la interfaz.
export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  // Si no está configurada la clave de API, se retorna error de servidor.
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
