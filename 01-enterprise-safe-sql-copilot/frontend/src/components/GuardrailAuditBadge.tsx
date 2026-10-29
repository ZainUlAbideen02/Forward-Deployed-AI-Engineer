"use client";

import React from "react";

interface GuardrailAuditBadgeProps {
  isSafe: boolean;
  reason?: string | null;
  tablesUsed?: string[];
  complexity?: string;
}

export const GuardrailAuditBadge: React.FC<GuardrailAuditBadgeProps> = ({
  isSafe,
  reason,
  tablesUsed = [],
  complexity,
}) => {
  if (isSafe) {
    return (
      <div className="border border-black bg-white p-4 rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black pb-2.5 mb-3">
          <div className="font-mono text-xs font-bold text-black uppercase tracking-wider">
            [AST AUDIT: PASSED // SAFE]
          </div>
          <span className="font-mono text-[10px] text-neutral-500 uppercase">
            STATUS: 100% READ_ONLY
          </span>
        </div>

        {/* Tabular Audit Invariants */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
          <div className="border border-neutral-200 bg-neutral-50 p-2">
            <span className="text-[10px] text-neutral-500 block uppercase">ROOT EXPR</span>
            <span className="font-bold text-black">sqlglot.exp.Select</span>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-2">
            <span className="text-[10px] text-neutral-500 block uppercase">MULTI-STATEMENT</span>
            <span className="font-bold text-black">PASSED (SINGLE)</span>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-2">
            <span className="text-[10px] text-neutral-500 block uppercase">DML/DDL SCAN</span>
            <span className="font-bold text-black">BLOCKED (ZERO WRITE)</span>
          </div>
        </div>

        {/* Audited Tables */}
        {tablesUsed.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-neutral-200 flex items-center gap-2 font-mono text-xs">
            <span className="text-neutral-500 text-[10px] uppercase font-bold">AUDITED TABLES:</span>
            <div className="flex flex-wrap gap-1">
              {tablesUsed.map((tbl, idx) => (
                <span
                  key={idx}
                  className="border border-black bg-white px-1.5 py-0.5 text-[11px] font-bold"
                >
                  {tbl}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // REJECTED STATE: High-contrast solid black container with crisp white typography
  return (
    <div className="border-2 border-black bg-black text-white p-4 rounded-none">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-2.5 mb-3 flex items-center justify-between">
        <div className="font-mono text-xs font-bold text-white uppercase tracking-wider">
          [SECURITY INTERCEPTION: QUERY ABORTED]
        </div>
        <span className="font-mono text-[10px] bg-white text-black px-1.5 py-0.5 font-bold uppercase">
          BLOCKED
        </span>
      </div>

      <p className="font-mono text-[11px] text-neutral-300 mb-3 uppercase">
        AST verification failure. Execution terminated in-memory prior to database execution.
      </p>

      {/* Violation Details */}
      <div className="border border-neutral-700 bg-neutral-900 p-3 font-mono text-xs text-neutral-100">
        <span className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
          INTERCEPTION REASON:
        </span>
        <div className="text-red-400 font-bold leading-relaxed break-words">
          {reason || "Forbidden AST statement type detected."}
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-neutral-800 font-mono text-[10px] text-neutral-400 uppercase">
        GUARANTEE: ZERO WRITE REQUESTS REACHED POSTGRESQL.
      </div>
    </div>
  );
};
