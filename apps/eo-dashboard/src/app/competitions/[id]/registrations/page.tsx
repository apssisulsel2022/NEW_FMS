"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type RegistrationRow = {
  id: string;
  created_at: string;
  registration_status: string;
  payment_status: string;
  team_profile_id: string;
  team_profiles: { id: string; name: string; slug: string; owner_user_id: string } | null;
};

export default function CompetitionRegistrationsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [competitionId, setCompetitionId] = useState("");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
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

  const load = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(
      `/api/v1/competitions/${encodeURIComponent(competitionId)}/registrations?registrationStatus=pending`,
      { headers: { Authorization: authHeader } }
    );
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load registrations");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, competitionId]);

  const decide = useCallback(
    async (participantId: string, decision: "approved" | "denied") => {
      if (!competitionId) return;
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(
        `/api/v1/competitions/${encodeURIComponent(competitionId)}/registrations/${encodeURIComponent(participantId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ decision })
        }
      );
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to update registration");
        return;
      }
      setSuccess(`Registration ${decision}`);
      await load();
      return body.data;
    },
    [authHeader, competitionId, load]
  );

  useEffect(() => {
    if (!session.accessToken || !competitionId) return;
    void load();
  }, [competitionId, load, session.accessToken]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team Registrations</h1>
          <p className="mt-2 text-sm text-zinc-300">Review pending registrations and approve/deny.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="rounded border border-zinc-700 px-3 py-2 text-sm"
            href={`/api/v1/competitions/${encodeURIComponent(competitionId)}/registrations/export`}
          >
            Export CSV
          </a>
          <Link className="text-sm underline" href={`/competitions/${competitionId}/manage`}>
            Back
          </Link>
        </div>
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
              <th className="px-3 py-2 text-left">Payment</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">{r.team_profiles?.name ?? r.team_profile_id}</td>
                <td className="px-3 py-2 text-zinc-300">{r.team_profiles?.slug ?? ""}</td>
                <td className="px-3 py-2 text-zinc-300">{r.payment_status}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded border border-zinc-700 px-2 py-1 text-xs"
                      onClick={() => decide(r.id, "approved")}
                      disabled={loading || !session.accessToken}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded border border-zinc-700 px-2 py-1 text-xs"
                      onClick={() => decide(r.id, "denied")}
                      disabled={loading || !session.accessToken}
                    >
                      Deny
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={4}>
                  No pending registrations.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

