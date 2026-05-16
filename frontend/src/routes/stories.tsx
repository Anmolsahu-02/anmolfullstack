import { createFileRoute } from "@tanstack/react-router";
import { PlatformShell } from "@/components/platform/platform-shell";
import { WritingCard } from "@/components/platform/writing-card";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/stories")({
  component: StoriesPage,
});

function StoriesPage() {
  const { ready, writings } = usePlatform();
  const stories = writings.filter((writing) => writing.category === "Stories");

  return (
    <PlatformShell
      title="Stories"
      subtitle="Narrative-first cards with cinematic previews and immersive excerpts."
    >
      {!ready || writings.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            Loading stories...
          </p>
        </div>
      ) : stories.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            No stories found yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {stories.map((writing) => (
            <WritingCard key={writing.id} writing={writing} />
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
