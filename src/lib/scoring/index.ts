/*
 * Draft the Stars scoring engine: a typed, pure port of the live js/scoring.js
 * (ZacheryTaylor/dwts-draft @ 073b8c9). The order of floating-point operations is
 * preserved on purpose so results are bit-for-bit identical to the live league.
 * Do not "simplify" without re-running tests/scoring.test.ts.
 *
 * Rules (DWTS template): each drafted celebrity and each drafted pro earns the full
 *   unit score / maxScore x round value   (e.g. 21/30 x 14 = 9.8)
 * every week. Max Possible = points + best case for the remaining weeks, capped by
 * how many units are still competing each week.
 */
import type {
  MaxPossibleBreakdown,
  RankSort,
  RankedTeam,
  ResolvedContestant,
  ResolvedPick,
  ScoringInput,
  ScoringWeek,
} from "./types";

export * from "./types";

/** Points for one unit in one week. With maxScore = 30 this is exactly the live coupleScorePoints. */
export function unitScorePoints(score: number, weekValue: number, maxScore = 30): number {
  return (Number(score) / maxScore) * Number(weekValue);
}

export function createScoring(input: ScoringInput) {
  const { rules } = input;
  const weeksOf = (): ScoringWeek[] => input.weeks || [];

  function allContestants(): ResolvedContestant[] {
    return input.units.flatMap((unit) =>
      unit.members.map((member) => ({
        ...member,
        unitId: unit.id,
        partner: unit.members
          .filter((other) => other.id !== member.id)
          .map((other) => other.name)
          .join(" & "),
      })),
    );
  }
  function contestant(contestantId: string): ResolvedContestant | undefined {
    return allContestants().find((person) => person.id === contestantId);
  }
  function teamPicks(teamId: string): ResolvedPick[] {
    return input.picks
      .filter((pick) => pick.teamId === teamId)
      .map((pick) => ({ ...pick, ...contestant(pick.contestantId) }));
  }
  function isAlive(unitId: string | undefined): boolean {
    return !weeksOf().some((week) =>
      (week.results || []).some((result) => result.unitId === unitId && result.eliminated),
    );
  }
  function weekValue(week: number): number {
    return rules.roundValues?.[week - 1] || 0;
  }
  function points(score: number, value: number): number {
    return unitScorePoints(score, value, rules.maxScore);
  }
  function scoreForTeam(teamId: string): number {
    return weeksOf().reduce((total, week) => {
      const value = rules.roundValues?.[week.week - 1] || 0;
      return (
        total +
        teamPicks(teamId).reduce((sum, pick) => {
          const result = (week.results || []).find((item) => item.unitId === pick.unitId);
          return sum + (result ? points(result.score, value) : 0);
        }, 0)
      );
    }, 0);
  }
  function latestWeek(): number {
    return Math.max(0, ...weeksOf().map((week) => Number(week.week) || 0));
  }
  /** Original (pre 2026-10-02) Max Possible: every alive pick scores perfect in every remaining week. */
  function maxPossibleLegacy(teamId: string): number {
    const latest = latestWeek();
    let total = scoreForTeam(teamId);
    teamPicks(teamId)
      .filter((pick) => isAlive(pick.unitId))
      .forEach(() => {
        rules.roundValues.slice(latest).forEach((value) => {
          total += value;
        });
      });
    return total;
  }
  function aliveUnitsNow(): number {
    return input.units.filter((unit) => isAlive(unit.id)).length;
  }
  function couplesCompeting(week: number): number {
    const row = (input.schedule || []).find((w) => Number(w.week) === Number(week));
    const alive = aliveUnitsNow();
    return row ? Math.min(Number(row.unitsCompeting), alive) : alive;
  }
  function aliveCopiesByUnit(teamId: string): { unitId: string; copies: number }[] {
    const counts = new Map<string, number>();
    teamPicks(teamId)
      .filter((pick) => isAlive(pick.unitId))
      .forEach((pick) => {
        const key = pick.unitId as string;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    return [...counts.entries()]
      .map(([unitId, copies]) => ({ unitId, copies }))
      .sort((a, b) => b.copies - a.copies || a.unitId.localeCompare(b.unitId));
  }
  /**
   * Max Possible (Zach, 2026-10-02): for each remaining week w,
   *   cap_w = min(units competing in week w (schedule), units alive now)
   *   best_w = copies held on the team's top-k alive units, k = min(team's alive units, cap_w)
   *   week max = (max/max) x roundValue_w x best_w
   */
  function maxPossibleBreakdown(teamId: string): MaxPossibleBreakdown {
    const latest = latestWeek();
    const held = aliveCopiesByUnit(teamId);
    const weeks = (rules.roundValues || [])
      .map((value, i) => ({ week: i + 1, value }))
      .filter((w) => w.week > latest)
      .map((w) => {
        const cap = couplesCompeting(w.week);
        const k = Math.min(held.length, cap);
        const copies = held.slice(0, k).reduce((s, h) => s + h.copies, 0);
        return { ...w, cap, couplesCounted: k, copies, max: (rules.maxScore / rules.maxScore) * w.value * copies };
      });
    const pts = scoreForTeam(teamId);
    return { points: pts, held, weeks, total: weeks.reduce((t, w) => t + w.max, pts) };
  }
  function maxPossible(teamId: string): number {
    return maxPossibleBreakdown(teamId).total;
  }
  function rankings(rankSort: RankSort = { key: "points", dir: "desc" }): RankedTeam[] {
    const direction = rankSort.dir === "asc" ? 1 : -1;
    return input.teams
      .map((item) => {
        const picks = teamPicks(item.id);
        return {
          ...item,
          picks,
          points: scoreForTeam(item.id),
          alive: picks.filter((pick) => isAlive(pick.unitId)).length,
          mpp: maxPossible(item.id),
        };
      })
      .sort((a, b) => {
        const left = a[rankSort.key];
        const right = b[rankSort.key];
        if (left === right) return b.points - a.points || b.mpp - a.mpp;
        return left > right ? direction : -direction;
      });
  }
  /** Display helper: a pick's points in one week, same formula. */
  function pickWeekPoints(pick: ResolvedPick, week: ScoringWeek): number {
    const result = (week.results || []).find((item) => item.unitId === pick.unitId);
    return result ? points(result.score, weekValue(week.week)) : 0;
  }
  function eliminatedWeek(unitId: string): number | null {
    const w = [...weeksOf()]
      .sort((a, b) => a.week - b.week)
      .find((week) => (week.results || []).some((r) => r.unitId === unitId && r.eliminated));
    return w ? Number(w.week) : null;
  }

  return {
    allContestants,
    contestant,
    teamPicks,
    isAlive,
    weekValue,
    scoreForTeam,
    latestWeek,
    maxPossible,
    maxPossibleLegacy,
    maxPossibleBreakdown,
    couplesCompeting,
    rankings,
    pickWeekPoints,
    eliminatedWeek,
    unitScorePoints: points,
  };
}

export type Scoring = ReturnType<typeof createScoring>;

export interface StandingRow extends RankedTeam {
  rank: number;
  weekPoints: number;
  movement: number | null;
  isLeader: boolean;
}

/** Standings as the league page shows them (points desc), with latest-week points and movement arrows. */
export function computeStandings(input: ScoringInput, sort: RankSort = { key: "points", dir: "desc" }) {
  const s = createScoring(input);
  const latest = s.latestWeek();
  const latestWeek = input.weeks.find((w) => Number(w.week) === latest);
  const weekPts = (t: RankedTeam) =>
    latestWeek ? t.picks.reduce((sum, p) => sum + s.pickWeekPoints(p, latestWeek), 0) : 0;
  let prev: Map<string, number> | null = null;
  if (latest >= 2) {
    const prevScoring = createScoring({ ...input, weeks: input.weeks.filter((w) => Number(w.week) < latest) });
    prev = new Map(prevScoring.rankings().map((t, i) => [t.id, i + 1]));
  }
  const leaderId = s.rankings()[0]?.id ?? null;
  const rows: StandingRow[] = s.rankings(sort).map((t, i) => ({
    ...t,
    rank: i + 1,
    weekPoints: weekPts(t),
    movement: prev && sort.key === "points" && sort.dir === "desc" ? (prev.get(t.id) ?? i + 1) - (i + 1) : null,
    isLeader: t.id === leaderId,
  }));
  return { scoring: s, latest, latestWeek, rows, leaderId };
}
