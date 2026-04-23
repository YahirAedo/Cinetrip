import { NextRequest, NextResponse } from "next/server";
import { GeocodingResult } from "@/types";

// Endpoint GET que convierte un texto de búsqueda en coordenadas geográficas usando OpenRouteService.
// Recibe el parámetro "text" en la query string y retorna hasta 5 sugerencias de lugares.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  // Si el texto es demasiado corto, se retorna una lista vacía sin consultar la API externa.
  if (!text || text.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
  }

  const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=5&lang=es&layers=locality`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: res.status });
    }

    const data = await res.json();
    // Se mapean las features GeoJSON de la respuesta al formato simplificado GeocodingResult.
    const results: GeocodingResult[] = (data.features || []).map(
      (f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
        label: f.properties.label,
        coordinates: f.geometry.coordinates,
      })
    );

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Failed to fetch geocoding" }, { status: 500 });
  }
}
