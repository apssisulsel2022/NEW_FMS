import Link from "next/link";

export default function EoHomePage() {
  return (
    <main>
      <h1 className="text-2xl font-semibold">Event Organizer Dashboard</h1>
      <p className="mt-2 text-zinc-300">
        Manage competitions, teams, players, matches, and live scoring in a multi-tenant SaaS setup.
      </p>
      <div className="mt-6">
        <Link className="underline" href="/competitions">
          Go to Competitions
        </Link>
      </div>
    </main>
  );
}

