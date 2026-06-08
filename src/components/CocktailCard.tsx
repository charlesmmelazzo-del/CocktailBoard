"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { spiritOf, spiritIdsOf } from "@/lib/constants";
import type { Cocktail } from "@/lib/types";

interface CardProps {
  cocktail: Cocktail;
  noteCount: number;
  onOpen: () => void;
  addedBy?: string;
  agreement?: { count: number; total: number };
}

// The visual card. Shared by the draggable and static (read-only) variants.
function CardBody({
  cocktail,
  noteCount,
  onOpen,
  addedBy,
  agreement,
  dragging,
}: CardProps & { dragging?: boolean }) {
  const spirits = spiritIdsOf(cocktail).map(spiritOf);
  const primary = spirits[0];
  return (
    <div
      onClick={onOpen}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white pl-3 pr-2.5 py-2.5 shadow-card transition hover:border-slate-300 hover:shadow-lift ${
        dragging ? "opacity-50" : ""
      }`}
    >
      {/* spirit color stripe — split into segments for multiple base spirits */}
      <span className="absolute inset-y-0 left-0 flex w-1.5 flex-col overflow-hidden">
        {spirits.map((sp, i) => (
          <span key={sp.id + i} className="flex-1" style={{ background: sp.color }} />
        ))}
      </span>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-slate-900">
            {cocktail.name}
          </p>
          {addedBy && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              added by {addedBy}
            </p>
          )}
        </div>
        {agreement && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white"
            style={{
              background: primary.color,
              opacity: 0.4 + 0.6 * (agreement.count / Math.max(agreement.total, 1)),
            }}
            title={`${agreement.count} of ${agreement.total} boards`}
          >
            {agreement.count}/{agreement.total}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {spirits.map((sp, i) => (
          <span
            key={sp.id + i}
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: sp.color, color: sp.text }}
          >
            {sp.label}
          </span>
        ))}
        {noteCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v12H7l-3 3V4z" />
            </svg>
            {noteCount}
          </span>
        )}
      </div>
    </div>
  );
}

// Draggable variant used on the signed-in user's own editable board.
export function SortableCocktailCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(props.cocktail.id) });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardBody {...props} dragging={isDragging} />
    </div>
  );
}

// Static variant used when viewing another user's board or the consensus view.
export function StaticCocktailCard(props: CardProps) {
  return <CardBody {...props} />;
}
