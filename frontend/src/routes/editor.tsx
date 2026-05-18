import { createFileRoute } from "@tanstack/react-router";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  CheckCircle2, ChevronRight, Clock, History, Loader2, Lock,
  RotateCcw, Save, X
} from "lucide-react";
import {
  useCallback, useEffect, useRef, useState
} from "react";
import { z } from "zod";
import { PlatformShell } from "@/components/platform/platform-shell";
import { usePlatform } from "@/context/platform-context";
import { apiClient } from "@/lib/api";

// ── Route ────────────────────────────────────────────────────────────────────

const editorSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/editor")({
  validateSearch: (search) => editorSearchSchema.parse(search),
  component: EditorPage,
});

// ── Toolbar config ────────────────────────────────────────────────────────────

const TOOLBAR_MODULES = {
  toolbar: [
    ["bold", "italic", "underline", "blockquote", "code-block"],
    [{ header: [1, 2, false] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["clean"],
  ],
};

const TOOLBAR_FORMATS = [
  "bold", "italic", "underline", "blockquote", "code-block",
  "header", "list", "align",
];

const GENRES = ["poem", "story", "lyrics", "screenplay"] as const;
const LANGUAGES = [
  "english", "hindi", "tamil", "telugu", "bengali", "marathi", "gujarati", "punjabi"
] as const;

type SaveStatus = "idle" | "unsaved" | "saving" | "saved";

interface VersionMeta {
  versionId: string;
  label?: string;
  editedAt: string;
}

// ── Version sidebar ───────────────────────────────────────────────────────────

function VersionSidebar({
  contentId,
  refreshKey,
  onRestore,
  onClose,
}: {
  contentId: string;
  refreshKey: number;
  onRestore: (delta: unknown) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.listVersions(contentId).then((res) => {
      const embedded = (res.data?.embedded ?? []) as VersionMeta[];
      setVersions([...embedded].reverse());
    }).finally(() => setLoading(false));
  }, [contentId, refreshKey]); // re-fetch when refreshKey changes

  const restore = async (versionId: string) => {
    if (!confirm("This will replace the current editor content. Continue?")) return;
    setRestoring(versionId);
    try {
      const res = await apiClient.restoreVersion(contentId, versionId);
      // res.data contains the restored version with delta
      onRestore((res.data as { delta?: unknown })?.delta ?? null);
    } catch { /* ignore */ } finally {
      setRestoring(null);
    }
  };

  return (
    <aside className="paper-texture border border-foreground/10 rounded-xl shadow-paper overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-foreground/60" />
          <h3 className="font-display text-lg" style={{ color: "var(--ink)" }}>Version history</h3>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-foreground/10">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-foreground/50 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-xs italic text-foreground/50 text-center py-6 font-serif-lit">
            No saved versions yet. Use "Save version" to capture a snapshot.
          </p>
        ) : (
          versions.map((v) => (
            <div
              key={v.versionId}
              className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-foreground/10 hover:border-foreground/25 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{v.label ?? "Auto-save"}</p>
                <p className="text-xs text-foreground/50 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(v.editedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => restore(v.versionId)}
                disabled={restoring === v.versionId}
                className="shrink-0 p-1.5 rounded hover:bg-foreground/10 text-foreground/60 hover:text-foreground disabled:opacity-40 transition-colors"
                title="Restore this version"
              >
                {restoring === v.versionId
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

// ── Save status badge ─────────────────────────────────────────────────────────

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground/65">
      {status === "unsaved" && <><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Unsaved</>}
      {status === "saving"  && <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>}
      {status === "saved"   && <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Saved</>}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function EditorPage() {
  const search = Route.useSearch();
  const { user } = usePlatform();

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <PlatformShell title="Editor" subtitle="Your writing desk.">
        <section className="paper-texture rounded-xl border border-foreground/10 p-10 shadow-paper flex flex-col items-center gap-4">
          <Lock className="w-12 h-12 text-foreground/50" />
          <p className="font-serif-lit italic text-foreground/70 text-center">
            Sign in to start writing.
          </p>
        </section>
      </PlatformShell>
    );
  }

  if (user.role === "reader") {
    return (
      <PlatformShell title="Editor" subtitle="Your writing desk.">
        <section className="paper-texture rounded-xl border border-foreground/10 p-10 shadow-paper flex flex-col items-center gap-4 text-center">
          <Lock className="w-12 h-12 text-foreground/50" />
          <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>Writers only</h2>
          <p className="font-serif-lit italic text-foreground/70">
            The editor is exclusive to writers. Explore and bookmark from the library.
          </p>
        </section>
      </PlatformShell>
    );
  }

  return <WriterEditor contentId={search.id} />;
}

// ── Writer editor (inner component, hooks only called when user is writer) ────

function WriterEditor({ contentId }: { contentId?: string }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<typeof GENRES[number]>("poem");
  const [language, setLanguage] = useState<typeof LANGUAGES[number]>("english");
  const [quillValue, setQuillValue] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showVersions, setShowVersions] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | undefined>(contentId);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");
  const [versionSaved, setVersionSaved] = useState(false);  // toast trigger

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quillRef = useRef<InstanceType<typeof ReactQuill> | null>(null);

  // Load existing content if contentId is provided
  useEffect(() => {
    if (!contentId) return;
    apiClient.getContent(contentId).then((res) => {
      const c = res.data;
      setTitle(c.title);
      setGenre((c.genre as typeof GENRES[number]) ?? "poem");
      setLanguage((c.language as typeof LANGUAGES[number]) ?? "english");
      if (c.quillDelta?.ops) {
        // Let Quill handle delta by setting content after mount
        const editor = quillRef.current?.getEditor?.();
        if (editor) {
          editor.setContents(c.quillDelta as Parameters<typeof editor.setContents>[0]);
        }
      }
      setActiveContentId(c._id);
    }).catch(() => { /* content not found */ });
  }, [contentId]);

  // ── Autosave handler ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;

    const delta = editor.getContents();
    setSaveStatus("saving");

    try {
      if (!activeContentId) {
        // Create new draft first
        const res = await apiClient.createContent({
          title: title || "Untitled",
          genre,
          language,
          contentType: genre as "poem" | "story" | "lyrics" | "screenplay",
          quillDelta: delta as Parameters<typeof apiClient.createContent>[0]["quillDelta"],
        });
        setActiveContentId(res.data._id);
      } else {
        await apiClient.updateAutosave(
          activeContentId,
          delta as Parameters<typeof apiClient.updateAutosave>[1]
        );
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("unsaved");
    }
  }, [activeContentId, title, genre, language]);

  // ── Text change: debounced 1500ms autosave ──────────────────────────────────
  const handleChange = useCallback((value: string) => {
    setQuillValue(value);
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(handleSave, 1500);
  }, [handleSave]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  // ── Sync metadata changes to backend on existing drafts ───────────────────────
  const metaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeContentId) return;
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
    metaTimerRef.current = setTimeout(() => {
      apiClient.updateMeta(activeContentId, {
        title: title || "Untitled",
        genre,
        language,
        contentType: genre,
      }).catch(() => { /* silently ignore if not yet saved */ });
    }, 800);
  }, [title, genre, language, activeContentId]);

  // Cleanup meta timer on unmount
  useEffect(() => () => {
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
  }, []);

  // ── Manual version save ─────────────────────────────────────────────────────
  const [versionsKey, setVersionsKey] = useState(0); // increment to force sidebar refresh

  const handleManualSave = async () => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;

    // Must have a saved draft first — create one if needed
    if (!activeContentId) {
      await handleSave();
      // handleSave sets activeContentId asynchronously, can't capture version yet
      return;
    }

    const delta = editor.getContents();
    setSaveStatus("saving");
    try {
      await apiClient.saveVersion(activeContentId, {
        delta: delta as Parameters<typeof apiClient.saveVersion>[1]["delta"],
        label: `Snapshot — ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
      setSaveStatus("saved");
      setVersionSaved(true);
      setVersionsKey((k) => k + 1); // force version sidebar to re-fetch
      setTimeout(() => { setSaveStatus("idle"); setVersionSaved(false); }, 3000);
    } catch (err) {
      console.error("[Editor] Version save failed:", err);
      setSaveStatus("unsaved");
    }
  };

  // ── Restore version delta into editor ───────────────────────────────────────
  const handleRestore = (delta: unknown) => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor || !delta) return;
    editor.setContents(delta as Parameters<typeof editor.setContents>[0]);
    setSaveStatus("unsaved");
  };

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    const editor = quillRef.current?.getEditor?.();
    setPublishing(true);
    setPublishMsg("");
    try {
      let contentId = activeContentId;

      // If no content saved yet, create it first
      if (!contentId) {
        if (!editor) throw new Error("Editor not ready");
        const delta = editor.getContents();
        const res = await apiClient.createContent({
          title: title || "Untitled",
          genre,
          language,
          contentType: genre as "poem" | "story" | "lyrics" | "screenplay",
          quillDelta: delta as Parameters<typeof apiClient.createContent>[0]["quillDelta"],
        });
        contentId = res.data._id;
        setActiveContentId(contentId);
      }

      await apiClient.publishContent(contentId);
      setPublishMsg("✓ Published! Your piece is now live.");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <PlatformShell title="Editor" subtitle="A calm space for your manuscript.">
      <div className={`grid gap-6 ${showVersions ? "xl:grid-cols-[1.8fr,1fr]" : ""}`}>

        {/* ── Main editor panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Metadata row */}
          <div className="paper-texture rounded-xl border border-foreground/10 p-4 shadow-paper space-y-3">
            <input
              id="editor-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaveStatus("unsaved"); }}
              placeholder="Title of your piece…"
              className="w-full font-display text-2xl bg-transparent outline-none text-foreground placeholder:text-foreground/35 border-b border-foreground/10 pb-2 focus:border-foreground/30"
              style={{ color: "var(--ink)" }}
            />
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-foreground/50">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value as typeof GENRES[number])}
                  className="text-sm bg-background/70 border border-foreground/15 rounded-lg px-3 py-1.5 outline-none"
                >
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-foreground/50">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as typeof LANGUAGES[number])}
                  className="text-sm bg-background/70 border border-foreground/15 rounded-lg px-3 py-1.5 outline-none"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Quill editor */}
          <div className="paper-texture rounded-xl border border-foreground/10 shadow-paper overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/10 bg-background/40">
              <SaveBadge status={saveStatus} />
              {versionSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Snapshot saved!
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSave}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-foreground/15 hover:bg-foreground/10 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" /> Save version
                </button>
                {activeContentId && (
                  <button
                    type="button"
                    onClick={() => setShowVersions((v) => !v)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-foreground/15 hover:bg-foreground/10 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" /> History
                    <ChevronRight className={`w-3 h-3 transition-transform ${showVersions ? "rotate-90" : ""}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg text-primary-foreground transition-colors disabled:opacity-50"
                  style={{ background: "var(--ink)" }}
                >
                  {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Publish
                </button>
              </div>
            </div>

            {publishMsg && (
              <div className={`px-4 py-2 text-xs ${publishMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                {publishMsg}
              </div>
            )}

            {/* Quill */}
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={quillValue}
              onChange={handleChange}
              modules={TOOLBAR_MODULES}
              formats={TOOLBAR_FORMATS}
              placeholder="Begin your manuscript here…"
              style={{ minHeight: "480px" }}
            />
          </div>
        </div>

        {/* ── Version history sidebar ─────────────────────────────────────────── */}
        {showVersions && activeContentId && (
          <VersionSidebar
            contentId={activeContentId}
            refreshKey={versionsKey}
            onRestore={handleRestore}
            onClose={() => setShowVersions(false)}
          />
        )}
      </div>
    </PlatformShell>
  );
}
