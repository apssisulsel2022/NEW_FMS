"use client";

import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useSession } from "@/lib/useSession";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function signUp() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  async function signOut() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <main className="max-w-md">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-zinc-300">Use Supabase Auth (email & password).</p>

      {session.loading ? (
        <div className="mt-6 text-sm text-zinc-400">Loading…</div>
      ) : session.userId ? (
        <div className="mt-6 rounded border border-zinc-800 p-4">
          <div className="text-sm text-zinc-300">Signed in as</div>
          <div className="mt-1 break-all text-sm">{session.userId}</div>
          <button
            className="mt-4 rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            onClick={signOut}
            disabled={busy}
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4 rounded border border-zinc-800 p-4">
          <label className="block">
            <div className="text-sm text-zinc-300">Email</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <div className="text-sm text-zinc-300">Password</div>
            <input
              className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
          </label>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <div className="flex items-center gap-3">
            <button
              className="rounded bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
              onClick={signIn}
              disabled={busy}
            >
              Sign in
            </button>
            <button
              className="rounded border border-zinc-700 px-3 py-2 text-sm"
              onClick={signUp}
              disabled={busy}
            >
              Sign up
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

