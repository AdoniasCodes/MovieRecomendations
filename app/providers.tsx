"use client";

import { AnniversaryStage } from "@/components/anniversary/AnniversaryStage";
import { BottomNav } from "@/components/nav/BottomNav";
import { AssistantButton } from "@/components/ai/AssistantButton";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { NudgeOverlay } from "@/components/notifications/NudgeOverlay";
import { MatchOverlay } from "@/components/discover/MatchOverlay";
import { SyncStatus } from "@/components/SyncStatus";
import { TitleSheetHost } from "@/components/title/TitleSheet";
import { WatchParty } from "@/components/watch/WatchParty";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { WelcomeGate } from "@/components/WelcomeGate";
import { useActivityTracker } from "@/lib/activity";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useActivityTracker();
  return (
    <AuthProvider>
    <StoreProvider>
      <div className="relative mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-3">
        {children}
      </div>
      <BottomNav />
      <AssistantButton />
      <NotificationsBell />
      <MatchOverlay />
      <NudgeOverlay />
      <AnniversaryStage />
      <SyncStatus />
      <TitleSheetHost />
      <WatchParty />
      <RegisterSW />
      <WelcomeGate />
    </StoreProvider>
    </AuthProvider>
  );
}
