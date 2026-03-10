"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  competition_id: string;
};

export default function TeamsPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();
  const [competitionId, setCompetitionId] = useState("");

  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/teams?competitionId=${encodeURIComponent(competitionId)}`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to load teams");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, competitionId]);

  async function create() {
    if (!eventOrganizerId || !competitionId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ eventOrganizerId, competitionId, name, slug })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to create team");
      return;
    }
    setName("");
    setSlug("");
    await load();
  }

  useEffect(() => {
    if (session.accessToken && competitionId) load();
  }, [competitionId, load, session.accessToken]);

  useEffect(() => {
    if (eventOrganizerId) return;
    if (eventOrganizers.loading) return;
    if (eventOrganizers.data.length === 0) return;
    setEventOrganizerId(eventOrganizers.data[0].id);
  }, [eventOrganizerId, eventOrganizers.data, eventOrganizers.loading, setEventOrganizerId]);

  return (
    <main>
      <h1 className="text-2xl font-semibold">Teams</h1>
      <p className="mt-2 text-sm text-zinc-300">Manage teams per competition.</p>

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

        <label className="block">
          <div className="text-sm text-zinc-300">Competition ID</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="uuid"
          />
        </label>

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

        <div className="flex items-end gap-3">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={create}
            disabled={
              loading ||
              !session.accessToken ||
              !eventOrganizerId ||
              !competitionId ||
              !name ||
              !slug
            }
          >
            Create
          </button>
          <button
            className="rounded border border-zinc-700 px-3 py-2 text-sm"
            onClick={load}
            disabled={loading || !session.accessToken || !competitionId}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {eventOrganizers.error ? (
        <div className="mt-4 text-sm text-red-400">{eventOrganizers.error}</div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Competition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">{r.name}</td>
                <td className="px-3 py-2 text-zinc-300">{r.slug}</td>
                <td className="px-3 py-2 text-zinc-300">{r.competition_id}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={3}>
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
