// apps/mobile/src/navigation/safeBack.ts
import { router } from "expo-router";
import { goTab, TabKey } from "./goTab";

/**
 * Safe back navigation:
 * - If there's history, go back.
 * - If not (deep-link / cold start), go to a safe tab.
 */
export function safeBack(fallbackTab: TabKey = "dashboard") {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  goTab(fallbackTab);
}
