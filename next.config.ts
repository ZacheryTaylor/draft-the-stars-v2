import type { NextConfig } from "next";

/**
 * DEMO_EXPORT=1 (scripts/build-demo.mjs): static export of the browser-only demo for GitHub Pages.
 * Default: the regular server app (server actions + mock adapter today, Supabase later).
 */
const demo = process.env.DEMO_EXPORT === "1";
const basePath = process.env.DEMO_BASE_PATH ?? "/draft-the-stars-v2";

const nextConfig: NextConfig = demo
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
      distDir: "out", // with output: "export", the export lands in distDir
      // The server app is parked in src/server-app during the demo build; CI typechecks everything separately.
      typescript: { ignoreBuildErrors: true },
    }
  : {};

export default nextConfig;
