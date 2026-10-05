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
  Pick as DraftPickRow,
  SlotPayment,
  Profile,
  Season,
  Show,
  Invite,
} from "./types";

export interface LeagueSummary {
  league: League;
  role: MemberRole;
  /** Filled team slots (owners assigned). Same source as draftReadiness.filledSlots. */
  memberCount: number;
  filledSlots: number;
  teamName: string | null;
  seasonTitle: string;
  showName: string;
  /** Slots paid or covered (or waived). Same source as draftReadiness.paidSlots. */
  paidSlots: number;
  myPaymentStatus: SlotPayment["status"] | null;
}

export interface MarkSlotsPaidInput {
  leagueId: string;
  teamIds: string[];
  payerId: string;
  provider: "mock" | "stripe";
  checkoutId: string;
  providerPaymentId: string;
}

export interface CreateLeagueInput {
  name: string;
  seasonId: string;
  /** 3-12 member slots. Copies and roster are derived by leagueSizing(). */
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
  /** Per-league score fix (league_score_overrides). Never touches shared scores. */
  overrideScore(userId: string, leagueId: string, episodeNumber: number, unitId: string, rawScore: number, eliminated: boolean, reason?: string): Promise<void>;
  clearScoreOverride(userId: string, leagueId: string, overrideId: string): Promise<void>;
  randomizeDraftOrder(userId: string, leagueId: string, seed?: string): Promise<void>;
  setDraftOrder(userId: string, leagueId: string, order: string[]): Promise<void>;
  regenerateInvite(userId: string, leagueId: string): Promise<Invite>;
  setMemberRole(userId: string, leagueId: string, memberId: string, role: MemberRole): Promise<void>;
  /**
   * Plan one checkout: a member's own slot, or (commissioner only) selected slots / all unpaid slots.
   * Throws for slots already paid, so a slot is never paid twice.
   */
  planSlotCheckout(payerId: string, leagueId: string, selection: string[] | "all_unpaid"): Promise<{ teamIds: string[]; quantity: number; amountCents: number }>;
  /** Server-only (service role / mark_slots_paid in Supabase): mark slots paid after the provider confirms. */
  markSlotsPaid(input: MarkSlotsPaidInput): Promise<number>;
  /** Commissioner: placeholder reminder to an unpaid member (email stub). */
  remindUnpaid(userId: string, leagueId: string, teamId: string): Promise<{ to: string | null }>;
  /** Commissioner: nudge every unpaid member (email stub). */
  remindAllUnpaid(userId: string, leagueId: string): Promise<{ count: number }>;
  /** Commissioner, before the draft: placeholder refund of a slot back to whoever paid it. */
  requestRefund(userId: string, leagueId: string, teamId: string): Promise<SlotPayment>;
  /** Commissioner, before the draft: remove a member (e.g. unpaid) so the slot can be re-invited. */
  removeMember(userId: string, leagueId: string, memberId: string): Promise<void>;
}

export class DataError extends Error {}
