import { env } from "./env";

/** Sentry placeholder. TODO(sentry): npx @sentry/wizard -i nextjs, then forward to Sentry.captureException. */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!env.sentry.dsn) console.warn("[monitoring stub]", error instanceof Error ? error.message : error, context ?? "");
}
