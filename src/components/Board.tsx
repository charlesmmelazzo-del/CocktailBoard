"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Column } from "./Column";
import { StaticCocktailCard } from "./CocktailCard";
import { StatsPanel } from "./StatsPanel";
import { CocktailModal } from "./CocktailModal";
import { AdminPanel } from "./AdminPanel";
import { SpiritPicker } from "./Spirit";
import { POOL_ID, type SpiritId } from "@/lib/constants";
import type { BoardState, Cocktail, Category, Note, User } from "@/lib/types";

type Columns = Record<string, number[]>;
type Mode = "single" | "consensus" | "compare";

const EMPTY_STATE: BoardState = {
  users: [],
  cocktails: [],
  categories: [],
  placements: [],
  notes: [],
};

// Build the column layout (pool + one per category) for a single user's board.
function buildColumns(
  state: BoardState,
  userId: number,
  categories: Category[],
): Columns {
  const cols: Columns = { [POOL_ID]: [] };
  for (const c of categories) cols[String(c.id)] = [];

  const placed = new Set<number>();
  const ups = state.placements
    .filter(
      (p) =>
        p.user_id === userId &&
        p.category_id != null &&
        cols[String(p.category_id)],
    )
    .sort((a, b) => a.position - b.position);
  for (const p of ups) {
    cols[String(p.category_id!)].push(p.cocktail_id);
    placed.add(p.cocktail_id);
  }
  for (const c of state.cocktails) if (!placed.has(c.id)) cols[POOL_ID].push(c.id);
  return cols;
}

