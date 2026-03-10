import "./globals.css";

import Link from "next/link";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-zinc-950 text-zinc-50">
        <header className="border-b border-zinc-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link className="font-semibold" href="/">
              EO Dashboard
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-300">
              <Link className="hover:text-zinc-50" href="/competitions">
                Competitions
              </Link>
              <Link className="hover:text-zinc-50" href="/discover">
                Discover
              </Link>
              <Link className="hover:text-zinc-50" href="/my-teams">
                My Teams
              </Link>
              <Link className="hover:text-zinc-50" href="/teams">
                Teams
              </Link>
              <Link className="hover:text-zinc-50" href="/players">
                Players
              </Link>
              <Link className="hover:text-zinc-50" href="/player-verifications">
                Verifications
              </Link>
              <Link className="hover:text-zinc-50" href="/matches">
                Matches
              </Link>
              <Link className="hover:text-zinc-50" href="/login">
                Login
              </Link>
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}

