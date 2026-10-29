"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { QueryInput } from "@/components/QueryInput";
import { GuardrailAuditBadge } from "@/components/GuardrailAuditBadge";
import { SQLViewer } from "@/components/SQLViewer";
import { ResultsVisualizer } from "@/components/ResultsVisualizer";
import { TelemetryWaterfall } from "@/components/TelemetryWaterfall";
import { CopilotResponse } from "@/types";

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
          errorData.detail || `Server status ${response.status} (${response.statusText})`
        );
      }

      const data: CopilotResponse = await response.json();
      setCopilotResponse(data);
    } catch (err: any) {
      console.error("Copilot query execution failed:", err);
      setErrorMessage(
        err.message ||
          "Failed to connect to Copilot backend. Ensure 'safe-sql-backend' is online at " + apiBaseUrl
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Console Top-Bar Header */}
      <Header apiBaseUrl={apiBaseUrl} />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Network / Connection Error Banner */}
        {errorMessage && (
          <div className="border-2 border-black bg-neutral-100 p-4 font-mono text-xs flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-red-600 uppercase block mb-0.5">
                [API COMMUNICATION HALTED]
              </span>
              <span className="text-black">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="border border-black bg-white hover:bg-black hover:text-white px-2 py-1 uppercase font-bold text-[11px]"
            >
              [DISMISS]
            </button>
          </div>
        )}

        {/* Responsive Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input, Guardrail Verdict, Telemetry */}
          <div className="lg:col-span-5 space-y-5">
            <QueryInput onSubmit={handleRunQuery} isLoading={isLoading} />

            {copilotResponse && (
              <GuardrailAuditBadge
                isSafe={copilotResponse.guardrail_safe}
                reason={copilotResponse.guardrail_reason}
                tablesUsed={copilotResponse.generation.tables_used}
                complexity={copilotResponse.generation.estimated_complexity}
              />
            )}

            {copilotResponse && (
              <TelemetryWaterfall latency={copilotResponse.latency} />
            )}
          </div>

          {/* Right Column: SQL Inspector & Spreadsheet / Chart Visualizer */}
          <div className="lg:col-span-7 space-y-5">
            {copilotResponse ? (
              <>
                <SQLViewer generation={copilotResponse.generation} />
                <ResultsVisualizer
                  result={copilotResponse.execution}
                  suggestedVisualization={copilotResponse.suggested_visualization}
                />
              </>
            ) : (
              /* High-Contrast Awaiting Input State */
              <div className="border border-black bg-white p-6 font-mono space-y-4">
                <div className="border-b border-black pb-2.5 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-black">
                    SYSTEM_READY // AWAITING QUERY INPUT
                  </span>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    POSTGRES_DIALECT: V16
                  </span>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed">
                  Enter an analytical business prompt or select an enterprise preset on the left.
                  Queries pass through live system catalog introspection, structured AST inspection,
                  and sandboxed transaction execution.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="border border-black bg-neutral-50 p-3">
                    <span className="font-bold block uppercase mb-1">[01_CATALOG]</span>
                    <span className="text-neutral-600">
                      information_schema introspection with 10-minute cache TTL.
                    </span>
                  </div>
                  <div className="border border-black bg-neutral-50 p-3">
                    <span className="font-bold block uppercase mb-1">[02_GUARDRAIL]</span>
                    <span className="text-neutral-600">
                      sqlglot AST inspection blocks DDL, DML, and injection delimiters.
                    </span>
                  </div>
                  <div className="border border-black bg-neutral-50 p-3">
                    <span className="font-bold block uppercase mb-1">[03_SANDBOX]</span>
                    <span className="text-neutral-600">
                      Executed under readonly_analyst with 2500ms statement timeout.
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-neutral-500 uppercase border-t border-neutral-200">
                  DEFENSIVE ARCHITECTURE: ZERO WRITE CAPABILITIES EXPOSED TO MODEL OUTPUT.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Engineering Footer */}
      <footer className="border-t border-black bg-white py-3 text-center text-xs font-mono text-black">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SAFE-SQL GATEWAY // PRODUCTION ARCHITECTURE</span>
          <span className="text-neutral-500 text-[11px]">
            POSTGRESQL 16 • FASTAPI • NEXT.JS 14 • SQLGLOT
          </span>
        </div>
      </footer>
    </div>
  );
}
