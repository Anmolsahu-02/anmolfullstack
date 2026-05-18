import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BookCheck, BookOpen, Edit3, ExternalLink,
  Loader2, Star, Bookmark, Globe2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { usePlatform } from "@/context/platform-context";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/my-writings")({
  component: MyWritingsPage,
});

interface PublishedItem {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: string;
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

const GENRE_COLORS: Record<string, string> = {
  poem: "var(--gold)",
  lyrics: "var(--maroon)",
  story: "var(--ink)",
  screenplay: "oklch(0.55 0.1 150)",
};

const GENRE_LABELS: Record<string, string> = {
  poem: "Poem",
  lyrics: "Lyrics",
  story: "Story",
  screenplay: "Screenplay",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function MyWritingsPage() {
  const { user } = usePlatform();
  const [items, setItems] = useState<PublishedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unpublishing, setUnpublishing] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getMyPublished();
      setItems(res.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      console.error("[MyWritings] load failed:", msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleUnpublish = async (id: string) => {
    if (!confirm("Unpublish this piece? It will move back to drafts.")) return;
    setUnpublishing(id);
    try {
      await apiClient.unpublishContent(id);
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch {
      alert("Failed to unpublish. Please try again.");
    } finally {
      setUnpublishing(null);
    }
  };

  const totalBookmarks = items.reduce((s, i) => s + (i.bookmarkCount ?? 0), 0);
  const avgRating = (() => {
    const totalRatings = items.reduce((s, i) => s + (i.ratingCount ?? 0), 0);
    if (totalRatings === 0) return null;
    const totalSum = items.reduce((s, i) => s + (i.ratingSum ?? 0), 0);
    return (totalSum / totalRatings).toFixed(1);
  })();

  return (
    <PlatformShell
      title="My Writings"
      subtitle="All your published pieces — visible to readers on the platform."
    >
      {/* ── Stats bar ── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Published", value: String(items.length), icon: BookCheck },
            { label: "Bookmarks", value: String(totalBookmarks), icon: Bookmark },
            { label: "Avg Rating", value: avgRating ?? "—", icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="paper-texture rounded-xl border border-foreground/10 p-4 shadow-paper text-center"
            >
              <Icon className="w-4 h-4 mx-auto mb-1 text-foreground/50" />
              <div className="font-display text-2xl" style={{ color: "var(--ink)" }}>{value}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-foreground/50 mt-0.5">{label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Content list ── */}
      {loading ? (
        <div className="flex items-center gap-3 py-16 justify-center text-foreground/50">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-serif-lit italic">Loading your published works…</span>
        </div>
      ) : error ? (
        <div className="paper-texture rounded-2xl border border-red-300/30 p-8 text-center shadow-paper">
          <p className="text-red-500 font-mono text-sm">{error}</p>
          <button
            type="button"
            onClick={loadItems}
            className="mt-4 px-4 py-2 text-xs border border-foreground/20 rounded-lg hover:bg-foreground/6"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="paper-texture rounded-2xl border border-foreground/10 p-10 text-center shadow-paper">
          <BookOpen className="w-10 h-10 mx-auto mb-4 text-foreground/30" />
          <p className="font-display text-2xl" style={{ color: "var(--ink)" }}>
            No published works yet
          </p>
          <p className="mt-2 font-serif-lit italic text-foreground/60">
            Write something in the editor and click Publish to share it with readers.
          </p>
          <Link
            to="/editor"
            className="mt-6 inline-flex h-10 px-6 rounded-full bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.2em] items-center"
          >
            <Edit3 className="w-3.5 h-3.5 mr-2" /> Open Editor
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const avg = (item.ratingCount ?? 0) > 0
              ? ((item.ratingSum ?? 0) / item.ratingCount).toFixed(1)
              : "—";
            const color = GENRE_COLORS[item.contentType ?? item.genre] ?? "var(--ink)";
            return (
              <motion.article
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="paper-texture rounded-xl border border-foreground/10 shadow-paper p-5 flex flex-col gap-3 group hover:border-foreground/25 transition-colors"
              >
                {/* Genre chip */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
                  >
                    {GENRE_LABELS[item.contentType ?? item.genre] ?? item.genre}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-foreground/40 flex items-center gap-1">
                    <Globe2 className="w-3 h-3" /> {item.language}
                  </span>
                  <span className="ml-auto text-[10px] text-foreground/40">{timeAgo(item.createdAt)}</span>
                </div>

                {/* Title */}
                <h2
                  className="font-display text-xl leading-tight"
                  style={{ color: "var(--ink)" }}
                >
                  {item.title || <span className="italic text-foreground/40">Untitled</span>}
                </h2>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-foreground/55">
                  <span className="flex items-center gap-1">
                    <Bookmark className="w-3.5 h-3.5" /> {item.bookmarkCount ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" /> {avg}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-foreground/8">
                  <Link
                    to="/editor"
                    search={{ id: item._id }}
                    className="flex-1 h-8 rounded-lg border border-foreground/15 text-xs flex items-center justify-center gap-1.5 hover:bg-foreground/6 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleUnpublish(item._id)}
                    disabled={unpublishing === item._id}
                    className="flex-1 h-8 rounded-lg border border-foreground/15 text-xs flex items-center justify-center gap-1.5 hover:bg-foreground/6 transition-colors disabled:opacity-50"
                  >
                    {unpublishing === item._id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <><ExternalLink className="w-3.5 h-3.5" /> Unpublish</>
                    }
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </PlatformShell>
  );
}
