/**
 * Draft order: seeded randomize (auditable, re-rollable) or manual reorder. Pure functions.
 * The order is a list of team ids, first pick first. Snake order follows it (teamForPick).
 * Locks once the draft starts (also enforced by a DB trigger on teams.draft_position).
 */

/** cyrb53-style string hash -> 32-bit seed. */
function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

/** mulberry32 PRNG. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle. Input is canonicalised (sorted) so seed + team ids fully determine the result. */
export function seededShuffle(teamIds: string[], seed: string): string[] {
  const out = [...teamIds].sort();
  const rand = prng(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface DraftOrderLogEntry {
  roll: number; // 1, 2, 3 ... (re-rolls increment)
  method: "random" | "manual";
  seed: string | null;
  input: string[]; // canonical (sorted) team ids the shuffle used
  order: string[];
  createdBy: string;
  createdAt: string;
}

export function randomizeEntry(teamIds: string[], seed: string, roll: number, createdBy: string, createdAt: string): DraftOrderLogEntry {
  return { roll, method: "random", seed, input: [...teamIds].sort(), order: seededShuffle(teamIds, seed), createdBy, createdAt };
}

export function manualEntry(order: string[], roll: number, createdBy: string, createdAt: string): DraftOrderLogEntry {
  return { roll, method: "manual", seed: null, input: [...order].sort(), order: [...order], createdBy, createdAt };
}

/** Audit: re-run a logged random roll and confirm it produced the recorded order. */
export function verifyEntry(entry: DraftOrderLogEntry): boolean {
  if (entry.method === "manual") return true;
  return entry.seed !== null && seededShuffle(entry.input, entry.seed).join() === entry.order.join();
}

/** Move one team (drag-to-reorder or up/down buttons). */
export function moveTeam(order: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return [...order];
  const out = [...order];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/** Validate a submitted manual order: exactly the league's teams, each once. */
export function isValidOrder(order: string[], teamIds: string[]): boolean {
  return order.length === teamIds.length && new Set(order).size === order.length && order.every((id) => teamIds.includes(id));
}

export function isOrderLocked(draftStatus: string): boolean {
  return draftStatus !== "not_started";
}

/** draft_position (1-based) per team id for an order. */
export function positionsFor(order: string[]): Record<string, number> {
  return Object.fromEntries(order.map((id, i) => [id, i + 1]));
}
