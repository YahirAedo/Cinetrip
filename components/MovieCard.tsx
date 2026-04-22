"use client";
import { Movie } from "@/types";
import { Star, Clock } from "lucide-react";

interface Props {
  movie: Movie;
  index: number;
}

export default function MovieCard({ movie, index }: Props) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
    : null;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        animation: `fadeUp 0.4s ease ${index * 0.1}s both`,
      }}
    >
      {/* Poster */}
      <div
        style={{
          width: 90,
          flexShrink: 0,
          background: "var(--surface2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={movie.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              minHeight: 130,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            🎬
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 14px 14px 0", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.15rem",
              letterSpacing: "0.03em",
              lineHeight: 1.2,
              color: "var(--text)",
            }}
          >
            {movie.title}
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              background: "var(--surface2)",
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            <Star size={11} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
              {movie.vote_average.toFixed(1)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} style={{ color: "var(--accent2)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--accent2)", fontWeight: 500 }}>
              {movie.runtime} min
            </span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {movie.release_date?.slice(0, 4)}
          </span>
          {movie.genres?.map((g) => (
            <span
              key={g.id}
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                background: "var(--surface2)",
                borderRadius: 4,
                padding: "2px 7px",
                border: "1px solid var(--border)",
              }}
            >
              {g.name}
            </span>
          ))}
        </div>

        {movie.overview && (
          <p
            style={{
              marginTop: 8,
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {movie.overview}
          </p>
        )}
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
