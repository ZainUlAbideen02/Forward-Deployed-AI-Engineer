"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Lock } from "lucide-react";

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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg shadow-emerald-950/10 backdrop-blur-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-emerald-400">
                  AST Security Guardrail Verified
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERDICT: SAFE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Query satisfies least-privilege read-only invariants. All AST security rules passed.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed audit checks */}
        <div className="mt-3 pt-3 border-t border-emerald-500/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>Root: <code className="text-emerald-400 font-mono">sqlglot.exp.Select</code></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>Multi-Statement: <span className="text-emerald-400 font-medium">PASSED</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>DML/DDL Tree Scan: <span className="text-emerald-400 font-medium">CLEAN</span></span>
          </div>
        </div>

        {/* Tables Used */}
        {tablesUsed.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Audited Tables:</span>
            <div className="flex flex-wrap gap-1">
              {tablesUsed.map((tbl, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono"
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

  // REJECTED STATE
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 shadow-xl shadow-rose-950/20 backdrop-blur-sm transition-all animate-shake">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-rose-400">
                Security Violation: AST Guardrail Intercepted
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                VERDICT: REJECTED
              </span>
            </div>
            <p className="text-xs text-rose-200/90 mt-0.5">
              Query aborted prior to database execution. The AST parser detected non-compliant or destructive syntax.
            </p>
          </div>
        </div>
      </div>

      {/* Violation Reason Card */}
      <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/40 text-xs">
        <div className="flex items-center gap-2 text-rose-300 font-semibold mb-1">
          <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>Interception Reason:</span>
        </div>
        <p className="text-rose-200/90 font-mono text-[11px] leading-relaxed break-words bg-slate-950/60 p-2 rounded border border-rose-900/50">
          {reason || "Potentially malicious or destructive SQL construct flagged by AST inspection."}
        </p>
      </div>

      {/* Protection guarantees */}
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
        <Lock className="h-3.5 w-3.5 text-emerald-400" />
        <span>Database state preserved. Zero write operations reached PostgreSQL.</span>
      </div>
    </div>
  );
};
