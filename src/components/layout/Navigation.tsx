"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut } from "lucide-react";

interface NavigationProps {
  onShowSettings?: () => void;
}

export function Navigation({ onShowSettings }: NavigationProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 dark:bg-background/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-base font-semibold text-primary-foreground shadow-lg">
            ✺
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-lg font-semibold text-foreground">Mood Spark</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">intentional check-ins</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 rounded-full border bg-card px-2 py-1 shadow-sm">
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
            {user?.name ? "Logged in" : "Guest mode"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-muted shadow-sm">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {user ? getUserInitials(user.name, user.email) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.name && (
                    <p className="font-medium">{user.name}</p>
                  )}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShowSettings}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
