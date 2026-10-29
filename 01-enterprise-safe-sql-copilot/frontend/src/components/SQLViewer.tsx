"use client";

import React, { useState } from "react";
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
      // Clipboard fallback
    }
  };

  return (
    <div className="border border-black bg-white rounded-none">
      {/* Inspector Top Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-black flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
            SYNTHESIZED SQL // INSPECTOR
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Complexity Badge */}
          <span className="border border-black bg-neutral-100 text-black px-2 py-0.5 text-xs font-mono uppercase font-bold">
            [{generation.estimated_complexity}]
          </span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy SQL to clipboard"
            className="border border-black bg-white hover:bg-black hover:text-white px-2.5 py-0.5 text-xs font-mono uppercase font-bold transition-colors"
          >
            {copied ? "[COPIED]" : "[COPY SQL]"}
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="border border-black bg-white hover:bg-black hover:text-white px-2 py-0.5 text-xs font-mono transition-colors"
          >
            {isCollapsed ? "[EXPAND]" : "[COLLAPSE]"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* SQL Terminal Box */}
          <pre className="p-3.5 bg-neutral-50 border border-black font-mono text-xs sm:text-sm text-black overflow-x-auto leading-relaxed select-all">
            <code>{generation.sql}</code>
          </pre>

          {/* Explanation Box */}
          {generation.explanation && (
            <div className="p-3 bg-white border border-neutral-200 font-mono text-xs text-neutral-800 leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                QUERY LOGIC & RATIONALE:
              </span>
              <p>{generation.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
