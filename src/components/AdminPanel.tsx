"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

export function AdminPanel({
  currentUserId,
  onClose,
}: {
  currentUserId: number;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      setError("Couldn't load users.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">
            Manage users
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

        <div className="p-5">
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onChanged,
}: {
  user: AdminUser;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dirty =
    username.trim() !== user.username ||
    password.length > 0 ||
    isAdmin !== user.is_admin;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          username,
          is_admin: isAdmin,
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Save failed.");
        return;
      }
      setPassword("");
      setMsg("Saved");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${user.username}? Their board, placements, and notes are removed.`))
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Delete failed.");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[8rem] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            Username {isSelf && <span className="text-slate-300">(you)</span>}
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-slate-400">
            New password
          </label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="leave blank to keep"
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Admin
        </label>
        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Save
          </button>
          {!isSelf && (
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${
            msg === "Saved" ? "text-green-600" : "text-red-500"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
