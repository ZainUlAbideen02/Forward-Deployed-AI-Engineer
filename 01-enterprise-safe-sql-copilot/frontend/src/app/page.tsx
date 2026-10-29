"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { QueryInput } from "@/components/QueryInput";
import { GuardrailAuditBadge } from "@/components/GuardrailAuditBadge";
import { SQLViewer } from "@/components/SQLViewer";
import { ResultsVisualizer } from "@/components/ResultsVisualizer";
import { TelemetryWaterfall } from "@/components/TelemetryWaterfall";
import { CopilotResponse } from "@/types";
import { Shield, Database, Lock, Server, Sparkles, Terminal } from "lucide-react";

export default function DashboardPage() {
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const handleRunQuery = async (query: string, contextHints?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/copilot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          context_hints: contextHints,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server responded with status ${response.status} (${response.statusText})`
        );
      }

      const data: CopilotResponse = await response.json();
      setCopilotResponse(data);
    } catch (err: any) {
      console.error("Copilot query execution failed:", err);
      setErrorMessage(
        err.message ||
          "Failed to connect to Copilot backend. Ensure 'safe-sql-backend' is running at " + apiBaseUrl
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Cockpit Header */}
      <Header apiBaseUrl={apiBaseUrl} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Network / Connection Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-rose-300">Backend Communication Issue</p>
                <p className="text-rose-200/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-700/50 text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Query Controls, Guardrail Status, Telemetry */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Natural Language Input */}
            <QueryInput onSubmit={handleRunQuery} isLoading={isLoading} />

            {/* 2. Guardrail Audit Badge */}
            {copilotResponse && (
              <GuardrailAuditBadge
                isSafe={copilotResponse.guardrail_safe}
                reason={copilotResponse.guardrail_reason}
                tablesUsed={copilotResponse.generation.tables_used}
                complexity={copilotResponse.generation.estimated_complexity}
              />
            )}

            {/* 3. Latency Waterfall */}
            {copilotResponse && (
              <TelemetryWaterfall latency={copilotResponse.latency} />
            )}
          </div>

          {/* Right Column: SQL Inspector & Results / Chart */}
          <div className="lg:col-span-7 space-y-5">
            {copilotResponse ? (
              <>
                {/* Generated SQL Inspector */}
                <SQLViewer generation={copilotResponse.generation} />

                {/* Results Table & Dynamic Recharts Visualization */}
                <ResultsVisualizer
                  result={copilotResponse.execution}
                  suggestedVisualization={copilotResponse.suggested_visualization}
                />
              </>
            ) : (
              /* Empty State / Welcome Guide */
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-6 shadow-xl backdrop-blur-sm">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-sky-400" />
                </div>

                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Forward Deployed AI SQL Copilot
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Translate business questions into production-safe SQL with live schema catalog
                    introspection, AST syntax enforcement, and sandboxed execution.
                  </p>
                </div>

                {/* Architecture Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-1">
                      <Database className="h-4 w-4" />
                      <span>Schema Catalog</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dynamic introspection of tables, foreign keys, and column constraints.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                      <Shield className="h-4 w-4" />
                      <span>AST Guardrail</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      sqlglot enforces strict read-only SELECT invariants and blocks injection.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                      <Lock className="h-4 w-4" />
                      <span>Least Privilege</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Executed via <code className="text-emerald-400">readonly_analyst</code> with 2500ms timeout.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Select an enterprise prompt from the left to start analyzing.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Enterprise Safe SQL Copilot • Production Reference Implementation</span>
          <span className="font-mono text-[11px] text-slate-400">
            PostgreSQL 16 • FastAPI • Next.js 14 • sqlglot • Recharts
          </span>
        </div>
      </footer>
    </div>
  );
}
