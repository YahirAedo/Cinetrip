import { NextRequest, NextResponse } from "next/server";
import { RouteResult } from "@/types";

// Endpoint POST que calcula la duración y distancia de una ruta en auto
// usando la API de OpenRouteService. Recibe las coordenadas de origen y destino
// en el cuerpo de la solicitud y retorna los datos de la ruta.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { originCoords, destinationCoords } = body;

  // Validación: ambas coordenadas son obligatorias para calcular la ruta.
  if (!originCoords || !destinationCoords) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
  }

  const url = `https://api.openrouteservice.org/v2/directions/driving-car`;

  try {
    // Se envía la solicitud a ORS con las coordenadas en el formato que espera la API.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        coordinates: [originCoords, destinationCoords],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("ORS error:", err);
      return NextResponse.json({ error: "Route calculation failed" }, { status: res.status });
    }

    const data = await res.json();
    // Se extrae el resumen del primer tramo de la ruta calculada.
    const segment = data.routes?.[0]?.summary;

    if (!segment) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    // Se convierten los valores de la API (segundos y metros) a minutos y kilómetros.
    const durationSeconds: number = segment.duration;
    const durationMinutes = Math.round(durationSeconds / 60);
    const distanceKm = Math.round(segment.distance / 100) / 10;

    const result: RouteResult = {
      durationSeconds,
      durationMinutes,
      distanceKm,
      summary: `${distanceKm} km · ~${durationMinutes} min`,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
