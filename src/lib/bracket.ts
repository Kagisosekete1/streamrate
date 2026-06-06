// Single-elimination bracket helpers

export interface SeededTeam { id: string; team_name: string; }

export function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

export interface PendingMatch {
  round: number;
  position: number;
  team_a_id: string | null;
  team_b_id: string | null;
}

/**
 * Generates a full single-elimination bracket. Byes are represented as null
 * team slots in round 1 and propagate to round 2.
 */
export function generateSingleElimination(teams: SeededTeam[]): PendingMatch[] {
  const size = nextPowerOfTwo(teams.length);
  const seeded: (SeededTeam | null)[] = [...teams];
  while (seeded.length < size) seeded.push(null);

  const matches: PendingMatch[] = [];
  // Round 1
  for (let i = 0; i < size / 2; i++) {
    matches.push({
      round: 1,
      position: i + 1,
      team_a_id: seeded[i * 2]?.id ?? null,
      team_b_id: seeded[i * 2 + 1]?.id ?? null,
    });
  }
  // Subsequent empty rounds
  let perRound = size / 4;
  let round = 2;
  while (perRound >= 1) {
    for (let i = 0; i < perRound; i++) {
      matches.push({ round, position: i + 1, team_a_id: null, team_b_id: null });
    }
    perRound = Math.floor(perRound / 2);
    round += 1;
  }
  return matches;
}