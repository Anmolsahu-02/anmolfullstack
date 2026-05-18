import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, X, BookmarkIcon, Star, ChevronRight, SlidersHorizontal,
  Loader2, BookOpen, ExternalLink
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { usePlatform } from "@/context/platform-context";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

// ── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  _id: string;
  title: string;
  genre: string;
  language: string;
  contentType: "lyrics" | "story" | "poem" | "screenplay";
  authorId: string;
  bookmarkCount: number;
  ratingSum: number;
  ratingCount: number;
  status: "draft" | "published";
  tags?: string[];
  quillDelta?: { ops: Array<{ insert?: string }> };
  createdAt: string;
}

const GENRES = ["poem", "story", "lyrics", "screenplay"];
const LANGUAGES = ["english", "hindi", "tamil", "telugu", "bengali", "marathi", "gujarati", "punjabi"];
const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "bookmarks", label: "Most Bookmarked" },
  { value: "rating", label: "Top Rated" },
];

const DEMO_ITEMS: ContentItem[] = [
  // ─── Poems ────────────────────────────────────────────────────────────────
  {
    _id: "demo-1", title: "Baarish ke baad", genre: "monsoon", language: "hindi",
    contentType: "poem", authorId: "demo", bookmarkCount: 34, ratingSum: 88, ratingCount: 20,
    status: "published", tags: ["rain", "nostalgia"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "बारिश के बाद जो खामोशी आती है\nवो सिर्फ आसमान की नहीं होती\nकुछ हिस्सा उस खालीपन का भी\nजो तुम छोड़ गए थे…" }] },
  },
  {
    _id: "demo-2", title: "Mazhaikkaalam", genre: "nature", language: "tamil",
    contentType: "poem", authorId: "demo", bookmarkCount: 19, ratingSum: 45, ratingCount: 10,
    status: "published", tags: ["rain", "Tamil"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "மழைக்காலம் வருகிறது\nமண்ணின் மணம் பரவுகிறது\nகுழந்தைகள் நனைந்து விளையாடுகிறார்கள்\nவெயில் காலம் மறந்துவிட்டது…" }] },
  },
  {
    _id: "demo-3", title: "The Weight of Silence", genre: "melancholy", language: "english",
    contentType: "poem", authorId: "demo", bookmarkCount: 51, ratingSum: 130, ratingCount: 28,
    status: "published", tags: ["grief", "introspection"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "Silence is not empty —\nit is full of what was never said.\nWe carry it like old letters,\nnever sent, never burned." }] },
  },
  {
    _id: "demo-4", title: "Aai chi aathvan", genre: "devotional", language: "marathi",
    contentType: "poem", authorId: "demo", bookmarkCount: 27, ratingSum: 70, ratingCount: 16,
    status: "published", tags: ["mother", "memory"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "आईची आठवण येते रात्री\nचंद्राच्या उजेडात\nतिचा स्पर्श आठवतो अजूनही\nवाऱ्यासारखा हलकेच…" }] },
  },
  {
    _id: "demo-5", title: "Neel akasher neeche", genre: "hope", language: "bengali",
    contentType: "poem", authorId: "demo", bookmarkCount: 23, ratingSum: 58, ratingCount: 14,
    status: "published", tags: ["sky", "hope"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "নীল আকাশের নিচে দাঁড়িয়ে\nমনে হয় কিছু একটা ফিরে পাব\nযা হারিয়েছি বহুদিন আগে\nস্বপ্নের মতো করে…" }] },
  },
  {
    _id: "demo-6", title: "Patte jharte hain", genre: "autumn", language: "hindi",
    contentType: "poem", authorId: "demo", bookmarkCount: 38, ratingSum: 95, ratingCount: 22,
    status: "published", tags: ["autumn", "change"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "पत्ते झरते हैं चुपचाप\nकोई शोर नहीं, कोई शिकायत नहीं\nशायद विदाई का यही सलीका होता है —\nखामोश और खूबसूरत…" }] },
  },
  // ─── Lyrics ───────────────────────────────────────────────────────────────
  {
    _id: "demo-7", title: "Ek Dil Ek Jaan", genre: "romance", language: "hindi",
    contentType: "lyrics", authorId: "demo", bookmarkCount: 57, ratingSum: 140, ratingCount: 30,
    status: "published", tags: ["love", "devotional"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "तेरी आँखों में देखा है अपना आसमान\nएक दिल एक जान\nदूरियाँ हो जाएं जितनी\nतेरे बिन कहाँ…" }] },
  },
  {
    _id: "demo-8", title: "Tenu labhna", genre: "punjabi-folk", language: "punjabi",
    contentType: "lyrics", authorId: "demo", bookmarkCount: 44, ratingSum: 110, ratingCount: 24,
    status: "published", tags: ["folk", "longing"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "ਤੈਨੂੰ ਲੱਭਣਾ ਸੀ ਮੇਨੂੰ\nਜਿੱਥੇ ਜਿੱਥੇ ਗਿਆ\nਤੇਰੀ ਯਾਦ ਨੇ ਸਾਥ ਦਿੱਤਾ\nਹਰ ਮੋੜ ਉੱਤੇ ਨਵਾ…" }] },
  },
  {
    _id: "demo-9", title: "City Lights", genre: "urban-soul", language: "english",
    contentType: "lyrics", authorId: "demo", bookmarkCount: 33, ratingSum: 84, ratingCount: 19,
    status: "published", tags: ["city", "soul"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "City lights don't sleep like us\nthey burn all night with no fuss\nI walk these streets alone tonight\nsearching for something right…" }] },
  },
  {
    _id: "demo-10", title: "Vaada tha tera", genre: "heartbreak", language: "hindi",
    contentType: "lyrics", authorId: "demo", bookmarkCount: 62, ratingSum: 155, ratingCount: 33,
    status: "published", tags: ["heartbreak", "promise"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "वादा था तेरा, निभाया नहीं\nहमने माना था, तूने माना नहीं\nरोके ना रुके ये आँसू अब\nतू जो गया तो वापस आया नहीं…" }] },
  },
  // ─── Stories ──────────────────────────────────────────────────────────────
  {
    _id: "demo-11", title: "Midnight in Chennai", genre: "urban", language: "tamil",
    contentType: "story", authorId: "demo", bookmarkCount: 21, ratingSum: 60, ratingCount: 15,
    status: "published", tags: ["city", "night"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "The city exhales only after midnight. Neon signs flicker over empty autorickshaws. Priya walks past the Marina shore, shoes in hand, letting cold waves find her ankles…" }] },
  },
  {
    _id: "demo-12", title: "Sone ki Chidiya", genre: "historical", language: "hindi",
    contentType: "story", authorId: "demo", bookmarkCount: 41, ratingSum: 105, ratingCount: 22,
    status: "published", tags: ["history", "India"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "वो शहर जो कभी सोने की चिड़िया था, आज बस किताबों में मिलता है। दादाजी कहते थे — एक वक्त था जब इस गली में इत्र की महक दिनभर रहती थी…" }] },
  },
  {
    _id: "demo-13", title: "The Last Fisherman", genre: "coastal", language: "english",
    contentType: "story", authorId: "demo", bookmarkCount: 17, ratingSum: 43, ratingCount: 10,
    status: "published", tags: ["sea", "tradition"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "He still goes out at 4 AM, though the nets come back lighter each year. The sea hasn't changed — the fish just found somewhere quieter to be. He understands that." }] },
  },
  {
    _id: "demo-14", title: "Dhaaga", genre: "family", language: "hindi",
    contentType: "story", authorId: "demo", bookmarkCount: 36, ratingSum: 90, ratingCount: 20,
    status: "published", tags: ["family", "thread"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "दादी हमेशा कहती थीं — 'धागा टूटता नहीं, बस ढीला पड़ जाता है।' हम समझे नहीं उस वक्त। अब जब घर बिखरने लगा, तो समझ आया…" }] },
  },
  {
    _id: "demo-15", title: "Ekla Chalo", genre: "journey", language: "bengali",
    contentType: "story", authorId: "demo", bookmarkCount: 29, ratingSum: 73, ratingCount: 17,
    status: "published", tags: ["journey", "solitude"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "সেদিন সন্ধ্যায় মালতী একা হাঁটতে বেরিয়েছিল। পথ চিনত না, কিন্তু পা থামেনি। কখনো কখনো না জানলেই ভালো যাওয়া যায়…" }] },
  },
  // ─── Screenplays ──────────────────────────────────────────────────────────
  {
    _id: "demo-16", title: "The Last Reel", genre: "drama", language: "english",
    contentType: "screenplay", authorId: "demo", bookmarkCount: 12, ratingSum: 35, ratingCount: 8,
    status: "published", tags: ["drama", "film"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "INT. CINEMA HALL - NIGHT\nThe projector hums. Three people remain in the last row.\n\nRAHUL: (whispering) We should go.\nPRIYA: Not yet. I want to see how it ends." }] },
  },
  {
    _id: "demo-17", title: "Apartment 404", genre: "dark-comedy", language: "english",
    contentType: "screenplay", authorId: "demo", bookmarkCount: 18, ratingSum: 47, ratingCount: 11,
    status: "published", tags: ["comedy", "apartment"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "INT. APARTMENT 404 - MORNING\nSUNEEL (32, still in yesterday's kurta) stares at the ceiling.\n\nSUNEEL: (to himself) Today is the day. Today I become a person.\n\nHe goes back to sleep." }] },
  },
  {
    _id: "demo-18", title: "Station no. 7", genre: "thriller", language: "hindi",
    contentType: "screenplay", authorId: "demo", bookmarkCount: 24, ratingSum: 62, ratingCount: 14,
    status: "published", tags: ["thriller", "train"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "INT. RAILWAY STATION - LATE NIGHT\nप्लेटफ़ॉर्म नंबर सात पर सिर्फ एक बल्ब जल रहा है। KAVYA (28) एक सूटकेस लेकर खड़ी है।\nट्रेन 40 मिनट लेट है। उसके पास 40 मिनट हैं।" }] },
  },
  {
    _id: "demo-19", title: "Ghar ka Khana", genre: "slice-of-life", language: "hindi",
    contentType: "screenplay", authorId: "demo", bookmarkCount: 31, ratingSum: 80, ratingCount: 18,
    status: "published", tags: ["food", "family"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "INT. KITCHEN - MORNING\nMAA (58) रोटी बेल रही है। रेडियो पर पुराना गाना चल रहा है।\n\nARUN: मुझे देर हो रही है।\nMAA: देर होती है। रोटी नहीं होती।" }] },
  },
  {
    _id: "demo-20", title: "Kadalil Oru Kathai", genre: "romance", language: "tamil",
    contentType: "screenplay", authorId: "demo", bookmarkCount: 15, ratingSum: 38, ratingCount: 9,
    status: "published", tags: ["sea", "romance"], createdAt: new Date().toISOString(),
    quillDelta: { ops: [{ insert: "EXT. BEACH - GOLDEN HOUR\nARUN மணலில் ஏதோ எழுதுகிறான். MEERA அதை படிக்கிறாள்.\n\nMEERA: இது என்ன?\nARUN: கடலுக்கு எழுதிய கடிதம்.\nMEERA: கடல் படிக்குமா?\nARUN: நீ படிக்கிறாயே." }] },
  },
];

