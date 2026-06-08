"use client";

import { SPIRITS, spiritOf, spiritIdsOf, type SpiritId } from "@/lib/constants";
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
    for (const id of spiritIdsOf(c)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
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

// Multi-select spirit picker — a cocktail can have one or more base spirits
// (e.g. when a build is split between two bases).
export function SpiritPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: SpiritId) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {SPIRITS.map((s) => {
        const active = value.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
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
