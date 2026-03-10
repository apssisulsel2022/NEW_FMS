export type RoundRobinMatchup<TTeamId extends string = string> = {
  round: number;
  homeTeamId: TTeamId;
  awayTeamId: TTeamId;
};

export function generateRoundRobinFixtures<TTeamId extends string>(
  teamIds: readonly TTeamId[],
  options?: { doubleRound?: boolean }
): RoundRobinMatchup<TTeamId>[] {
  const doubleRound = options?.doubleRound ?? true;

  const originalTeams = [...teamIds];
  if (originalTeams.length < 2) return [];

  const hasBye = originalTeams.length % 2 === 1;
  const teams = hasBye ? ([...originalTeams, "__BYE__" as TTeamId] as TTeamId[]) : originalTeams;

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  const left = teams.slice(0, half);
  const right = teams.slice(half).reverse();

  const fixtures: RoundRobinMatchup<TTeamId>[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = left[i];
      const b = right[i];
      if (a === ("__BYE__" as TTeamId) || b === ("__BYE__" as TTeamId)) continue;

      const isEvenRound = round % 2 === 0;
      const homeTeamId = isEvenRound ? b : a;
      const awayTeamId = isEvenRound ? a : b;
      fixtures.push({ round, homeTeamId, awayTeamId });
    }

    const fixed = left[0];
    const movedFromLeft = left.splice(1, 1)[0];
    const movedFromRight = right.shift()!;
    left.splice(1, 0, movedFromRight);
    right.push(movedFromLeft);
    left[0] = fixed;
  }

  if (!doubleRound) return fixtures;

  const secondLeg = fixtures.map((m) => ({
    round: m.round + rounds,
    homeTeamId: m.awayTeamId,
    awayTeamId: m.homeTeamId
  }));

  return fixtures.concat(secondLeg);
}

