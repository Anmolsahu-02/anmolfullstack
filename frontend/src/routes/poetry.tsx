import { createFileRoute } from "@tanstack/react-router";
import { PlatformShell } from "@/components/platform/platform-shell";
import { WritingCard } from "@/components/platform/writing-card";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/poetry")({
  component: PoetryPage,
});

function PoetryPage() {
  const { ready, writings } = usePlatform();
  const poetry = writings.filter((writing) => writing.category === "Poetry");

  return (
    <PlatformShell
      title="Poetry"
      subtitle="Floating verse cards, soft tones, and emotional textual textures."
    >
      {!ready || writings.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            Loading poetry...
          </p>
        </div>
      ) : poetry.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            No poetry found yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {poetry.map((writing) => (
            <WritingCard key={writing.id} writing={writing} />
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
