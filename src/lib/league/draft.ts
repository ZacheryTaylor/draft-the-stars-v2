/** Pure draft rules (same as the live app): snake order, roster slots per role, copies per dancer, no dancer twice on one team. */
export interface DraftTeam { id: string; draftPosition: number }
export interface DraftPick { teamId: string; contestantId: string; copy: number }
export interface DraftContestant { id: string; role: string }
export interface DraftRules {
  draftType: "snake" | "linear";
  copiesPerContestant: number;
  rosterSize: Partial<Record<string, number>>;
}

export function totalPicks(teams: number, rules: DraftRules): number {
  return teams * Object.values(rules.rosterSize).reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** Team on the clock for a 1-based overall pick. */
export function teamForPick<T extends DraftTeam>(overall: number, teams: T[], draftType: DraftRules["draftType"]): T {
  const ordered = [...teams].sort((a, b) => a.draftPosition - b.draftPosition);
  const n = ordered.length;
  const round = Math.ceil(overall / n);
  const idx = (overall - 1) % n;
  return draftType === "snake" && round % 2 === 0 ? ordered[n - 1 - idx] : ordered[idx];
}

export type PickCheck = { ok: true; copy: number } | { ok: false; reason: string };

export function checkPick(teamId: string, contestant: DraftContestant, picks: DraftPick[], all: DraftContestant[], rules: DraftRules): PickCheck {
  const used = picks.filter((p) => p.contestantId === contestant.id).length;
  if (used >= rules.copiesPerContestant) return { ok: false, reason: "All copies of this dancer are taken" };
  const mine = picks.filter((p) => p.teamId === teamId);
  if (mine.some((p) => p.contestantId === contestant.id)) return { ok: false, reason: "This team already has this dancer" };
  const role = contestant.role;
  const slots = rules.rosterSize[role] ?? 0;
  const filled = mine.filter((p) => all.find((c) => c.id === p.contestantId)?.role === role).length;
  if (filled >= slots) return { ok: false, reason: `No ${role} slots left on this team (${slots} max)` };
  return { ok: true, copy: used + 1 };
}
