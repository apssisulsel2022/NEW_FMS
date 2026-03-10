"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type MatchRow = {
  id: string;
  competition_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string | null;
  match_status: string;
  home_score: number;
  away_score: number;
};

export default function MatchesPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();
  const [competitionId, setCompetitionId] = useState("");

  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/matches?competitionId=${encodeURIComponent(competitionId)}`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to load matches");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, competitionId]);

  async function create() {
    if (!eventOrganizerId || !competitionId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        eventOrganizerId,
        competitionId,
        homeTeamId,
        awayTeamId,
        scheduledAt: scheduledAt || null,
        venue: venue || null
      })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Failed to create match");
      return;
    }
    setHomeTeamId("");
    setAwayTeamId("");
    setScheduledAt("");
    setVenue("");
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
      <h1 className="text-2xl font-semibold">Matches</h1>
      <p className="mt-2 text-sm text-zinc-300">Create and list matches per competition.</p>

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
          <div className="text-sm text-zinc-300">Home Team ID</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            placeholder="uuid"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Away Team ID</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            placeholder="uuid"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Scheduled At (ISO)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="2026-03-10T18:00:00Z"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Venue (optional)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Stadium A"
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
              !homeTeamId ||
              !awayTeamId
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
              <th className="px-3 py-2 text-left">Scheduled</th>
              <th className="px-3 py-2 text-left">Home</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-left">Away</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-300">
                  {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "-"}
                </td>
                <td className="px-3 py-2 text-zinc-100">{r.home_team_id}</td>
                <td className="px-3 py-2 text-center text-zinc-100">
                  {r.home_score}-{r.away_score}
                </td>
                <td className="px-3 py-2 text-zinc-100">{r.away_team_id}</td>
                <td className="px-3 py-2 text-zinc-300">{r.match_status}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={5}>
                  No matches yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
