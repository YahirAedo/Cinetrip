import { NextRequest, NextResponse } from "next/server";
import { RouteResult } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { originCoords, destinationCoords } = body;

  if (!originCoords || !destinationCoords) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
  }

  const url = `https://api.openrouteservice.org/v2/directions/driving-car`;

  try {
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
    const segment = data.routes?.[0]?.summary;

    if (!segment) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

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
