/**
 * Applies every migration + seed to PGlite (real Postgres compiled to WASM, no network, no Supabase)
 * and checks constraints and row-level security behave as intended.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "supabase");
const sql = (p: string) => readFileSync(join(root, p), "utf8");
let db: PGlite;

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(sql("tests/local-shim.sql"));
  for (const f of readdirSync(join(root, "migrations")).sort()) await db.exec(sql(`migrations/${f}`));
  await db.exec(sql("tests/local-grants.sql"));
  await db.exec(sql("seed.sql"));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@example.com', '{"username":"Commish_A","birth_year":1990}'),
      ('${B}', 'b@example.com', '{"username":"player_b","birth_year":1995,"theme_preset":"dark"}');
  `);
});

describe("migrations + seed", () => {
  it("seeds DWTS Season 35 in show-agnostic form", async () => {
    const r = await db.query<{ units: number; people: number; eps: number; scores: number }>(`
      select (select count(*) from contestant_units)::int units, (select count(*) from contestants)::int people,
             (select count(*) from episodes)::int eps, (select count(*) from scores)::int scores`);
    expect(r.rows[0]).toEqual({ units: 16, people: 32, eps: 11, scores: 43 });
    const rv = await db.query<{ v: number[] }>(`select array_agg(round_value::int order by number) v from episodes`);
    expect(rv.rows[0].v).toEqual([10, 12, 14, 16, 18, 20, 23, 26, 29, 32, 36]);
  });

  it("creates profiles from auth sign-up, lowercases usernames, keeps theme", async () => {
    const r = await db.query<{ username: string; theme_preset: string }>(`select username, theme_preset from profiles order by username`);
    expect(r.rows).toEqual([{ username: "commish_a", theme_preset: "pink" }, { username: "player_b", theme_preset: "dark" }]);
  });

  it("rejects under-13 users, duplicate usernames and unknown themes", async () => {
    await expect(db.exec(`insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000c1', '{"username":"kid","birth_year":${new Date().getFullYear() - 10}}')`)).rejects.toThrow(/13 or older/);
    await expect(db.exec(`insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000c2', '{"username":"PLAYER_B","birth_year":1990}')`)).rejects.toThrow();
    await expect(db.exec(`update profiles set theme_preset = 'neon' where id = '${A}'`)).rejects.toThrow();
  });
});

const C = "00000000-0000-0000-0000-00000000000c";

describe("row-level security, slot payments, draft gate", () => {
  let leagueId = "";
  const team: string[] = [];
  const pay = (ids: string[], payer: string, chk: string) =>
    db.query(`select mark_slots_paid($1, $2::uuid[], $3, 'mock', $4, $4)`, [leagueId, `{${ids.join(",")}}`, payer, chk]);
  const slot = async (i: number) =>
    (await db.query<{ status: string; member_id: string | null; payer_id: string | null }>(`select status, member_id, payer_id from payments where team_id = $1 and status <> 'void'`, [team[i]])).rows[0];

  beforeAll(async () => {
    await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${C}', 'c@example.com', '{"username":"player_c","birth_year":1999}')`);
    leagueId = await as(A, async () => {
      const r = await db.query<{ id: string }>(`
        insert into leagues (slug, name, season_id, scoring_template_id, owner_id, settings)
        select 'abcd1234', 'Test League', s.id, t.id, '${A}', '{"team_count": 3, "roster_size": {"celebrity": 5, "pro": 5}, "copies_per_contestant": 1, "draft_type": "snake"}'
        from seasons s, scoring_templates t limit 1 returning id`);
      return r.rows[0].id;
    });
    await as(A, async () => {
      for (let i = 1; i <= 3; i++) {
        const r = await db.query<{ id: string }>(`insert into teams (league_id, owner_id, name, draft_position) values ($1, $2, $3, $4) returning id`, [leagueId, i === 1 ? A : null, `Team ${i}`, i]);
        team.push(r.rows[0].id);
      }
      await db.query(`insert into invites (league_id, code, created_by) values ($1, 'JOINME42', '${A}')`, [leagueId]);
    });
  });

  it("creating a league is free: active, $5 per slot, one unpaid payment row per slot", async () => {
    expect((await db.query<{ status: string }>(`select status from leagues where id = $1`, [leagueId])).rows[0].status).toBe("active");
    expect((await db.query(`select price_per_member_cents, fee_waived from league_billing where league_id = $1`, [leagueId])).rows[0]).toEqual({ price_per_member_cents: 500, fee_waived: false });
    const rows = await db.query<{ status: string; amount_cents: number }>(`select status, amount_cents from payments where league_id = $1`, [leagueId]);
    expect(rows.rows).toEqual([1, 2, 3].map(() => ({ status: "unpaid", amount_cents: 500 })));
    expect(await slot(0)).toMatchObject({ member_id: A, payer_id: null });
  });

  it("non-members cannot see a private league; anon can read show data", async () => {
    expect((await as(B, () => db.query(`select * from leagues`))).rows).toHaveLength(0);
    expect((await as(null, () => db.query(`select * from leagues`))).rows).toHaveLength(0);
    expect((await as(null, () => db.query(`select * from contestants`))).rows).toHaveLength(32);
  });

  it("join by code claims the next open slot; members can't mark themselves paid", async () => {
    expect((await as(B, () => db.query(`select * from invites`))).rows).toHaveLength(0);
    await as(B, () => db.query(`select join_league_by_code('joinme42')`));
    expect(await slot(1)).toMatchObject({ status: "unpaid", member_id: B });
    const upd = await as(B, () => db.query(`update payments set status = 'paid' where team_id = $1 returning *`, [team[1]]));
    expect(upd.rows).toHaveLength(0); // no update policy
    await expect(as(B, () => pay([team[1]], B, "x"))).rejects.toThrow(/permission denied/);
    await expect(as(A, () => pay([team[1]], A, "x"))).rejects.toThrow(/permission denied/); // commissioner can't either: server only
    const up = await as(B, () => db.query(`update league_members set role = 'commissioner' where user_id = '${B}' returning *`));
    expect(up.rows).toHaveLength(0);
    await expect(as(B, () => db.query(`update teams set draft_position = 1 where id = $1`, [team[1]]))).rejects.toThrow(/commissioner/);
    await expect(as(B, () => db.query(`update teams set owner_id = null where id = $1`, [team[1]]))).rejects.toThrow(/commissioner/);
    expect((await as(B, () => db.query(`update teams set name = 'Bea Team' where id = $1 returning name`, [team[1]]))).rows).toHaveLength(1);
  });

  it("draft can't start while a slot is open or unpaid", async () => {
    await expect(as(A, () => db.query(`update leagues set draft_status = 'in_progress' where id = $1`, [leagueId]))).rejects.toThrow(/filled and paid/);
  });

  it("commissioner covers a member + an open slot in ONE checkout; payer recorded separately; no double payment", async () => {
    expect((await pay([team[1], team[2]], A, "chk_cover")).rows[0]).toEqual({ mark_slots_paid: 2 }); // server (service role)
    expect(await slot(1)).toEqual({ status: "paid", member_id: B, payer_id: A });
    expect(await slot(2)).toEqual({ status: "paid", member_id: null, payer_id: A });
    await expect(pay([team[1]], B, "chk_dup")).rejects.toThrow(/already paid/);
    await expect(db.query(`insert into payments (league_id, team_id, amount_cents, status) values ($1, $2, 500, 'unpaid')`, [leagueId, team[1]])).rejects.toThrow(/payments_one_active_per_slot/);
    await expect(as(A, () => db.query(`update leagues set draft_status = 'in_progress' where id = $1`, [leagueId]))).rejects.toThrow(/filled and paid/);
  });

  it("a covered open slot stays paid when someone claims it", async () => {
    await as(C, () => db.query(`select join_league_by_code('JOINME42')`));
    expect(await slot(2)).toEqual({ status: "paid", member_id: C, payer_id: A });
  });

  it("commissioner pays their own slot, then the draft can start; order locks", async () => {
    await expect(as(A, () => db.query(`update leagues set draft_status = 'in_progress' where id = $1`, [leagueId]))).rejects.toThrow(/filled and paid/);
    await pay([team[0]], A, "chk_own");
    await as(A, () => db.query(`update leagues set draft_status = 'in_progress' where id = $1`, [leagueId]));
    await expect(as(A, () => db.query(`update teams set draft_position = 9 where id = $1`, [team[0]]))).rejects.toThrow(/locked/);
    const ent = await db.query(`select count(*)::int n from entitlements where league_id = $1 and kind = 'league_membership'`, [leagueId]);
    expect(ent.rows[0]).toEqual({ n: 3 });
  });

  it("score overrides are per league and never touch shared scores", async () => {
    const before = (await db.query(`select sum(raw_score)::text s from scores`)).rows[0];
    await as(A, () => db.query(`insert into league_score_overrides (league_id, episode_id, unit_id, raw_score, created_by) select $1, e.id, u.id, 30, '${A}' from episodes e, contestant_units u where e.number = 1 limit 1`, [leagueId]));
    await expect(as(B, () => db.query(`insert into league_score_overrides (league_id, episode_id, unit_id, raw_score) select $1, e.id, u.id, 1 from episodes e, contestant_units u where e.number = 2 limit 1`, [leagueId]))).rejects.toThrow();
    expect((await as(B, () => db.query(`select * from league_score_overrides`))).rows).toHaveLength(1);
    expect((await db.query(`select sum(raw_score)::text s from scores`)).rows[0]).toEqual(before);
    await expect(as(A, () => db.query(`insert into scores (episode_id, unit_id, raw_score) select e.id, u.id, 30 from episodes e, contestant_units u where e.number = 11 limit 1`))).rejects.toThrow();
  });

  it("users can only change their own profile/theme", async () => {
    expect((await as(B, () => db.query(`update profiles set theme_preset = 'gold' where id = '${B}' returning theme_preset`))).rows).toHaveLength(1);
    expect((await as(B, () => db.query(`update profiles set theme_preset = 'gold' where id = '${A}' returning theme_preset`))).rows).toHaveLength(0);
  });
});

describe("girls' league dry-run SQL applies cleanly", () => {
  it("creates 8 fee-waived slots, 64 picks, and the draft is complete", async () => {
    const { mapLegacyLeague, planToSql } = await import("@/lib/migration/legacy-to-v2");
    const fx = (f: string) => JSON.parse(readFileSync(join(__dirname, "fixtures", "live-data", f), "utf8"));
    const data = { season: fx("season.json"), scores: fx("scores.json"), league: fx("league.json"), schedule: fx("elimination-schedule.json") };
    const out = planToSql(mapLegacyLeague(data as never), data as never).replaceAll(":'commissioner_id'", `'${A}'`);
    await db.exec(out); // as the service role (migration operator)
    const r = await db.query<{ status: string; n: number }>(
      `select p.status, count(*)::int n from payments p join leagues l on l.id = p.league_id where l.slug = 'dwts35-league1' group by 1`,
    );
    expect(r.rows).toEqual([{ status: "waived", n: 8 }]);
    const picks = await db.query<{ n: number }>(`select count(*)::int n from picks p join leagues l on l.id = p.league_id where l.slug = 'dwts35-league1'`);
    expect(picks.rows[0].n).toBe(64);
    expect((await db.query(`select draft_status from leagues where slug = 'dwts35-league1'`)).rows[0]).toEqual({ draft_status: "complete" });
  });
});
