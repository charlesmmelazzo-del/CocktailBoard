"use client";

import { useEffect, useState } from "react";
import { SpiritPicker } from "./Spirit";
import type { Cocktail, Note } from "@/lib/types";
import { spiritIdsOf } from "@/lib/constants";

interface Props {
  cocktail: Cocktail;
  notes: Note[];
  currentUserId: number;
  addedBy?: string;
  onClose: () => void;
  onChanged: () => void; // ask parent to re-sync from the server
}

export function CocktailModal({
  cocktail,
  notes,
  currentUserId,
  addedBy,
  onClose,
  onChanged,
}: Props) {
  const [name, setName] = useState(cocktail.name);
  const [recipe, setRecipe] = useState(cocktail.recipe);
  const [spirits, setSpirits] = useState<string[]>(spiritIdsOf(cocktail));
  const [savingDetails, setSavingDetails] = useState(false);

  const spiritKey = spiritIdsOf(cocktail).join(",");

  const myNote = notes.find((n) => n.user_id === currentUserId);
  const otherNotes = notes.filter((n) => n.user_id !== currentUserId);
  const [noteDraft, setNoteDraft] = useState(myNote?.body || "");
  const [savingNote, setSavingNote] = useState(false);

  // Keep fields in sync if the underlying cocktail changes (live edits by others).
  useEffect(() => {
    setName(cocktail.name);
    setRecipe(cocktail.recipe);
    setSpirits(spiritIdsOf(cocktail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cocktail.id, cocktail.name, cocktail.recipe, spiritKey]);

  useEffect(() => {
    if (!myNote) return;
    setNoteDraft((prev) => (prev === "" ? myNote.body : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myNote?.body]);

  const detailsDirty =
    name.trim() !== cocktail.name ||
    recipe !== cocktail.recipe ||
    spirits.join(",") !== spiritKey;

  async function saveDetails() {
    if (!name.trim()) return;
    setSavingDetails(true);
    try {
      await fetch("/api/cocktails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cocktail.id, name, recipe, base_spirits: spirits }),
      });
      onChanged();
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    try {
      await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cocktail_id: cocktail.id, body: noteDraft }),
      });
      onChanged();
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteCocktail() {
    if (!confirm(`Delete "${cocktail.name}" for everyone? This can't be undone.`))
      return;
    await fetch(`/api/cocktails?id=${cocktail.id}`, { method: "DELETE" });
    onChanged();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-500">
            Cocktail
            {addedBy && (
              <span className="ml-2 font-normal text-slate-400">
                · added by {addedBy}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Name / descriptor
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base font-medium outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Base spirit(s) — tap more than one for a split base
            </label>
            <SpiritPicker value={spirits} onChange={setSpirits} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Recipe
            </label>
            <textarea
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              rows={5}
              placeholder="2 oz bourbon&#10;0.75 oz lemon&#10;0.75 oz simple…"
              className="scroll-thin w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {detailsDirty && (
            <div className="flex justify-end">
              <button
                onClick={saveDetails}
                disabled={savingDetails || !name.trim()}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingDetails ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notes &amp; thoughts
            </h3>

            <div className="mb-3">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={2}
                placeholder="Add your note (everyone can see it)…"
                className="scroll-thin w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  onClick={saveNote}
                  disabled={savingNote || noteDraft === (myNote?.body || "")}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  {savingNote ? "Saving…" : "Save my note"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {otherNotes.length === 0 && !myNote?.body && (
                <p className="text-xs text-slate-400">No notes yet.</p>
              )}
              {otherNotes.map((n) => (
                <div
                  key={n.user_id}
                  className="rounded-lg bg-slate-50 px-3 py-2"
                >
                  <p className="mb-0.5 text-xs font-semibold text-slate-500">
                    {n.username}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between border-t border-slate-100 pt-4">
            <button
              onClick={deleteCocktail}
              className="text-xs font-medium text-red-500 hover:text-red-600"
            >
              Delete cocktail
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
