"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";

type TeamProfile = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  owner_user_id: string;
};

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type TeamInvitation = {
  id: string;
  created_at: string;
  role: string;
  invited_email: string | null;
  invited_user_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  status: string;
};

type Registration = {
  id: string;
  created_at: string;
  registration_status: string;
  payment_status: string;
  competitions: { id: string; name: string; slug: string; start_date: string | null; end_date: string | null } | null;
};

export default function TeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [teamProfileId, setTeamProfileId] = useState("");
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"player" | "manager" | "captain">("player");
  const [latestToken, setLatestToken] = useState<string | null>(null);

  const [messageCompetitionId, setMessageCompetitionId] = useState("");
  const [messageText, setMessageText] = useState("");

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

  const loadAll = useCallback(async () => {
    if (!session.accessToken || !teamProfileId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const [pRes, mRes, iRes, rRes] = await Promise.all([
      fetch(`/api/v1/team-profiles/${encodeURIComponent(teamProfileId)}`, { headers: { Authorization: authHeader } }),
      fetch(`/api/v1/team-profiles/${encodeURIComponent(teamProfileId)}/members`, { headers: { Authorization: authHeader } }),
      fetch(`/api/v1/team-profiles/${encodeURIComponent(teamProfileId)}/invitations`, { headers: { Authorization: authHeader } }),
      fetch(`/api/v1/team-profiles/${encodeURIComponent(teamProfileId)}/registrations`, { headers: { Authorization: authHeader } })
    ]);

    const [pBody, mBody, iBody, rBody] = await Promise.all([pRes.json(), mRes.json(), iRes.json(), rRes.json()]);
    setLoading(false);

    if (!pRes.ok) {
      setError(pBody?.error?.message ?? "Failed to load team");
      return;
    }
    if (!mRes.ok) {
      setError(mBody?.error?.message ?? "Failed to load members");
      return;
    }
    if (!iRes.ok) {
      setError(iBody?.error?.message ?? "Failed to load invitations");
      return;
    }
    if (!rRes.ok) {
      setError(rBody?.error?.message ?? "Failed to load registrations");
      return;
    }

    setProfile(pBody.data ?? null);
    setMembers(mBody.data ?? []);
    setInvitations(iBody.data ?? []);
    setRegistrations(rBody.data ?? []);
  }, [authHeader, session.accessToken, teamProfileId]);

  const invite = useCallback(async () => {
    if (!teamProfileId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLatestToken(null);
    const res = await fetch(`/api/v1/team-profiles/${encodeURIComponent(teamProfileId)}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ invitedEmail: inviteEmail || null, role: inviteRole })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to create invitation");
      return;
    }
    setInviteEmail("");
    setLatestToken(body.data?.token ?? null);
    setSuccess("Invitation created");
    await loadAll();
  }, [authHeader, inviteEmail, inviteRole, loadAll, teamProfileId]);

  const sendMessage = useCallback(async () => {
    if (!messageCompetitionId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/competitions/${encodeURIComponent(messageCompetitionId)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ teamProfileId, message: messageText })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to send message");
      return;
    }
    setMessageText("");
    setSuccess("Message sent to organizer");
    return body.data;
  }, [authHeader, messageCompetitionId, messageText, teamProfileId]);

  useEffect(() => {
    if (!session.accessToken || !teamProfileId) return;
    void loadAll();
  }, [loadAll, session.accessToken, teamProfileId]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{profile?.name ?? "Team"}</h1>
          <p className="mt-2 text-sm text-zinc-300">{profile?.description ?? ""}</p>
        </div>
        <Link className="text-sm underline" href="/my-teams">
          Back
        </Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Members</h2>
            <button className="rounded border border-zinc-700 px-3 py-2 text-sm" onClick={loadAll} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-200">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-zinc-100">{m.profiles?.full_name ?? m.user_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{m.role}</td>
                  </tr>
                ))}
                {members.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-zinc-400" colSpan={2}>
                      No members.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Invite member</h2>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <div className="text-sm text-zinc-300">Email (optional)</div>
              <input
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Role</div>
              <select
                className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
              >
                <option value="player">player</option>
                <option value="manager">manager</option>
              </select>
            </label>
            <div className="flex justify-end">
              <button
                className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                onClick={invite}
                disabled={loading || !session.accessToken || !teamProfileId}
              >
                Create invite
              </button>
            </div>

            {latestToken ? (
              <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200">
                Invite token: <span className="break-all">{latestToken}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold">Invitations</h3>
            <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-200">
                  <tr>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Accepted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-2 text-zinc-300">{inv.created_at}</td>
                      <td className="px-3 py-2 text-zinc-300">{inv.role}</td>
                      <td className="px-3 py-2 text-zinc-300">{inv.invited_email ?? ""}</td>
                      <td className="px-3 py-2 text-zinc-300">{inv.accepted_at ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                  {invitations.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-zinc-400" colSpan={4}>
                        No invitations.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 rounded border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold">Registrations</h2>
        <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left">Competition</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-zinc-100">{r.competitions?.name ?? r.competitions?.id ?? r.id}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.registration_status}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.payment_status}</td>
                </tr>
              ))}
              {registrations.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-zinc-400" colSpan={3}>
                    No registrations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold">Message organizer</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block md:col-span-1">
            <div className="text-sm text-zinc-300">Competition ID</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={messageCompetitionId}
              onChange={(e) => setMessageCompetitionId(e.target.value)}
              placeholder="uuid"
            />
          </label>
          <label className="block md:col-span-2">
            <div className="text-sm text-zinc-300">Message</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Hello organizer…"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={sendMessage}
            disabled={loading || !session.accessToken || !teamProfileId || !messageCompetitionId || !messageText}
          >
            Send
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}
    </main>
  );
}

