"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type Analytics = {
  competition_id: string;
  event_organizer_id: string;
  state: string;
  published_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  participants_total: number;
  teams_total: number;
  players_total: number;
  matches_total: number;
  notifications_total: number;
} | null;

export default function CompetitionManagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [competitionId, setCompetitionId] = useState<string>("");
  const [analytics, setAnalytics] = useState<Analytics>(null);
  const [csv, setCsv] = useState("name,slug\nTeam A,team-a\nTeam B,team-b");
  const [scheduleStartAt, setScheduleStartAt] = useState(new Date().toISOString());
  const [intervalMinutes, setIntervalMinutes] = useState("120");
  const [doubleRound, setDoubleRound] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setCompetitionId(p.id));
  }, [params]);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const loadAnalytics = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/competitions/${encodeURIComponent(competitionId)}/analytics`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load analytics");
      return;
    }
    setAnalytics(body.data ?? null);
  }, [authHeader, competitionId]);

  const importCsv = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/competitions/${encodeURIComponent(competitionId)}/participants/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ csv, hasHeader: true })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to import participants");
      return;
    }
    setSuccess(`Imported ${body.data?.createdTeams ?? 0} teams`);
    await loadAnalytics();
  }, [authHeader, competitionId, csv, loadAnalytics]);

  const generateSchedule = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/competitions/${encodeURIComponent(competitionId)}/schedule/round-robin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        startAt: scheduleStartAt,
        matchIntervalMinutes: Number(intervalMinutes),
        doubleRound
      })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to generate schedule");
      return;
    }
    setSuccess(`Created ${body.data?.created ?? 0} matches`);
    await loadAnalytics();
  }, [authHeader, competitionId, doubleRound, intervalMinutes, loadAnalytics, scheduleStartAt]);

  useEffect(() => {
    if (!session.accessToken || !competitionId) return;
    void loadAnalytics();
  }, [competitionId, loadAnalytics, session.accessToken]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Competition Management</h1>
          <p className="mt-2 text-sm text-zinc-300">Participants, scheduling, notifications, and analytics.</p>
        </div>
        <Link className="text-sm underline" href="/competitions">
          Back
        </Link>
      </div>

      <div className="mt-6 rounded border border-zinc-800 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-zinc-300">Competition ID</div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              href={`/competitions/${competitionId}/registrations`}
            >
              Registrations
            </Link>
            <button
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              onClick={loadAnalytics}
              disabled={loading || !session.accessToken || !competitionId}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-2 break-all text-xs text-zinc-400">{competitionId}</div>
        <pre className="mt-4 overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-200">
          {JSON.stringify(analytics ?? {}, null, 2)}
        </pre>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Bulk participant import (CSV → teams)</h2>
          <p className="mt-1 text-xs text-zinc-400">Columns: name, slug. Header required.</p>
          <textarea
            className="mt-3 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs"
            rows={8}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={importCsv}
              disabled={loading || !session.accessToken || !competitionId}
            >
              Import
            </button>
          </div>
        </section>

        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Automated scheduling (round-robin)</h2>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Start at (ISO)</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={scheduleStartAt}
                onChange={(e) => setScheduleStartAt(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Interval minutes</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} />
              Double round
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={generateSchedule}
              disabled={loading || !session.accessToken || !competitionId}
            >
              Generate
            </button>
          </div>
        </section>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}
    </main>
  );
}
