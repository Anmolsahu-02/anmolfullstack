import { createFileRoute } from "@tanstack/react-router";
import { PlatformShell } from "@/components/platform/platform-shell";
import { WritingCard } from "@/components/platform/writing-card";
import { usePlatform } from "@/context/platform-context";

export const Route = createFileRoute("/screenplays")({
  component: ScreenplaysPage,
});

function ScreenplaysPage() {
  const { ready, writings } = usePlatform();
  const screenplays = writings.filter((writing) => writing.category === "Screenplays");

  return (
    <PlatformShell
      title="Screenplays"
      subtitle="Film-strip rhythm, script aesthetics, and scene-ready previews."
    >
      {!ready || writings.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            Loading screenplays...
          </p>
        </div>
      ) : screenplays.length === 0 ? (
        <div className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            No screenplays found yet.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {screenplays.map((writing) => (
            <WritingCard key={writing.id} writing={writing} />
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
