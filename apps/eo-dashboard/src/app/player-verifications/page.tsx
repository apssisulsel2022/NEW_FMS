"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type VerificationRow = {
  id: string;
  created_at: string;
  workflow_status: string;
  ai_status: string;
  submitted_at: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_reason: string | null;
  players: {
    id: string;
    player_code: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    email: string | null;
    nik_last4: string | null;
    verification_status: string;
  } | null;
};

export default function PlayerVerificationsPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();

  const [workflowStatus, setWorkflowStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  useEffect(() => {
    if (eventOrganizerId) return;
    if (eventOrganizers.loading) return;
    if (eventOrganizers.data.length === 0) return;
    setEventOrganizerId(eventOrganizers.data[0].id);
  }, [eventOrganizerId, eventOrganizers.data, eventOrganizers.loading, setEventOrganizerId]);

  const load = useCallback(async () => {
    if (!session.accessToken || !eventOrganizerId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("eventOrganizerId", eventOrganizerId);
    if (workflowStatus) params.set("workflowStatus", workflowStatus);
    if (q) params.set("q", q);

    const res = await fetch(`/api/v1/player-verifications?${params.toString()}`, { headers: { Authorization: authHeader } });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load verifications");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, eventOrganizerId, q, session.accessToken, workflowStatus]);

  useEffect(() => {
    if (!session.accessToken || !eventOrganizerId) return;
    void load();
  }, [eventOrganizerId, load, session.accessToken]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Player Verifications</h1>
          <p className="mt-2 text-sm text-zinc-300">Review verification requests and approve/reject for tournament participation.</p>
        </div>
        <button className="rounded border border-zinc-700 px-3 py-2 text-sm" onClick={load} disabled={loading || !session.accessToken}>
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-3">
        <label className="block">
          <div className="text-sm text-zinc-300">Event Organizer</div>
          {eventOrganizers.data.length > 0 ? (
            <select
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={eventOrganizerId}
              onChange={(e) => setEventOrganizerId(e.target.value)}
              disabled={!session.accessToken || loading}
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
          <div className="text-sm text-zinc-300">Status</div>
          <select
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={workflowStatus}
            onChange={(e) => setWorkflowStatus(e.target.value)}
            disabled={!session.accessToken || loading}
          >
            <option value="">All</option>
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="appealed">appealed</option>
          </select>
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Search</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name/email…"
          />
        </label>

        <div className="flex items-end justify-end md:col-span-3">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={load}
            disabled={loading || !session.accessToken || !eventOrganizerId}
          >
            Apply filters
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-left">DOB</th>
              <th className="px-3 py-2 text-left">NIK</th>
              <th className="px-3 py-2 text-left">Workflow</th>
              <th className="px-3 py-2 text-left">AI</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">
                  {r.players ? `${r.players.first_name} ${r.players.last_name}` : r.id}
                  <div className="text-xs text-zinc-500">{r.players?.player_code ?? ""}</div>
                  <div className="text-xs text-zinc-500">{r.players?.email ?? ""}</div>
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.players?.date_of_birth ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.players?.nik_last4 ? `****${r.players.nik_last4}` : "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.workflow_status}</td>
                <td className="px-3 py-2 text-zinc-300">{r.ai_status}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="rounded border border-zinc-700 px-2 py-1 text-xs" href={`/player-verifications/${r.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={6}>
                  No verification requests.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

