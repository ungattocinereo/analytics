"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { SiteData } from "./types";

const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import("react-chartjs-2").then(mod => mod.Doughnut), { ssr: false });

/* ── Design Tokens ──────────────────────────────────────────── */
const COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  "Atrani.ru":         { bg: "rgba(239, 68, 68, 0.12)",  border: "rgb(239, 68, 68)",  glow: "rgba(239, 68, 68, 0.15)" },
  "Cinereo.it":        { bg: "rgba(168, 85, 247, 0.12)", border: "rgb(168, 85, 247)", glow: "rgba(168, 85, 247, 0.15)" },
  "amalfi.day":        { bg: "rgba(59, 130, 246, 0.12)", border: "rgb(59, 130, 246)", glow: "rgba(59, 130, 246, 0.15)" },
  "guide.amalfi.day":  { bg: "rgba(34, 197, 94, 0.12)",  border: "rgb(34, 197, 94)",  glow: "rgba(34, 197, 94, 0.15)" },
  "find.amalfi.day":   { bg: "rgba(251, 191, 36, 0.12)", border: "rgb(251, 191, 36)", glow: "rgba(251, 191, 36, 0.15)" },
  "Ceramiche Da Mario":{ bg: "rgba(236, 72, 153, 0.12)", border: "rgb(236, 72, 153)", glow: "rgba(236, 72, 153, 0.15)" },
  "Moto Excursions":   { bg: "rgba(20, 184, 166, 0.12)", border: "rgb(20, 184, 166)", glow: "rgba(20, 184, 166, 0.15)" },
  "Katerina":          { bg: "rgba(249, 115, 22, 0.12)", border: "rgb(249, 115, 22)", glow: "rgba(249, 115, 22, 0.15)" },
  "Masha":             { bg: "rgba(99, 102, 241, 0.12)", border: "rgb(99, 102, 241)", glow: "rgba(99, 102, 241, 0.15)" },
  "Landing (menu.band)":{ bg: "rgba(163, 230, 53, 0.12)",border: "rgb(163, 230, 53)", glow: "rgba(163, 230, 53, 0.15)" },
  "Le Palme":          { bg: "rgba(190, 18, 60, 0.12)",  border: "rgb(190, 18, 60)",  glow: "rgba(190, 18, 60, 0.15)" },
  "Birecto":           { bg: "rgba(6, 182, 212, 0.12)",  border: "rgb(6, 182, 212)",  glow: "rgba(6, 182, 212, 0.15)" },
  "Vittoria":          { bg: "rgba(217, 119, 6, 0.12)",  border: "rgb(217, 119, 6)",  glow: "rgba(217, 119, 6, 0.15)" },
};

const EMOJIS: Record<string, string> = {
  "Atrani.ru": "🇷🇺", "Cinereo.it": "🇮🇹", "amalfi.day": "🌊",
  "guide.amalfi.day": "📖", "find.amalfi.day": "🔍",
  "Ceramiche Da Mario": "🏺", "Moto Excursions": "🏍️",
  "Katerina": "👤", "Masha": "👤", "Landing (menu.band)": "📄",
  "Le Palme": "🍕", "Birecto": "🍕", "Vittoria": "🍕",
};

/* ── Helpers ────────────────────────────────────────────────── */
function fmt(n: number) { return n.toLocaleString(); }
function fmtDur(s: number) { return `${Math.floor(s/60)}m ${Math.round(s%60)}s`; }
function pctChange(current: number, previous: number) {
  if (!previous) return null;
  const v = ((current - previous) / previous) * 100;
  return v;
}

/* ── Main Component ─────────────────────────────────────────── */
interface Props {
  initialSites: Record<string, SiteData>;
  initialAllSites: Record<string, SiteData>;
}

