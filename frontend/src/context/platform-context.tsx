import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  BOOKMARK_GROWTH,
  LANGUAGE_DISTRIBUTION,
  MOODS,
  TRENDING_TAGS,
  VERSIONS,
  WRITERS,
  WRITING_ACTIVITY,
  WRITINGS,
  type Writing,
} from "@/lib/demo-data";
import { apiClient } from "@/lib/api";

type AuthUser = {
  id: string;
  name: string;
  avatar: string;
  mode: "member" | "guest";
};

type Settings = {
  language: string;
  theme: "parchment" | "midnight";
  editorFont: "serif" | "display" | "mono";
  notifications: boolean;
  ambientMotion: boolean;
};

type PlatformContextValue = {
  ready: boolean;
  user: AuthUser | null;
  writings: Writing[];
  bookmarks: string[];
  settings: Settings;
  selectedSidebarPath: string;
  sidebarCollapsed: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => void;
  toggleBookmark: (writingId: string) => void;
  isBookmarked: (writingId: string) => boolean;
  saveSidebarPath: (path: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const STORAGE_KEY = "akshar.demo.state.v1";

const defaultSettings: Settings = {
  language: "Hindi",
  theme: "parchment",
  editorFont: "serif",
  notifications: true,
  ambientMotion: true,
};

type PersistedState = {
  ready: boolean;
  user: AuthUser | null;
  bookmarks: string[];
  settings: Settings;
  selectedSidebarPath: string;
  sidebarCollapsed: boolean;
};

const defaultPersisted: PersistedState = {
  ready: false,
  user: null,
  bookmarks: ["wr-1", "wr-4"],
  settings: defaultSettings,
  selectedSidebarPath: "/dashboard",
  sidebarCollapsed: false,
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useState<PersistedState>(defaultPersisted);
  const { ready, user, bookmarks, settings, selectedSidebarPath, sidebarCollapsed } = persistedState;

  // Apply theme immediately on mount to prevent FOUC (flash of unstyled content)
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", settings.theme === "midnight");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        setPersistedState({
          ready: true,
          user: parsed.user ?? null,
          bookmarks: parsed.bookmarks ?? defaultPersisted.bookmarks,
          settings: parsed.settings ?? defaultPersisted.settings,
          selectedSidebarPath: parsed.selectedSidebarPath ?? defaultPersisted.selectedSidebarPath,
          sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
        });
      } else {
        setPersistedState((prev) => ({ ...prev, ready: true }));
      }
    } catch {
      setPersistedState((prev) => ({ ...prev, ready: true }));
    }
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const payload = {
      user,
      bookmarks,
      settings,
      selectedSidebarPath,
      sidebarCollapsed,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, user, bookmarks, settings, selectedSidebarPath, sidebarCollapsed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", settings.theme === "midnight");
  }, [settings.theme]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      ready,
      user,
      writings: WRITINGS,
      bookmarks,
      settings,
      selectedSidebarPath,
      sidebarCollapsed,
      signIn: async (email, password) => {
        try {
          const response = await apiClient.signIn(email, password);
          setPersistedState((prev) => ({
            ...prev,
            user: {
              id: response.data.user.id,
              name: response.data.user.name,
              avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=240&q=80",
              mode: "member",
            },
          }));
        } catch (error) {
          console.error('Sign in failed:', error);
          // Fallback to demo mode
          await wait(500);
          setPersistedState((prev) => ({
            ...prev,
            user: {
              id: "u-demo",
              name: email.split("@")[0] || "Writer",
              avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=240&q=80",
              mode: "member",
            },
          }));
        }
      },
      signUp: async (email, password, name) => {
        try {
          const response = await apiClient.signUp(email, name || "New Writer", password);
          setPersistedState((prev) => ({
            ...prev,
            user: {
              id: response.data.user.id,
              name: response.data.user.name,
              avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&q=80",
              mode: "member",
            },
          }));
        } catch (error) {
          console.error('Sign up failed:', error);
          // Fallback to demo mode
          await wait(700);
          setPersistedState((prev) => ({
            ...prev,
            user: {
              id: "u-new",
              name: name || "New Writer",
              avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&q=80",
              mode: "member",
            },
          }));
        }
      },
      continueAsGuest: async () => {
        await wait(350);
        setPersistedState((prev) => ({
          ...prev,
          user: {
            id: "u-guest",
            name: "Guest Writer",
            avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=240&q=80",
            mode: "guest",
          },
        }));
      },
      signOut: () => {
        apiClient.signOut();
        setPersistedState((prev) => ({ ...prev, user: null }));
      },
      toggleBookmark: (writingId) =>
        setPersistedState((prev) => ({
          ...prev,
          bookmarks: prev.bookmarks.includes(writingId)
            ? prev.bookmarks.filter((id) => id !== writingId)
            : [writingId, ...prev.bookmarks],
        })),
      isBookmarked: (writingId) => bookmarks.includes(writingId),
      saveSidebarPath: (path) =>
        setPersistedState((prev) => ({ ...prev, selectedSidebarPath: path })),
      setSidebarCollapsed: (collapsed) =>
        setPersistedState((prev) => ({ ...prev, sidebarCollapsed: collapsed })),
      updateSettings: (patch) =>
        setPersistedState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } })),
    }),
    [bookmarks, ready, selectedSidebarPath, settings, sidebarCollapsed, user],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return context;
}

export function useDemoAnalytics() {
  const { writings, bookmarks } = usePlatform();

  const categoryCount = writings.reduce<Record<string, number>>((acc, writing) => {
    acc[writing.category] = (acc[writing.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    categoryCount,
    totalWritings: writings.length,
    totalBookmarks: bookmarks.length,
    draftVersions: VERSIONS,
    featuredWriters: WRITERS,
    trends: TRENDING_TAGS,
    moods: MOODS,
    bookmarkGrowth: BOOKMARK_GROWTH,
    writingActivity: WRITING_ACTIVITY,
    languageDistribution: LANGUAGE_DISTRIBUTION,
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
