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

describe("row-level security", () => {
  let leagueId = "";
  beforeAll(async () => {
    leagueId = await as(A, async () => {
      const r = await db.query<{ id: string }>(`
        insert into leagues (slug, name, season_id, scoring_template_id, owner_id)
        select 'abcd1234', 'Test League', s.id, t.id, '${A}' from seasons s, scoring_templates t limit 1 returning id`);
      return r.rows[0].id;
    });
  });

  it("new league: owner is commissioner, league pending_payment, billing pending at team_count x 300c", async () => {
    const m = await db.query<{ role: string }>(`select role from league_members where league_id = $1`, [leagueId]);
    expect(m.rows).toEqual([{ role: "commissioner" }]);
    const l = await db.query<{ status: string }>(`select status from leagues where id = $1`, [leagueId]);
    expect(l.rows[0].status).toBe("pending_payment");
    const b = await db.query(`select status, price_per_member_cents, billed_member_count, amount_due_cents from league_billing where league_id = $1`, [leagueId]);
    expect(b.rows[0]).toEqual({ status: "pending", price_per_member_cents: 300, billed_member_count: 8, amount_due_cents: 2400 });
  });

  it("commissioner cannot self-activate or resize a league; invites are refused while pending", async () => {
    await as(A, async () => {
      await expect(db.query(`update leagues set status = 'active' where id = $1`, [leagueId])).rejects.toThrow(/checkout/);
      await expect(db.query(`update leagues set settings = jsonb_set(settings, '{team_count}', '12') where id = $1`, [leagueId])).rejects.toThrow(/checkout/);
      await db.query(`insert into invites (league_id, code, created_by) values ($1, 'JOINME42', '${A}')`, [leagueId]);
    });
    await expect(as(B, () => db.query(`select join_league_by_code('JOINME42')`))).rejects.toThrow(/waiting for payment/);
    await expect(db.query(`insert into leagues (slug, name, season_id, scoring_template_id, owner_id, settings) select 'toolarge', 'x', s.id, t.id, '${A}', '{"team_count": 13}' from seasons s, scoring_templates t`)).rejects.toThrow();
  });

  it("service role (after mock payment) activates the league", async () => {
    await db.query(`update leagues set status = 'active' where id = $1`, [leagueId]); // postgres superuser = service side
    await db.query(`update league_billing set status = 'active', provider = 'mock', paid_at = now() where league_id = $1`, [leagueId]);
    expect((await db.query<{ status: string }>(`select status from leagues where id = $1`, [leagueId])).rows[0].status).toBe("active");
  });

  it("non-members cannot see a private league; anon can read show data", async () => {
    expect((await as(B, () => db.query(`select * from leagues`))).rows).toHaveLength(0);
    expect((await as(null, () => db.query(`select * from leagues`))).rows).toHaveLength(0);
    expect((await as(null, () => db.query(`select * from contestants`))).rows).toHaveLength(32);
  });

  it("players cannot write scores or mark a league paid", async () => {
    await as(A, async () => {
      const r = await db.query(`update league_billing set status = 'active' where league_id = $1 returning *`, [leagueId]);
      expect(r.rows).toHaveLength(0); // no update policy: only the service role can activate
      await expect(db.query(`insert into scores (episode_id, unit_id, raw_score) select e.id, u.id, 30 from episodes e, contestant_units u where e.number = 11 limit 1`)).rejects.toThrow();
    });
  });

  it("join by invite code adds a player; commissioner-only invites stay hidden", async () => {
    expect((await as(B, () => db.query(`select * from invites`))).rows).toHaveLength(0);
    await as(B, () => db.query(`select join_league_by_code('joinme42')`));
    expect((await as(B, () => db.query(`select * from leagues`))).rows).toHaveLength(1);
    const roles = await as(B, () => db.query<{ role: string }>(`select role from league_members where league_id = $1 order by role`, [leagueId]));
    expect(roles.rows.map((r) => r.role)).toEqual(["commissioner", "player"]);
    // a player cannot promote themselves
    const up = await as(B, () => db.query(`update league_members set role = 'commissioner' where user_id = '${B}' returning *`));
    expect(up.rows).toHaveLength(0);
  });

  it("users can only change their own profile/theme", async () => {
    const own = await as(B, () => db.query(`update profiles set theme_preset = 'gold' where id = '${B}' returning theme_preset`));
    expect(own.rows).toHaveLength(1);
    const other = await as(B, () => db.query(`update profiles set theme_preset = 'gold' where id = '${A}' returning theme_preset`));
    expect(other.rows).toHaveLength(0);
  });
});
