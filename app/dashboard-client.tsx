"use client";

import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import type { SiteData } from "./types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS: Record<string, { bg: string; border: string }> = {
  "Atrani.ru": { bg: "rgba(239, 68, 68, 0.15)", border: "rgb(239, 68, 68)" },
  "Cinereo.it": { bg: "rgba(168, 85, 247, 0.15)", border: "rgb(168, 85, 247)" },
  "amalfi.day": { bg: "rgba(59, 130, 246, 0.15)", border: "rgb(59, 130, 246)" },
  "guide.amalfi.day": { bg: "rgba(34, 197, 94, 0.15)", border: "rgb(34, 197, 94)" },
  "find.amalfi.day": { bg: "rgba(251, 191, 36, 0.15)", border: "rgb(251, 191, 36)" },
  "Ceramiche Da Mario": { bg: "rgba(236, 72, 153, 0.15)", border: "rgb(236, 72, 153)" },
  "Moto Excursions": { bg: "rgba(20, 184, 166, 0.15)", border: "rgb(20, 184, 166)" },
  "Katerina": { bg: "rgba(249, 115, 22, 0.15)", border: "rgb(249, 115, 22)" },
  "Masha": { bg: "rgba(99, 102, 241, 0.15)", border: "rgb(99, 102, 241)" },
  "Landing (menu.band)": { bg: "rgba(163, 230, 53, 0.15)", border: "rgb(163, 230, 53)" },
  "Le Palme": { bg: "rgba(190, 18, 60, 0.15)", border: "rgb(190, 18, 60)" },
  "Birecto": { bg: "rgba(6, 182, 212, 0.15)", border: "rgb(6, 182, 212)" },
  "Vittoria": { bg: "rgba(217, 119, 6, 0.15)", border: "rgb(217, 119, 6)" },
};

const EMOJIS: Record<string, string> = {
  "Atrani.ru": "🇷🇺",
  "Cinereo.it": "🇮🇹",
  "amalfi.day": "🌊",
  "guide.amalfi.day": "📖",
  "find.amalfi.day": "🔍",
  "Ceramiche Da Mario": "🏺",
  "Moto Excursions": "🏍️",
  "Katerina": "👤",
  "Masha": "👤",
  "Landing (menu.band)": "📄",
  "Le Palme": "🍕",
  "Birecto": "🍕",
  "Vittoria": "🍕",
};

interface DashboardClientProps {
  initialSites: Record<string, SiteData>;
  initialAllSites: Record<string, SiteData>;
}

