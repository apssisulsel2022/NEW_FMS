"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type CompetitionRow = {
  id: string;
  name: string;
  slug: string;
  season: string | null;
  published_at: string | null;
};

export default function CompetitionsPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();

  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [season, setSeason] = useState("");

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!eventOrganizerId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/competitions?eventOrganizerId=${encodeURIComponent(eventOrganizerId)}`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to load competitions");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, eventOrganizerId]);

  async function create() {
    if (!eventOrganizerId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ eventOrganizerId, name, slug, season: season || null })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to create competition");
      return;
    }
    setName("");
    setSlug("");
    setSeason("");
    await load();
  }

  async function publish(id: string) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/competitions/${id}/publish`, {
      method: "POST",
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to publish competition");
      return;
    }
    await load();
  }

  useEffect(() => {
    if (session.accessToken && eventOrganizerId) load();
  }, [eventOrganizerId, load, session.accessToken]);

  useEffect(() => {
    if (eventOrganizerId) return;
    if (eventOrganizers.loading) return;
    if (eventOrganizers.data.length === 0) return;
    setEventOrganizerId(eventOrganizers.data[0].id);
  }, [eventOrganizerId, eventOrganizers.data, eventOrganizers.loading, setEventOrganizerId]);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Competitions</h1>
      <p className="mt-2 text-sm text-zinc-300">
        Select an Event Organizer (tenant), then create and publish competitions.
      </p>

      <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm text-zinc-300">Event Organizer ID</div>
          {eventOrganizers.data.length > 0 ? (
            <select
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={eventOrganizerId}
              onChange={(e) => setEventOrganizerId(e.target.value)}
            >
              <option value="" disabled>
                Select tenant…
              </option>
              {eventOrganizers.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={eventOrganizerId}
              onChange={(e) => setEventOrganizerId(e.target.value)}
              placeholder="uuid"
            />
          )}
        </label>

        <div className="flex items-end justify-end">
          <Link className="text-sm underline" href="/login">
            {session.userId ? "Signed in" : "Go to login"}
          </Link>
        </div>

        <label className="block">
          <div className="text-sm text-zinc-300">Name</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="National League 2026"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Slug</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="national-league-2026"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Season (optional)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="2026"
          />
        </label>

        <div className="flex items-end gap-3">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={create}
            disabled={loading || !session.accessToken || !eventOrganizerId || !name || !slug}
          >
            Create
          </button>
          <button
            className="rounded border border-zinc-700 px-3 py-2 text-sm"
            onClick={load}
            disabled={loading || !session.accessToken || !eventOrganizerId}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {eventOrganizers.error ? (
        <div className="mt-4 text-sm text-red-400">{eventOrganizers.error}</div>
      ) : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Season</th>
              <th className="px-3 py-2 text-left">Published</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">{r.name}</td>
                <td className="px-3 py-2 text-zinc-300">{r.slug}</td>
                <td className="px-3 py-2 text-zinc-300">{r.season ?? ""}</td>
                <td className="px-3 py-2 text-zinc-300">{r.published_at ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="rounded border border-zinc-700 px-2 py-1 text-xs"
                    onClick={() => publish(r.id)}
                    disabled={loading || !session.accessToken || !!r.published_at}
                  >
                    Publish
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={5}>
                  No competitions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