// ── Lazy font loading ─────────────────────────────────────────────────────────

const fontMap: Record<string, string> = {
  hindi: "Tiro+Devanagari+Hindi",
  tamil: "Catamaran",
  bengali: "Hind+Siliguri",
  marathi: "Tiro+Devanagari+Marathi",
  telugu: "Ramaraja",
  english: "EB+Garamond",
};

function loadFont(lang: string) {
  const id = `font-${lang}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontMap[lang] ?? "EB+Garamond"}&display=swap`;
  document.head.appendChild(link);
}

function avgRating(item: ContentItem) {
  return item.ratingCount > 0 ? item.ratingSum / item.ratingCount : 0;
}

function extractText(item: ContentItem, chars = 200): string {
  if (!item.quillDelta?.ops) return "";
  return item.quillDelta.ops
    .map((op) => (typeof op.insert === "string" ? op.insert : ""))
    .join("")
    .slice(0, chars);
}

// ── Star rating widget ────────────────────────────────────────────────────────

function StarWidget({
  contentId, initialAvg, initialCount, readonly = false,
}: {
  contentId: string; initialAvg: number; initialCount: number; readonly?: boolean;
}) {
  const { user } = usePlatform();
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [hover, setHover] = useState(0);
  const [myRating, setMyRating] = useState(0);

  const rate = async (score: number) => {
    if (!user || readonly) return;
    setMyRating(score);
    try {
      const res = await apiClient.rateContent(contentId, score);
      if (res.data) {
        const newAvg = res.data.count > 0 ? res.data.avg : score;
        setAvg(newAvg);
        setCount(res.data.count);
      }
    } catch { /* ignore */ }
  };

  const display = hover || myRating || avg;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={!user || readonly}
            onMouseEnter={() => !readonly && setHover(s)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => rate(s)}
            className="disabled:cursor-default"
          >
            <Star
              className="w-4 h-4 transition-colors"
              style={{ color: s <= display ? "var(--gold)" : undefined }}
              fill={s <= display ? "var(--gold)" : "none"}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-foreground/60">
        {avg > 0 ? avg.toFixed(1) : "—"} ({count})
      </span>
    </div>
  );
}

