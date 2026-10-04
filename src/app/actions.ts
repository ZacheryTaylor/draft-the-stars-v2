"use server";
/** Server actions. All writes go through the DataAdapter (mock today). */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { billing } from "@/lib/billing/config";
import { getPaymentProvider } from "@/lib/billing/get-provider";
import { getData, DataError } from "@/lib/data";
import { clearSession, getCurrentUser, setSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/services/email";
import { captureException } from "@/lib/services/monitoring";
import { isThemeId, type ThemeId } from "@/lib/themes/presets";
import type { MemberRole } from "@/lib/data/types";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (path: string, error: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);

async function run<T>(path: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DataError || e instanceof RangeError) return back(path, e.message);
    captureException(e, { path });
    return back(path, "Something went wrong");
  }
}
async function requireUser(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return user;
}

export async function signUp(form: FormData) {
  const birthYear = Number(str(form, "birthYear"));
  const theme = str(form, "theme");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(form, "email"))) back("/signup", "Enter a valid email");
  const user = await run("/signup", () =>
    getData().createProfile({
      email: str(form, "email"),
      username: str(form, "username"),
      birthYear,
      themePreset: isThemeId(theme) ? theme : undefined,
    }),
  );
  await sendEmail({ to: user.email, subject: "Verify your Draft the Stars account", text: "Placeholder verification email" });
  await setSession(user.id);
  redirect("/dashboard");
}

export async function logIn(form: FormData) {
  const user = await getData().findProfileByLogin(str(form, "login"));
  if (!user) back("/login", "No account with that email or username (placeholder auth: try zach)");
  await setSession(user!.id);
  const next = str(form, "next");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logOut() {
  await clearSession();
  redirect("/");
}

export async function createLeague(form: FormData) {
  const user = await requireUser("/leagues/new");
  const league = await run("/leagues/new", () =>
    getData().createLeague(user.id, {
      name: str(form, "name"),
      seasonId: str(form, "seasonId"),
      teamCount: Number(str(form, "teamCount")),
      draftType: str(form, "draftType") === "linear" ? "linear" : "snake",
      privacy: str(form, "privacy") === "public" ? "public" : "private",
    }),
  );
  redirect(league.status === "pending_payment" ? `/leagues/${league.slug}/billing?new=1` : `/leagues/${league.slug}`);
}

/** Checkout. Today the provider is always the mock, which settles instantly. */
export async function checkoutLeague(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/billing`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  if (!bundle) back("/dashboard", "League not found");
  const { league } = bundle!;
  if (!bundle!.members.some((m) => m.userId === user.id && m.role !== "player")) back(path, "Only the commissioner can pay for the league");
  if (league.status === "active") back(path, "This league is already paid");
  const provider = getPaymentProvider();
  const result = await provider.createCheckout({
    leagueId: league.id,
    leagueName: league.name,
    payerId: user.id,
    memberCount: league.settings.teamCount,
    pricePerMemberCents: billing.pricePerMemberCents,
    currency: billing.currency,
    successUrl: `${path}?paid=1`,
    cancelUrl: path,
  });
  if (result.kind === "redirect") redirect(result.url);
  if (result.kind === "unavailable") back(path, result.reason);
  if (result.kind === "paid") {
    await getData().recordPayment({
      leagueId: league.id,
      payerId: user.id,
      provider: provider.id,
      providerPaymentId: result.providerPaymentId,
      amountCents: result.amountCents,
      currency: billing.currency,
      memberCount: league.settings.teamCount,
      pricePerMemberCents: billing.pricePerMemberCents,
      status: "succeeded",
    });
  }
  revalidatePath(`/leagues/${slug}`, "layout");
  redirect(`${path}?paid=1`);
}

export async function resetMockBilling(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/billing`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  await run(path, () => getData().resetBilling(user.id, bundle!.league.id));
  revalidatePath(`/leagues/${slug}`, "layout");
  redirect(path);
}

export async function joinLeague(form: FormData) {
  const user = await requireUser("/join");
  const league = await run("/join", () => getData().joinLeagueByCode(user.id, str(form, "code")));
  redirect(`/leagues/${league.slug}`);
}

export async function setDraftStatus(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/draft`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  const status = str(form, "status") as "in_progress" | "paused" | "not_started";
  await run(path, () => getData().setDraftStatus(user.id, bundle!.league.id, status));
  revalidatePath(path);
  redirect(path);
}

export async function makePick(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/draft`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  await run(path, () => getData().makePick(user.id, bundle!.league.id, str(form, "contestantId")));
  // TODO(realtime): broadcast on Supabase Realtime channel `draft:${leagueId}` instead of polling.
  revalidatePath(path);
  redirect(path);
}

export async function overrideScore(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/commissioner`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  await run(path, () =>
    getData().overrideScore(user.id, bundle!.league.id, Number(str(form, "week")), str(form, "unitId"), Number(str(form, "score")), form.get("eliminated") === "on"),
  );
  revalidatePath(`/leagues/${slug}`, "layout");
  redirect(`${path}?saved=score`);
}

export async function regenerateInvite(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/commissioner`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  await run(path, () => getData().regenerateInvite(user.id, bundle!.league.id));
  revalidatePath(path);
  redirect(`${path}?saved=invite`);
}

export async function setMemberRole(form: FormData) {
  const slug = str(form, "slug");
  const path = `/leagues/${slug}/commissioner`;
  const user = await requireUser(path);
  const bundle = await getData().getLeague(slug);
  await run(path, () => getData().setMemberRole(user.id, bundle!.league.id, str(form, "memberId"), str(form, "role") as MemberRole));
  revalidatePath(path);
  redirect(`${path}?saved=role`);
}

export async function updateUsername(form: FormData) {
  const user = await requireUser("/settings");
  await run("/settings", () => getData().updateProfile(user.id, { username: str(form, "username"), displayName: str(form, "displayName") }));
  revalidatePath("/", "layout");
  redirect("/settings?saved=profile");
}

/** Saves the theme to the profile (theme_preset column). Logged-out users rely on localStorage only. */
export async function saveTheme(theme: ThemeId): Promise<{ saved: "profile" | "local" }> {
  if (!isThemeId(theme)) throw new Error("Unknown theme");
  const user = await getCurrentUser();
  if (!user) return { saved: "local" };
  await getData().updateProfile(user.id, { themePreset: theme });
  revalidatePath("/", "layout");
  return { saved: "profile" };
}
