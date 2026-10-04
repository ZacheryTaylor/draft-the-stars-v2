/** In-memory adapter so the whole app runs without Supabase. Resets when the server restarts. Mirrors the RLS rules. */
import { initialLeagueStatus, leagueGate } from "@/lib/billing";
import { billing } from "@/lib/billing/config";
import { checkPick, teamForPick, totalPicks } from "@/lib/league/draft";
import { leagueSizing } from "@/lib/league/sizing";
import { isThemeId } from "@/lib/themes/presets";
import { DataError, type CreateLeagueInput, type DataAdapter, type LeagueSummary } from "./adapter";
import { createSeedState } from "./mock-seed";
import type { DbState, League, LeagueBundle, MemberRole, Payment, Profile } from "./types";

const g = globalThis as unknown as { __dtsMockDb?: DbState };
export function mockDb(): DbState {
  if (!g.__dtsMockDb) g.__dtsMockDb = createSeedState();
  return g.__dtsMockDb;
}
export function resetMockDb(): void {
  g.__dtsMockDb = createSeedState();
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

  async getProfile(id: string) {
    return this.db.profiles.find((p) => p.id === id) ?? null;
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
    return this.db.seasons.map((season) => ({ season, show: this.db.shows.find((s) => s.id === season.showId)!, castUnits: this.db.units.filter((u) => u.seasonId === season.id).length }));
  }
  async listLeaguesForUser(userId: string): Promise<LeagueSummary[]> {
    const db = this.db;
    return db.leagueMembers
      .filter((m) => m.userId === userId)
      .map((m) => {
        const l = league(db, m.leagueId);
        const season = db.seasons.find((s) => s.id === l.seasonId)!;
        return {
          league: l,
          role: m.role,
          memberCount: db.leagueMembers.filter((x) => x.leagueId === l.id).length,
          teamName: db.teams.find((t) => t.leagueId === l.id && t.ownerId === userId)?.name ?? null,
          seasonTitle: season.title,
          showName: db.shows.find((s) => s.id === season.showId)?.name ?? "",
          billingStatus: db.leagueBilling.find((b) => b.leagueId === l.id)?.status ?? "pending",
        };
      });
  }
  async getLeague(slug: string): Promise<LeagueBundle | null> {
    const db = this.db;
    const l = db.leagues.find((x) => x.slug === slug);
    if (!l) return null;
    const season = db.seasons.find((s) => s.id === l.seasonId)!;
    const units = db.units.filter((u) => u.seasonId === season.id);
    const episodes = db.episodes.filter((e) => e.seasonId === season.id);
    const epIds = new Set(episodes.map((e) => e.id));
    return {
      show: db.shows.find((s) => s.id === season.showId)!,
      season,
      units,
      contestants: db.contestants.filter((c) => c.seasonId === season.id),
      episodes,
      scores: db.scores.filter((s) => epIds.has(s.episodeId)),
      league: l,
      members: db.leagueMembers.filter((m) => m.leagueId === l.id).map((m) => ({ ...m, profile: db.profiles.find((p) => p.id === m.userId) ?? null })),
      teams: db.teams.filter((t) => t.leagueId === l.id),
      picks: db.picks.filter((p) => p.leagueId === l.id),
      invites: db.invites.filter((i) => i.leagueId === l.id && !i.revoked),
      billing: db.leagueBilling.find((b) => b.leagueId === l.id)!,
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
      status: initialLeagueStatus(),
      draftStatus: "not_started",
      createdAt: now(),
    };
    db.leagues.push(l);
    db.leagueMembers.push({ leagueId: id, userId, role: "commissioner", joinedAt: now() });
    for (let i = 1; i <= input.teamCount; i++)
      db.teams.push({ id: `${id}:team:${i}`, leagueId: id, ownerId: i === 1 ? userId : null, name: i === 1 ? `${owner.username}'s team` : `Team ${i}`, draftPosition: i });
    db.invites.push({ id: rid("invite"), leagueId: id, code: code(), createdBy: userId, expiresAt: null, maxUses: null, uses: 0, claimTeamId: null, revoked: false });
    db.leagueBilling.push({
      leagueId: id,
      status: l.status === "active" ? "waived" : "pending",
      pricePerMemberCents: billing.pricePerMemberCents,
      billedMemberCount: input.teamCount,
      amountDueCents: input.teamCount * billing.pricePerMemberCents,
      provider: null,
      paidAt: null,
    });
    return l;
  }
  async joinLeagueByCode(userId: string, raw: string) {
    const db = this.db;
    const inv = db.invites.find((i) => i.code === raw.trim().toUpperCase() && !i.revoked);
    if (!inv || (inv.expiresAt && inv.expiresAt < now()) || (inv.maxUses != null && inv.uses >= inv.maxUses)) throw new DataError("Invite code is invalid or expired");
    const l = league(db, inv.leagueId);
    const gate = leagueGate(l.status);
    if (!gate.allowed) throw new DataError(gate.message);
    if (role(db, l.id, userId)) return l;
    if (db.leagueMembers.filter((m) => m.leagueId === l.id).length >= l.settings.teamCount) throw new DataError("This league is full");
    db.leagueMembers.push({ leagueId: l.id, userId, role: "player", joinedAt: now() });
    inv.uses += 1;
    const team = (inv.claimTeamId && db.teams.find((t) => t.id === inv.claimTeamId && !t.ownerId)) || db.teams.find((t) => t.leagueId === l.id && !t.ownerId);
    if (team) team.ownerId = userId;
    return l;
  }
  async setDraftStatus(userId: string, leagueId: string, status: League["draftStatus"]) {
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    if (status === "in_progress") {
      const gate = leagueGate(l.status);
      if (!gate.allowed) throw new DataError(gate.message);
    }
    l.draftStatus = status;
  }
  async makePick(userId: string, leagueId: string, contestantId: string) {
    const db = this.db;
    const l = league(db, leagueId);
    const gate = leagueGate(l.status);
    if (!gate.allowed) throw new DataError(gate.message);
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
  async overrideScore(userId: string, leagueId: string, episodeNumber: number, unitId: string, rawScore: number, eliminated: boolean) {
    // In Supabase, shared scores are admin/service-role only; commissioner overrides would go to a per-league override table (TODO).
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    const ep = db.episodes.find((e) => e.seasonId === l.seasonId && e.number === episodeNumber);
    if (!ep) throw new DataError("Unknown week");
    if (!(rawScore >= 0 && rawScore <= ep.maxScore)) throw new DataError(`Score must be 0-${ep.maxScore}`);
    const existing = db.scores.find((s) => s.episodeId === ep.id && s.unitId === unitId);
    if (existing) Object.assign(existing, { rawScore, eliminated, source: "manual" });
    else db.scores.push({ id: rid("score"), episodeId: ep.id, unitId, rawScore, eliminated, source: "manual", published: true });
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
  async recordPayment(payment: Omit<Payment, "id" | "createdAt">) {
    const db = this.db;
    const l = league(db, payment.leagueId);
    const p: Payment = { ...payment, id: rid("payment"), createdAt: now() };
    db.payments.push(p);
    if (p.status !== "succeeded") return;
    const b = db.leagueBilling.find((x) => x.leagueId === l.id)!;
    Object.assign(b, { status: "active", provider: p.provider, paidAt: p.createdAt, billedMemberCount: p.memberCount, amountDueCents: 0 });
    l.status = "active";
    db.entitlements.push({ id: rid("ent"), userId: null, leagueId: l.id, kind: "league_season_pass", sourcePaymentId: p.id, startsAt: p.createdAt, endsAt: null });
  }
  async resetBilling(userId: string, leagueId: string) {
    // Demo helper only (mock): put a league back to pending_payment to re-run checkout.
    const db = this.db;
    requireCommissioner(db, leagueId, userId);
    const l = league(db, leagueId);
    const b = db.leagueBilling.find((x) => x.leagueId === leagueId)!;
    Object.assign(b, { status: "pending", provider: null, paidAt: null, amountDueCents: l.settings.teamCount * b.pricePerMemberCents });
    l.status = "pending_payment";
    db.entitlements = db.entitlements.filter((e) => e.leagueId !== leagueId);
  }
}
