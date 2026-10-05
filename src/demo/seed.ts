/** Demo seed for the static GitHub Pages build: the regular mock seed + the girls' league as a read-only sample. */
import { createSeedState } from "@/lib/data/mock-seed";
import { mapLegacyLeague, type LegacyData } from "@/lib/migration/legacy-to-v2";
import type { DbState } from "@/lib/data/types";
import season from "../../tests/fixtures/live-data/season.json";
import scores from "../../tests/fixtures/live-data/scores.json";
import league from "../../tests/fixtures/live-data/league.json";
import schedule from "../../tests/fixtures/live-data/elimination-schedule.json";

export const GIRLS_SLUG = "girls-league-sample";

export function createDemoState(): DbState {
  const s = createSeedState();
  const plan = mapLegacyLeague({ season, scores, league, schedule } as unknown as LegacyData, { commissionerId: "user:zach", slug: GIRLS_SLUG });
  const L = plan.league;
  s.leagues.push({ ...L, name: `${L.name} (girls' league sample)` });
  // Sample teams are filled for count consistency (dashboard filled/paid); only zach is a real member.
  for (const t of plan.teams) t.ownerId = t.ownerId ?? `legacy:${t.id}`;
  s.teams.push(...plan.teams);
  s.picks.push(...plan.picks);
  s.invites.push(...plan.invites);
  s.leagueMembers.push({ leagueId: L.id, userId: "user:zach", role: "commissioner", joinedAt: L.createdAt });
  s.leagueBilling.push(plan.billing);
  for (const t of plan.teams)
    s.payments.push({
      id: `payment:${t.id}`, leagueId: L.id, teamId: t.id, memberId: null, payerId: null, amountCents: plan.billing.pricePerMemberCents, currency: "usd",
      status: "waived", provider: null, checkoutId: null, providerPaymentId: null, paidAt: null, remindedAt: null, refundToId: null, createdAt: L.createdAt,
    });
  s.draftOrderLog.push({ id: `order:${L.id}`, leagueId: L.id, roll: 1, method: "manual", seed: null, input: plan.teams.map((t) => t.id).sort(), order: plan.teams.map((t) => t.id), createdBy: "user:zach", createdAt: L.createdAt });
  return s;
}
