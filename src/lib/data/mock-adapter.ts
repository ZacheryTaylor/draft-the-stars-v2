/** In-memory adapter so the whole app runs without Supabase. Resets when the server restarts. Mirrors the RLS rules. */
import { activeSlotPayment, draftReadiness, planCheckout } from "@/lib/billing";
import { billing } from "@/lib/billing/config";
import { isOrderLocked, isValidOrder, manualEntry, positionsFor, randomizeEntry } from "@/lib/league/draft-order";
import { checkPick, teamForPick, totalPicks } from "@/lib/league/draft";
import { leagueSizing } from "@/lib/league/sizing";
import { isThemeId } from "@/lib/themes/presets";
import { DataError, type CreateLeagueInput, type DataAdapter, type LeagueSummary, type MarkSlotsPaidInput } from "./adapter";
import { createSeedState } from "./mock-seed";
import type { DbState, League, LeagueBundle, MemberRole, Profile, SlotPayment } from "./types";

const g = globalThis as unknown as { __dtsMockDb?: DbState };
export function mockDb(): DbState {
  if (!g.__dtsMockDb) g.__dtsMockDb = createSeedState();
  return g.__dtsMockDb;
}
export function resetMockDb(): void {
  g.__dtsMockDb = createSeedState();
}
/** Browser demo: hydrate the store from localStorage (or a fresh demo seed). */
export function setMockDb(state: DbState): void {
  g.__dtsMockDb = state;
}

