import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock4, FilePenLine } from "lucide-react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { useDemoAnalytics, usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/drafts")({
  component: DraftsPage,
});

function DraftsPage() {
  const { ready, writings } = usePlatform();
  const analytics = useDemoAnalytics();
  const drafts = writings.slice(0, 5);

  return (
    <PlatformShell
      title="Drafts"
      subtitle="Unpublished pages, living snapshots, and return points for your process."
    >
      {!ready || writings.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            Loading drafts...
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6">
          <section className="space-y-4">
            {drafts.map((draft, index) => (
              <motion.article
                key={draft.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                      {draft.title}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground/55 mt-1">
                      {draft.category} · {draft.language}
                    </p>
                  </div>
                  <Link
                    to="/editor"
                    search={{ from: draft.id }}
                    className="rounded-full h-9 px-4 border border-foreground/20 text-xs uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition-colors inline-flex items-center"
                  >
                    Continue
                  </Link>
                </div>
                <p className="mt-3 font-serif-lit italic text-foreground/70">{draft.excerpt}</p>
              </motion.article>
            ))}
          </section>

          <aside className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
            <div className="flex items-center gap-2">
              <Clock4 className="w-4 h-4 text-foreground/55" />
              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                Snapshot stream
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.draftVersions.map((version) => (
                <div key={version.id} className="rounded-lg border border-foreground/15 p-3">
                  <div className="flex justify-between text-xs">
                    <span>{version.label}</span>
                    <span className="text-foreground/55">
                      {new Date(version.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm italic text-foreground/70 mt-1">{version.note}</p>
                </div>
              ))}
            </div>
            <Link
              to="/editor"
              className="mt-5 w-full rounded-full h-10 bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center"
            >
              <FilePenLine className="w-3.5 h-3.5 mr-2" /> Open editor
            </Link>
          </aside>
        </div>
      )}
    </PlatformShell>
  );
}
