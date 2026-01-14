// apps/mobile/src/navigation/goTab.ts
import { router } from "expo-router";

export type TabKey = "dashboard" | "planner" | "scholarships" | "profile";

export const TAB_PATHS: Record<TabKey, string> = {
  dashboard: "/(tabs)",
  planner: "/(tabs)/planner",
  scholarships: "/(tabs)/scholarships",
  profile: "/(tabs)/profile",
} as const;

export function goTab(tab: TabKey) {
  // single canonical replace; never push
  router.replace(TAB_PATHS[tab]);
}
