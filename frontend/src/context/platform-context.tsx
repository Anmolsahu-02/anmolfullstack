import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BOOKMARK_GROWTH,
  LANGUAGE_DISTRIBUTION,
  MOODS,
  TRENDING_TAGS,
  VERSIONS,
  WRITERS,
  WRITING_ACTIVITY,
  type Writing,
  type WritingCategory,
} from "@/lib/demo-data";
import { apiClient } from "@/lib/api";

interface Content {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: 'lyrics' | 'story' | 'poem' | 'screenplay';
  quillDelta: { ops: Array<{ insert?: string; attributes?: Record<string, unknown> }> };
  authorId: string;
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
}

type AuthUser = {
  id: string;
  name: string;
  avatar: string;
  role: 'writer' | 'reader';
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
  signUp: (email: string, password: string, name: string, role: 'writer' | 'reader') => Promise<void>;
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
  bookmarks: [],
  settings: defaultSettings,
  selectedSidebarPath: "/dashboard",
  sidebarCollapsed: false,
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [persistedState, setPersistedState] = useState<PersistedState>(defaultPersisted);
  const [mongoWritings, setMongoWritings] = useState<Writing[]>([]);

  // `ready` is gated ONLY on localStorage — never on the backend API call.
  // This ensures inputs on sign-in/sign-up are never blocked by a slow/dead backend.
  const { ready, user, bookmarks, settings, selectedSidebarPath, sidebarCollapsed } = persistedState;

  // ── Load from localStorage once on mount ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        setPersistedState({
          ready: true,
          user: parsed.user ?? null,
          bookmarks: parsed.bookmarks ?? [],
          settings: parsed.settings ?? defaultSettings,
          selectedSidebarPath: parsed.selectedSidebarPath ?? "/dashboard",
          sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
        });
      } else {
        setPersistedState((prev) => ({ ...prev, ready: true }));
      }
    } catch {
      setPersistedState((prev) => ({ ...prev, ready: true }));
    }
  }, []);

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user, bookmarks, settings, selectedSidebarPath, sidebarCollapsed,
    }));
  }, [ready, user, bookmarks, settings, selectedSidebarPath, sidebarCollapsed]);

  // ── Theme toggle — safe inside useEffect, never during render ────────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", settings.theme === "midnight");
  }, [settings.theme]);

  // ── Content fetch — fire-and-forget with 3s timeout ──────────────────────
  // Runs once after localStorage is ready. A dead backend silently yields [].
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    (async () => {
      try {
        const response = await apiClient.getContentByLanguage('english');
        if (response?.data && Array.isArray(response.data)) {
          const categoryMap: Record<string, WritingCategory> = {
            poem: 'Poetry',
            story: 'Stories',
            lyrics: 'Lyrics',
            screenplay: 'Screenplays',
          };
          setMongoWritings(
            response.data.map((content: Content): Writing => ({
              id: content._id,
              title: content.title,
              category: categoryMap[content.contentType] ?? 'Poetry',
              language: content.language as Writing['language'],
              genre: content.genre,
              mood: "Tender",
              rating: content.ratingCount > 0 ? content.ratingSum / content.ratingCount : 0,
              bookmarks: content.bookmarkCount,
              authorId: content.authorId,
              excerpt: content.quillDelta?.ops?.[0]?.insert?.substring(0, 100) ?? "",
              body: content.quillDelta?.ops?.map((op) => op.insert ?? "").join("") ?? "",
              publishedAt: content.createdAt,
            }))
          );
        }
      } catch {
        // Backend unavailable — empty list, no crash, no UI freeze
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [ready]);

  // ── Stable callbacks via useCallback ─────────────────────────────────────
  // All functions are stable across renders so useMemo below fires rarely.

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiClient.signIn(email, password);
    setPersistedState((prev) => ({
      ...prev,
      user: {
        id: response.data.user.id,
        name: response.data.user.name,
        role: response.data.user.role,
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=240&q=80",
        mode: "member",
      },
    }));
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    name: string,
    role: 'writer' | 'reader'
  ) => {
    const response = await apiClient.signUp(email, name || "New Writer", password, role);
    setPersistedState((prev) => ({
      ...prev,
      user: {
        id: response.data.user.id,
        name: response.data.user.name,
        role: response.data.user.role,
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&q=80",
        mode: "member",
      },
    }));
  }, []);

  const continueAsGuest = useCallback(async () => {
    setPersistedState((prev) => ({
      ...prev,
      user: {
        id: "u-guest",
        name: "Guest Writer",
        avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=240&q=80",
        role: "reader",
        mode: "guest",
      },
    }));
  }, []);

  const signOut = useCallback(() => {
    apiClient.signOut();
    setPersistedState((prev) => ({ ...prev, user: null }));
  }, []);

  const toggleBookmark = useCallback((writingId: string) => {
    setPersistedState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.includes(writingId)
        ? prev.bookmarks.filter((id) => id !== writingId)
        : [writingId, ...prev.bookmarks],
    }));
  }, []);

  const isBookmarked = useCallback(
    (writingId: string) => bookmarks.includes(writingId),
    [bookmarks]
  );

  const saveSidebarPath = useCallback((path: string) => {
    setPersistedState((prev) => ({ ...prev, selectedSidebarPath: path }));
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setPersistedState((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setPersistedState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  // ── Memoised context value ────────────────────────────────────────────────
  const value = useMemo<PlatformContextValue>(
    () => ({
      ready,
      user,
      writings: mongoWritings,
      bookmarks,
      settings,
      selectedSidebarPath,
      sidebarCollapsed,
      signIn,
      signUp,
      continueAsGuest,
      signOut,
      toggleBookmark,
      isBookmarked,
      saveSidebarPath,
      setSidebarCollapsed,
      updateSettings,
    }),
    [
      ready, user, mongoWritings, bookmarks, settings,
      selectedSidebarPath, sidebarCollapsed,
      signIn, signUp, continueAsGuest, signOut,
      toggleBookmark, isBookmarked,
      saveSidebarPath, setSidebarCollapsed, updateSettings,
    ],
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