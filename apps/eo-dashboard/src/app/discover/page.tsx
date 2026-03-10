"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type CompetitionRow = {
  id: string;
  event_organizer_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  participant_limit: number | null;
  entry_fee_cents: number | null;
  currency: string | null;
  state: string;
};

type TeamProfileListItem = {
  teamProfileId: string;
  role: string;
  profile: { id: string; name: string; slug: string; logo_path: string | null } | null;
};

export default function DiscoverCompetitionsPage() {
  const session = useSession();
  const [q, setQ] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [prizeMinCents, setPrizeMinCents] = useState("");

  const [teamProfiles, setTeamProfiles] = useState<TeamProfileListItem[]>([]);
  const [selectedTeamProfileId, setSelectedTeamProfileId] = useState("");

  const [rows, setRows] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const loadTeams = useCallback(async () => {
    if (!session.accessToken) return;
    const res = await fetch("/api/v1/team-profiles", { headers: { Authorization: authHeader } });
    const body = await res.json();
    if (res.ok) {
      const data = body.data ?? [];
      setTeamProfiles(data);
      if (!selectedTeamProfileId && data.length > 0) setSelectedTeamProfileId(data[0].teamProfileId);
    }
  }, [authHeader, selectedTeamProfileId, session.accessToken]);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (skillLevel) params.set("skillLevel", skillLevel);
    if (startDateFrom) params.set("startDateFrom", startDateFrom);
    if (startDateTo) params.set("startDateTo", startDateTo);
    if (prizeMinCents) params.set("prizeMinCents", prizeMinCents);

    const res = await fetch(`/api/v1/competitions/discover?${params.toString()}`, { headers: { Authorization: authHeader } });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load competitions");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, prizeMinCents, q, session.accessToken, skillLevel, startDateFrom, startDateTo]);

  const register = useCallback(
    async (competitionId: string) => {
      if (!selectedTeamProfileId) {
        setError("Create a team profile first");
        return;
      }
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/v1/competitions/${encodeURIComponent(competitionId)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ teamProfileId: selectedTeamProfileId, roster: {} })
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to register");
        return;
      }
      if (body.data?.needsPayment) {
        setSuccess("Registration submitted. Payment required (payment flow not configured yet).");
      } else {
        setSuccess("Registration submitted. Waiting for organizer approval.");
      }
    },
    [authHeader, selectedTeamProfileId]
  );

  useEffect(() => {
    if (!session.accessToken) return;
    void loadTeams();
  }, [loadTeams, session.accessToken]);

  useEffect(() => {
    if (!session.accessToken) return;
    void load();
  }, [load, session.accessToken]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discover Competitions</h1>
          <p className="mt-2 text-sm text-zinc-300">Browse published competitions and submit team registrations.</p>
        </div>
        <Link className="text-sm underline" href="/my-teams">
          Manage teams
        </Link>
      </div>

      <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-3">
        <label className="block">
          <div className="text-sm text-zinc-300">Team</div>
          <select
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={selectedTeamProfileId}
            onChange={(e) => setSelectedTeamProfileId(e.target.value)}
            disabled={!session.accessToken || loading}
          >
            {teamProfiles.length === 0 ? <option value="">Create a team first</option> : null}
            {teamProfiles.map((t) => (
              <option key={t.teamProfileId} value={t.teamProfileId}>
                {t.profile?.name ?? t.teamProfileId} ({t.role})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Search</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="League…"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Skill level</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            placeholder="beginner/intermediate/pro"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Start date from</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={startDateFrom}
            onChange={(e) => setStartDateFrom(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Start date to</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={startDateTo}
            onChange={(e) => setStartDateTo(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Prize min (cents)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={prizeMinCents}
            onChange={(e) => setPrizeMinCents(e.target.value)}
            placeholder="1000000"
            inputMode="numeric"
          />
        </label>

        <div className="flex items-end gap-3 md:col-span-3">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={load}
            disabled={loading || !session.accessToken}
          >
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
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Dates</th>
              <th className="px-3 py-2 text-left">Registration closes</th>
              <th className="px-3 py-2 text-left">Entry fee</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">
                  {r.name}
                  <div className="text-xs text-zinc-500">{r.slug}</div>
                </td>
                <td className="px-3 py-2 text-zinc-300">
                  {r.start_date ?? "-"} → {r.end_date ?? "-"}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.registration_closes_at ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {r.entry_fee_cents ? `${r.entry_fee_cents} ${r.currency ?? ""}` : "Free"}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.state}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="rounded border border-zinc-700 px-2 py-1 text-xs"
                    onClick={() => register(r.id)}
                    disabled={loading || !session.accessToken || !selectedTeamProfileId}
                  >
                    Register
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={6}>
                  No competitions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

