/**
 * Show-agnostic scoring input. A "unit" is whatever scores together on the show:
 * a celebrity + pro couple on DWTS, a single contestant on most other shows.
 */
export type ContestantRole = "celebrity" | "pro" | "solo";

export interface ScoringContestant {
  id: string;
  name: string;
  role: ContestantRole;
}

export interface ScoringUnit {
  id: string;
  label?: string;
  /** Order matters for bit-for-bit parity with the live app: celebrity first, then pro. */
  members: ScoringContestant[];
}

export interface ScoringResult {
  unitId: string;
  score: number;
  eliminated: boolean;
}

export interface ScoringWeek {
  week: number;
  name?: string;
  results: ScoringResult[];
}

export interface ScheduleWeek {
  week: number;
  /** Units that dance (and can score) that week, actual or projected. */
  unitsCompeting: number;
}

export interface ScoringRules {
  /** Perfect score for a week (DWTS: 30). */
  maxScore: number;
  /** Round value per week, index 0 = week 1 (DWTS S35: 10,12,14,16,18,20,23,26,29,32,36). */
  roundValues: number[];
}

export interface ScoringTeam {
  id: string;
  name: string;
}

export interface ScoringPick {
  teamId: string;
  contestantId: string;
  overall?: number;
  round?: number;
  copy?: number;
}

export interface ScoringInput {
  rules: ScoringRules;
  units: ScoringUnit[];
  /** Kept in source order: the live app sums weeks in file order, which affects the last float bit. */
  weeks: ScoringWeek[];
  teams: ScoringTeam[];
  picks: ScoringPick[];
  schedule?: ScheduleWeek[];
}

export interface ResolvedContestant extends ScoringContestant {
  unitId: string;
  partner: string;
}

export type ResolvedPick = ScoringPick & Partial<ResolvedContestant>;

export interface MaxPossibleWeek {
  week: number;
  value: number;
  cap: number;
  couplesCounted: number;
  copies: number;
  max: number;
}

export interface MaxPossibleBreakdown {
  points: number;
  held: { unitId: string; copies: number }[];
  weeks: MaxPossibleWeek[];
  total: number;
}

export type RankKey = "points" | "alive" | "mpp";
export interface RankSort {
  key: RankKey;
  dir: "asc" | "desc";
}

export interface RankedTeam extends ScoringTeam {
  picks: ResolvedPick[];
  points: number;
  alive: number;
  mpp: number;
}
