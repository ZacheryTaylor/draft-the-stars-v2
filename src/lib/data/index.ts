import { env } from "@/lib/services/env";
import type { DataAdapter } from "./adapter";
import { MockAdapter } from "./mock-adapter";

let adapter: DataAdapter | null = null;

/** The app's data layer. Only the mock exists today; DATA_ADAPTER=supabase is a TODO. */
export function getData(): DataAdapter {
  if (!adapter) {
    if (env.dataAdapter === "supabase") console.warn("[data] DATA_ADAPTER=supabase is not implemented yet; using the mock adapter.");
    adapter = new MockAdapter();
  }
  return adapter;
}
export { DataError } from "./adapter";
