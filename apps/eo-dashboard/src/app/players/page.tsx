"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useActiveEventOrganizer } from "@/lib/useActiveEventOrganizer";
import { useEventOrganizers } from "@/lib/useEventOrganizers";
import { useSession } from "@/lib/useSession";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  gender: string | null;
  nik_last4: string | null;
};

export default function PlayersPage() {
  const session = useSession();
  const { eventOrganizerId, setEventOrganizerId } = useActiveEventOrganizer();
  const eventOrganizers = useEventOrganizers();

  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [nik, setNik] = useState("");

  const authHeader = useMemo(() => {
    if (!session.accessToken) return "";
    return `Bearer ${session.accessToken}`;
  }, [session.accessToken]);

  const load = useCallback(async () => {
    if (!eventOrganizerId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/players?eventOrganizerId=${encodeURIComponent(eventOrganizerId)}`, {
      headers: { Authorization: authHeader }
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to load players");
      return;
    }
    setRows(body.data ?? []);
  }, [authHeader, eventOrganizerId]);

  async function create() {
    if (!eventOrganizerId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/players", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        eventOrganizerId,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? dateOfBirth : null,
        nationality: nationality ? nationality : null,
        gender: gender ? gender : null,
        nik: nik ? nik : undefined
      })
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Failed to create player");
      return;
    }
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setNationality("");
    setGender("");
    setNik("");
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
      <h1 className="text-2xl font-semibold">Players</h1>
      <p className="mt-2 text-sm text-zinc-300">Manage players and NIK data per tenant.</p>

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
          <div className="text-sm text-zinc-300">First name</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Budi"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Last name</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Santoso"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Date of birth</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Nationality</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="ID"
          />
        </label>

        <label className="block">
          <div className="text-sm text-zinc-300">Gender</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            placeholder="male/female"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="text-sm text-zinc-300">NIK (16 digit)</div>
          <input
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            value={nik}
            onChange={(e) => setNik(e.target.value)}
            inputMode="numeric"
            placeholder="3201010101010101"
          />
        </label>

        <div className="flex items-end gap-3 md:col-span-2">
          <button
            className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={create}
            disabled={loading || !session.accessToken || !eventOrganizerId || !firstName || !lastName}
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

      <div className="mt-8 overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">DOB</th>
              <th className="px-3 py-2 text-left">Nationality</th>
              <th className="px-3 py-2 text-left">Gender</th>
              <th className="px-3 py-2 text-left">NIK</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-zinc-100">
                  {r.first_name} {r.last_name}
                </td>
                <td className="px-3 py-2 text-zinc-300">{r.date_of_birth ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.nationality ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.gender ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-300">{r.nik_last4 ? `****${r.nik_last4}` : "-"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-400" colSpan={5}>
                  No players yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

