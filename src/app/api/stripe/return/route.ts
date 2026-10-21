import { env } from "@/lib/services/env";

/** Success/cancel landing: sends the member back to the league billing page. Paid status comes only from the webhook. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const league = u.searchParams.get("league_id") ?? "";
  const status = u.searchParams.get("status") === "success" ? "success" : "cancelled";
  const dest = league ? `/dashboard?checkout=${status}&league=${encodeURIComponent(league)}` : `/dashboard?checkout=${status}`;
  return Response.redirect(new URL(dest, env.siteUrl), 303);
}
