"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type VerificationRow = {
  id: string;
  created_at: string;
  player_id: string;
  workflow_status: string;
  submitted_at: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_reason: string | null;
  players: { id: string; first_name: string; last_name: string; player_code: string; email: string | null } | null;
};

export default function TeamVerificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [teamProfileId, setTeamProfileId] = useState("");

  const [playerId, setPlayerId] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [q, setQ] = useState("");

  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setTeamProfileId(p.id));
  }, [params]);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!session.accessToken || !teamProfileId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const params = new URLSearchParams();
    params.set("teamProfileId", teamProfileId);
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
  }, [authHeader, q, session.accessToken, teamProfileId, workflowStatus]);

  const createRequest = useCallback(async () => {
    if (!playerId.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/v1/player-verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ teamProfileId, playerId: playerId.trim() })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to create request");
      return;
    }
    setPlayerId("");
    setSuccess("Verification request created");
    await load();
  }, [authHeader, load, playerId, teamProfileId]);

  useEffect(() => {
    if (!session.accessToken || !teamProfileId) return;
    void load();
  }, [load, session.accessToken, teamProfileId]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Player Verifications</h1>
          <p className="mt-2 text-sm text-zinc-300">Create verification requests and track approval/rejection history.</p>
        </div>
        <Link className="text-sm underline" href={`/my-teams/${teamProfileId}`}>
          Back
        </Link>
      </div>

      <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-3">
        <label className="block md:col-span-2">
          <div className="text-sm text-zinc-300">Create request (Player ID)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="player uuid"
          />
        </label>
        <div className="flex items-end justify-end">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={createRequest}
            disabled={loading || !session.accessToken || !teamProfileId || !playerId.trim()}
          >
            Create
          </button>
        </div>

        <label className="block">
          <div className="text-sm text-zinc-300">Status</div>
          <select
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={workflowStatus}
            onChange={(e) => setWorkflowStatus(e.target.value)}
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

        <label className="block md:col-span-2">
          <div className="text-sm text-zinc-300">Search</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name/email…"
          />
        </label>

        <div className="flex items-end justify-end md:col-span-3">
          <button className="rounded border border-zinc-700 px-3 py-2 text-sm" onClick={load} disabled={loading || !session.accessToken}>
            Apply filters
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-left">Workflow</th>
              <th className="px-3 py-2 text-left">Decision</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">
                  {r.players ? `${r.players.first_name} ${r.players.last_name}` : r.player_id}
                  <div className="text-xs text-zinc-500">{r.players?.player_code ?? ""}</div>
                  <div className="text-xs text-zinc-500">{r.players?.email ?? ""}</div>
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.workflow_status}</td>
                <td className="px-3 py-2 text-zinc-300">{r.decision ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  <Link className="rounded border border-zinc-700 px-2 py-1 text-xs" href={`/player-verifications/${r.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={4}>
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