export default function DashboardClient({ initialSites, initialAllSites }: DashboardClientProps) {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const sites = Object.values(initialSites);
  const allSites = Object.values(initialAllSites);
  const active = selectedSite ? initialAllSites[selectedSite] : null;

  // Combined overview chart
  const trendDates = active
    ? active.trend.map(r => {
        const d = r.dimensions[0];
        return `${d.slice(6, 8)}/${d.slice(4, 6)}`;
      })
    : Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      });

  const overviewChartData = active
    ? {
        labels: trendDates,
        datasets: [
          {
            label: "Sessions",
            data: active.trend.map(r => parseInt(r.metrics[0])),
            borderColor: COLORS[active.name]?.border || "rgb(59,130,246)",
            backgroundColor: COLORS[active.name]?.bg || "rgba(59,130,246,0.15)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      }
    : {
        labels: trendDates,
        datasets: sites
          .filter(s => s.trend.length > 0)
          .map(site => ({
            label: site.name,
            data: site.trend.map(r => parseInt(r.metrics[0])),
            borderColor: COLORS[site.name]?.border,
            backgroundColor: COLORS[site.name]?.bg,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          })),
      };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: !active, labels: { color: "#a1a1aa", boxWidth: 12, padding: 16 } },
      tooltip: { backgroundColor: "rgba(24,24,27,0.95)", titleColor: "#f4f4f5", bodyColor: "#a1a1aa", borderColor: "#3f3f46", borderWidth: 1 },
    },
    scales: {
      x: { grid: { color: "rgba(63,63,70,0.3)" }, ticks: { color: "#71717a", maxTicksLimit: 10 } },
      y: { grid: { color: "rgba(63,63,70,0.3)" }, ticks: { color: "#71717a" }, beginAtZero: true },
    },
  };

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }

  function formatNumber(n: number) {
    return n.toLocaleString();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Last updated: {sites[0]?.updatedAt ? new Date(sites[0].updatedAt).toLocaleString() : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedSite(null)}
          disabled={!selectedSite}
          className="text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-default transition"
        >
          ← All sites
        </button>
      </div>

      {/* Site cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {sites.map(site => {
          const s = site.summary7d;
          const s30 = site.summary30d;
          const isSelected = selectedSite === site.name;
          return (
            <button
              type="button"
              key={site.name}
              onClick={() => setSelectedSite(isSelected ? null : site.name)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-zinc-500 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{EMOJIS[site.name]}</span>
                <span className="text-sm font-medium truncate">{site.name}</span>
              </div>
              <div className="text-2xl font-semibold">{formatNumber(s.sessions)}</div>
              <div className="text-xs text-zinc-500 mt-1">sessions (7d)</div>
              <div className="flex gap-3 mt-2 text-xs text-zinc-400">
                <span>{formatNumber(s30.sessions)}/30d</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trend chart */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">
          {active ? `${active.name} — Sessions (30d)` : "Sessions Overview (30d)"}
        </h2>
        <div className="h-[280px]">
          <Line data={overviewChartData} options={chartOptions} />
        </div>
      </div>

      {/* Detail panels for selected site */}
      {active && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Summary */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">7-Day Summary</h3>
            <div className="space-y-3">
              {[
                ["Sessions", formatNumber(active.summary7d.sessions)],
                ["Users", formatNumber(active.summary7d.users)],
                ["Page Views", formatNumber(active.summary7d.pageViews)],
                ["Avg. Session", formatDuration(active.summary7d.avgSessionDuration)],
                ["Bounce Rate", `${active.summary7d.bounceRate}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-zinc-500 text-sm">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Sources (7d)</h3>
            <div className="space-y-2">
              {active.sources.map((s, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm truncate mr-2">{s.dimensions[0]}</span>
                  <span className="text-sm text-zinc-400 whitespace-nowrap">{formatNumber(parseInt(s.metrics[0]))}</span>
                </div>
              ))}
              {active.sources.length === 0 && <p className="text-zinc-600 text-sm">No data</p>}
            </div>
          </div>

          {/* Countries */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Countries (7d)</h3>
            {active.countries.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-36 h-36">
                  <Doughnut
                    data={{
                      labels: active.countries.map(c => c.dimensions[0]),
                      datasets: [{
                        data: active.countries.map(c => parseInt(c.metrics[0])),
                        backgroundColor: [
                          "rgb(239,68,68)", "rgb(59,130,246)", "rgb(34,197,94)", "rgb(251,191,36)",
                          "rgb(168,85,247)", "rgb(236,72,153)", "rgb(20,184,166)", "rgb(249,115,22)",
                          "rgb(99,102,241)", "rgb(163,230,53)",
                        ],
                        borderWidth: 0,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: "rgba(24,24,27,0.95)", titleColor: "#f4f4f5", bodyColor: "#a1a1aa" },
                      },
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  {active.countries.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{c.dimensions[0]}</span>
                      <span>{formatNumber(parseInt(c.metrics[0]))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">No data</p>
            )}
          </div>

          {/* Top Pages */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 md:col-span-2">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Pages (7d)</h3>
            <div className="space-y-2">
              {active.topPages.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm font-mono text-zinc-400 truncate mr-4">{p.dimensions[0]}</span>
                  <span className="text-sm whitespace-nowrap">{formatNumber(parseInt(p.metrics[0]))} views</span>
                </div>
              ))}
              {active.topPages.length === 0 && <p className="text-zinc-600 text-sm">No data</p>}
            </div>
          </div>
        </div>
      )}

      {/* Additional sites as small pills */}
      <div className="mt-12">
        <h3 className="text-sm font-medium text-zinc-500 mb-3">Other projects</h3>
        <div className="flex flex-wrap gap-2">
          {allSites
            .filter(s => !sites.map(s => s.name).includes(s.name))
            .map(site => {
              const isSelected = selectedSite === site.name;
              return (
                <button
                  type="button"
                  key={site.name}
                  onClick={() => setSelectedSite(isSelected ? null : site.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                    isSelected
                      ? "border-zinc-500 bg-zinc-800 text-zinc-200"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  <span>{EMOJIS[site.name] || "•"}</span>
                  <span>{site.name}</span>
                  <span className="text-zinc-500">({site.summary7d.sessions})</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-zinc-600 mt-8 pb-8">
        Updated daily via GitHub Actions · Data from Google Analytics 4
      </div>
    </div>
  );
}
