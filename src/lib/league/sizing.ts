/**
 * League size and roster logic (Zach, 2026-10-04). Pure and show-agnostic: driven by cast size.
 *
 *   copies       = 1 for 3-4 teams, 2 for 5-8, 3 for 9-12
 *   totalDancers = castUnits x rolesPerUnit x copies      (DWTS: celebrity and pro are separate draftable dancers)
 *   perTeam      = largest multiple of rolesPerUnit <= floor(totalDancers / teams)   (DWTS: largest EVEN number)
 *   roster       = perTeam split evenly across roles (DWTS: half pros, half celebrities)
 *   leftover     = totalDancers - perTeam x teams  -> stays undrafted
 *                  TODO(free-agents): store leftovers as a future free-agent pool.
 */
export const MIN_TEAMS = 3;
export const MAX_TEAMS = 12;

export function copiesForTeams(teams: number): number {
  assertTeams(teams);
  if (teams <= 4) return 1;
  if (teams <= 8) return 2;
  return 3;
}

export interface LeagueSizing {
  teams: number;
  castUnits: number;
  copies: number;
  totalDancers: number;
  perTeam: number;
  /** Roster slots per role, e.g. { celebrity: 4, pro: 4 }. */
  perRole: number;
  leftover: number;
}

export function assertTeams(teams: number): void {
  if (!Number.isInteger(teams) || teams < MIN_TEAMS || teams > MAX_TEAMS)
    throw new RangeError(`Team count must be a whole number from ${MIN_TEAMS} to ${MAX_TEAMS}`);
}

export function leagueSizing(castUnits: number, teams: number, rolesPerUnit = 2): LeagueSizing {
  assertTeams(teams);
  if (!Number.isInteger(castUnits) || castUnits < 1) throw new RangeError("Cast size must be a positive whole number");
  const copies = copiesForTeams(teams);
  const totalDancers = castUnits * rolesPerUnit * copies;
  const fair = Math.floor(totalDancers / teams);
  const perTeam = fair - (fair % rolesPerUnit);
  return { teams, castUnits, copies, totalDancers, perTeam, perRole: perTeam / rolesPerUnit, leftover: totalDancers - perTeam * teams };
}

/** Table for every allowed team count (shown in the create-league UI). */
export function sizingTable(castUnits: number, rolesPerUnit = 2): LeagueSizing[] {
  const rows: LeagueSizing[] = [];
  for (let t = MIN_TEAMS; t <= MAX_TEAMS; t++) rows.push(leagueSizing(castUnits, t, rolesPerUnit));
  return rows;
}