export function Board({
  currentUser,
  isAdmin,
}: {
  currentUser: User;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<BoardState>(EMPTY_STATE);
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState<Mode>("single");
  const [viewedUserId, setViewedUserId] = useState(currentUser.id);
  const [compareIds, setCompareIds] = useState<number[]>([currentUser.id]);
  const [showAdmin, setShowAdmin] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const [columns, setColumns] = useState<Columns>({ [POOL_ID]: [] });
  const columnsRef = useRef<Columns>(columns);
  const dirtyRef = useRef(false);

  const categories = useMemo(
    () => [...state.categories].sort((a, b) => a.position - b.position || a.id - b.id),
    [state.categories],
  );

  const editable = mode === "single" && viewedUserId === currentUser.id;

  const applyColumns = useCallback((next: Columns) => {
    columnsRef.current = next;
    setColumns(next);
  }, []);

  // --- Live sync ------------------------------------------------------------
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;
      const data: BoardState = await res.json();
      setState(data);
      setLoaded(true);
    } catch {
      /* network blip — try again next tick */
    }
  }, [router]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 1500);
    return () => clearInterval(t);
  }, [fetchState]);

  // Rebuild the editable board from the server unless the user is mid-edit.
  useEffect(() => {
    if (!editable) return;
    if (dirtyRef.current || activeId != null) return;
    applyColumns(buildColumns(state, currentUser.id, categories));
  }, [state, editable, activeId, categories, currentUser.id, applyColumns]);

  // --- Derived lookups ------------------------------------------------------
  const cocktailsById = useMemo(() => {
    const m = new Map<number, Cocktail>();
    for (const c of state.cocktails) m.set(c.id, c);
    return m;
  }, [state.cocktails]);

  const noteCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const n of state.notes) m.set(n.cocktail_id, (m.get(n.cocktail_id) || 0) + 1);
    return m;
  }, [state.notes]);

  const notesFor = useCallback(
    (cocktailId: number): Note[] => state.notes.filter((n) => n.cocktail_id === cocktailId),
    [state.notes],
  );

  const consensusView = useMemo(
    () => buildConsensus(state, categories),
    [state, categories],
  );

  // --- Drag and drop --------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const findContainer = (id: string): string | null => {
    const cols = columnsRef.current;
    if (cols[id]) return id;
    const num = Number(id);
    return Object.keys(cols).find((k) => cols[k].includes(num)) || null;
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;

    const cols = columnsRef.current;
    const activeItems = cols[from];
    const overItems = cols[to];
    const activeNum = Number(activeId);
    const overIndex =
      overId in cols ? overItems.length : overItems.indexOf(Number(overId));
    const insertAt = overIndex >= 0 ? overIndex : overItems.length;

    applyColumns({
      ...cols,
      [from]: activeItems.filter((i) => i !== activeNum),
      [to]: [...overItems.slice(0, insertAt), activeNum, ...overItems.slice(insertAt)],
    });
    dirtyRef.current = true;
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (over) {
      const activeId = String(active.id);
      const overId = String(over.id);
      const from = findContainer(activeId);
      const to = findContainer(overId);
      if (from && to && from === to && activeId !== overId) {
        const cols = columnsRef.current;
        const items = cols[from];
        const oldIndex = items.indexOf(Number(activeId));
        const newIndex = overId in cols ? items.length - 1 : items.indexOf(Number(overId));
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          applyColumns({ ...cols, [from]: arrayMove(items, oldIndex, newIndex) });
        }
      }
    }
    dirtyRef.current = true;
    void persist(columnsRef.current);
  }

  async function persist(cols: Columns) {
    const placements: Array<{ cocktail_id: number; category_id: number; position: number }> = [];
    for (const cat of categories) {
      (cols[String(cat.id)] || []).forEach((cid, idx) =>
        placements.push({ cocktail_id: cid, category_id: cat.id, position: idx }),
      );
    }
    try {
      await fetch("/api/placements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements }),
      });
    } finally {
      dirtyRef.current = false;
      fetchState();
    }
  }

  // --- Category + cocktail actions -----------------------------------------
  async function addCategory(name: string) {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    fetchState();
  }
  async function renameCategory(id: number, name: string) {
    await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    fetchState();
  }
  async function deleteCategory(id: number) {
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    fetchState();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const openCocktail = openId != null ? cocktailsById.get(openId) : null;

  const stripProps = {
    categories,
    cocktailsById,
    noteCounts,
    onOpenCocktail: setOpenId,
  };

  return (
    <div className="flex h-screen flex-col">
      <Header
        currentUser={currentUser}
        cocktails={state.cocktails}
        isAdmin={isAdmin}
        onAdmin={() => setShowAdmin(true)}
        onLogout={logout}
      />

      <Toolbar
        users={state.users}
        currentUser={currentUser}
        mode={mode}
        viewedUserId={viewedUserId}
        compareIds={compareIds}
        onSingle={(uid) => {
          setMode("single");
          setViewedUserId(uid);
        }}
        onConsensus={() => setMode("consensus")}
        onCompare={() => setMode("compare")}
        onToggleCompareId={(uid) =>
          setCompareIds((prev) =>
            prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
          )
        }
        onAddedCocktail={fetchState}
      />

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading the board…
        </div>
      ) : mode === "compare" ? (
        <CompareView
          users={state.users}
          currentUserId={currentUser.id}
          compareIds={compareIds}
          buildFor={(uid) => buildColumns(state, uid, categories)}
          {...stripProps}
        />
      ) : mode === "consensus" ? (
        <BoardStrip
          className="min-h-0 flex-1"
          columns={consensusView.columns}
          poolTitle="Not yet placed"
          editable={false}
          agreement={consensusView.agreement}
          agreementTotal={consensusView.total}
          {...stripProps}
        />
      ) : editable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <BoardStrip
            className="min-h-0 flex-1"
            columns={columns}
            poolTitle="Uncategorized pool"
            editable
            onRenameCategory={renameCategory}
            onDeleteCategory={deleteCategory}
            onAddCategory={addCategory}
            {...stripProps}
          />
          <DragOverlay>
            {activeId != null && cocktailsById.get(activeId) ? (
              <StaticCocktailCard
                cocktail={cocktailsById.get(activeId)!}
                noteCount={noteCounts.get(activeId) || 0}
                onOpen={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <BoardStrip
          className="min-h-0 flex-1"
          columns={buildColumns(state, viewedUserId, categories)}
          poolTitle="Uncategorized pool"
          editable={false}
          {...stripProps}
        />
      )}

      {openCocktail && (
        <CocktailModal
          cocktail={openCocktail}
          notes={notesFor(openCocktail.id)}
          currentUserId={currentUser.id}
          onClose={() => setOpenId(null)}
          onChanged={fetchState}
        />
      )}

      {showAdmin && isAdmin && (
        <AdminPanel
          currentUserId={currentUser.id}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}

// A horizontal strip of columns: the pool followed by each category.
function BoardStrip({
  className,
  columns,
  categories,
  cocktailsById,
  noteCounts,
  editable,
  poolTitle,
  onOpenCocktail,
  onRenameCategory,
  onDeleteCategory,
  onAddCategory,
  agreement,
  agreementTotal,
}: {
  className?: string;
  columns: Columns;
  categories: Category[];
  cocktailsById: Map<number, Cocktail>;
  noteCounts: Map<number, number>;
  editable: boolean;
  poolTitle: string;
  onOpenCocktail: (id: number) => void;
  onRenameCategory?: (id: number, name: string) => void;
  onDeleteCategory?: (id: number) => void;
  onAddCategory?: (name: string) => void;
  agreement?: Map<string, Map<number, number>>;
  agreementTotal?: number;
}) {
  return (
    <div className={`scroll-thin flex gap-4 overflow-x-auto px-5 py-4 ${className || ""}`}>
      <Column
        id={POOL_ID}
        title={poolTitle}
        cocktailIds={columns[POOL_ID] || []}
        cocktailsById={cocktailsById}
        noteCounts={noteCounts}
        editable={editable}
        isPool
        onOpenCocktail={onOpenCocktail}
      />
      {categories.map((cat) => (
        <Column
          key={cat.id}
          id={String(cat.id)}
          title={cat.name}
          cocktailIds={columns[String(cat.id)] || []}
          cocktailsById={cocktailsById}
          noteCounts={noteCounts}
          editable={editable}
          onOpenCocktail={onOpenCocktail}
          onRename={onRenameCategory ? (name) => onRenameCategory(cat.id, name) : undefined}
          onDelete={onDeleteCategory ? () => onDeleteCategory(cat.id) : undefined}
          agreement={agreement?.get(String(cat.id))}
          agreementTotal={agreementTotal}
        />
      ))}
      {onAddCategory && <AddCategory onAdd={onAddCategory} />}
    </div>
  );
}

// Stacked, read-only boards for comparing several people at once.
function CompareView({
  users,
  currentUserId,
  compareIds,
  buildFor,
  categories,
  cocktailsById,
  noteCounts,
  onOpenCocktail,
}: {
  users: User[];
  currentUserId: number;
  compareIds: number[];
  buildFor: (uid: number) => Columns;
  categories: Category[];
  cocktailsById: Map<number, Cocktail>;
  noteCounts: Map<number, number>;
  onOpenCocktail: (id: number) => void;
}) {
  const selected = users.filter((u) => compareIds.includes(u.id));

  if (selected.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Pick one or more boards above to compare.
      </div>
    );
  }

  return (
    <div className="scroll-thin flex-1 divide-y divide-slate-200 overflow-y-auto">
      {selected.map((u) => (
        <section key={u.id} className="flex h-[440px] flex-col">
          <div className="flex items-center gap-2 px-5 pt-3 text-sm font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {u.username}
            {u.id === currentUserId && (
              <span className="text-xs font-normal text-slate-400">(you)</span>
            )}
          </div>
          <BoardStrip
            className="min-h-0 flex-1 pt-2"
            columns={buildFor(u.id)}
            categories={categories}
            cocktailsById={cocktailsById}
            noteCounts={noteCounts}
            editable={false}
            poolTitle="Uncategorized pool"
            onOpenCocktail={onOpenCocktail}
          />
        </section>
      ))}
    </div>
  );
}

// Aggregate every user's board: for each category, how many users placed each
// cocktail there. Surfaces where everyone agrees and where boards diverge.
function buildConsensus(state: BoardState, categories: Category[]) {
  const columns: Columns = { [POOL_ID]: [] };
  const agreement = new Map<string, Map<number, number>>();
  for (const c of categories) {
    columns[String(c.id)] = [];
    agreement.set(String(c.id), new Map());
  }

  const participants = new Set<number>();
  const everPlaced = new Set<number>();
  const byCat = new Map<number, Map<number, Set<number>>>();

  for (const p of state.placements) {
    if (p.category_id == null) continue;
    participants.add(p.user_id);
    everPlaced.add(p.cocktail_id);
    if (!byCat.has(p.category_id)) byCat.set(p.category_id, new Map());
    const m = byCat.get(p.category_id)!;
    if (!m.has(p.cocktail_id)) m.set(p.cocktail_id, new Set());
    m.get(p.cocktail_id)!.add(p.user_id);
  }

  for (const cat of categories) {
    const m = byCat.get(cat.id);
    if (!m) continue;
    const entries = [...m.entries()].sort((a, b) => b[1].size - a[1].size);
    const agreeMap = agreement.get(String(cat.id))!;
    for (const [cocktailId, usersSet] of entries) {
      columns[String(cat.id)].push(cocktailId);
      agreeMap.set(cocktailId, usersSet.size);
    }
  }

  for (const c of state.cocktails)
    if (!everPlaced.has(c.id)) columns[POOL_ID].push(c.id);

  return { columns, agreement, total: Math.max(participants.size, 1) };
}

// --- Header --------------------------------------------------------------
function Header({
  currentUser,
  cocktails,
  isAdmin,
  onAdmin,
  onLogout,
}: {
  currentUser: User;
  cocktails: Cocktail[];
  isAdmin: boolean;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1">
          {["#FF7A00", "#2563EB", "#A3E635", "#EC4899"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <h1 className="text-sm font-semibold tracking-tight text-slate-900">
          Cocktail Draft Board
        </h1>
      </div>
      <div className="flex-1" />
      <StatsPanel cocktails={cocktails} />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          Hi, <span className="font-medium text-slate-700">{currentUser.username}</span>
        </span>
        {isAdmin && (
          <button
            onClick={onAdmin}
            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            Admin
          </button>
        )}
        <button
          onClick={onLogout}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

// --- Toolbar (board switcher + compare picker + add cocktail) ------------
function Toolbar({
  users,
  currentUser,
  mode,
  viewedUserId,
  compareIds,
  onSingle,
  onConsensus,
  onCompare,
  onToggleCompareId,
  onAddedCocktail,
}: {
  users: User[];
  currentUser: User;
  mode: Mode;
  viewedUserId: number;
  compareIds: number[];
  onSingle: (uid: number) => void;
  onConsensus: () => void;
  onCompare: () => void;
  onToggleCompareId: (uid: number) => void;
  onAddedCocktail: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const others = users.filter((u) => u.id !== currentUser.id);

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "bg-slate-900 text-white"
        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
    }`;

  return (
    <div className="border-b border-slate-200 bg-white/70">
      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Board
        </span>
        <button
          className={pill(mode === "single" && viewedUserId === currentUser.id)}
          onClick={() => onSingle(currentUser.id)}
        >
          My board
        </button>
        {others.map((u) => (
          <button
            key={u.id}
            className={pill(mode === "single" && viewedUserId === u.id)}
            onClick={() => onSingle(u.id)}
          >
            {u.username}
          </button>
        ))}
        <button className={pill(mode === "consensus")} onClick={onConsensus}>
          ✦ Consensus
        </button>
        <button className={pill(mode === "compare")} onClick={onCompare}>
          ⊞ Compare
        </button>

        <div className="flex-1" />

        {adding ? (
          <NewCocktail
            onClose={() => setAdding(false)}
            onCreated={() => {
              setAdding(false);
              onAddedCocktail();
            }}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            + New cocktail
          </button>
        )}
      </div>

      {mode === "compare" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Showing
          </span>
          {users.map((u) => {
            const on = compareIds.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => onToggleCompareId(u.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border ${
                    on ? "border-white bg-white" : "border-slate-300"
                  }`}
                >
                  {on && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="4">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {u.username}
                {u.id === currentUser.id && " (you)"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewCocktail({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [spirit, setSpirit] = useState<string>("bourbon");
  const [recipe, setRecipe] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/cocktails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, base_spirit: spirit, recipe }),
      });
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-slate-700">New cocktail</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Temporary name or descriptor"
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Base spirit</p>
          <SpiritPicker value={spirit} onChange={(id: SpiritId) => setSpirit(id)} />
        </div>
        <textarea
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          rows={4}
          placeholder="Recipe (optional)"
          className="scroll-thin mb-4 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add cocktail"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCategory({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="w-60 shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
          }
        }}
        className="rounded-2xl border border-dashed border-slate-300 p-3"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-2 w-full rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
        >
          + Add category
        </button>
      </form>
    </div>
  );
}
