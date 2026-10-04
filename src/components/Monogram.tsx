import { monogram } from "@/lib/data/monogram";

/** Initials avatar. The product never shows contestant photos or show logos. */
export function Monogram({ name, role, size, initials }: { name: string; role?: string; size?: "sm" | "lg"; initials?: string }) {
  return (
    <span className={`mono ${role === "pro" ? "pro" : ""} ${size ?? ""}`} aria-hidden="true" title={name}>
      {initials ?? monogram(name)}
    </span>
  );
}
