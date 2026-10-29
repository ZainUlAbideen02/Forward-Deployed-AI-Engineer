"use client";

import React, { useState } from "react";
import { Sparkles, Play, ShieldAlert, ArrowRight, CornerDownLeft, Loader2, Database } from "lucide-react";

interface QueryInputProps {
  onSubmit: (query: string, contextHints?: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_QUERIES = [
  {
    label: "Top 5 Organizations by Spend",
    query: "List top 5 organizations by monthly spend",
    isMalicious: false,
  },
  {
    label: "Active Subscriptions (90d)",
    query: "Show active subscriptions expiring in the next 90 days",
    isMalicious: false,
  },
  {
    label: "Users by RBAC Role",
    query: "Count of users grouped by RBAC role",
    isMalicious: false,
  },
  {
    label: "DEFENSE AUDIT: Delete Inactive Users",
    query: "MALICIOUS TEST: Delete all users where is_active is false",
    isMalicious: true,
  },
];

export const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState("");
  const [contextHints, setContextHints] = useState("");
  const [showHints, setShowHints] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim(), contextHints.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPreset = (presetQuery: string) => {
    setQuery(presetQuery);
    onSubmit(presetQuery, contextHints.trim() || undefined);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Title & Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Natural Language Business Query</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowHints(!showHints)}
          className="text-xs text-slate-400 hover:text-sky-400 transition-colors"
        >
          {showHints ? "Hide Context Hints" : "+ Add Context Hints"}
        </button>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about enterprise organizations, users, subscriptions, or audit logs..."
            rows={3}
            disabled={isLoading}
            className="w-full bg-[#0b1120] text-slate-100 placeholder-slate-500 text-sm rounded-xl p-3.5 border border-slate-800 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none resize-none transition-all disabled:opacity-50"
          />

          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg font-medium text-xs shadow-md shadow-sky-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Run Query</span>
                  <CornerDownLeft className="h-3 w-3 opacity-60 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Context Hints */}
        {showHints && (
          <div className="pt-1">
            <input
              type="text"
              value={contextHints}
              onChange={(e) => setContextHints(e.target.value)}
              placeholder="e.g. Prefer joining on subscriptions.status = 'active', exclude test accounts"
              className="w-full bg-[#0b1120] text-slate-200 placeholder-slate-500 text-xs rounded-lg px-3 py-2 border border-slate-800 focus:border-sky-500/50 outline-none"
            />
          </div>
        )}
      </form>

      {/* Pipeline Status Indicator during loading */}
      {isLoading && (
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-sky-500/20 text-xs text-slate-300">
          <div className="flex items-center gap-2 mb-2 font-medium text-sky-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>FDE Production Pipeline in Progress:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>1. Schema Catalog</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-ping"></span>
              <span>2. LLM Synthesis</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span>3. AST Guardrail</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span>4. Sandbox Exec</span>
            </div>
          </div>
        </div>
      )}

      {/* Preset Chips */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] font-medium text-slate-400 block mb-2">
          Enterprise Preset Prompts:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset.query)}
              disabled={isLoading}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                preset.isMalicious
                  ? "bg-rose-950/30 border-rose-800/50 text-rose-300 hover:bg-rose-900/40 hover:border-rose-600"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/60 hover:border-slate-600 hover:text-white"
              }`}
            >
              {preset.isMalicious ? (
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
              ) : (
                <ArrowRight className="h-3 w-3 text-sky-400 flex-shrink-0" />
              )}
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
