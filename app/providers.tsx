"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { AssistantButton } from "@/components/ai/AssistantButton";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { MatchOverlay } from "@/components/discover/MatchOverlay";
import { TitleSheetHost } from "@/components/title/TitleSheet";
import { WatchParty } from "@/components/watch/WatchParty";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import { WelcomeGate } from "@/components/WelcomeGate";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
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
      <TitleSheetHost />
      <WatchParty />
      <RegisterSW />
      <WelcomeGate />
    </StoreProvider>
    </AuthProvider>
  );
}
