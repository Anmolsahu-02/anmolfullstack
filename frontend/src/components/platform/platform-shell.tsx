import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BarChart3,
  BookCheck,
  BookMarked,
  BookOpen,
  Bookmark,
  Clapperboard,
  Compass,
  Feather,
  FileClock,
  FileText,
  Globe,
  Home,
  Library,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Sparkles,
  UserRound,
  Waves,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/context/platform-context";

type SidebarItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { to: "/dashboard", label: "common.home", icon: Home },
  { to: "/explore", label: "common.explore", icon: Compass },
  { to: "/my-writings", label: "common.myWritings", icon: BookCheck },
  { to: "/poetry", label: "common.poetry", icon: Feather },
  { to: "/lyrics", label: "common.lyrics", icon: Waves },
  { to: "/stories", label: "common.stories", icon: BookOpen },
  { to: "/screenplays", label: "common.screenplays", icon: Clapperboard },
  { to: "/library", label: "common.library", icon: Library },
  { to: "/bookmarks", label: "common.bookmarks", icon: Bookmark },
  { to: "/drafts", label: "common.drafts", icon: FileText },
  { to: "/analytics", label: "common.analytics", icon: BarChart3 },
  { to: "/profile", label: "common.profile", icon: UserRound },
  { to: "/settings", label: "common.settings", icon: Settings },
];

export function PlatformShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const {
    user,
    ready,
    selectedSidebarPath,
    saveSidebarPath,
    sidebarCollapsed,
    setSidebarCollapsed,
    signOut,
  } = usePlatform();
  const [mobileOpen, setMobileOpen] = useState(false);

  const greeting = useMemo(() => {
    if (!user) return t('common.welcome');
    return `${t('common.welcomeBack')}, ${user.name.split(" ")[0]}`;
  }, [user, t]);

  const activePath = location.pathname;

  useEffect(() => {
    if (ready) {
      saveSidebarPath(activePath);
    }
  }, [activePath, ready, saveSidebarPath]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-serif-lit italic text-xl text-foreground/60"
          style={{ animation: "float-a 2s ease-in-out infinite" }}
        >
          Preparing your manuscript desk...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center px-4 bg-background">
        <section className="paper-texture max-w-md w-full rounded-2xl border border-foreground/10 shadow-paper p-6 text-center space-y-4">
          <div className="text-xs uppercase tracking-[0.22em] text-foreground/50">
            Session required
          </div>
          <h1 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
            Continue to your writing desk
          </h1>
          <p className="font-serif-lit italic text-foreground/70">
            This workspace keeps your drafts, bookmarks, and reading flow behind sign-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-ink px-5 text-xs uppercase tracking-[0.2em] text-primary-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-full border border-foreground/20 px-5 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Create account
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-spotlight opacity-40" />
      <div
        className="absolute -top-20 -left-20 w-56 h-56 rounded-full blur-3xl opacity-20"
        style={{ background: "var(--gold)" }}
      />
      <div
        className="absolute -bottom-20 right-0 w-72 h-72 rounded-full blur-3xl opacity-15"
        style={{ background: "var(--maroon)" }}
      />

      <aside
        className={cn(
          "hidden md:flex relative z-20 border-r border-foreground/10 paper-texture flex-col transition-all duration-500",
          sidebarCollapsed ? "w-20 px-3" : "w-72 px-5",
        )}
      >
        <div className="h-16 flex items-center justify-between">
          <Link
            to="/"
            className={cn(
              "font-display text-2xl tracking-tight",
              sidebarCollapsed && "text-center w-full",
            )}
            style={{ color: "var(--ink)" }}
          >
            अ{!sidebarCollapsed && <span className="text-foreground">kshar</span>}
          </Link>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="rounded-full h-8 w-8 text-foreground/60 hover:text-foreground hover:bg-foreground/8 transition-colors"
            >
              <Menu className="w-4 h-4 mx-auto" />
            </button>
          )}
        </div>

        <nav className="mt-3 flex-1 space-y-1 pb-4 overflow-auto">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarButton
              key={item.to}
              item={item}
              collapsed={sidebarCollapsed}
              active={activePath === item.to}
              selectedSidebarPath={selectedSidebarPath}
              onSelect={(path) => {
                saveSidebarPath(path);
                setMobileOpen(false);
              }}
            />
          ))}
        </nav>

        <div className="pb-5">
          <div className="paper-texture border border-foreground/10 rounded-lg p-3">
            {!sidebarCollapsed ? (
              <>
                <div className="text-xs uppercase tracking-[0.2em] text-foreground/45 mb-2">
                  Weekly spark
                </div>
                <div className="font-display text-3xl" style={{ color: "var(--ink)" }}>
                  2,148
                </div>
                <div className="text-xs text-foreground/60 italic">words written this week</div>
              </>
            ) : (
              <div className="grid place-items-center text-foreground/70">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="mt-3 w-full text-xs uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground"
            >
              expand
            </button>
          )}
        </div>
      </aside>

      <motion.div
        initial={false}
        animate={{ x: mobileOpen ? 0 : -340 }}
        className="fixed md:hidden z-40 top-0 left-0 bottom-0 w-80 paper-texture border-r border-foreground/10 p-4"
      >
        <div className="h-12 flex items-center justify-between">
          <div className="font-display text-2xl" style={{ color: "var(--ink)" }}>
            अkshar
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-sm uppercase tracking-[0.2em] text-foreground/60"
          >
            close
          </button>
        </div>
        <div className="mt-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarButton
              key={item.to}
              item={item}
              collapsed={false}
              active={activePath === item.to}
              selectedSidebarPath={selectedSidebarPath}
              onSelect={(path) => {
                saveSidebarPath(path);
                setMobileOpen(false);
              }}
            />
          ))}
        </div>
      </motion.div>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 md:hidden bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="flex-1 relative z-20 min-w-0">
        <header className="h-16 border-b border-foreground/10 px-4 md:px-8 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-full h-9 w-9 bg-foreground/8"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-4 h-4 mx-auto" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                {greeting}
              </div>
              <div className="font-serif-lit italic text-sm text-foreground/75">{subtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/editor"
              className="hidden sm:inline-flex h-9 px-4 rounded-full bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.2em] items-center"
            >
              <PenLine className="w-3.5 h-3.5 mr-2" /> {t('common.write')}
            </Link>
            {/* Language picker — English / Hindi only */}
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="h-9 px-3 rounded-full border border-foreground/20 bg-background/80 text-sm text-foreground hover:border-foreground/40 transition-colors"
              title={t('common.language')}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
            {/* Avatar — person silhouette with initials */}
            <div
              title={user.name}
              className="h-9 w-9 rounded-full border border-foreground/20 flex items-center justify-center bg-foreground/8 select-none shrink-0"
              style={{ color: "var(--ink)" }}
            >
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <circle cx="18" cy="13" r="6" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M5 31c0-7.18 5.82-13 13-13s13 5.82 13 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <button
              onClick={() => {
                signOut();
              }}
              className="h-9 w-9 rounded-full border border-foreground/20 text-foreground/70 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </header>

        <section className="px-4 py-8 md:px-8 md:py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="font-display text-4xl md:text-5xl" style={{ color: "var(--ink)" }}>
              {title}
            </h1>
          </motion.div>
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}