const now = () => new Date().toISOString();
const rid = (p: string) => `${p}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const slugify = (name: string) =>
  (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "league") + "-" + Math.random().toString(36).slice(2, 6);
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function role(db: DbState, leagueId: string, userId: string): MemberRole | null {
  return db.leagueMembers.find((m) => m.leagueId === leagueId && m.userId === userId)?.role ?? null;
}
function requireCommissioner(db: DbState, leagueId: string, userId: string) {
  const r = role(db, leagueId, userId);
  if (r !== "commissioner" && r !== "co_commissioner") throw new DataError("Only the commissioner can do that");
}
export const slotPayment = activeSlotPayment;
function newSlotPayment(db: DbState, leagueId: string, teamId: string, memberId: string | null): SlotPayment {
  const b = db.leagueBilling.find((x) => x.leagueId === leagueId);
  const p: SlotPayment = {
    id: rid("payment"), leagueId, teamId, memberId, payerId: null,
    amountCents: b?.pricePerMemberCents ?? billing.pricePerMemberCents, currency: billing.currency,
    status: b?.feeWaived ? "waived" : "unpaid", provider: null, checkoutId: null, providerPaymentId: null,
    paidAt: null, remindedAt: null, refundToId: null, createdAt: now(),
  };
  db.payments.push(p);
  return p;
}
function requireBeforeDraft(l: League, what: string) {
  if (l.status !== "active") throw new DataError(`This league is ${l.status}`);
  if (l.draftStatus !== "not_started") throw new DataError(`${what} is locked once the draft starts`);
}
function league(db: DbState, leagueId: string): League {
  const l = db.leagues.find((x) => x.id === leagueId);
  if (!l) throw new DataError("League not found");
  return l;
}

export class MockAdapter implements DataAdapter {
  readonly kind = "mock" as const;
  private get db() {
    return mockDb();
  }

  /** Sync readers (the browser demo renders from these; the async interface wraps them). */
  getProfileNow(id: string) {
    return this.db.profiles.find((p) => p.id === id) ?? null;
  }
  async getProfile(id: string) {
    return this.getProfileNow(id);
  }
  async findProfileByLogin(login: string) {
    const l = login.trim().toLowerCase();
    return this.db.profiles.find((p) => p.username === l || p.email.toLowerCase() === l) ?? null;
  }
  async createProfile(input: { email: string; username: string; birthYear: number; displayName?: string; themePreset?: Profile["themePreset"] }) {
    const username = input.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) throw new DataError("Username must be 3-20 letters, numbers or underscores");
    if (this.db.profiles.some((p) => p.username === username)) throw new DataError("That username is taken");
    if (this.db.profiles.some((p) => p.email.toLowerCase() === input.email.trim().toLowerCase())) throw new DataError("That email already has an account");
    if (new Date().getFullYear() - input.birthYear < 13) throw new DataError("You must be 13 or older to sign up");
    const profile: Profile = {
      id: rid("user"),
      username,
      displayName: input.displayName?.trim() || null,
      email: input.email.trim(),
      birthYear: input.birthYear,
      themePreset: input.themePreset && isThemeId(input.themePreset) ? input.themePreset : "pink",
      createdAt: now(),
    };
    this.db.profiles.push(profile);
    return profile;
  }
  async updateProfile(id: string, patch: Partial<Pick<Profile, "username" | "displayName" | "themePreset">>) {
    const p = this.db.profiles.find((x) => x.id === id);
    if (!p) throw new DataError("Profile not found");
    if (patch.username !== undefined) {
      const u = patch.username.trim().toLowerCase();
      if (!USERNAME_RE.test(u)) throw new DataError("Username must be 3-20 letters, numbers or underscores");
      if (this.db.profiles.some((x) => x.username === u && x.id !== id)) throw new DataError("That username is taken");
      p.username = u;
    }
    if (patch.displayName !== undefined) p.displayName = patch.displayName?.trim() || null;
    if (patch.themePreset !== undefined) {
      if (!isThemeId(patch.themePreset)) throw new DataError("Unknown theme");
      p.themePreset = patch.themePreset;
    }
    return p;
  }
  async listSeasons() {
    return this.listSeasonsNow();
  }
  listSeasonsNow() {
    return this.db.seasons.map((season) => ({ season, show: this.db.shows.find((s) => s.id === season.showId)!, castUnits: this.db.units.filter((u) => u.seasonId === season.id).length }));
  }
  async listLeaguesForUser(userId: string): Promise<LeagueSummary[]> {
    return this.listLeaguesForUserNow(userId);
  }
  listLeaguesForUserNow(userId: string): LeagueSummary[] {
    const db = this.db;
    return db.leagueMembers
      .filter((m) => m.userId === userId)
      .map((m) => {
        const l = league(db, m.leagueId);
        const season = db.seasons.find((s) => s.id === l.seasonId)!;
        const teams = db.teams.filter((t) => t.leagueId === l.id);
        const payments = db.payments.filter((p) => p.leagueId === l.id);
        const ready = draftReadiness({ teamCount: l.settings.teamCount, teams, payments });
        return {
          league: l,
          role: m.role,
          /** Filled team slots (same source as draftReadiness / Fees / Commissioner). */
          memberCount: ready.filledSlots,
          filledSlots: ready.filledSlots,
          teamName: teams.find((t) => t.ownerId === userId)?.name ?? null,
          seasonTitle: season.title,
          showName: db.shows.find((s) => s.id === season.showId)?.name ?? "",
          paidSlots: ready.paidSlots,
          myPaymentStatus: (() => {
            const t = teams.find((x) => x.ownerId === userId);
            return t ? (slotPayment(db.payments, t.id)?.status ?? null) : null;
          })(),
        };
      });
  }
  async getLeague(slug: string): Promise<LeagueBundle | null> {
    return this.getLeagueNow(slug);
  }
  getLeagueNow(slug: string): LeagueBundle | null {
    const db = this.db;
    const l = db.leagues.find((x) => x.slug === slug);
    if (!l) return null;
    const season = db.seasons.find((s) => s.id === l.seasonId)!;
    const units = db.units.filter((u) => u.seasonId === season.id);
    const episodes = db.episodes.filter((e) => e.seasonId === season.id);
    const epIds = new Set(episodes.map((e) => e.id));
    const overrides = db.scoreOverrides.filter((o) => o.leagueId === l.id);
    // League view = shared scores with this league's commissioner overrides applied on top.
    const scores = db.scores.filter((s) => epIds.has(s.episodeId)).map((s) => {
      const o = overrides.find((x) => x.episodeId === s.episodeId && x.unitId === s.unitId);
      return o ? { ...s, rawScore: o.rawScore, eliminated: o.eliminated, source: "manual" as const } : s;
    });
    for (const o of overrides)
      if (!scores.some((s) => s.episodeId === o.episodeId && s.unitId === o.unitId))
        scores.push({ id: o.id, episodeId: o.episodeId, unitId: o.unitId, rawScore: o.rawScore, eliminated: o.eliminated, source: "manual", published: true });
    return {
      show: db.shows.find((s) => s.id === season.showId)!,
      season,
      units,
      contestants: db.contestants.filter((c) => c.seasonId === season.id),
      episodes,
      scores,
      league: l,
      members: db.leagueMembers.filter((m) => m.leagueId === l.id).map((m) => ({ ...m, profile: db.profiles.find((p) => p.id === m.userId) ?? null })),
      teams: db.teams.filter((t) => t.leagueId === l.id),
      picks: db.picks.filter((p) => p.leagueId === l.id),
      invites: db.invites.filter((i) => i.leagueId === l.id && !i.revoked),
      billing: db.leagueBilling.find((b) => b.leagueId === l.id)!,
      payments: db.payments.filter((p) => p.leagueId === l.id),
      draftOrderLog: db.draftOrderLog.filter((e) => e.leagueId === l.id).sort((a, b) => b.roll - a.roll),
      scoreOverrides: overrides,
    };
  }
  async createLeague(userId: string, input: CreateLeagueInput) {
    const db = this.db;
    const owner = await this.getProfile(userId);
    if (!owner) throw new DataError("Sign in to create a league");
    const name = input.name.trim();
    if (!name || name.length > 60) throw new DataError("League name must be 1-60 characters");
    const season = db.seasons.find((s) => s.id === input.seasonId);
    if (!season) throw new DataError("Pick a season");
    const castUnits = db.units.filter((u) => u.seasonId === season.id).length;
    const sizing = leagueSizing(castUnits, input.teamCount); // throws for <3 or >12
    const id = rid("league");
    const l: League = {
      id,
      slug: slugify(name),
      name,
      seasonId: season.id,
      scoringTemplateSlug: season.scoringTemplateSlug,
      ownerId: userId,
      settings: { teamCount: input.teamCount, rosterSize: { celebrity: sizing.perRole, pro: sizing.perRole }, copiesPerContestant: sizing.copies, draftType: input.draftType, pickClockSeconds: 90 },
      privacy: input.privacy,
      status: "active", // creating a league is free
      draftStatus: "not_started",
      createdAt: now(),
    };
    db.leagues.push(l);
    db.leagueMembers.push({ leagueId: id, userId, role: "commissioner", joinedAt: now() });
    for (let i = 1; i <= input.teamCount; i++)
      db.teams.push({ id: `${id}:team:${i}`, leagueId: id, ownerId: i === 1 ? userId : null, name: i === 1 ? `${owner.username}'s team` : `Team ${i}`, draftPosition: i });
    db.invites.push({ id: rid("invite"), leagueId: id, code: code(), createdBy: userId, expiresAt: null, maxUses: null, uses: 0, claimTeamId: null, revoked: false });
    db.leagueBilling.push({ leagueId: id, pricePerMemberCents: billing.pricePerMemberCents, feeWaived: false, waivedReason: null });
    // One payment row per slot. The commissioner pays their own $5 too, unless they cover more slots.
    for (const t of db.teams.filter((x) => x.leagueId === id)) newSlotPayment(db, id, t.id, t.ownerId);
    return l;
  }
  async joinLeagueByCode(userId: string, raw: string) {
    const db = this.db;
    const inv = db.invites.find((i) => i.code === raw.trim().toUpperCase() && !i.revoked);
    if (!inv || (inv.expiresAt && inv.expiresAt < now()) || (inv.maxUses != null && inv.uses >= inv.maxUses)) throw new DataError("Invite code is invalid or expired");
    const l = league(db, inv.leagueId);
    if (role(db, l.id, userId)) return l;
    if (l.status !== "active" || l.draftStatus !== "not_started") throw new DataError("This league is not accepting members");
    if (db.leagueMembers.filter((m) => m.leagueId === l.id).length >= l.settings.teamCount) throw new DataError("This league is full");
    db.leagueMembers.push({ leagueId: l.id, userId, role: "player", joinedAt: now() });
    inv.uses += 1;
    const team = (inv.claimTeamId && db.teams.find((t) => t.id === inv.claimTeamId && !t.ownerId)) || db.teams.find((t) => t.leagueId === l.id && !t.ownerId);
    if (team) {
      team.ownerId = userId;
      // A slot the commissioner already covered stays paid for whoever claims it.
      const p = slotPayment(db.payments, team.id) ?? newSlotPayment(db, l.id, team.id, null);
      p.memberId = userId;
    }
    return l;
  }
  async setDraftStatus(userId: string, leagueId: string, status: League["draftStatus"]) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    if (l.draftStatus === "not_started" && status !== "not_started") {
      if (l.status !== "active") throw new DataError(`This league is ${l.status}`);
      const r = this.readiness(leagueId);
      if (!r.ready) throw new DataError(`Draft can't start yet: ${r.reasons.join("; ")}`);
    }
    if (l.draftStatus !== "not_started" && status === "not_started" && db.picks.some((p) => p.leagueId === leagueId)) throw new DataError("Picks exist; the draft can't be reset");
    l.draftStatus = status;
  }
  async makePick(userId: string, leagueId: string, contestantId: string) {
    const db = this.db;
    const l = league(db, leagueId);
    if (l.status !== "active") throw new DataError(`This league is ${l.status}`);
    if (l.draftStatus !== "in_progress") throw new DataError("The draft is not running");
    const teams = db.teams.filter((t) => t.leagueId === leagueId);
    const picks = db.picks.filter((p) => p.leagueId === leagueId);
    const rules = { draftType: l.settings.draftType, copiesPerContestant: l.settings.copiesPerContestant, rosterSize: l.settings.rosterSize };
    const overall = picks.length + 1;
    const team = teamForPick(overall, teams, l.settings.draftType);
    const r = role(db, leagueId, userId);
    if (team.ownerId !== userId && r !== "commissioner" && r !== "co_commissioner") throw new DataError(`It's ${team.name}'s pick`);
    const contestants = db.contestants.filter((c) => c.seasonId === l.seasonId);
    const c = contestants.find((x) => x.id === contestantId);
    if (!c) throw new DataError("Unknown dancer");
    const check = checkPick(team.id, c, picks, contestants, rules);
    if (!check.ok) throw new DataError(check.reason);
    const pick = { id: rid("pick"), leagueId, teamId: team.id, contestantId, round: Math.ceil(overall / teams.length), overall, copy: check.copy, pickedAt: now() };
    db.picks.push(pick);
    if (overall >= totalPicks(teams.length, rules)) l.draftStatus = "complete";
    return pick;
  }
  async overrideScore(userId: string, leagueId: string, episodeNumber: number, unitId: string, rawScore: number, eliminated: boolean, reason?: string) {
    // Per-league override (public.league_score_overrides). Shared scores are never modified.
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    const ep = db.episodes.find((e) => e.seasonId === l.seasonId && e.number === episodeNumber);
    if (!ep) throw new DataError("Unknown week");
    if (!db.units.some((u) => u.id === unitId && u.seasonId === l.seasonId)) throw new DataError("Unknown couple");
    if (!(rawScore >= 0 && rawScore <= ep.maxScore)) throw new DataError(`Score must be 0-${ep.maxScore}`);
    const existing = db.scoreOverrides.find((o) => o.leagueId === leagueId && o.episodeId === ep.id && o.unitId === unitId);
    if (existing) Object.assign(existing, { rawScore, eliminated, reason: reason?.trim() || null, createdBy: userId, createdAt: now() });
    else db.scoreOverrides.push({ id: rid("override"), leagueId, episodeId: ep.id, unitId, rawScore, eliminated, reason: reason?.trim() || null, createdBy: userId, createdAt: now() });
  }
  async clearScoreOverride(userId: string, leagueId: string, overrideId: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    db.scoreOverrides = db.scoreOverrides.filter((o) => !(o.id === overrideId && o.leagueId === leagueId));
  }
  private applyOrder(leagueId: string, entry: ReturnType<typeof manualEntry>) {
    const db = this.db;
    const pos = positionsFor(entry.order);
    db.teams.filter((t) => t.leagueId === leagueId).forEach((t) => (t.draftPosition = pos[t.id]));
    db.draftOrderLog.push({ id: rid("order"), leagueId, ...entry });
  }
  private nextRoll(leagueId: string) {
    return Math.max(0, ...this.db.draftOrderLog.filter((e) => e.leagueId === leagueId).map((e) => e.roll)) + 1;
  }
  async randomizeDraftOrder(userId: string, leagueId: string, seed?: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    if (isOrderLocked(l.draftStatus)) throw new DataError("Draft order is locked once the draft starts");
    const roll = this.nextRoll(leagueId);
    const s = seed?.trim() || `${l.slug}-${roll}-${Math.random().toString(36).slice(2, 10)}`;
    const ids = db.teams.filter((t) => t.leagueId === leagueId).map((t) => t.id);
    this.applyOrder(leagueId, randomizeEntry(ids, s, roll, userId, now()));
  }
  async setDraftOrder(userId: string, leagueId: string, order: string[]) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    if (isOrderLocked(l.draftStatus)) throw new DataError("Draft order is locked once the draft starts");
    const ids = db.teams.filter((t) => t.leagueId === leagueId).map((t) => t.id);
    if (!isValidOrder(order, ids)) throw new DataError("Order must list every team exactly once");
    this.applyOrder(leagueId, manualEntry(order, this.nextRoll(leagueId), userId, now()));
  }
  readiness(leagueId: string) {
    const db = this.db;
    const l = league(db, leagueId);
    const teams = db.teams.filter((t) => t.leagueId === leagueId);
    return draftReadiness({ teamCount: l.settings.teamCount, teams, payments: db.payments.filter((p) => p.leagueId === leagueId) });
  }
  async regenerateInvite(userId: string, leagueId: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    db.invites.filter((i) => i.leagueId === leagueId).forEach((i) => (i.revoked = true));
    const inv = { id: rid("invite"), leagueId, code: code(), createdBy: userId, expiresAt: null, maxUses: null, uses: 0, claimTeamId: null, revoked: false };
    db.invites.push(inv);
    return inv;
  }
  async setMemberRole(userId: string, leagueId: string, memberId: string, newRole: MemberRole) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    if (league(db, leagueId).ownerId === memberId) throw new DataError("The league owner stays commissioner");
    const m = db.leagueMembers.find((x) => x.leagueId === leagueId && x.userId === memberId);
    if (!m) throw new DataError("Member not found");
    m.role = newRole;
  }
  async planSlotCheckout(payerId: string, leagueId: string, selection: string[] | "all_unpaid") {
    const db = this.db;
    const l = league(db, leagueId);
    requireBeforeDraft(l, "Paying");
    const r = role(db, leagueId, payerId);
    if (!r) throw new DataError("Join the league first");
    const teams = db.teams.filter((t) => t.leagueId === leagueId);
    const isCommish = r === "commissioner" || r === "co_commissioner";
    if (!isCommish) {
      // Players pay only their own slot.
      const mine = teams.find((t) => t.ownerId === payerId);
      if (!mine || selection === "all_unpaid" || selection.length !== 1 || selection[0] !== mine.id) throw new DataError("You can only pay for your own team");
    }
    const slots = teams.map((t) => ({ teamId: t.id, status: slotPayment(db.payments, t.id)?.status ?? ("unpaid" as const) }));
    const plan = planCheckout(slots, selection, db.leagueBilling.find((b) => b.leagueId === leagueId)?.pricePerMemberCents);
    if (!plan.ok) throw new DataError(plan.reason);
    return { teamIds: plan.teamIds, quantity: plan.quantity, amountCents: plan.amountCents };
  }
  async markSlotsPaid(input: MarkSlotsPaidInput) {
    // Mirrors public.mark_slots_paid(): all-or-nothing, only 'unpaid' slots. Stops double payment.
    const db = this.db;
    const rows = input.teamIds.map((id) => slotPayment(db.payments, id) ?? (db.teams.some((t) => t.id === id && t.leagueId === input.leagueId) ? newSlotPayment(db, input.leagueId, id, db.teams.find((t) => t.id === id)!.ownerId) : undefined));
    if (new Set(input.teamIds).size !== input.teamIds.length || rows.some((p) => !p || p.leagueId !== input.leagueId || p.status !== "unpaid"))
      throw new DataError("Some slots are already paid or not payable");
    const at = now();
    for (const p of rows as SlotPayment[]) {
      Object.assign(p, { status: "paid", payerId: input.payerId, provider: input.provider, checkoutId: input.checkoutId, providerPaymentId: input.providerPaymentId, paidAt: at });
      db.entitlements.push({ id: rid("ent"), userId: p.memberId, leagueId: input.leagueId, kind: "league_membership", sourcePaymentId: p.id, startsAt: at, endsAt: null });
    }
    return rows.length;
  }
  async remindUnpaid(userId: string, leagueId: string, teamId: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const p = slotPayment(db.payments, teamId);
    if (!p || p.leagueId !== leagueId || p.status !== "unpaid") throw new DataError("That slot doesn't need a reminder");
    if (!p.memberId) throw new DataError("That slot is open; share the invite code instead");
    p.remindedAt = now();
    return { to: db.profiles.find((x) => x.id === p.memberId)?.email ?? null };
  }
  async remindAllUnpaid(userId: string, leagueId: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const at = now();
    let count = 0;
    for (const t of db.teams.filter((x) => x.leagueId === leagueId)) {
      const p = slotPayment(db.payments, t.id);
      if (p && p.status === "unpaid" && p.memberId) {
        p.remindedAt = at;
        count++;
      }
    }
    return { count };
  }
  async requestRefund(userId: string, leagueId: string, teamId: string) {
    // TODO(refunds): placeholder. The provider refund goes back to whoever paid (payer_id), never to the member.
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    requireBeforeDraft(league(db, leagueId), "Refunding");
    const p = slotPayment(db.payments, teamId);
    if (!p || p.leagueId !== leagueId || p.status !== "paid") throw new DataError("Only paid slots can be refunded");
    Object.assign(p, { status: "refund_pending", refundToId: p.payerId });
    newSlotPayment(db, leagueId, teamId, db.teams.find((t) => t.id === teamId)?.ownerId ?? null);
    db.entitlements = db.entitlements.filter((e) => e.sourcePaymentId !== p.id);
    return p;
  }
  async removeMember(userId: string, leagueId: string, memberId: string) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    requireBeforeDraft(l, "Removing members");
    if (l.ownerId === memberId) throw new DataError("The league owner can't be removed");
    if (!role(db, leagueId, memberId)) throw new DataError("Member not found");
    db.leagueMembers = db.leagueMembers.filter((m) => !(m.leagueId === leagueId && m.userId === memberId));
    const team = db.teams.find((t) => t.leagueId === leagueId && t.ownerId === memberId);
    if (!team) return;
    team.ownerId = null;
    const p = slotPayment(db.payments, team.id);
    if (p?.status === "paid" && p.payerId === memberId) {
      // They paid for themselves: refund them (placeholder) and reopen the slot unpaid.
      Object.assign(p, { status: "refund_pending", refundToId: memberId });
      newSlotPayment(db, leagueId, team.id, null);
    } else if (p) {
      p.memberId = null; // unpaid, waived, or covered by someone else: the slot keeps that status for the next member
    }
  }
}
