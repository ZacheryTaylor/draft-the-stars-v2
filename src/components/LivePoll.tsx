"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Realtime placeholder: re-fetches the page every few seconds. TODO(realtime): Supabase Realtime channel `draft:<leagueId>`. */
export function LivePoll({ seconds = 8, active }: { seconds?: number; active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [active, seconds, router]);
  return null;
}
