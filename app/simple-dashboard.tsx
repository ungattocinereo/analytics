"use client";

import { useState } from "react";
import type { SiteData } from "./types";

interface SimpleDashboardProps {
  initialSites: Record<string, SiteData>;
  initialAllSites: Record<string, SiteData>;
}

export default function SimpleDashboard({ initialSites, initialAllSites }: SimpleDashboardProps) {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const sites = Object.values(initialSites);
  const allSites = Object.values(initialAllSites);
  const active = selectedSite ? initialAllSites[selectedSite] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-8">Analytics</h1>

      {/* Site cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {sites.map(site => {
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
              <div className="text-sm font-medium truncate mb-2">{site.name}</div>
              <div className="text-2xl font-semibold">{site.summary7d.sessions.toLocaleString()}</div>
              <div className="text-xs text-zinc-500 mt-1">sessions (7d)</div>
            </button>
          );
        })}
      </div>

      {/* Selected site details */}
      {active && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 mb-8">
          <h2 className="text-lg font-medium mb-4">{active.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-zinc-500 text-sm">Sessions (7d)</div>
              <div className="text-2xl font-semibold">{active.summary7d.sessions.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Users (7d)</div>
              <div className="text-2xl font-semibold">{active.summary7d.users.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Page Views (7d)</div>
              <div className="text-2xl font-semibold">{active.summary7d.pageViews.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-sm">Bounce Rate</div>
              <div className="text-2xl font-semibold">{active.summary7d.bounceRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Other projects */}
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
                  <span>{site.name}</span>
                  <span className="text-zinc-500">({site.summary7d.sessions})</span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="text-center text-xs text-zinc-600 mt-8 pb-8">
        Updated daily via GitHub Actions · Data from Google Analytics 4
      </div>
    </div>
  );
}
