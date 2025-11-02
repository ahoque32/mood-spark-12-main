"use client";

import { useAppStore } from "@/lib/store";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Settings() {
  const { settings, setSettings } = useAppStore();

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Settings & Privacy
          </h1>
          <p className="text-muted-foreground">
            Control your data and tracking preferences
          </p>
        </div>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Your Privacy Matters</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All emotion analysis is local to your device. You choose what to share.
                We never sell your data or use it for advertising.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <PrivacyToggle
            id="analyze-tone"
            label="Analyze message tone"
            description="On-device only / never leaves your phone"
            checked={settings.analyzeTone}
            onCheckedChange={(checked) => setSettings({ analyzeTone: checked })}
          />

          <PrivacyToggle
            id="correlate-social"
            label="Correlate mood with social media time"
            description="Usage only; no content analyzed"
            checked={settings.correlateSocial}
            onCheckedChange={(checked) => setSettings({ correlateSocial: checked })}
          />

          <PrivacyToggle
            id="share-therapist"
            label="Allow therapist insights access"
            description="Encrypted | You control what's shared"
            checked={settings.shareWithTherapist}
            onCheckedChange={(checked) => setSettings({ shareWithTherapist: checked })}
          />
        </div>
      </div>
    </div>
  );
}