// ── Bookmark button ───────────────────────────────────────────────────────────

function BookmarkBtn({
  contentId, initialCount,
}: {
  contentId: string; initialCount: number;
}) {
  const { user } = usePlatform();
  const [bookmarked, setBookmarked] = useState(false);
  const [count, setCount] = useState(initialCount);

  const toggle = async () => {
    if (!user) return;
    const next = !bookmarked;
    setBookmarked(next);
    setCount((c) => next ? c + 1 : Math.max(0, c - 1));
    try {
      const res = await apiClient.toggleBookmark(contentId);
      setBookmarked(res.data.bookmarked);
      setCount(res.data.count);
    } catch {
      setBookmarked(!next);
      setCount((c) => next ? Math.max(0, c - 1) : c + 1);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!user}
      title={user ? (bookmarked ? "Remove bookmark" : "Bookmark") : "Sign in to bookmark"}
      className="flex items-center gap-1.5 text-xs text-foreground/65 hover:text-foreground disabled:opacity-40 transition-colors"
    >
      <BookmarkIcon
        className="w-4 h-4"
        fill={bookmarked ? "currentColor" : "none"}
      />
      <span>{count}</span>
    </button>
  );
}

// ── Content Drawer ────────────────────────────────────────────────────────────

function ContentDrawer({
  item, onClose,
}: {
  item: ContentItem; onClose: () => void;
}) {
  const text = extractText(item, 2000);

  useEffect(() => {
    loadFont(item.language);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item.language, onClose]);

  const fontFamily =
    item.language === "hindi" || item.language === "marathi"
      ? "'Tiro Devanagari Hindi', serif"
      : item.language === "tamil" ? "'Catamaran', sans-serif"
        : item.language === "bengali" ? "'Hind Siliguri', sans-serif"
          : item.language === "telugu" ? "'Ramaraja', serif"
            : "'EB Garamond', serif";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.aside
        key="drawer-panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl paper-texture shadow-elevated flex flex-col overflow-hidden border-l border-foreground/10"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-foreground/10">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/55 mb-1">
              {item.genre} · {item.language}
            </p>
            <h2 className="font-display text-2xl leading-tight" style={{ color: "var(--ink)" }}>
              {item.title || "Untitled"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-foreground/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="px-5 pt-3 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-foreground/8 text-xs text-foreground/65">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {text ? (
            <div
              className="text-base leading-[1.85] whitespace-pre-wrap text-foreground/85"
              style={{ fontFamily }}
            >
              {text}
            </div>
          ) : (
            <p className="text-foreground/45 italic text-sm">No preview available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-foreground/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <StarWidget
              contentId={item._id}
              initialAvg={avgRating(item)}
              initialCount={item.ratingCount}
            />
            <BookmarkBtn contentId={item._id} initialCount={item.bookmarkCount} />
          </div>
          <a
            href={`/content/${item._id}`}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/55 hover:text-foreground transition-colors ink-underline"
          >
            Open full page
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.aside>
    </>
  );
}

// ── Content Card ──────────────────────────────────────────────────────────────

function ContentCard({ item, onClick }: { item: ContentItem; onClick: () => void }) {
  const excerpt = extractText(item, 120);
  const avg = avgRating(item);

  return (
    <motion.article
      whileHover={{ y: -3 }}
      onClick={onClick}
      className="paper-texture border border-foreground/10 rounded-xl p-4 shadow-paper cursor-pointer hover:border-foreground/25 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border border-foreground/15"
          style={{ color: "var(--ink)" }}
        >
          {item.genre}
        </span>
        <span className="text-xs text-foreground/50">{item.language}</span>
      </div>

      <h3 className="font-display text-lg leading-snug mb-1" style={{ color: "var(--ink)" }}>
        {item.title || "Untitled"}
      </h3>

      {excerpt && (
        <p className="text-sm text-foreground/65 line-clamp-2 font-serif-lit italic mb-3">
          {excerpt}…
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-foreground/50">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3" fill={avg > 0 ? "var(--gold)" : "none"} style={{ color: "var(--gold)" }} />
          <span>{avg > 0 ? avg.toFixed(1) : "—"}</span>
        </div>
        <div className="flex items-center gap-1">
          <BookmarkIcon className="w-3 h-3" />
          <span>{item.bookmarkCount}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
      </div>
    </motion.article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ExplorePage() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [sort, setSort] = useState<"latest" | "bookmarks" | "rating">("latest");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContent = useCallback(async (q: string, g: string, l: string, s: typeof sort) => {
    setLoading(true);
    try {
      let dbResults: ContentItem[] = [];
      if (q.trim()) {
        const res = await apiClient.searchContent(q.trim(), l || undefined, g || undefined);
        dbResults = res.data ?? [];
      } else {
        const res = await apiClient.browseContent({
          genre: g || undefined,
          language: l || undefined,
          sort: s,
        });
        dbResults = res.data ?? [];
      }

      // ── Filter and merge demo items ──
      let demo = DEMO_ITEMS;
      if (g) demo = demo.filter(d => d.genre === g || d.contentType === g);
      if (l) demo = demo.filter(d => d.language === l);
      if (q.trim()) {
        const ql = q.toLowerCase();
        demo = demo.filter(d =>
          d.title.toLowerCase().includes(ql) ||
          d.genre.toLowerCase().includes(ql) ||
          d.language.toLowerCase().includes(ql)
        );
      }

      let combined = [...dbResults, ...demo];

      // Sort combined results
      if (s === "latest") {
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (s === "bookmarks") {
        combined.sort((a, b) => b.bookmarkCount - a.bookmarkCount);
      } else if (s === "rating") {
        combined.sort((a, b) => avgRating(b) - avgRating(a));
      }

      setResults(combined);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchContent(query, genre, language, sort);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, genre, language, sort, fetchContent]);

  const toggleGenre = (g: string) => setGenre((prev) => prev === g ? "" : g);
  const toggleLanguage = (l: string) => setLanguage((prev) => prev === l ? "" : l);

  return (
    <PlatformShell
      title="Explore"
      subtitle="Search, filter, and discover multilingual writing across genres."
    >
      {/* Search bar */}
      <section className="paper-texture border border-foreground/10 rounded-xl p-4 md:p-5 shadow-paper">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <input
            id="explore-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, mood, language, rain…"
            className="w-full rounded-full border border-foreground/15 bg-background/80 py-3 pl-11 pr-10 outline-none focus:border-foreground/40 transition-colors"
          />
        </div>

        {/* Genre chips */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/45" />
          <span className="text-xs text-foreground/45 uppercase tracking-[0.18em] mr-1">Genre</span>
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g)}
              className="px-3 py-1 rounded-full text-xs border transition-all duration-150"
              style={{
                borderColor: genre === g ? "var(--ink)" : "rgba(0,0,0,0.15)",
                background: genre === g ? "var(--ink)" : "transparent",
                color: genre === g ? "var(--primary-foreground)" : "inherit",
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Language chips */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-foreground/45 uppercase tracking-[0.18em] mr-1 ml-5">Lang</span>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLanguage(l)}
              className="px-3 py-1 rounded-full text-xs border transition-all duration-150"
              style={{
                borderColor: language === l ? "var(--maroon)" : "rgba(0,0,0,0.15)",
                background: language === l ? "var(--maroon)" : "transparent",
                color: language === l ? "#fff" : "inherit",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-foreground/45 uppercase tracking-[0.18em]">Sort</span>
          <button
            type="button"
            onClick={() => { setGenre(""); setLanguage(""); setQuery(""); setSort("latest"); }}
            className="px-3 py-1 rounded-full text-xs border transition-all duration-150"
            style={{
              borderColor: (!genre && !language && !query && sort === "latest") ? "var(--ink)" : "rgba(0,0,0,0.15)",
              background: (!genre && !language && !query && sort === "latest") ? "var(--ink)" : "transparent",
              color: (!genre && !language && !query && sort === "latest") ? "#fff" : "inherit",
            }}
          >
            All
          </button>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value as typeof sort)}
              className="px-3 py-1 rounded-full text-xs border transition-all duration-150"
              style={{
                borderColor: sort === opt.value ? "var(--gold)" : "rgba(0,0,0,0.15)",
                background: sort === opt.value ? "var(--gold)" : "transparent",
                color: sort === opt.value ? "#000" : "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-foreground/50">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm italic font-serif-lit">Searching manuscripts…</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground/45">
            <BookOpen className="w-10 h-10 opacity-40" />
            <p className="text-sm font-serif-lit italic">
              No content matched your filters. Try broadening the search.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((item) => (
              <ContentCard
                key={item._id}
                item={item}
                onClick={() => setActiveItem(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Content drawer */}
      <AnimatePresence>
        {activeItem && (
          <ContentDrawer item={activeItem} onClose={() => setActiveItem(null)} />
        )}
      </AnimatePresence>
    </PlatformShell>
  );
}
