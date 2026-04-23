"use client";
import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { GeocodingResult } from "@/types";

interface Props {
  placeholder: string;
  onSelect: (result: GeocodingResult) => void;
  value: string;
  onChange: (v: string) => void;
}

export default function LocationInput({ placeholder, onSelect, value, onChange }: Props) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectingRef = useRef(false);

  useEffect(() => {
    if (selectingRef.current) return;
    if (value.length < 3) { setResults([]); setOpen(false); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?text=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.results || []);
        if (!selectingRef.current) setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [value]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <MapPin
          size={16}
          style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            color: "var(--accent)", pointerEvents: "none",
          }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => {
            if (!selectingRef.current) setOpen(false);
          }}
          style={{
            width: "100%",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontSize: "0.95rem",
            padding: "12px 14px 12px 40px",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {loading && (
          <Loader2
            size={14}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", overflow: "hidden", zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                selectingRef.current = true;
              }}
              onClick={() => {
                onSelect(r);
                onChange(r.label);
                if (debounce.current) clearTimeout(debounce.current);
                setOpen(false);
                setResults([]);
                setTimeout(() => {
                  selectingRef.current = false;
                }, 0);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 14px",
                background: "transparent", border: "none",
                color: "var(--text)", fontFamily: "var(--font-body)",
                fontSize: "0.88rem", cursor: "pointer", textAlign: "left",
                borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "var(--surface)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <MapPin size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}