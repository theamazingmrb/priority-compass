"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Home, BookOpen, CheckSquare, Compass, Play, Pause, LogOut, User, Music, ChevronLeft, ChevronRight, Map, Star, CalendarDays, MoreHorizontal, X, Timer, Settings, BarChart3, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpotify } from "@/lib/spotify-context";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/brand-logo";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/checkin", label: "Check-in", icon: Compass },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/warmap", label: "Life Lanes", icon: Map },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/reflections", label: "Reflections", icon: Star },
  { href: "/playlist", label: "Playlist", icon: Music },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Primary nav items shown on mobile (top 5)
const mobilePrimaryLinks = links.slice(0, 5);
// Settings always at the end of overflow
const mobileOverflowLinks = links.slice(5, -1); // Exclude settings from grid
const mobileSettingsLink = links[links.length - 1]; // Settings link

export default function Nav() {
  const path = usePathname();
  const { currentTrack, isPlaying, playerReady, playTrack, pause } = useSpotify();
  const { user, signOut } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const [showOverflow, setShowOverflow] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const isActiveOverflowItem = mobileOverflowLinks.some(link => link.href === path);

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-border bg-card py-8 z-50 transition-all duration-300",
        collapsed ? "w-16 px-2" : "w-56 px-4"
      )}>
        {/* Logo / Toggle */}
        <div className="mb-8 px-3 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <BrandLogo size={20} className="text-primary" />
              <span className="text-primary font-bold text-base tracking-tight">Priority Compass</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-muted-foreground hover:text-foreground transition-colors",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                path === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                collapsed && "justify-center"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} />
              {!collapsed && label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          {user && !collapsed && (
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <User size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium truncate">{user.user_metadata?.name || user.email}</span>
              </div>
              <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-xs">
                <LogOut size={14} className="mr-2" />
                Sign Out
              </Button>
            </div>
          )}
          {currentTrack && playerReady && !collapsed && (
            <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
              <div className="flex items-center gap-2">
                {currentTrack.album_art && (
                  <Image src={currentTrack.album_art} alt={currentTrack.name} width={36} height={36} className="rounded flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{currentTrack.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                </div>
                <button
                  onClick={isPlaying ? pause : () => playTrack(currentTrack)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            </div>
          )}
          {!collapsed && (
            <div className="flex items-center justify-between px-2">
              <p className="text-xs text-muted-foreground">Stay focused. Stay fluid.</p>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-border bg-card/95 backdrop-blur-md flex items-center px-1 safe-area-inset-bottom shadow-lg">
        {mobilePrimaryLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2.5 px-1 transition-all touch-feedback",
              path === href
                ? "text-primary"
                : "text-muted-foreground active:bg-secondary/50 active:scale-95"
            )}
          >
            <Icon size={24} strokeWidth={path === href ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        
        {/* More button */}
        <button
          onClick={() => setShowOverflow(!showOverflow)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] py-2.5 px-1 transition-all touch-feedback",
            showOverflow || isActiveOverflowItem
              ? "text-primary"
              : "text-muted-foreground active:bg-secondary/50 active:scale-95"
          )}
        >
          {showOverflow ? <X size={24} strokeWidth={2} /> : <MoreHorizontal size={24} strokeWidth={showOverflow || isActiveOverflowItem ? 2.5 : 2} />}
          <span className="text-[10px] font-medium">{showOverflow ? "Close" : "More"}</span>
        </button>
      </nav>

      {/* ── Mobile overflow menu ── */}
      {showOverflow && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/90 backdrop-blur-md" onClick={() => setShowOverflow(false)}>
          <div 
            className="absolute bottom-20 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border p-4 safe-area-inset-bottom shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-3">
              {mobileOverflowLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowOverflow(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl min-h-[88px] transition-all touch-feedback",
                    path === href
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground active:scale-95 active:bg-secondary"
                  )}
                >
                  <Icon size={28} strokeWidth={path === href ? 2.5 : 2} />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              ))}
            </div>
            {/* Settings link at bottom */}
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href={mobileSettingsLink.href}
                onClick={() => setShowOverflow(false)}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-4 rounded-xl transition-all min-h-[52px] touch-feedback",
                  path === mobileSettingsLink.href
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground active:scale-[0.98] active:bg-secondary"
                )}
              >
                <div className="flex items-center gap-3">
                  <mobileSettingsLink.icon size={22} strokeWidth={path === mobileSettingsLink.href ? 2.5 : 2} />
                  <span className="text-sm font-medium">{mobileSettingsLink.label}</span>
                </div>
                {path === mobileSettingsLink.href && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}