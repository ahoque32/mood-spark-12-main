"use client";

import { useState } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { Navigation } from "@/components/layout/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { UserSettings } from "@/components/UserSettings";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <AuthGate>
      <div className="min-h-screen bg-background">
        <Navigation onShowSettings={() => setShowSettings(true)} />
        <main className="pb-20">
          {children}
        </main>
        <BottomNav />
        
        {showSettings && (
          <UserSettings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </AuthGate>
  );
}