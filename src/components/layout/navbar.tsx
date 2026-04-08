"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  teacher: "강사",
  student: "수강생",
  owner: "원장",
};

const ROLE_NAV: Record<string, Array<{ href: string; label: string }>> = {
  teacher: [
    { href: "/instructor", label: "세션 관리" },
    { href: "/mentor", label: "멘토" },
  ],
  student: [
    { href: "/student/join", label: "수업 참여" },
  ],
  owner: [
    { href: "/owner", label: "대시보드" },
    { href: "/mentor", label: "멘토" },
  ],
};

export function Navbar() {
  const { profile, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = profile?.role ?? "student";
  const navItems = ROLE_NAV[role] ?? [];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          <Eye className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Argos</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* User info */}
        {!isLoading && profile && (
          <div className="hidden md:flex items-center gap-3">
            <Badge variant="outline">{ROLE_LABELS[role] ?? role}</Badge>
            <span className="text-sm font-medium">{profile.display_name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm font-medium rounded-md",
                pathname.startsWith(item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          {profile && (
            <div className="pt-2 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ROLE_LABELS[role] ?? role}</Badge>
                <span className="text-sm">{profile.display_name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                로그아웃
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
