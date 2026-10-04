/** v2 domain rows. These mirror the Supabase tables in supabase/migrations (camelCase here, snake_case in SQL). */
import type { ThemeId } from "@/lib/themes/presets";

export type MemberRole = "commissioner" | "co_commissioner" | "player";
export type ContestantRole = "celebrity" | "pro" | "solo";
export type DraftStatus = "not_started" | "in_progress" | "paused" | "complete";
/** Per team slot. paid/waived count toward the draft gate. */
export type MemberPaymentStatus = "unpaid" | "paid" | "waived" | "refund_pending" | "refunded" | "void";
export type LeagueStatus = "active" | "cancelled" | "archived";

export interface Profile {
  id: string;
  username: string; // unique, lowercase
  displayName: string | null;
  email: string; // lives in auth.users in Supabase
  birthYear: number;
  themePreset: ThemeId;
  createdAt: string;
}

export interface Show { id: string; slug: string; name: string; unitLabel: string }
export interface Season {
  id: string;
  showId: string;
  number: number;
  title: string;
  copiesPerContestant: number;
  rosterSize: Partial<Record<ContestantRole, number>>;
  scoringTemplateSlug: string;
  status: "upcoming" | "airing" | "finished";
  finaleDate: string | null;
}
export interface ContestantUnit { id: string; seasonId: string; key: string; label: string; sortOrder: number }
export interface Contestant {
  id: string;
  seasonId: string;
  unitId: string;
  key: string;
  name: string;
  role: ContestantRole;
  monogram: string;
  sortOrder: number;
}
export interface Episode {
  id: string;
  seasonId: string;
  number: number;
  name: string | null;
  roundValue: number;
  maxScore: number;
  unitsCompeting: number | null;
  scheduleStatus: "actual" | "projected";
}
export interface Score {
  id: string;
  episodeId: string;
  unitId: string;
  rawScore: number;
  eliminated: boolean;
  source: "auto" | "manual";
  published: boolean;
}

export interface LeagueSettings {
  teamCount: number;
  rosterSize: Partial<Record<ContestantRole, number>>;
  copiesPerContestant: number;
  draftType: "snake" | "linear";
  pickClockSeconds: number;
}
export interface League {
  id: string;
  slug: string;
  name: string;
  seasonId: string;
  scoringTemplateSlug: string;
  ownerId: string;
  settings: LeagueSettings;
  privacy: "private" | "public";
  /** Creating a league is free: leagues start active. cancelled = commissioner cancelled before the draft. */
  status: LeagueStatus;
  draftStatus: DraftStatus;
  createdAt: string;
}
export interface LeagueMember { leagueId: string; userId: string; role: MemberRole; joinedAt: string }
export interface Team { id: string; leagueId: string; ownerId: string | null; name: string; draftPosition: number }
export interface Pick {
  id: string;
  leagueId: string;
  teamId: string;
  contestantId: string;
  round: number;
  overall: number;
  copy: number;
  pickedAt: string;
}
export interface Invite {
  id: string;
  leagueId: string;
  code: string;
  createdBy: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  claimTeamId: string | null;
  revoked: boolean;
}
/** League-level fee settings. Each team slot has its own SlotPayment row. */
export interface LeagueBilling {
  leagueId: string;
  pricePerMemberCents: number; // 500
  feeWaived: boolean; // e.g. the migrated girls' league
  waivedReason: string | null;
}

/**
 * One row per team slot (public.payments). memberId = who holds the slot (null while open);
 * payerId = who paid (the member, or the commissioner covering it). Only the server (mock checkout
 * or provider webhook) can set status = 'paid'.
 */
export interface SlotPayment {
  id: string;
  leagueId: string;
  teamId: string;
  memberId: string | null;
  payerId: string | null;
  amountCents: number;
  currency: string;
  status: MemberPaymentStatus;
  provider: "mock" | "stripe" | null;
  checkoutId: string | null; // one checkout can cover several slots (quantity x $5)
  providerPaymentId: string | null;
  paidAt: string | null;
  remindedAt: string | null;
  refundToId: string | null; // refunds go back to whoever paid
  createdAt: string;
}
export type Payment = SlotPayment;

export interface DraftOrderLog {
  id: string;
  leagueId: string;
  roll: number;
  method: "random" | "manual";
  seed: string | null;
  input: string[];
  order: string[];
  createdBy: string;
  createdAt: string;
}

/** Commissioner score fix for ONE league. Never touches shared public.scores. */
export interface ScoreOverride {
  id: string;
  leagueId: string;
  episodeId: string;
  unitId: string;
  rawScore: number;
  eliminated: boolean;
  reason: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Entitlement {
  id: string;
  userId: string | null;
  leagueId: string | null;
  kind: "league_membership" | "cosmetic" | "feature";
  sourcePaymentId: string | null;
  startsAt: string;
  endsAt: string | null;
}

/** Everything about one show season (shared by every league on that season). */
export interface SeasonBundle {
  show: Show;
  season: Season;
  units: ContestantUnit[];
  contestants: Contestant[];
  episodes: Episode[];
  scores: Score[];
}

export interface DbState extends Omit<SeasonBundle, "show" | "season" | "units" | "contestants" | "episodes" | "scores"> {
  profiles: Profile[];
  shows: Show[];
  seasons: Season[];
  units: ContestantUnit[];
  contestants: Contestant[];
  episodes: Episode[];
  scores: Score[];
  leagues: League[];
  leagueMembers: LeagueMember[];
  teams: Team[];
  picks: Pick[];
  invites: Invite[];
  leagueBilling: LeagueBilling[];
  payments: SlotPayment[];
  entitlements: Entitlement[];
  draftOrderLog: DraftOrderLog[];
  scoreOverrides: ScoreOverride[];
}

export interface LeagueBundle extends SeasonBundle {
  league: League;
  members: (LeagueMember & { profile: Profile | null })[];
  teams: Team[];
  picks: Pick[];
  invites: Invite[];
  billing: LeagueBilling;
  payments: SlotPayment[];
  draftOrderLog: DraftOrderLog[];
  scoreOverrides: ScoreOverride[];
}
