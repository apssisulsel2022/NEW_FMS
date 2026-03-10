"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type TeamProfileListItem = {
  teamProfileId: string;
  role: string;
  profile: { id: string; name: string; slug: string; logo_path: string | null; description: string | null } | null;
};

export default function MyTeamsPage() {
  const session = useSession();
  const [rows, setRows] = useState<TeamProfileListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [inviteToken, setInviteToken] = useState("");

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/team-profiles", { headers: { Authorization: authHeader } });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load teams");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, session.accessToken]);

  const create = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/v1/team-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ name, slug, description: description || null })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to create team");
      return;
    }
    setName("");
    setSlug("");
    setDescription("");
    setSuccess("Team created");
    await load();
  }, [authHeader, description, load, name, slug]);

  const acceptInvite = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/v1/team-invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ token: inviteToken })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to accept invitation");
      return;
    }
    setInviteToken("");
    setSuccess("Invitation accepted");
    await load();
  }, [authHeader, inviteToken, load]);

  useEffect(() => {
    if (!session.accessToken) return;
    void load();
  }, [load, session.accessToken]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Teams</h1>
          <p className="mt-2 text-sm text-zinc-300">Create team profiles, invite members, and manage registrations.</p>
        </div>
        <Link className="text-sm underline" href="/discover">
          Discover competitions
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Create team</h2>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Name</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team A"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Slug</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="team-a"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Description</div>
              <textarea
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>
            <div className="flex justify-end">
              <button
                className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                onClick={create}
                disabled={loading || !session.accessToken || !name}
              >
                Create
              </button>
            </div>
          </div>
        </section>

        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Accept invitation</h2>
          <p className="mt-1 text-xs text-zinc-400">Paste the invite token from your team captain/manager.</p>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Invite token</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="token…"
              />
            </label>
            <div className="flex justify-end">
              <button
                className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                onClick={acceptInvite}
                disabled={loading || !session.accessToken || !inviteToken}
              >
                Accept
              </button>
            </div>
          </div>
        </section>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.teamProfileId}>
                <td className="px-3 py-2 text-zinc-100">{r.profile?.name ?? r.teamProfileId}</td>
                <td className="px-3 py-2 text-zinc-300">{r.profile?.slug ?? ""}</td>
                <td className="px-3 py-2 text-zinc-300">{r.role}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="rounded border border-zinc-700 px-2 py-1 text-xs" href={`/my-teams/${r.teamProfileId}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={4}>
                  No teams yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

