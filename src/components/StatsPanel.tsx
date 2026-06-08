"use client";

import { SPIRITS, spiritIdsOf } from "@/lib/constants";
import type { Cocktail } from "@/lib/types";

// The always-visible totals: how many cocktails exist overall, broken down by
// base spirit. A split-base cocktail counts toward each of its spirits.
export function StatsPanel({ cocktails }: { cocktails: Cocktail[] }) {
  const counts = new Map<string, number>();
  for (const c of cocktails) {
    for (const id of spiritIdsOf(c)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {cocktails.length}
        </span>
        <span className="text-xs text-slate-500">cocktails</span>
      </div>
      <div className="h-8 w-px bg-slate-200" />
      <div className="flex flex-wrap gap-1.5">
        {SPIRITS.filter((s) => counts.get(s.id)).map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{ background: s.color, color: s.text }}
            title={s.label}
          >
            {s.label}
            <span className="opacity-90">{counts.get(s.id)}</span>
          </span>
        ))}
        {cocktails.length === 0 && (
          <span className="text-xs text-slate-400">
            No cocktails yet — add your first one.
          </span>
        )}
      </div>
    </div>
  );
}
