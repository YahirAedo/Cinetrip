"use client";
import { Movie } from "@/types";
import MovieCard from "./MovieCard";
import { Clock, Film, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Props {
  movies: Movie[];
  tripMinutes: number;
  comboIndex: number;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m > 0 ? m + "min" : ""}`;
}

export default function ComboResult({ movies, tripMinutes, comboIndex }: Props) {
  const [expanded, setExpanded] = useState(comboIndex === 0);
  const totalRuntime = movies.reduce((sum, m) => sum + m.runtime, 0);
  const leftover = tripMinutes - totalRuntime;
  const pct = Math.round((totalRuntime / tripMinutes) * 100);

  const label =
    movies.length === 1
      ? "Una película"
      : movies.length === 2
      ? "Doble función"
      : "Triple función";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "var(--surface)",
        marginBottom: 12,
        transition: "border-color 0.2s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text)",
          fontFamily: "var(--font-body)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              borderRadius: 8,
              padding: "4px 10px",
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            {label}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={13} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "0.88rem" }}>{formatTime(totalRuntime)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Film size={13} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: "0.88rem" }}>{movies.length} película{movies.length > 1 ? "s" : ""}</span>
            </div>
            <span
              style={{
                fontSize: "0.82rem",
                color: leftover >= 0 ? "var(--accent2)" : "#ef4444",
                fontWeight: 500,
              }}
            >
              {leftover >= 0 ? `Sobran ${formatTime(leftover)}` : `Excede ${formatTime(Math.abs(leftover))}`}
            </span>
          </div>
        </div>

        {expanded ? (
          <ChevronUp size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        )}
      </button>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--surface2)", margin: "0 20px" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(pct, 100)}%`,
            background: pct > 100 ? "#ef4444" : "var(--accent)",
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Movie list */}
      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {movies.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
