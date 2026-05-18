import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BookCheck, Flame, Globe2, LibraryBig, Loader2, Pencil,
  Plus, Sparkles, Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { usePlatform } from "@/context/platform-context";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/dashboard/writer")({
  component: WriterDashboardPage,
});

interface ContentItem {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: string;
  bookmarkCount?: number;
  ratingSum?: number;
  ratingCount?: number;
  quillDelta?: { ops: Array<{ insert?: string }> };
  updatedAt: string;
  createdAt: string;
}

function wordCount(item: ContentItem): number {
  if (!item.quillDelta?.ops) return 0;
  const text = item.quillDelta.ops
    .map((op) => (typeof op.insert === "string" ? op.insert : ""))
    .join("");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function WriterDashboardPage() {
  const navigate = useNavigate();
  const { user } = usePlatform();
  const [drafts, setDrafts] = useState<ContentItem[]>([]);
  const [published, setPublished] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === "reader") {
      navigate({ to: "/dashboard/reader" });
    }
  }, [user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [draftsRes, publishedRes] = await Promise.all([
        apiClient.getDrafts(),
        apiClient.getMyPublished(),
      ]);
      setDrafts(draftsRes.data ?? []);
      setPublished(publishedRes.data ?? []);
    } catch (err) {
      console.error('[Writer Dashboard] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handlePublishDraft = async (contentId: string) => {
    try {
      await apiClient.publishContent(contentId);
      // Re-fetch both lists so counts and items stay in sync
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Publish failed");
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (contentId: string) => {
    if (!confirm("Delete this draft permanently?")) return;
    setDeletingId(contentId);
    try {
      await apiClient.deleteContent(contentId);
      setDrafts((prev) => prev.filter((d) => d._id !== contentId));
    } catch { /* ignore */ } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (contentId: string) => {
    try {
      await apiClient.publishContent(contentId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Publish failed");
    }
  };

  return (
    <PlatformShell
      title="Writer Dashboard"
      subtitle="Your drafts, published pieces, and manuscript metrics."
    >
      <div className="grid xl:grid-cols-[1.5fr,1fr] gap-6">

        {/* ── Left column ─────────────────────────────────────── */}
        <section className="space-y-6">

          {/* Metric row */}
          <div className="grid sm:grid-cols-3 gap-4">
            <MetricCard icon={Flame}      label="Drafts"    value={String(drafts.length)}    note="in progress" />
            <MetricCard icon={BookCheck}  label="Published" value={String(published.length)} note="live pieces" />
            <MetricCard icon={Sparkles}   label="Bookmarks"
              value={String(published.reduce((s, p) => s + (p.bookmarkCount ?? 0), 0))}
              note="reader saves"
            />
          </div>

          {/* New piece CTA */}
          <Link
            to="/editor"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-foreground/20 hover:border-foreground/45 hover:bg-foreground/5 transition-all group"
          >
            <Plus className="w-4 h-4 text-foreground/50 group-hover:text-foreground" />
            <span className="text-sm text-foreground/60 group-hover:text-foreground">New piece…</span>
          </Link>

          {/* Drafts */}
          <Panel title="Drafts" icon={Pencil}>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-foreground/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm italic font-serif-lit">Loading drafts…</span>
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-sm italic text-foreground/50 font-serif-lit py-2">
                No drafts yet — start writing!
              </p>
            ) : (
              <ul className="space-y-3">
                {drafts.map((draft) => (
                  <li
                    key={draft._id}
                    className="flex items-start justify-between gap-3 border-b border-foreground/10 pb-3 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-serif-lit italic truncate">
                        {draft.title || "Untitled"}
                      </p>
                      <p className="text-xs text-foreground/50 mt-0.5">
                        {wordCount(draft).toLocaleString()} words · edited {timeAgo(draft.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to="/editor"
                        search={{ from: draft._id }}
                        className="px-2.5 py-1 rounded-lg text-xs border border-foreground/15 hover:bg-foreground hover:text-background transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handlePublishDraft(draft._id)}
                        className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                        style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(draft._id)}
                        disabled={deletingId === draft._id}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      >
                        {deletingId === draft._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Published */}
          <Panel title="Published" icon={BookCheck}>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-foreground/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm italic font-serif-lit">Loading…</span>
              </div>
            ) : published.length === 0 ? (
              <p className="text-sm italic text-foreground/50 font-serif-lit py-2">
                Nothing published yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {published.map((piece) => {
                  const avg = (piece.ratingCount ?? 0) > 0
                    ? ((piece.ratingSum ?? 0) / (piece.ratingCount ?? 1)).toFixed(1)
                    : "—";
                  return (
                    <li
                      key={piece._id}
                      className="flex items-start justify-between gap-3 border-b border-foreground/10 pb-3 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-serif-lit italic truncate">{piece.title}</p>
                        <p className="text-xs text-foreground/50 mt-0.5">
                          🔖 {piece.bookmarkCount ?? 0} · ⭐ {avg} · {piece.genre}
                        </p>
                      </div>
                      <span className="text-xs text-foreground/40 shrink-0">{timeAgo(piece.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </section>

        {/* ── Right sidebar ────────────────────────────────────── */}
        <aside className="space-y-5">
          <Panel title="Quick routes" icon={LibraryBig}>
            <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.16em]">
              <QuickLink to="/explore">Explore</QuickLink>
              <QuickLink to="/bookmarks">Bookmarks</QuickLink>
              <QuickLink to="/drafts">Drafts</QuickLink>
              <QuickLink to="/editor">Editor</QuickLink>
            </div>
          </Panel>

          {published.length > 0 && (
            <Panel title="Language mix" icon={Globe2}>
              <div className="space-y-2">
                {Array.from(
                  published.reduce((acc, p) => {
                    acc.set(p.language, (acc.get(p.language) ?? 0) + 1);
                    return acc;
                  }, new Map<string, number>())
                ).map(([lang, count]) => {
                  const pct = Math.round((count / published.length) * 100);
                  return (
                    <div key={lang}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{lang}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "var(--ink)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </PlatformShell>
  );
}

function MetricCard({ icon: Icon, label, value, note }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} className="paper-texture rounded-xl border border-foreground/10 p-4 shadow-paper">
      <div className="flex items-center justify-between text-foreground/65 text-xs uppercase tracking-[0.15em]">
        {label}
        <Icon className="w-4 h-4" />
      </div>
      <div className="mt-3 font-display text-3xl" style={{ color: "var(--ink)" }}>{value}</div>
      <p className="text-xs text-foreground/60 italic">{note}</p>
    </motion.div>
  );
}

function Panel({ title, icon: Icon, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <section className="paper-texture rounded-xl border border-foreground/10 p-4 md:p-5 shadow-paper">
      <div className="flex items-center gap-2 text-sm mb-4">
        <Icon className="w-4 h-4 text-foreground/60" />
        <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QuickLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-foreground/15 px-3 py-2 hover:bg-foreground hover:text-background transition-colors text-center"
    >
      {children}
    </Link>
  );
}
