import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CheckCircle2, History, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { PlatformShell } from "@/components/platform/platform-shell";
import { useDemoAnalytics, usePlatform } from "@/context/platform-context";

const editorSearchSchema = z.object({
  from: z.string().optional(),
});

export const Route = createFileRoute("/editor")({
  validateSearch: (search) => editorSearchSchema.parse(search),
  component: EditorPage,
});

function EditorPage() {
  const search = Route.useSearch();
  const { writings, settings } = usePlatform();
  const { draftVersions } = useDemoAnalytics();
  const activeWritingId = search.from ?? writings[0]?.id;
  const currentWriting = useMemo(
    () => writings.find((writing) => writing.id === activeWritingId) ?? writings[0],
    [activeWritingId, writings],
  );
  if (!currentWriting) {
    return (
      <PlatformShell
        title="Editor"
        subtitle="An immersive writing studio with live autosave and manuscript snapshots."
      >
        <section className="paper-texture rounded-xl border border-foreground/10 p-6 shadow-paper">
          <p className="font-serif-lit italic text-foreground/70">
            No draft is available yet. Create or load a manuscript to start editing.
          </p>
        </section>
      </PlatformShell>
    );
  }
  const editorRef = useRef<HTMLDivElement>(null);
  const draftStorageKey = `akshar.editor.draft.v1:${activeWritingId ?? "default"}`;
  const [title, setTitle] = useState(currentWriting.title);
  const [language, setLanguage] = useState(currentWriting.language);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("just now");
  const [snapshotPulse, setSnapshotPulse] = useState(false);

  useEffect(() => {
    setTitle(currentWriting.title);
    setLanguage(currentWriting.language);
  }, [currentWriting.language, currentWriting.title]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(draftStorageKey);
    if (saved && editorRef.current) {
      editorRef.current.innerHTML = saved;
    } else if (editorRef.current) {
      editorRef.current.innerText = currentWriting.body;
    }
  }, [currentWriting.body, draftStorageKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!editorRef.current || typeof window === "undefined") return;
      setSaving(true);
      const value = editorRef.current.innerHTML;
      window.localStorage.setItem(draftStorageKey, value);
      setTimeout(() => {
        setSaving(false);
        setLastSavedAt("just now");
      }, 420);
    }, 4500);
    return () => clearInterval(interval);
  }, [draftStorageKey]);

  const plainTextLength = editorRef.current?.innerText.length ?? 0;
  const words = Math.max(1, Math.round(plainTextLength / 5));

  return (
    <PlatformShell
      title="Editor"
      subtitle="An immersive writing studio with live autosave and manuscript snapshots."
    >
      <div className="grid xl:grid-cols-[1.6fr,0.9fr] gap-6">
        <section className="paper-texture rounded-xl border border-foreground/10 p-5 md:p-6 shadow-paper">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="font-display text-4xl bg-transparent border-0 outline-none min-w-[220px]"
              style={{ color: "var(--ink)" }}
            />
            <div className="flex items-center gap-2 text-xs">
              <motion.span
                animate={saving ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.9 }}
                transition={{ duration: 0.8, repeat: saving ? Infinity : 0 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-foreground/15"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Autosaving..." : `Saved ${lastSavedAt}`}
              </motion.span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as typeof language)}
                className="rounded-full border border-foreground/15 bg-background/80 px-3 py-1.5"
              >
                {["Hindi", "Tamil", "Bengali", "English", "Gujarati"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { id: "bold", label: "Bold", cmd: "bold" },
              { id: "italic", label: "Italic", cmd: "italic" },
              { id: "underline", label: "Underline", cmd: "underline" },
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => document.execCommand(tool.cmd)}
                className="h-8 px-3 rounded-full text-xs border border-foreground/15 hover:bg-foreground hover:text-background transition-colors"
              >
                {tool.label}
              </button>
            ))}
            <button
              onClick={() => {
                if (!editorRef.current) return;
                editorRef.current.innerHTML =
                  draftVersions[0]?.snapshot ?? editorRef.current.innerHTML;
              }}
              className="h-8 px-3 rounded-full text-xs border border-foreground/15 hover:bg-foreground hover:text-background transition-colors"
            >
              Restore draft
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={`mt-5 min-h-[420px] rounded-xl border border-foreground/12 bg-background/70 p-5 outline-none text-lg leading-relaxed ${
              settings.editorFont === "mono"
                ? "font-mono"
                : settings.editorFont === "display"
                  ? "font-display"
                  : "font-serif-lit"
            }`}
          />
        </section>

        <aside className="space-y-5">
          <section className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
            <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
              Writing stats
            </h2>
            <div className="mt-4 space-y-2 text-sm text-foreground/70">
              <div className="flex justify-between">
                <span>Words</span>
                <span className="font-display text-xl text-foreground">{words}</span>
              </div>
              <div className="flex justify-between">
                <span>Characters</span>
                <span className="font-display text-xl text-foreground">{plainTextLength}</span>
              </div>
              <div className="flex justify-between">
                <span>Language</span>
                <span>{language}</span>
              </div>
            </div>
          </section>

          <section className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
            <h2
              className="font-display text-2xl flex items-center gap-2"
              style={{ color: "var(--ink)" }}
            >
              <History className="w-4 h-4" />
              Snapshot actions
            </h2>
            <button
              onClick={() => setSnapshotPulse((pulse) => !pulse)}
              className="mt-4 w-full h-10 rounded-full bg-gradient-ink text-primary-foreground text-xs uppercase tracking-[0.2em]"
            >
              Save version snapshot
            </button>
            <motion.div
              animate={snapshotPulse ? { scale: [1, 1.02, 1] } : undefined}
              className="mt-4 rounded-lg border border-foreground/15 p-3 text-sm"
            >
              <p className="text-foreground/70">
                Saved just now. This moment is now archived in your version timeline.
              </p>
              <CheckCircle2 className="w-4 h-4 mt-2 text-[var(--gold)]" />
            </motion.div>
            <button className="mt-4 w-full h-10 rounded-full border border-foreground/20 text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors">
              Publish draft
            </button>
          </section>
        </aside>
      </div>
    </PlatformShell>
  );
}
