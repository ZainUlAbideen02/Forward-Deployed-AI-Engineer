"use client";

import React, { useState } from "react";
import { Code2, Copy, Check, ChevronDown, ChevronUp, Terminal, HelpCircle } from "lucide-react";
import { SQLGenerationOutput } from "@/types";

interface SQLViewerProps {
  generation: SQLGenerationOutput;
}

export const SQLViewer: React.FC<SQLViewerProps> = ({ generation }) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generation.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getComplexityBadge = (complexity: string) => {
    switch (complexity) {
      case "simple":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "medium":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "complex":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Generated SQL Inspector</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Complexity badge */}
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${getComplexityBadge(
              generation.estimated_complexity
            )}`}
          >
            {generation.estimated_complexity} complexity
          </span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            title="Copy SQL to clipboard"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-3.5">
          {/* SQL Code Box */}
          <div className="relative">
            <pre className="p-4 rounded-xl bg-[#070b14] border border-slate-800 font-mono text-xs sm:text-sm text-sky-200 overflow-x-auto leading-relaxed shadow-inner">
              <code>{generation.sql}</code>
            </pre>
          </div>

          {/* Explanation Box */}
          {generation.explanation && (
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                <span>Query Rationale & Strategy:</span>
              </div>
              <p className="leading-relaxed text-slate-300">{generation.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
