import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, CartesianGrid, XAxis, Cell, PieChart, Pie, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";
import { usePlatform } from "@/context/platform-context";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "var(--ink)", "var(--gold)", "var(--maroon)",
  "oklch(0.55 0.1 150)", "oklch(0.6 0.12 260)", "oklch(0.65 0.1 30)",
];

interface LangStat { _id: string; count: number; avgRating: number }
interface GenreStat { _id: string; totalBookmarks: number; count: number; avgRating: number }

function AnalyticsPage() {
  const { user } = usePlatform();
  const [langStats, setLangStats] = useState<LangStat[]>([]);
  const [trending, setTrending] = useState<GenreStat[]>([]);
  const [myDrafts, setMyDrafts] = useState(0);
  const [myPublished, setMyPublished] = useState(0);
  const [myBookmarks, setMyBookmarks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loads: Promise<void>[] = [
      apiClient.getLanguageStats()
        .then((r) => setLangStats((r.data as LangStat[]) ?? []))
        .catch(() => {}),
      apiClient.getTrendingContent()
        .then((r) => setTrending((r.data as unknown as GenreStat[]) ?? []))
        .catch(() => {}),
    ];

    if (user) {
      loads.push(
        apiClient.getDrafts()
          .then((r) => setMyDrafts(r.data?.length ?? 0))
          .catch(() => {})
      );
      loads.push(
        apiClient.getMyPublished()
          .then((r) => {
            const items = r.data ?? [];
            setMyPublished(items.length);
            setMyBookmarks(items.reduce((s: number, i: { bookmarkCount?: number }) => s + (i.bookmarkCount ?? 0), 0));
          })
          .catch(() => {})
      );
    }

    Promise.all(loads).finally(() => setLoading(false));
  }, [user]);

  const pieData = langStats.map((l) => ({ name: l._id, value: l.count }));
  const genreData = trending.slice(0, 6).map((g) => ({
    genre: g._id ?? "unknown",
    bookmarks: g.totalBookmarks ?? 0,
    count: g.count ?? 0,
  }));

  return (
    <PlatformShell
      title="Analytics"
      subtitle="Real-time signals from your readership and writing patterns."
    >
      {loading ? (
        <div className="flex items-center gap-3 py-20 justify-center text-foreground/50">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-serif-lit italic">Loading analytics…</span>
        </div>
      ) : (
        <div className="grid xl:grid-cols-2 gap-6">

          {/* ── My stats ── */}
          {user && (
            <section className="xl:col-span-2 grid grid-cols-3 gap-4">
              {[
                { label: "My Drafts", value: myDrafts },
                { label: "Published", value: myPublished },
                { label: "Total Bookmarks", value: myBookmarks },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper text-center"
                >
                  <div className="font-display text-4xl" style={{ color: "var(--ink)" }}>{value}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-foreground/50 mt-1">{label}</div>
                </div>
              ))}
            </section>
          )}

          {/* ── Genre bookmarks (trending) ── */}
          <ChartPanel title="Genre popularity (bookmarks)">
            {genreData.length === 0 ? (
              <p className="font-serif-lit italic text-foreground/50 py-8 text-center">
                No published content yet — publish something to see genre stats.
              </p>
            ) : (
              <ChartContainer
                config={{ bookmarks: { label: "Bookmarks", color: "var(--ink)" } }}
                className="h-[260px] w-full"
              >
                <BarChart data={genreData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="genre" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookmarks" radius={[6, 6, 0, 0]}>
                    {genreData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </ChartPanel>

          {/* ── Language distribution ── */}
          <ChartPanel title="Language distribution (all platform)">
            {pieData.length === 0 ? (
              <p className="font-serif-lit italic text-foreground/50 py-8 text-center">
                No language data yet.
              </p>
            ) : (
              <ChartContainer
                config={{ value: { label: "Works", color: "var(--gold)" } }}
                className="h-[300px] w-full"
              >
                <PieChart>
                  <Tooltip
                    formatter={(v, name) => [`${v} works`, name]}
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid color-mix(in oklab, currentColor 15%, transparent)",
                      borderRadius: "8px",
                    }}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </ChartPanel>

          {/* ── Top genres table ── */}
          {genreData.length > 0 && (
            <section className="xl:col-span-2 paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
              <h2 className="font-display text-2xl mb-4" style={{ color: "var(--ink)" }}>
                Top genres by engagement
              </h2>
              <div className="space-y-3">
                {genreData.map((g) => {
                  const maxBookmarks = Math.max(...genreData.map((x) => x.bookmarks), 1);
                  return (
                    <div key={g.genre}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{g.genre}</span>
                        <span className="text-foreground/50">
                          {g.count} works · {g.bookmarks} bookmarks
                        </span>
                      </div>
                      <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-ink"
                          style={{ width: `${(g.bookmarks / maxBookmarks) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Language stats table ── */}
          {langStats.length > 0 && (
            <section className="xl:col-span-2 paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
              <h2 className="font-display text-2xl mb-4" style={{ color: "var(--ink)" }}>
                Language breakdown
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {langStats.map((l) => (
                  <div
                    key={l._id}
                    className="rounded-xl border border-foreground/10 p-3 text-center"
                  >
                    <div className="font-display text-2xl capitalize" style={{ color: "var(--ink)" }}>
                      {l.count}
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em] text-foreground/50 mt-0.5 capitalize">
                      {l._id}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PlatformShell>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="paper-texture rounded-xl border border-foreground/10 p-5 shadow-paper">
      <h2 className="font-display text-2xl mb-4" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
