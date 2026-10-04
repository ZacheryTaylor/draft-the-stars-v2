/**
 * Every outside service is a placeholder. All values are optional and read from the environment;
 * see .env.example. Nothing here connects anywhere.
 */
const v = (k: string) => {
  const value = process.env[k];
  return value && value.trim() ? value.trim() : undefined;
};

export const env = {
  siteUrl: v("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
  dataAdapter: (v("DATA_ADAPTER") ?? "mock") as "mock" | "supabase",
  supabase: {
    url: v("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: v("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: v("SUPABASE_SERVICE_ROLE_KEY"),
    dbUrl: v("SUPABASE_DB_URL"),
  },
  stripe: {
    secretKey: v("STRIPE_SECRET_KEY"),
    publishableKey: v("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: v("STRIPE_WEBHOOK_SECRET"),
    priceId: v("STRIPE_PRICE_ID_LEAGUE_MEMBER"),
  },
  resend: { apiKey: v("RESEND_API_KEY"), from: v("EMAIL_FROM") },
  sentry: { dsn: v("NEXT_PUBLIC_SENTRY_DSN"), authToken: v("SENTRY_AUTH_TOKEN"), org: v("SENTRY_ORG"), project: v("SENTRY_PROJECT") },
};

export interface ServiceStatus { name: string; connected: boolean; envVars: string[]; note: string }

export function serviceStatus(): ServiceStatus[] {
  return [
    { name: "Supabase (database, auth, realtime)", connected: Boolean(env.supabase.url && env.supabase.anonKey), envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL"], note: "Using the in-memory mock data layer." },
    { name: "Stripe (payments)", connected: false, envVars: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID_LEAGUE_MEMBER"], note: "Mock provider only." },
    { name: "Resend (email)", connected: false, envVars: ["RESEND_API_KEY", "EMAIL_FROM"], note: "Emails are logged, not sent." },
    { name: "Sentry (errors)", connected: false, envVars: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"], note: "Errors are logged to the server console." },
  ];
}
