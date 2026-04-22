import { NextRequest, NextResponse } from "next/server";
import { GeocodingResult } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  if (!text || text.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ORS API key not configured" }, { status: 500 });
  }

  const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(text)}&size=5&lang=es`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: res.status });
    }

    const data = await res.json();
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
