import { notFound } from "next/navigation";

import { createSupabasePublicClient } from "@/lib/supabasePublic";

export const revalidate = 0;

export default async function CompetitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabasePublicClient();

  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (competitionError) throw competitionError;
  if (!competition) notFound();

  const [{ data: standings }, { data: matches }] = await Promise.all([
    supabase
      .from("standings")
      .select("team_id, played, wins, draws, losses, goals_for, goals_against, goal_diff, points")
      .eq("competition_id", competition.id)
      .order("points", { ascending: false })
      .order("goal_diff", { ascending: false })
      .order("goals_for", { ascending: false }),
    supabase
      .from("matches")
      .select("id, scheduled_at, match_status, home_team_id, away_team_id, home_score, away_score")
      .eq("competition_id", competition.id)
      .order("scheduled_at", { ascending: true })
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{competition.name}</h1>
          <p className="mt-1 text-sm text-zinc-300">{competition.season ?? ""}</p>
        </div>
        <div className="text-right text-sm text-zinc-300">
          <div>Slug: {competition.slug}</div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Standings</h2>
        <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-right">P</th>
                <th className="px-3 py-2 text-right">W</th>
                <th className="px-3 py-2 text-right">D</th>
                <th className="px-3 py-2 text-right">L</th>
                <th className="px-3 py-2 text-right">GD</th>
                <th className="px-3 py-2 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {(standings ?? []).map((row) => (
                <tr key={row.team_id}>
                  <td className="px-3 py-2 text-zinc-100">{row.team_id}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.played}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.wins}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.draws}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.losses}</td>
                  <td className="px-3 py-2 text-right text-zinc-300">{row.goal_diff}</td>
                  <td className="px-3 py-2 text-right font-semibold text-zinc-100">{row.points}</td>
                </tr>
              ))}
              {(standings ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-400" colSpan={7}>
                    No standings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Fixtures</h2>
        <div className="mt-3 overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-200">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Home</th>
                <th className="px-3 py-2 text-center">Score</th>
                <th className="px-3 py-2 text-left">Away</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {(matches ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 text-zinc-300">
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2 text-zinc-100">{m.home_team_id}</td>
                  <td className="px-3 py-2 text-center text-zinc-100">
                    {m.home_score}-{m.away_score}
                  </td>
                  <td className="px-3 py-2 text-zinc-100">{m.away_team_id}</td>
                  <td className="px-3 py-2 text-zinc-300">{m.match_status}</td>
                </tr>
              ))}
              {(matches ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-zinc-400" colSpan={5}>
                    No fixtures yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

