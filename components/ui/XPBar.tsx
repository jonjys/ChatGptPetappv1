"use client";

import { formatXP } from "@/lib/xp-system";

type XPBarProps = {
  xp: number;
  xpToNext: number;
  progress: number;
  level: number;
  compact?: boolean;
};

export default function XPBar({ xp, xpToNext, progress, level, compact }: XPBarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded-lg text-xs font-black"
          style={{
            background: "#c8ff00",
            border: "2px solid #0a0a0a",
            width: 28,
            height: 28,
            fontSize: 11,
          }}
        >
          {level}
        </span>
        <div className="flex-1">
          <div className="xp-track">
            <div className="xp-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>
          {formatXP(xp)}/{formatXP(xpToNext)}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>
          LVL {level}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: "#0a0a0a" }}>{formatXP(xp)}</span>
          <span style={{ color: "#999" }}> / {formatXP(xpToNext)} XP</span>
        </span>
      </div>
      <div className="xp-track">
        <div className="xp-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span style={{ fontSize: 11, color: "#999", fontWeight: 600 }}>
          {progress}% to LVL {level + 1}
        </span>
      </div>
    </div>
  );
}
