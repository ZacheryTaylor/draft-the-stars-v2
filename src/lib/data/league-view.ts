import type { LeagueBundle, Profile } from "./types";

export function viewerRole(bundle: LeagueBundle, user: Profile | null) {
  const m = user ? bundle.members.find((x) => x.userId === user.id) : undefined;
  return {
    isMember: Boolean(m),
    isCommissioner: m?.role === "commissioner" || m?.role === "co_commissioner",
    role: m?.role ?? null,
    myTeamId: user ? bundle.teams.find((t) => t.ownerId === user.id)?.id ?? null : null,
  };
}
