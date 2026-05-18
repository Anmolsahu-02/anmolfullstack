import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Bookmark, BookmarkIcon, Compass, ExternalLink, Flame,
  Loader2, Star, TrendingUp, X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { usePlatform } from "@/context/platform-context";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/dashboard/reader")({
  component: ReaderDashboardPage,
});

interface ContentItem {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: string;
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  quillDelta?: { ops: Array<{ insert?: string }> };
  createdAt: string;
}

function avgRating(item: ContentItem) {
  return item.ratingCount > 0 ? item.ratingSum / item.ratingCount : 0;
}

function extractText(item: ContentItem, chars = 150) {
  if (!item.quillDelta?.ops) return "";
  return item.quillDelta.ops
    .map((op) => (typeof op.insert === "string" ? op.insert : ""))
    .join("")
    .slice(0, chars);
}

// ── Mini content drawer ───────────────────────────────────────────────────────

function MiniDrawer({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = extractText(item, 1000);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg paper-texture shadow-elevated flex flex-col border-l border-foreground/10"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-foreground/10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55 mb-1">
              {item.genre} · {item.language}
            </p>
            <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
              {item.title || "Untitled"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-foreground/10">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {text
            ? <p className="text-base leading-relaxed font-serif-lit italic text-foreground/80 whitespace-pre-wrap">{text}…</p>
            : <p className="text-foreground/45 text-sm italic">No preview.</p>
          }
        </div>
        <div className="border-t border-foreground/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" fill="var(--gold)" style={{ color: "var(--gold)" }} />
            <span className="text-sm">{avgRating(item) > 0 ? avgRating(item).toFixed(1) : "—"}</span>
            <span className="text-xs text-foreground/50 ml-1">({item.ratingCount} ratings)</span>
          </div>
          <a
            href={`/content/${item._id}`}
            className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-foreground/55 hover:text-foreground ink-underline"
          >
            Open full page <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.aside>
    </>
  );
}

// ── Bookmark card ─────────────────────────────────────────────────────────────

function BookmarkCard({ item, onClick }: { item: ContentItem; onClick: () => void }) {
  const avg = avgRating(item);
  return (
    <motion.article
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="paper-texture border border-foreground/10 rounded-xl p-4 shadow-paper cursor-pointer hover:border-foreground/25 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.18em] text-foreground/55 border border-foreground/15 px-2 py-0.5 rounded-full">
          {item.genre}
        </span>
        <span className="text-xs text-foreground/45">{item.language}</span>
      </div>
      <h3 className="font-display text-lg mb-1 truncate" style={{ color: "var(--ink)" }}>
        {item.title || "Untitled"}
      </h3>
      <div className="flex items-center gap-3 text-xs text-foreground/50">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" fill={avg > 0 ? "var(--gold)" : "none"} style={{ color: "var(--gold)" }} />
          {avg > 0 ? avg.toFixed(1) : "—"}
        </span>
        <span className="flex items-center gap-1">
          <BookmarkIcon className="w-3 h-3" />{item.bookmarkCount}
        </span>
      </div>
    </motion.article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ReaderDashboardPage() {
  const navigate = useNavigate();
  const { user } = usePlatform();
  const [bookmarked, setBookmarked] = useState<ContentItem[]>([]);
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (user && user.role === "writer") {
      navigate({ to: "/dashboard/writer" });
    }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bmRes, browseRes] = await Promise.all([
        apiClient.getMyBookmarks(),
        apiClient.browseContent({ sort: "bookmarks" }),
      ]);
      setBookmarked(bmRes.data ?? []);
      setTrending((browseRes.data ?? []).slice(0, 6));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <PlatformShell
      title="Reader Dashboard"
      subtitle="Your bookmarks, trending picks, and discovery stream."
    >
      <div className="space-y-8">

        {/* Stats row */}
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Bookmark}   label="Bookmarked" value={String(bookmarked.length)} note="saved pieces" />
          <StatCard icon={TrendingUp} label="Trending"   value={String(trending.length)}   note="popular right now" />
          <StatCard icon={Star}       label="Explore"    value="∞"                          note="pieces to discover" />
        </div>

        {/* Bookmarks section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-foreground/60" />
              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Your Bookmarks</h2>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-foreground/50">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm italic font-serif-lit">Loading bookmarks…</span>
            </div>
          ) : bookmarked.length === 0 ? (
            <div className="paper-texture rounded-xl border border-foreground/10 p-8 text-center">
              <BookmarkIcon className="w-8 h-8 mx-auto mb-3 text-foreground/30" />
              <p className="text-sm font-serif-lit italic text-foreground/50">
                No bookmarks yet — explore and save pieces you love.
              </p>
              <Link
                to="/explore"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.18em]"
              >
                <Compass className="w-3.5 h-3.5" /> Explore now
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarked.map((item) => (
                <BookmarkCard key={item._id} item={item} onClick={() => setActiveItem(item)} />
              ))}
            </div>
          )}
        </section>

        {/* Trending section */}
        {trending.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-foreground/60" />
              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Trending</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((item) => (
                <BookmarkCard key={item._id} item={item} onClick={() => setActiveItem(item)} />
              ))}
            </div>
          </section>
        )}

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.2em]"
        >
          <Compass className="w-3.5 h-3.5" /> Explore library
        </Link>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {activeItem && <MiniDrawer item={activeItem} onClose={() => setActiveItem(null)} />}
      </AnimatePresence>
    </PlatformShell>
  );
}

function StatCard({ icon: Icon, label, value, note }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} className="paper-texture rounded-xl border border-foreground/10 p-4 shadow-paper">
      <div className="flex items-center justify-between text-foreground/65 text-xs uppercase tracking-[0.15em]">
        {label}<Icon className="w-4 h-4" />
      </div>
      <div className="mt-3 font-display text-3xl" style={{ color: "var(--ink)" }}>{value}</div>
      <p className="text-xs text-foreground/60 italic">{note}</p>
    </motion.div>
  );
}
