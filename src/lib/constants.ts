// The canonical list of base spirits and their bright, well-separated colors.
// Colors are chosen to be vivid and easy to tell apart at a glance.

export type SpiritId =
  | "bourbon"
  | "rye"
  | "single_malt"
  | "rum"
  | "gin"
  | "tequila"
  | "mezcal"
  | "agave_other"
  | "shochu"
  | "brandy"
  | "other";

export interface Spirit {
  id: SpiritId;
  label: string;
  color: string; // bright fill color
  text: string; // readable text color on top of `color`
}

export const SPIRITS: Spirit[] = [
  { id: "bourbon", label: "Bourbon", color: "#FF7A00", text: "#ffffff" },
  { id: "rye", label: "Rye", color: "#FFC400", text: "#3a2a00" },
  { id: "single_malt", label: "Single Malt", color: "#C026D3", text: "#ffffff" },
  { id: "rum", label: "Rum", color: "#06B6D4", text: "#062b33" },
  { id: "gin", label: "Gin", color: "#2563EB", text: "#ffffff" },
  { id: "tequila", label: "Tequila", color: "#A3E635", text: "#1f2b00" },
  { id: "mezcal", label: "Mezcal", color: "#15803D", text: "#ffffff" },
  { id: "agave_other", label: "Agave Other", color: "#2DD4BF", text: "#04302b" },
  { id: "shochu", label: "Shochu", color: "#EC4899", text: "#ffffff" },
  { id: "brandy", label: "Brandy", color: "#DC2626", text: "#ffffff" },
  { id: "other", label: "Other", color: "#64748B", text: "#ffffff" },
];

export const SPIRIT_MAP: Record<string, Spirit> = SPIRITS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, Spirit>,
);

export function spiritOf(id: string | null | undefined): Spirit {
  return (id && SPIRIT_MAP[id]) || SPIRIT_MAP.other;
}

// Normalize a raw list of spirit ids: keep only known ids, dedupe, preserve
// order, and never return empty (falls back to ["other"]).
export function normalizeSpiritIds(input: unknown): SpiritId[] {
  const arr = Array.isArray(input)
    ? input
    : typeof input === "string" && input
      ? [input]
      : [];
  const seen = new Set<string>();
  const out: SpiritId[] = [];
  for (const raw of arr) {
    const id = SPIRIT_MAP[String(raw)] ? (String(raw) as SpiritId) : null;
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out.length ? out : ["other"];
}

// The base spirits of a cocktail, resolved from the array (falling back to the
// legacy single base_spirit field for older rows).
export function spiritIdsOf(c: {
  base_spirits?: string[] | null;
  base_spirit?: string | null;
}): SpiritId[] {
  const source =
    c.base_spirits && c.base_spirits.length ? c.base_spirits : c.base_spirit;
  return normalizeSpiritIds(source);
}

// Sentinel category id used for the "uncategorized" pool on the client.
export const POOL_ID = "pool";
