# Test fixtures copied from the live league (read-only copy)

Used **only** as test fixtures and as the input to the migration dry-run. Nothing here is served by the app.

| File | Source |
| --- | --- |
| season.json, scores.json, league.json, elimination-schedule.json | `ZacheryTaylor/dwts-draft` `data/` @ `073b8c9` (2026-10-02 15:37 CT) |
| live-scoring.cjs | `ZacheryTaylor/dwts-draft` `js/scoring.js` @ `073b8c9`, unchanged (reference implementation for bit-for-bit tests) |
| live-rendered-baseline.json | Rankings + weekly tables as rendered by the LIVE site in headless Chromium, captured 2026-10-02 15:32 CT (backup `20261002-153200`) |

Refresh after each episode by re-copying the four JSON files (and a new baseline capture) before the migration gate.
| live-rendered-current.json | Rankings as rendered by the LIVE site https://zacherytaylor.github.io/dwts-draft/ (read-only headless capture), 2026-10-04 08:41 CT, scores updatedAt 2026-10-02 15:37 CT. Uses the current (capped) Max Possible. |

Note: `live-rendered-baseline.json` was captured *before* the 2026-10-02 Max Possible change, so its MPP column is the legacy formula; the tests compare it against `maxPossibleLegacy`.
