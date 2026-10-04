/**
 * Migration-script stub: maps the girls' league v1 JSON to the v2 schema and verifies that
 * recomputed standings match the backup with 0 differences. DRY-RUN ONLY: nothing connects to
 * Supabase. Writes the plan to .migration-dry-run/ (git-ignored).
 *
 *   npm run migrate:dry-run
 *   npx tsx scripts/migrate-legacy-league.ts --dry-run --data /workspace/dwts-backup/<stamp>/live-deployed/data --baseline <rendered.json>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { mapLegacyLeague, planToSql, verifyMigration, type LegacyData } from "../src/lib/migration/legacy-to-v2";

const args = process.argv.slice(2);
const arg = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const root = join(__dirname, "..");
const dataDir = resolve(arg("data", join(root, "tests/fixtures/live-data"))!);
const baselinePath = arg("baseline", join(root, "tests/fixtures/live-data/live-rendered-current.json"));
const outDir = resolve(arg("out", join(root, ".migration-dry-run"))!);

if (args.includes("--apply")) {
  console.error("--apply is not implemented. TODO(migration): after the Nov 24 finale, connect with SUPABASE_SERVICE_ROLE_KEY, run plan.sql in one transaction, rebuild standings_cache, and re-run this verification against the database.");
  process.exit(2);
}
if (!args.includes("--dry-run")) {
  console.error("Refusing to run without --dry-run.");
  process.exit(2);
}

const read = (f: string) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));
const schedulePath = join(dataDir, "elimination-schedule.json");
const data: LegacyData = {
  season: read("season.json"),
  scores: read("scores.json"),
  league: read("league.json"),
  schedule: existsSync(schedulePath) ? read("elimination-schedule.json") : undefined,
};
const baseline = baselinePath && existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : undefined;

const plan = mapLegacyLeague(data, { feeWaived: arg("billing") !== "unpaid" }); // --billing=unpaid to charge the $5 fee
const result = verifyMigration(plan, data, baseline);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "plan.json"), JSON.stringify(plan, null, 2));
writeFileSync(join(outDir, "plan.sql"), planToSql(plan, data));
const report = [
  `Migration dry-run  ${new Date().toISOString()}`,
  `source data: ${dataDir}`,
  `baseline:    ${baseline ? baselinePath : "(none)"}`,
  `mapped: league "${plan.league.name}" (${plan.league.slug}), ${plan.teams.length} teams, ${plan.picks.length} picks, ${plan.invites.length} claim invites, ${plan.seasonBundle.units.length} units, ${plan.seasonBundle.contestants.length} contestants, ${plan.seasonBundle.episodes.length} episodes, ${plan.seasonBundle.scores.length} scores`,
  `warnings: ${plan.warnings.length ? plan.warnings.join("; ") : "none"}`,
  "",
  "Recomputed standings (from v2 rows):",
  ...result.table.map((l) => "  " + l),
  "",
  `${result.compared} values compared (v2 vs v1 scoring bit-for-bit${baseline ? " + v2 vs rendered baseline" : ""}), ${result.differences.length} differences`,
  ...result.differences.map((d) => "  DIFF " + d),
  result.differences.length ? "GATE: FAIL" : "GATE: PASS (0 differences)",
].join("\n");
writeFileSync(join(outDir, "verification.txt"), report + "\n");
console.log(report);
console.log(`\nwrote ${outDir}/plan.json, plan.sql, verification.txt`);
process.exit(result.differences.length ? 1 : 0);
