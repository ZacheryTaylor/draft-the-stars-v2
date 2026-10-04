/** v2 domain rows. These mirror the Supabase tables in supabase/migrations (camelCase here, snake_case in SQL). */
import type { ThemeId } from "@/lib/themes/presets";

export type MemberRole = "commissioner" | "co_commissioner" | "player";
export type ContestantRole = "celebrity" | "pro" | "solo";
export type DraftStatus = "not_started" | "in_progress" | "paused" | "complete";
export type BillingStatus = "pending" | "active" | "waived" | "refunded";
export type LeagueStatus = "pending_payment" | "active" | "archived";

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
  /** pending_payment until checkout succeeds. */
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
export interface LeagueBilling {
  leagueId: string;
  status: BillingStatus;
  pricePerMemberCents: number;
  billedMemberCount: number | null;
  amountDueCents: number | null;
  provider: "mock" | "stripe" | null;
  paidAt: string | null;
}
export interface Payment {
  id: string;
  leagueId: string;
  payerId: string | null;
  provider: "mock" | "stripe";
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  memberCount: number;
  pricePerMemberCents: number;
  status: "pending" | "succeeded" | "failed" | "refunded";
  createdAt: string;
}
export interface Entitlement {
  id: string;
  userId: string | null;
  leagueId: string | null;
  kind: "league_season_pass" | "cosmetic" | "feature";
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
  payments: Payment[];
  entitlements: Entitlement[];
}

export interface LeagueBundle extends SeasonBundle {
  league: League;
  members: (LeagueMember & { profile: Profile | null })[];
  teams: Team[];
  picks: Pick[];
  invites: Invite[];
  billing: LeagueBilling;
}
