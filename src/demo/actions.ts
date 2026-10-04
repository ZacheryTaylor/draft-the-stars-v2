/** Demo versions of the server actions (src/app/actions.ts), running against the browser store. */
import { useRouter } from "next/navigation";
import { billing } from "@/lib/billing/config";
import { getPaymentProvider } from "@/lib/billing/get-provider";
import { DataError } from "@/lib/data/adapter";
import { isThemeId, THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes/presets";
import type { MemberRole } from "@/lib/data/types";
import { demoRoutes as r } from "@/views/routes";
import { commit, currentUid, demoData, resetDemo, setFlash, setUid } from "./store";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const leagueId = (slug: string) => {
  const b = demoData.getLeagueNow(slug);
  if (!b) throw new DataError("League not found");
  return b;
};
function me() {
  const uid = currentUid();
  if (!uid || !demoData.getProfileNow(uid)) throw new DataError("Log in first (try zach)");
  return uid;
}
function applyTheme(t: ThemeId) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, t);
  } catch {}
}

export function useDemoActions(page: string) {
  const router = useRouter();
  const run =
    (fn: (form: FormData) => Promise<void> | void) =>
    async (form: FormData): Promise<void> => {
      try {
        await fn(form);
      } catch (e) {
        setFlash({ page, error: e instanceof DataError || e instanceof RangeError ? e.message : "Something went wrong in the demo" });
      }
      commit();
    };
  const saved = (s: string) => setFlash({ page, saved: s });

  return {
    logIn: run(async (f) => {
      const p = await demoData.findProfileByLogin(str(f, "login"));
      if (!p) throw new DataError("No demo account with that username (try zach)");
      setUid(p.id);
      applyTheme(p.themePreset);
      const next = str(f, "next");
      router.push(next.startsWith("/") ? next : r.dashboard);
    }),
    signUp: run(async (f) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(f, "email"))) throw new DataError("Enter a valid email");
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      const p = await demoData.createProfile({ email: str(f, "email"), username: str(f, "username"), birthYear: Number(str(f, "birthYear")), themePreset: isThemeId(theme) ? theme : undefined });
      setUid(p.id);
      router.push(r.dashboard);
    }),
    logOut: async () => {
      setUid(null);
      router.push(r.home);
    },
    resetDemo: () => {
      resetDemo();
      router.push(r.home);
    },
    saveTheme: async (t: ThemeId): Promise<{ saved: "profile" | "local" }> => {
      applyTheme(t);
      const uid = currentUid();
      if (uid && demoData.getProfileNow(uid)) {
        await demoData.updateProfile(uid, { themePreset: t });
        commit();
        return { saved: "profile" };
      }
      return { saved: "local" };
    },
    updateUsername: run(async (f) => {
      await demoData.updateProfile(me(), { username: str(f, "username"), displayName: str(f, "displayName") });
      saved("profile");
    }),
    createLeague: run(async (f) => {
      const l = await demoData.createLeague(me(), {
        name: str(f, "name"),
        seasonId: str(f, "seasonId"),
        teamCount: Number(str(f, "teamCount")),
        draftType: str(f, "draftType") === "linear" ? "linear" : "snake",
        privacy: str(f, "privacy") === "public" ? "public" : "private",
      });
      commit();
      router.push(r.league(l.slug, "fees", "new=1"));
    }),
    joinLeague: run(async (f) => {
      const l = await demoData.joinLeagueByCode(me(), str(f, "code"));
      commit();
      router.push(r.league(l.slug));
    }),
    // league actions (stay on the page)
    checkoutSlots: run(async (f) => {
      const uid = me();
      const b = leagueId(str(f, "slug"));
      const mode = str(f, "mode");
      const selection = mode === "all_unpaid" ? "all_unpaid" : mode === "mine" ? b.teams.filter((t) => t.ownerId === uid).map((t) => t.id) : f.getAll("teamId").map(String);
      const plan = await demoData.planSlotCheckout(uid, b.league.id, selection);
      const provider = getPaymentProvider();
      const res = await provider.createCheckout({ leagueId: b.league.id, leagueName: b.league.name, payerId: uid, teamIds: plan.teamIds, quantity: plan.quantity, amountCents: plan.amountCents, currency: billing.currency, successUrl: "", cancelUrl: "" });
      if (res.kind !== "paid") throw new DataError(res.kind === "unavailable" ? res.reason : "Checkout unavailable in the demo");
      await demoData.markSlotsPaid({ leagueId: b.league.id, teamIds: plan.teamIds, payerId: uid, provider: provider.id, checkoutId: res.providerPaymentId, providerPaymentId: res.providerPaymentId });
      setFlash({ page, paid: String(plan.quantity) });
    }),
    remindUnpaid: run(async (f) => {
      await demoData.remindUnpaid(me(), leagueId(str(f, "slug")).league.id, str(f, "teamId"));
      saved("reminder");
    }),
    requestRefund: run(async (f) => {
      const p = await demoData.requestRefund(me(), leagueId(str(f, "slug")).league.id, str(f, "teamId"));
      if (p.providerPaymentId) await getPaymentProvider().refund(p.providerPaymentId, p.amountCents);
      saved("refund");
    }),
    removeMember: run(async (f) => {
      await demoData.removeMember(me(), leagueId(str(f, "slug")).league.id, str(f, "memberId"));
      saved("removed");
    }),
    setDraftStatus: run(async (f) => {
      await demoData.setDraftStatus(me(), leagueId(str(f, "slug")).league.id, str(f, "status") as "in_progress" | "paused" | "not_started");
    }),
    makePick: run(async (f) => {
      await demoData.makePick(me(), leagueId(str(f, "slug")).league.id, str(f, "contestantId"));
    }),
    regenerateInvite: run(async (f) => {
      await demoData.regenerateInvite(me(), leagueId(str(f, "slug")).league.id);
      saved("invite");
    }),
    setMemberRole: run(async (f) => {
      await demoData.setMemberRole(me(), leagueId(str(f, "slug")).league.id, str(f, "memberId"), str(f, "role") as MemberRole);
      saved("role");
    }),
    randomizeDraftOrder: run(async (f) => {
      await demoData.randomizeDraftOrder(me(), leagueId(str(f, "slug")).league.id, str(f, "seed") || undefined);
      saved("order");
    }),
    saveDraftOrder: run(async (f) => {
      await demoData.setDraftOrder(me(), leagueId(str(f, "slug")).league.id, str(f, "order").split(",").filter(Boolean));
      saved("order");
    }),
    overrideScore: run(async (f) => {
      await demoData.overrideScore(me(), leagueId(str(f, "slug")).league.id, Number(str(f, "week")), str(f, "unitId"), Number(str(f, "score")), f.get("eliminated") === "on", str(f, "reason"));
      saved("score");
    }),
    clearScoreOverride: run(async (f) => {
      await demoData.clearScoreOverride(me(), leagueId(str(f, "slug")).league.id, str(f, "overrideId"));
      saved("score");
    }),
  };
}
