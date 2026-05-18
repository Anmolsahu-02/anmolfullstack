import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/lyrics")({
  component: LyricsPage,
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

function LyricsPage() {
  const [items, setItems] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.browseContent({ contentType: "lyrics" })
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformShell
      title="Lyrics"
      subtitle="Waveform-inspired motion and rhythmic lines in multilingual melodies."
    >
      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-foreground/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-serif-lit italic">Loading lyrics…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">No lyrics published yet.</p>
        </div>
      ) : (
        <>
          <div className="relative mb-5 h-14 rounded-xl border border-foreground/15 overflow-hidden bg-background/60">
            <motion.div
              className="absolute inset-y-0 left-0 w-48"
              style={{
                background:
                  "linear-gradient(90deg, transparent, color-mix(in oklab, var(--gold) 38%, transparent), transparent)",
              }}
              animate={{ x: ["-20%", "220%"] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {items.map((item) => (
              <ContentCard key={item._id} item={item} accentColor="var(--maroon)" />
            ))}
          </div>
        </>
      )}
    </PlatformShell>
  );
}

function ContentCard({ item, accentColor }: { item: ContentCard; accentColor: string }) {
  const avg = (item.ratingCount ?? 0) > 0
    ? ((item.ratingSum ?? 0) / item.ratingCount).toFixed(1)
    : "—";
  return (
    <article className="paper-texture rounded-xl border border-foreground/10 shadow-paper p-5 hover:border-foreground/25 transition-colors">
      <span
        className="text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: `color-mix(in oklab, ${accentColor} 15%, transparent)`, color: accentColor }}
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
}
