/**
 * Data access interface. The app talks only to this. Today: MockAdapter (in-memory, seeded).
 * Later: SupabaseAdapter against supabase/migrations (TODO(supabase)).
 */
import type { ThemeId } from "@/lib/themes/presets";
import type {
  DraftStatus,
  League,
  LeagueBundle,
  MemberRole,
  Payment,
  Pick as DraftPickRow,
  Profile,
  Season,
  Show,
  Invite,
} from "./types";

export interface LeagueSummary {
  league: League;
  role: MemberRole;
  memberCount: number;
  teamName: string | null;
  seasonTitle: string;
  showName: string;
  billingStatus: string;
}

export interface CreateLeagueInput {
  name: string;
  seasonId: string;
  /** 3-12; also the billed member count. Copies and roster are derived by leagueSizing(). */
  teamCount: number;
  draftType: "snake" | "linear";
  privacy: "private" | "public";
}

export interface DataAdapter {
  readonly kind: "mock" | "supabase";
  getProfile(id: string): Promise<Profile | null>;
  findProfileByLogin(login: string): Promise<Profile | null>;
  createProfile(input: { email: string; username: string; birthYear: number; displayName?: string; themePreset?: ThemeId }): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Pick<Profile, "username" | "displayName" | "themePreset">>): Promise<Profile>;
  listSeasons(): Promise<{ season: Season; show: Show; castUnits: number }[]>;
  listLeaguesForUser(userId: string): Promise<LeagueSummary[]>;
  getLeague(slug: string): Promise<LeagueBundle | null>;
  createLeague(userId: string, input: CreateLeagueInput): Promise<League>;
  joinLeagueByCode(userId: string, code: string): Promise<League>;
  makePick(userId: string, leagueId: string, contestantId: string): Promise<DraftPickRow>;
  setDraftStatus(userId: string, leagueId: string, status: DraftStatus): Promise<void>;
  overrideScore(userId: string, leagueId: string, episodeNumber: number, unitId: string, rawScore: number, eliminated: boolean): Promise<void>;
  regenerateInvite(userId: string, leagueId: string): Promise<Invite>;
  setMemberRole(userId: string, leagueId: string, memberId: string, role: MemberRole): Promise<void>;
  /** Server-only (service role in Supabase): record a provider-confirmed payment and activate the league. */
  recordPayment(payment: Omit<Payment, "id" | "createdAt">): Promise<void>;
  resetBilling(userId: string, leagueId: string): Promise<void>;
}

export class DataError extends Error {}
