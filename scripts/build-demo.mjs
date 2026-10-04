#!/usr/bin/env node
/**
 * Builds the static GitHub Pages demo into ./out.
 * Next.js only routes src/app, so for the demo build we temporarily swap in src/demo-app
 * (client pages + browser-side mock adapter in localStorage) and restore the server app afterwards.
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";

const APP = "src/app", PARKED = "src/server-app", DEMO = "src/demo-app";
function restore() {
  if (existsSync(PARKED)) {
    if (existsSync(APP)) renameSync(APP, DEMO);
    renameSync(PARKED, APP);
  }
}
restore(); // recover from an interrupted earlier run
if (!existsSync(DEMO)) throw new Error(`${DEMO} not found`);
renameSync(APP, PARKED);
renameSync(DEMO, APP);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restore(); process.exit(1); });
try {
  rmSync("out", { recursive: true, force: true });
  execSync("npx next build", { stdio: "inherit", env: { ...process.env, DEMO_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" } });
} finally {
  restore();
}
writeFileSync("out/.nojekyll", ""); // serve _next/ as-is on GitHub Pages
console.log(`\nDemo exported to ./out (basePath ${process.env.DEMO_BASE_PATH ?? "/draft-the-stars-v2"})`);
