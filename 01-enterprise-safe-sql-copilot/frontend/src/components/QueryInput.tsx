"use client";

import React, { useState } from "react";

interface QueryInputProps {
  onSubmit: (query: string, contextHints?: string) => Promise<void>;
  isLoading: boolean;
}

const PRESET_QUERIES = [
  {
    label: "[01] TOP 5 ORGS BY SPEND",
    query: "List top 5 organizations by monthly spend",
    isMalicious: false,
  },
  {
    label: "[02] SUBSCRIPTIONS (EXPIRING 90D)",
    query: "Show active subscriptions expiring in the next 90 days",
    isMalicious: false,
  },
  {
    label: "[03] USERS GROUPED BY ROLE",
    query: "Count of users grouped by RBAC role",
    isMalicious: false,
  },
  {
    label: "[!] MALICIOUS INJECTION AUDIT",
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
    <div className="border border-black bg-white p-5 rounded-none">
      {/* Title Bar */}
      <div className="flex items-center justify-between mb-3 border-b border-black pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
            INPUT // NATURAL LANGUAGE QUERY
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowHints(!showHints)}
          className="font-mono text-[11px] text-neutral-600 hover:text-black uppercase underline decoration-1"
        >
          {showHints ? "[-] HIDE CONTEXT" : "[+] ADD CONTEXT HINTS"}
        </button>
      </div>

      {/* Query Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type business query (e.g., 'Summarize monthly spend across tiers')..."
            rows={3}
            disabled={isLoading}
            className="w-full bg-white text-black placeholder-neutral-400 font-mono text-xs sm:text-sm p-3 border border-black focus:outline-none focus:ring-0 focus:border-black rounded-none resize-none leading-relaxed disabled:opacity-50"
          />

          {showHints && (
            <input
              type="text"
              value={contextHints}
              onChange={(e) => setContextHints(e.target.value)}
              placeholder="CONTEXT HINTS: e.g. 'join on subscriptions, status = active'"
              className="w-full bg-neutral-50 text-black placeholder-neutral-400 font-mono text-xs p-2 border border-black focus:outline-none rounded-none"
            />
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed px-4 py-2 font-mono uppercase text-xs tracking-wider font-bold rounded-none border border-black transition-colors"
            >
              {isLoading ? "EXECUTING PIPELINE..." : "EXECUTE QUERY ->"}
            </button>
          </div>
        </div>
      </form>

      {/* Pipeline Status Indicator */}
      {isLoading && (
        <div className="mt-4 p-3 border border-black bg-neutral-50 font-mono text-xs">
          <div className="font-bold text-black uppercase mb-2 tracking-wider">
            [FDE PIPELINE IN PROGRESS]
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="border border-black bg-white p-2">
              <span className="block text-neutral-500 font-normal">01_CATALOG</span>
              <span className="font-bold">INTROSPECT</span>
            </div>
            <div className="border border-black bg-white p-2">
              <span className="block text-neutral-500 font-normal">02_LLM</span>
              <span className="font-bold">SYNTHESIZE</span>
            </div>
            <div className="border border-black bg-white p-2">
              <span className="block text-neutral-500 font-normal">03_GUARDRAIL</span>
              <span className="font-bold">AST_VERIFY</span>
            </div>
            <div className="border border-black bg-white p-2">
              <span className="block text-neutral-500 font-normal">04_SANDBOX</span>
              <span className="font-bold">EXECUTE</span>
            </div>
          </div>
        </div>
      )}

      {/* Preset Chips */}
      <div className="mt-4 pt-3 border-t border-black">
        <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
          PRESET PROMPTS:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset.query)}
              disabled={isLoading}
              className={`text-[11px] font-mono uppercase px-2 py-1 rounded-none transition-colors border ${
                preset.isMalicious
                  ? "border-black bg-neutral-100 hover:bg-black hover:text-white font-bold"
                  : "border-neutral-300 hover:border-black hover:bg-neutral-100 text-black"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
