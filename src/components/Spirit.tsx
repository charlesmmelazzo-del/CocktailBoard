"use client";

import { SPIRITS, spiritOf, type SpiritId } from "@/lib/constants";
import type { Cocktail } from "@/lib/types";

export function SpiritDot({ id, size = 10 }: { id: string; size?: number }) {
  const s = spiritOf(id);
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ background: s.color, width: size, height: size }}
      title={s.label}
    />
  );
}

export function SpiritPill({ id }: { id: string }) {
  const s = spiritOf(id);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: s.color, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// A compact tally of how many cocktails of each base spirit are present.
export function SpiritBreakdown({ cocktails }: { cocktails: Cocktail[] }) {
  const counts = new Map<string, number>();
  for (const c of cocktails) {
    counts.set(c.base_spirit, (counts.get(c.base_spirit) || 0) + 1);
  }
  const present = SPIRITS.filter((s) => counts.get(s.id));
  if (present.length === 0) {
    return <span className="text-xs text-slate-300">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {present.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{ background: s.color, color: s.text }}
          title={s.label}
        >
          <span className="hidden sm:inline">{s.label}</span>
          <span className="sm:hidden">{s.label.slice(0, 3)}</span>
          {counts.get(s.id)}
        </span>
      ))}
    </div>
  );
}

export function SpiritPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: SpiritId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SPIRITS.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              active ? "ring-2 ring-offset-1 ring-slate-900" : "opacity-60 hover:opacity-100"
            }`}
            style={{ background: s.color, color: s.text }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
