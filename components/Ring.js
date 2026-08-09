"use client";
import { TOKENS } from "../lib/tokens";

export default function Ring({ value, goal, size = 96, stroke = 9, color, label, sub }) {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ticks = Array.from({ length: 12 });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {ticks.map((_, i) => {
            const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const x1 = size / 2 + (r + stroke / 2 + 2) * Math.cos(a);
            const y1 = size / 2 + (r + stroke / 2 + 2) * Math.sin(a);
            const x2 = size / 2 + (r + stroke / 2 + 5) * Math.cos(a);
            const y2 = size / 2 + (r + stroke / 2 + 5) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={TOKENS.line} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />;
          })}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TOKENS.surface2} strokeWidth={stroke - 2} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: size * 0.22, color: TOKENS.chalk, lineHeight: 1 }}>{Math.round(value)}</span>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: size * 0.09, color: TOKENS.muted, letterSpacing: 0.5 }}>/ {Math.round(goal)}</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1.5, color: TOKENS.chalk, textTransform: "uppercase" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: TOKENS.muted, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}