function SidebarButton({
  item,
  active,
  onSelect,
  selectedSidebarPath,
  collapsed,
}: {
  item: SidebarItem;
  active: boolean;
  onSelect: (path: string) => void;
  selectedSidebarPath: string;
  collapsed: boolean;
}) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const selected = selectedSidebarPath === item.to;

  return (
    <Link
      to={item.to}
      onClick={() => onSelect(item.to)}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-md overflow-hidden transition-colors",
        active
          ? "text-foreground font-semibold bg-foreground/[0.13]"
          : "text-foreground/70 hover:text-foreground hover:bg-foreground/6",
        collapsed && "justify-center px-2",
      )}
    >
      <motion.span
        className="absolute inset-0 rounded-md pointer-events-none"
        initial={false}
        animate={{
          boxShadow: active
            ? "inset 0 0 0 1px color-mix(in oklab, var(--gold) 55%, transparent)"
            : "inset 0 0 0 1px transparent",
        }}
      />
      <motion.span
        className="absolute h-20 w-20 rounded-full pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: "color-mix(in oklab, var(--gold) 25%, transparent)",
          left: "10%",
          top: "-70%",
        }}
        animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.22, 0] }}
        transition={{ duration: 0.85, repeat: Infinity, repeatDelay: 0.9 }}
      />
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="text-sm">{t(item.label)}</span>}
      {selected && !collapsed && !active && (
        <BookMarked className="w-3.5 h-3.5 ml-auto text-foreground/40" />
      )}
    </Link>
  );
}
