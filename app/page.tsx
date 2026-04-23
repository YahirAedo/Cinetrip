"use client";

import { useState, useEffect } from "react";
import { Car, Clock, Film, Search, ChevronRight, RotateCcw, Layers } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import ComboResult from "@/components/ComboResult";
import { Genre, GeocodingResult, Movie } from "@/types";

type TripMode = "route" | "manual";

export default function Home() {
  const [mode, setMode] = useState<TripMode>("route");
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<GeocodingResult | null>(null);
  const [destination, setDestination] = useState<GeocodingResult | null>(null);
  const [manualMinutes, setManualMinutes] = useState("");
  const [tripMinutes, setTripMinutes] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [maxMovies, setMaxMovies] = useState(2);
  const [bySize, setBySize] = useState<Record<number, Movie[][]>>({});
  const [activeTab, setActiveTab] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    fetch("/api/genres").then((r) => r.json()).then((d) => setGenres(d.genres || []));
  }, []);

  async function calculateRoute() {
    if (!origin || !destination) return;
    setRouteLoading(true); setRouteError(""); setTripMinutes(null); setRouteInfo(null);
    try {
      const res = await fetch("/api/route-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originCoords: origin.coordinates, destinationCoords: destination.coordinates }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTripMinutes(data.durationMinutes);
      setRouteInfo({ distanceKm: data.distanceKm, durationMinutes: data.durationMinutes });
    } catch { setRouteError("Error al calcular la ruta. Verificá las direcciones."); }
    finally { setRouteLoading(false); }
  }

  async function searchMovies() {
    const minutes = mode === "manual" ? parseInt(manualMinutes) : tripMinutes;
    if (!minutes || minutes < 30) return;
    setSearching(true); setSearched(false); setBySize({}); setSearchError("");
    try {
      const genreParam = selectedGenres.length > 0 ? selectedGenres.join(",") : "";
      const res = await fetch(`/api/movies?minutes=${minutes}&genres=${genreParam}&maxMovies=${maxMovies}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBySize(data.bySize || {});
      setActiveTab(1);
      setSearched(true);
      if (mode === "manual") setTripMinutes(minutes);
    } catch { setSearchError("Error al buscar películas. Intentá de nuevo."); }
    finally { setSearching(false); }
  }

  function reset() {
    setOriginText(""); setDestText(""); setOrigin(null); setDestination(null);
    setManualMinutes(""); setTripMinutes(null); setRouteInfo(null);
    setBySize({}); setSearched(false); setSelectedGenres([]); setMaxMovies(2);
    setRouteError(""); setSearchError(""); setActiveTab(1);
  }

  const resolvedMinutes = mode === "manual" ? parseInt(manualMinutes) || null : tripMinutes;
  const canSearch = !!(resolvedMinutes && resolvedMinutes >= 30);

  const tabLabels: Record<number, string> = {
    1: "1 película",
    2: "2 películas",
    3: "3 películas",
    4: "4 películas",
    5: "5 películas",
  };

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 80px" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #0f0f18 0%, var(--bg) 100%)", borderBottom: "1px solid var(--border)", padding: "48px 24px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(232,197,71,0.07) 0%, transparent 70%)" }} />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Film size={22} style={{ color: "var(--accent)" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", letterSpacing: "0.2em", color: "var(--text-muted)" }}>CINETRIP</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem, 8vw, 6rem)", letterSpacing: "0.04em", lineHeight: 0.95, color: "var(--text)", marginBottom: 16 }}>
          PELÍCULAS<br /><span style={{ color: "var(--accent)" }}>PARA TU VIAJE</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
          Calculá la duración de tu viaje y encontrá la combinación de películas perfecta para aprovechar cada minuto.
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 0" }}>
        {/* Step 1 */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "1rem" }}>1</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.05em" }}>DURACIÓN DEL VIAJE</h2>
          </div>
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 4, gap: 4, marginBottom: 16, width: "fit-content" }}>
            {([["route", "Calcular ruta", Car], ["manual", "Ingresar minutos", Clock]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => { setMode(m); setTripMinutes(null); setRouteInfo(null); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, border: "none", background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "var(--bg)" : "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s", fontWeight: mode === m ? 500 : 400 }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
          {mode === "route" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <LocationInput placeholder="Origen (ej: Buenos Aires)" value={originText} onChange={setOriginText} onSelect={(r) => { setOrigin(r); setOriginText(r.label); }} />
              <LocationInput placeholder="Destino (ej: Mar del Plata)" value={destText} onChange={setDestText} onSelect={(r) => { setDestination(r); setDestText(r.label); }} />
              <button onClick={calculateRoute} disabled={!origin || !destination || routeLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 24px", borderRadius: "var(--radius)", background: origin && destination ? "var(--accent)" : "var(--surface2)", border: "none", color: origin && destination ? "var(--bg)" : "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 500, cursor: origin && destination ? "pointer" : "not-allowed", transition: "all 0.2s", alignSelf: "flex-start" }}>
                <Car size={16} />{routeLoading ? "Calculando..." : "Calcular duración"}{!routeLoading && <ChevronRight size={14} />}
              </button>
              {routeError && <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{routeError}</p>}
              {routeInfo && (
                <div style={{ display: "flex", gap: 20, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--accent)", borderRadius: "var(--radius)" }}>
                  <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>DISTANCIA</span><span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--accent)" }}>{routeInfo.distanceKm} km</span></div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div><span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>DURACIÓN</span><span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--accent)" }}>{routeInfo.durationMinutes} min</span></div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <Clock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--accent)" }} />
                <input type="number" min={30} max={1440} value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} placeholder="ej: 120" style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: "1.1rem", padding: "12px 14px 12px 42px", outline: "none", width: 160 }} />
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>minutos</span>
              {manualMinutes && parseInt(manualMinutes) >= 30 && <span style={{ color: "var(--accent)", fontSize: "0.85rem" }}>≈ {Math.floor(parseInt(manualMinutes) / 60)}h {parseInt(manualMinutes) % 60}min</span>}
            </div>
          )}
        </section>

        {/* Step 2 */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: canSearch ? "var(--accent)" : "var(--surface2)", color: canSearch ? "var(--bg)" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "1rem", transition: "all 0.3s" }}>2</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.05em", color: canSearch ? "var(--text)" : "var(--text-muted)", transition: "color 0.3s" }}>PREFERENCIAS</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Max movies — hasta 5 */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 8, letterSpacing: "0.08em" }}>MÁXIMO DE PELÍCULAS</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMaxMovies(n)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1px solid ${maxMovies === n ? "var(--accent)" : "var(--border)"}`, background: maxMovies === n ? "rgba(232,197,71,0.1)" : "var(--surface)", color: maxMovies === n ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s" }}>
                    <Layers size={13} />{n}
                  </button>
                ))}
              </div>
            </div>
            {/* Géneros — selección OR */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 4, letterSpacing: "0.08em" }}>GÉNEROS (opcional)</label>
              <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: 8, opacity: 0.7 }}>
                Seleccioná uno o más. Las películas pueden pertenecer a cualquiera de los géneros elegidos.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {genres.map((g) => {
                  const active = selectedGenres.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenres((prev) => active ? prev.filter((id) => id !== g.id) : [...prev, g.id])}
                      style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "var(--accent2)" : "var(--border)"}`, background: active ? "rgba(255,107,74,0.12)" : "var(--surface)", color: active ? "var(--accent2)" : "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Search */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={searchMovies} disabled={!canSearch || searching} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: "var(--radius)", background: canSearch ? "var(--accent)" : "var(--surface2)", border: "none", color: canSearch ? "var(--bg)" : "var(--text-muted)", fontFamily: "var(--font-display)", fontSize: "1.1rem", letterSpacing: "0.08em", cursor: canSearch ? "pointer" : "not-allowed", transition: "all 0.2s", opacity: searching ? 0.7 : 1 }}>
              <Search size={18} />{searching ? "BUSCANDO..." : "BUSCAR PELÍCULAS"}
            </button>
            {searched && (
              <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: "var(--radius)", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-display)", fontSize: "1.1rem", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s" }}>
                <RotateCcw size={18} />NUEVA BÚSQUEDA
              </button>
            )}
          </div>
          {searchError && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 8 }}>{searchError}</p>}
        </div>

        {/* Results */}
        {searched && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent2)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "1rem" }}>3</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.05em" }}>RESULTADOS</h2>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>para {resolvedMinutes} min</span>
              </div>
            </div>

            {/* Pestañas por cantidad de películas */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
              {Array.from({ length: maxMovies }, (_, i) => i + 1).map((n) => {
                const count = bySize[n]?.length || 0;
                const isActive = activeTab === n;
                return (
                  <button
                    key={n}
                    onClick={() => setActiveTab(n)}
                    style={{
                      padding: "10px 16px",
                      border: "none",
                      borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                      background: "transparent",
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.85rem",
                      fontWeight: isActive ? 500 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      marginBottom: -1,
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {tabLabels[n]}
                    <span style={{
                      fontSize: "0.7rem",
                      background: isActive ? "var(--accent)" : "var(--surface2)",
                      color: isActive ? "var(--bg)" : "var(--text-muted)",
                      borderRadius: 10,
                      padding: "1px 7px",
                      transition: "all 0.2s",
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Contenido de la pestaña activa */}
            {(bySize[activeTab] || []).length === 0 ? (
              <div style={{ padding: "40px 24px", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                  No encontramos combinaciones de {activeTab} película{activeTab > 1 ? "s" : ""} para este tiempo.
                </p>
              </div>
            ) : (
              (bySize[activeTab] || []).map((combo, i) => (
                <ComboResult key={i} movies={combo} tripMinutes={resolvedMinutes!} comboIndex={i} />
              ))
            )}
          </section>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 60, padding: "20px", borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.78rem" }}>
        Powered by{" "}
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>TMDB</a>
        {" & "}
        <a href="https://openrouteservice.org" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>OpenRouteService</a>
      </div>
    </main>
  );
}