export default function Dashboard({ initialSites, initialAllSites }: Props) {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    import("chart.js").then(({ Chart, registerables }) => {
      Chart.register(...registerables);
      setChartsReady(true);
    });
  }, []);

  const sites = Object.values(initialSites);
  const allSites = Object.values(initialAllSites);
  const active = selectedSite
    ? (initialSites[selectedSite] ?? initialAllSites[selectedSite] ?? null)
    : null;

  const selectSite = useCallback((name: string) => {
    setSelectedSite(prev => prev === name ? null : name);
  }, []);

  // ── Aggregate stats ──
  const totalSessions7d = sites.reduce((a, s) => a + s.summary7d.sessions, 0);
  const totalSessions30d = sites.reduce((a, s) => a + s.summary30d.sessions, 0);
  const totalUsers7d = sites.reduce((a, s) => a + s.summary7d.users, 0);
  const totalPageViews7d = sites.reduce((a, s) => a + s.summary7d.pageViews, 0);
  const avgBounce = sites.length ? (sites.reduce((a, s) => a + s.summary7d.bounceRate, 0) / sites.length).toFixed(1) : "0";

  // ── Chart data ──
  const activeTrend = active && Array.isArray(active.trend) ? active.trend : [];
  const activeTopPages = active && Array.isArray(active.topPages) ? active.topPages : [];
  const activeSources = active && Array.isArray(active.sources) ? active.sources : [];
  const activeCountries = active && Array.isArray(active.countries) ? active.countries : [];
  const hasTrendData = activeTrend.length > 0;

  const defaultTrendDates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const trendDates = hasTrendData
    ? activeTrend.map(r => {
        const d = r.dimensions[0];
        return `${d.slice(6, 8)}/${d.slice(4, 6)}`;
      })
    : defaultTrendDates;

  const overviewChartData = active && hasTrendData
    ? {
        labels: trendDates,
        datasets: [{
          label: "Sessions",
          data: activeTrend.map(r => parseInt(r.metrics[0])),
          borderColor: COLORS[active.name]?.border || "rgb(59,130,246)",
          backgroundColor: (ctx: any) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            const c = COLORS[active.name]?.border || "rgb(59,130,246)";
            g.addColorStop(0, c.replace("rgb", "rgba").replace(")", ",0.2)"));
            g.addColorStop(1, c.replace("rgb", "rgba").replace(")", ",0)"));
            return g;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS[active.name]?.border || "rgb(59,130,246)",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
          borderWidth: 2,
        }],
      }
    : {
        labels: defaultTrendDates,
        datasets: sites
          .filter(s => Array.isArray(s.trend) && s.trend.length > 0)
          .map(site => ({
            label: site.name,
            data: (site.trend ?? []).map(r => parseInt(r.metrics[0])),
            borderColor: COLORS[site.name]?.border,
            backgroundColor: "transparent",
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 1.5,
          })),
      };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        display: !active,
        labels: { color: "#a1a1aa", boxWidth: 10, padding: 20, usePointStyle: true, pointStyle: "circle", font: { size: 11, family: "'Inter', sans-serif" } },
      },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.95)",
        titleColor: "#fafafa",
        bodyColor: "#a1a1aa",
        borderColor: "rgba(63, 63, 70, 0.5)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        titleFont: { size: 12, weight: 600 as const, family: "'Inter', sans-serif" },
        bodyFont: { size: 12, family: "'Inter', sans-serif" },
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(63, 63, 70, 0.15)", drawBorder: false },
        ticks: { color: "#52525b", maxTicksLimit: 8, font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: "rgba(63, 63, 70, 0.15)", drawBorder: false },
        ticks: { color: "#52525b", font: { size: 11 }, padding: 8 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  const maxSourceSessions = activeSources.length > 0
    ? Math.max(...activeSources.map(s => parseInt(s.metrics[0])))
    : 1;

  return (
    <div className="bg-gradient-mesh min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="flex items-start justify-between mb-10 animate-fade-in-up">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Analytics</h1>
            </div>
            <p className="text-zinc-500 text-sm ml-11">
              {sites[0]?.updatedAt
                ? `Updated ${new Date(sites[0].updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedSite && (
              <button
                type="button"
                onClick={() => setSelectedSite(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                All sites
              </button>
            )}
            <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
              {(["7d", "30d"] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    timeRange === r
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Overview Stats ──────────────────────────────── */}
        {!selectedSite && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 stagger-children">
            {[
              { label: "Sessions", value: timeRange === "7d" ? totalSessions7d : totalSessions30d, sub: timeRange === "7d" ? `${fmt(totalSessions30d)} / 30d` : `${fmt(totalSessions7d)} / 7d` },
              { label: "Users", value: totalUsers7d, sub: `${sites.length} sites` },
              { label: "Page Views", value: totalPageViews7d, sub: `${(totalPageViews7d / (totalSessions7d || 1)).toFixed(1)} per session` },
              { label: "Avg. Bounce", value: `${avgBounce}%`, sub: "across all sites" },
            ].map(stat => (
              <div key={stat.label} className="glass-card-static p-4">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-semibold metric-value">{typeof stat.value === "number" ? fmt(stat.value) : stat.value}</p>
                <p className="text-xs text-zinc-600 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Site Cards Grid ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 stagger-children">
          {sites.map(site => {
            const s = timeRange === "7d" ? site.summary7d : site.summary30d;
            const s7 = site.summary7d;
            const s30 = site.summary30d;
            const change = pctChange(s7.sessions, s30.sessions > 0 ? s30.sessions / 4.3 : 0);
            const isSelected = selectedSite === site.name;
            const color = COLORS[site.name];
            return (
              <button
                type="button"
                key={site.name}
                onClick={() => selectSite(site.name)}
                className={`glass-card site-card p-4 text-left cursor-pointer ${isSelected ? "active" : ""}`}
                style={{ "--card-accent": color?.border } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{EMOJIS[site.name] || "•"}</span>
                  <span className="text-xs font-medium text-zinc-300 truncate">{site.name}</span>
                </div>
                <p className="text-2xl font-semibold metric-value mb-0.5">{fmt(s.sessions)}</p>
                <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
                  sessions ({timeRange})
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">{fmt(s.users)} users</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-zinc-500">{fmt(timeRange === "7d" ? s30.sessions : s7.sessions)} {timeRange === "7d" ? "30d" : "7d"}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Trend Chart ─────────────────────────────────── */}
        {chartsReady && (
          <div className="glass-card-static p-5 sm:p-6 mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-medium text-zinc-400">
                {active && hasTrendData ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS[active.name]?.border }} />
                    {active.name}
                    <span className="text-zinc-600">—</span>
                    <span className="text-zinc-300">Sessions (30d)</span>
                  </span>
                ) : (
                  "Sessions Overview (30d)"
                )}
              </h2>
            </div>
            <div className="chart-container h-[280px] sm:h-[320px]">
              <Line data={overviewChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* ── Detail Panels ───────────────────────────────── */}
        {active && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">

            {/* Summary */}
            <div className="glass-card-static p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">
                {timeRange === "7d" ? "7-Day" : "30-Day"} Summary
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Sessions", value: fmt(active.summary7d.sessions), icon: "📊" },
                  { label: "Users", value: fmt(active.summary7d.users), icon: "👤" },
                  { label: "Page Views", value: fmt(active.summary7d.pageViews), icon: "📄" },
                  { label: "Avg. Duration", value: fmtDur(active.summary7d.avgSessionDuration), icon: "⏱" },
                  { label: "Bounce Rate", value: `${active.summary7d.bounceRate}%`, icon: "↩" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500 flex items-center gap-2">
                      <span className="text-xs">{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="text-sm font-medium metric-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="glass-card-static p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">
                Top Sources ({timeRange})
              </h3>
              <div className="space-y-3">
                {activeSources.slice(0, 8).map((s, i) => {
                  const val = parseInt(s.metrics[0]);
                  const pct = (val / maxSourceSessions) * 100;
                  const color = COLORS[active.name]?.border || "rgb(59,130,246)";
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-400 truncate mr-3">{s.dimensions[0] || "(direct)"}</span>
                        <span className="text-zinc-300 font-medium metric-value whitespace-nowrap">{fmt(val)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                {activeSources.length === 0 && <p className="text-zinc-600 text-sm">No source data</p>}
              </div>
            </div>

            {/* Countries */}
            <div className="glass-card-static p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">
                Countries ({timeRange})
              </h3>
              {chartsReady && activeCountries.length > 0 ? (
                <div className="flex items-center gap-5">
                  <div className="w-32 h-32 flex-shrink-0">
                    <Doughnut
                      data={{
                        labels: activeCountries.slice(0, 6).map(c => c.dimensions[0]),
                        datasets: [{
                          data: activeCountries.slice(0, 6).map(c => parseInt(c.metrics[0])),
                          backgroundColor: [
                            "rgba(59,130,246,0.8)", "rgba(239,68,68,0.8)", "rgba(34,197,94,0.8)",
                            "rgba(251,191,36,0.8)", "rgba(168,85,247,0.8)", "rgba(236,72,153,0.8)",
                          ],
                          borderWidth: 0,
                          spacing: 2,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: "65%",
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(9,9,11,0.95)",
                            titleColor: "#fafafa",
                            bodyColor: "#a1a1aa",
                            borderColor: "rgba(63,63,70,0.5)",
                            borderWidth: 1,
                            padding: 10,
                            cornerRadius: 8,
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    {activeCountries.slice(0, 6).map((c, i) => {
                      const total = activeCountries.reduce((a, x) => a + parseInt(x.metrics[0]), 0);
                      const pct = total ? ((parseInt(c.metrics[0]) / total) * 100).toFixed(0) : "0";
                      const colors = ["#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#A855F7", "#EC4899"];
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-zinc-400">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i] }} />
                            {c.dimensions[0]}
                          </span>
                          <span className="text-zinc-300 font-medium metric-value">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No country data</p>
              )}
            </div>

            {/* Top Pages — full width */}
            <div className="glass-card-static p-5 md:col-span-2 lg:col-span-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">
                Top Pages ({timeRange})
              </h3>
              {activeTopPages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                  {activeTopPages.map((p, i) => {
                    const views = parseInt(p.metrics[0]);
                    const maxViews = parseInt(activeTopPages[0]?.metrics[0] || "1");
                    return (
                      <div key={i} className="flex items-center gap-3 group">
                        <span className="text-[10px] text-zinc-600 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors font-mono">
                            {p.dimensions[0]}
                          </p>
                          <div className="progress-bar mt-1">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${(views / maxViews) * 100}%`,
                                background: COLORS[active.name]?.border || "rgb(59,130,246)",
                                opacity: 0.6,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-zinc-500 metric-value flex-shrink-0">{fmt(views)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-600 text-sm">No page data</p>
              )}
            </div>
          </div>
        )}

        {/* ── Other Projects ──────────────────────────────── */}
        <div className="mt-12">
          <h3 className="text-xs font-medium text-zinc-600 uppercase tracking-wider mb-4">Other Projects</h3>
          <div className="flex flex-wrap gap-2">
            {allSites
              .filter(s => !sites.map(x => x.name).includes(s.name))
              .map(site => {
                const isSelected = selectedSite === site.name;
                const color = COLORS[site.name];
                return (
                  <button
                    type="button"
                    key={site.name}
                    onClick={() => selectSite(site.name)}
                    className={`pill cursor-pointer ${isSelected ? "!border-zinc-600 !bg-zinc-800 !text-zinc-200" : ""}`}
                    style={isSelected ? { borderColor: color?.border, boxShadow: `0 0 0 1px ${color?.border}` } : undefined}
                  >
                    <span>{EMOJIS[site.name] || "•"}</span>
                    <span>{site.name}</span>
                    <span className="text-zinc-600">{fmt(site.summary7d.sessions)}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="text-center text-[11px] text-zinc-700 mt-12 pb-8 flex items-center justify-center gap-2">
          <span className="inline-block w-1 h-1 rounded-full bg-green-500/50" />
          Updated daily via GitHub Actions · Google Analytics 4
        </footer>
      </div>
    </div>
  );
}
