"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@/lib/useSession";
import { createSupabaseBrowserAuthedClient } from "@/lib/supabaseBrowserAuthed";

type RosterRow = {
  id: string;
  team_id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  roster_status: string;
  start_date: string | null;
  end_date: string | null;
  players: {
    id: string;
    player_code: string;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    email: string | null;
    phone: string | null;
    primary_position: string | null;
    jersey_number_preference: number | null;
  } | null;
};

export default function TeamRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const [teamId, setTeamId] = useState("");

  const [q, setQ] = useState("");
  const [rosterStatus, setRosterStatus] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);

  const [csv, setCsv] = useState(
    "first_name,last_name,date_of_birth,email,phone,primary_position,jersey_number,roster_status,emergency_contact_name,emergency_contact_phone,address\nJohn,Doe,2008-01-10,john@example.com,08123456789,GK,1,active,Jane Doe,08111111111,Jakarta"
  );

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [primaryPosition, setPrimaryPosition] = useState("");
  const [jerseyPref, setJerseyPref] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setTeamId(p.id));
  }, [params]);

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!session.accessToken || !teamId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (rosterStatus) qs.set("rosterStatus", rosterStatus);

    const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/roster?${qs.toString()}`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load roster");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, q, rosterStatus, session.accessToken, teamId]);

  const addPlayer = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        player: {
          firstName,
          lastName,
          dateOfBirth,
          email: email || null,
          phone,
          address: address || null,
          emergencyContactName,
          emergencyContactPhone,
          primaryPosition,
          jerseyNumberPreference: jerseyPref ? Number(jerseyPref) : null
        },
        roster: { jerseyNumber: jerseyPref ? Number(jerseyPref) : null, position: primaryPosition, rosterStatus: "active" }
      })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to add player");
      return;
    }
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setEmail("");
    setPhone("");
    setAddress("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setPrimaryPosition("");
    setJerseyPref("");
    setSuccess("Player added");
    await load();
  }, [
    address,
    authHeader,
    dateOfBirth,
    email,
    emergencyContactName,
    emergencyContactPhone,
    firstName,
    jerseyPref,
    lastName,
    load,
    phone,
    primaryPosition,
    teamId
  ]);

  const updateEntry = useCallback(
    async (teamPlayerId: string, patch: { rosterStatus?: string; position?: string | null; jerseyNumber?: number | null }) => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/roster/${encodeURIComponent(teamPlayerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify(patch)
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to update roster entry");
        return;
      }
      setSuccess("Roster updated");
      await load();
      return body.data;
    },
    [authHeader, load, teamId]
  );

  const removeEntry = useCallback(
    async (teamPlayerId: string) => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/roster/${encodeURIComponent(teamPlayerId)}`, {
        method: "DELETE",
        headers: { Authorization: authHeader }
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body?.error?.message ?? "Failed to remove player");
        return;
      }
      setSuccess("Player removed");
      await load();
      return body.data;
    },
    [authHeader, load, teamId]
  );

  const importCsv = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/roster/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ csv, hasHeader: true })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to import roster");
      return;
    }
    setSuccess(`Imported ${body.data?.created ?? 0} players`);
    await load();
  }, [authHeader, csv, load, teamId]);

  useEffect(() => {
    if (!session.accessToken || !teamId) return;
    void load();
  }, [load, session.accessToken, teamId]);

  useEffect(() => {
    if (!session.accessToken || !teamId) return;
    const sb = createSupabaseBrowserAuthedClient(session.accessToken);
    const channel = sb
      .channel(`roster:${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_players", filter: `team_id=eq.${teamId}` },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [load, session.accessToken, teamId]);

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Team Roster</h1>
          <p className="mt-2 text-sm text-zinc-300">Add, edit, import, and export players with real-time updates.</p>
        </div>
        <Link className="text-sm underline" href="/my-teams">
          Back
        </Link>
      </div>

      <div className="mt-6 grid gap-4 rounded border border-zinc-800 p-4 md:grid-cols-3">
        <label className="block">
          <div className="text-sm text-zinc-300">Search</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name/email…"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Status</div>
          <select
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={rosterStatus}
            onChange={(e) => setRosterStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="active">active</option>
            <option value="injured">injured</option>
            <option value="suspended">suspended</option>
            <option value="inactive">inactive</option>
          </select>
        </label>

        <div className="flex items-end gap-3">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={load}
            disabled={loading || !session.accessToken || !teamId}
          >
            Apply
          </button>
          <a
            className="rounded border border-zinc-700 px-3 py-2 text-sm"
            href={`/api/v1/teams/${encodeURIComponent(teamId)}/roster/export`}
          >
            Export CSV
          </a>
        </div>
      </div>

      {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}
      {success ? <div className="mt-4 text-sm text-emerald-300">{success}</div> : null}
      {loading ? <div className="mt-4 text-sm text-zinc-400">Loading…</div> : null}

      <div className="mt-6 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-left">DOB</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Position</th>
              <th className="px-3 py-2 text-left">Jersey</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">
                  {r.players ? `${r.players.first_name} ${r.players.last_name}` : r.player_id}
                  <div className="text-xs text-zinc-500">{r.players?.player_code ?? ""}</div>
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.players?.date_of_birth ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {r.players?.email ?? ""} {r.players?.phone ? `(${r.players.phone})` : ""}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.position ?? r.players?.primary_position ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.jersey_number ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.roster_status}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded border border-zinc-700 px-2 py-1 text-xs"
                      onClick={() => updateEntry(r.id, { rosterStatus: "injured" })}
                      disabled={loading}
                    >
                      Injured
                    </button>
                    <button
                      className="rounded border border-zinc-700 px-2 py-1 text-xs"
                      onClick={() => updateEntry(r.id, { rosterStatus: "suspended" })}
                      disabled={loading}
                    >
                      Suspend
                    </button>
                    <button className="rounded border border-zinc-700 px-2 py-1 text-xs" onClick={() => removeEntry(r.id)} disabled={loading}>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={7}>
                  No roster entries.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Add player</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <div className="text-sm text-zinc-300">First name</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Last name</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Date of birth</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD" />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Jersey preference</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={jerseyPref} onChange={(e) => setJerseyPref(e.target.value)} inputMode="numeric" placeholder="10" />
            </label>
            <label className="block md:col-span-2">
              <div className="text-sm text-zinc-300">Position</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={primaryPosition} onChange={(e) => setPrimaryPosition(e.target.value)} placeholder="GK/DF/MF/FW" />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Email</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Phone</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <div className="text-sm text-zinc-300">Address</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Emergency contact name</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-zinc-300">Emergency contact phone</div>
              <input className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={addPlayer}
              disabled={
                loading ||
                !session.accessToken ||
                !teamId ||
                !firstName ||
                !lastName ||
                !dateOfBirth ||
                !phone ||
                !primaryPosition ||
                !emergencyContactName ||
                !emergencyContactPhone
              }
            >
              Add
            </button>
          </div>
        </section>

        <section className="rounded border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold">Bulk import (CSV)</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Columns: first_name,last_name,date_of_birth,email,phone,primary_position,jersey_number,roster_status,emergency_contact_name,emergency_contact_phone,address
          </p>
          <textarea className="mt-3 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="mt-3 flex justify-end">
            <button className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900" onClick={importCsv} disabled={loading || !session.accessToken || !teamId}>
              Import
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

