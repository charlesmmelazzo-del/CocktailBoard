"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableCocktailCard, StaticCocktailCard } from "./CocktailCard";
import { SpiritBreakdown } from "./Spirit";
import type { Cocktail } from "@/lib/types";

interface ColumnProps {
  id: string; // "pool" or a category id as string
  title: string;
  cocktailIds: number[];
  cocktailsById: Map<number, Cocktail>;
  noteCounts: Map<number, number>;
  editable: boolean;
  isPool?: boolean;
  onOpenCocktail: (id: number) => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  agreement?: Map<number, number>;
  agreementTotal?: number;
}

export function Column({
  id,
  title,
  cocktailIds,
  cocktailsById,
  noteCounts,
  editable,
  isPool,
  onOpenCocktail,
  onRename,
  onDelete,
  agreement,
  agreementTotal,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);

  const cocktails = cocktailIds
    .map((cid) => cocktailsById.get(cid))
    .filter((c): c is Cocktail => Boolean(c));

  function commitRename() {
    setRenaming(false);
    const next = draft.trim();
    if (next && next !== title && onRename) onRename(next);
    else setDraft(title);
  }

  return (
    <section
      className={`flex max-h-full w-72 shrink-0 flex-col rounded-2xl border bg-white/60 ${
        isOver ? "border-slate-400 bg-slate-50" : "border-slate-200"
      } ${isPool ? "bg-slate-50/80" : ""}`}
    >
      <header className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(title);
                  setRenaming(false);
                }
              }}
              className="w-full rounded-md border border-slate-300 px-1.5 py-0.5 text-sm font-semibold outline-none"
            />
          ) : (
            <h2
              className="truncate text-sm font-semibold text-slate-800"
              onDoubleClick={() => {
                if (onRename) {
                  setDraft(title);
                  setRenaming(true);
                }
              }}
              title={onRename ? "Double-click to rename" : undefined}
            >
              {title}
            </h2>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
            {cocktails.length}
          </span>
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Remove the "${title}" category? Cards in it go back to the pool.`))
                  onDelete();
              }}
              className="rounded-md p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              title="Delete category"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="px-3 pb-2 pt-2">
        <SpiritBreakdown cocktails={cocktails} />
      </div>

      <div
        ref={setNodeRef}
        className="scroll-thin flex-1 space-y-2 overflow-y-auto px-3 pb-3"
      >
        <SortableContext
          items={cocktailIds.map(String)}
          strategy={verticalListSortingStrategy}
        >
          {cocktails.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-300">
              {editable ? "Drop cocktails here" : "Empty"}
            </div>
          )}
          {cocktails.map((c) => {
            const noteCount = noteCounts.get(c.id) || 0;
            const agree =
              agreement && agreementTotal
                ? { count: agreement.get(c.id) || 0, total: agreementTotal }
                : undefined;
            return editable ? (
              <SortableCocktailCard
                key={c.id}
                cocktail={c}
                noteCount={noteCount}
                onOpen={() => onOpenCocktail(c.id)}
              />
            ) : (
              <StaticCocktailCard
                key={c.id}
                cocktail={c}
                noteCount={noteCount}
                onOpen={() => onOpenCocktail(c.id)}
                agreement={agree}
              />
            );
          })}
        </SortableContext>
      </div>
    </section>
  );
}
