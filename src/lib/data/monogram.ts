const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]);
/** Initials for monogram avatars (no photos, ever). "Harry Shum Jr." -> "HS". */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => !SUFFIXES.has(w.toLowerCase()) && /[a-z0-9]/i.test(w));
  if (!words.length) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
