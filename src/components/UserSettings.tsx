"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2 } from "lucide-react";

interface UserSettingsProps {
  onClose: () => void;
}

interface Settings {
  analyzeTone: boolean;
  correlateSocial: boolean;
  shareWithTherapist: boolean;
}

export function UserSettings({ onClose }: UserSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    analyzeTone: false,
    correlateSocial: false,
    shareWithTherapist: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      setSettings(settings);
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/settings/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-data.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export successful",
          description: `Your data has been exported as ${format.toUpperCase()}.`,
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your data.",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch('/api/settings/delete-account', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Account deleted",
          description: "Your account and all data have been permanently deleted.",
        });
        window.location.reload();
      } else {
        throw new Error('Account deletion failed');
      }
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Failed to delete your account.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account preferences and data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacy Settings</CardTitle>
              <CardDescription>
                Control how your data is used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="analyzeTone" className="text-sm font-medium">
                  Analyze tone in entries
                </Label>
                <Switch
                  id="analyzeTone"
                  checked={settings.analyzeTone}
                  onCheckedChange={(value) => updateSetting('analyzeTone', value)}
                  disabled={isSaving || isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="correlateSocial" className="text-sm font-medium">
                  Correlate with social data
                </Label>
                <Switch
                  id="correlateSocial"
                  checked={settings.correlateSocial}
                  onCheckedChange={(value) => updateSetting('correlateSocial', value)}
                  disabled={isSaving || isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="shareWithTherapist" className="text-sm font-medium">
                  Share with therapist
                </Label>
                <Switch
                  id="shareWithTherapist"
                  checked={settings.shareWithTherapist}
                  onCheckedChange={(value) => updateSetting('shareWithTherapist', value)}
                  disabled={isSaving || isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Data</CardTitle>
              <CardDescription>
                Download your mood data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => exportData('json')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => exportData('csv')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}