import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/screenplays")({
  component: ScreenplaysPage,
});

interface ContentCard {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: string;
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
}

function ScreenplaysPage() {
  const [items, setItems] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.browseContent({ contentType: "screenplay" })
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell
      title="Screenplays"
      subtitle="Scene directions, dialogue, and stage craft from the platform's scriptwriters."
    >
      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-foreground/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-serif-lit italic">Loading screenplays…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">No screenplays published yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {items.map((item) => {
            const avg = (item.ratingCount ?? 0) > 0
              ? ((item.ratingSum ?? 0) / item.ratingCount).toFixed(1)
              : "—";
            return (
              <article
                key={item._id}
                className="paper-texture rounded-xl border border-foreground/10 shadow-paper p-5 font-mono hover:border-foreground/25 transition-colors"
              >
                <span
                  className="text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: "color-mix(in oklab, oklch(0.55 0.1 150) 15%, transparent)",
                    color: "oklch(0.55 0.1 150)",
                  }}
                >
                  {item.language}
                </span>
                <h2 className="font-display text-xl mt-3" style={{ color: "var(--ink)" }}>
                  {item.title || <span className="italic text-foreground/40">Untitled</span>}
                </h2>
                <p className="text-xs text-foreground/50 mt-2">
                  🔖 {item.bookmarkCount ?? 0} · ⭐ {avg}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </PlatformShell>
  );
}
