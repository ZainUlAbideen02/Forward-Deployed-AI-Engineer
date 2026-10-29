"use client";

import React from "react";
import { LatencyBreakdown } from "@/types";

interface TelemetryWaterfallProps {
  latency: LatencyBreakdown;
}

export const TelemetryWaterfall: React.FC<TelemetryWaterfallProps> = ({ latency }) => {
  const {
    schema_introspection_ms,
    llm_generation_ms,
    guardrail_validation_ms,
    sandboxed_execution_ms,
    total_pipeline_ms,
  } = latency;

  const sumMs =
    schema_introspection_ms +
    llm_generation_ms +
    guardrail_validation_ms +
    sandboxed_execution_ms || 1;

  const getPercent = (ms: number) => {
    return Math.max(2, Math.min(100, Math.round((ms / sumMs) * 100)));
  };

  const stages = [
    { code: "01_CATALOG", label: "SCHEMA INTROSPECTION", ms: schema_introspection_ms },
    { code: "02_SYNTHESIS", label: "LLM GENERATION", ms: llm_generation_ms },
    { code: "03_GUARDRAIL", label: "AST VALIDATION", ms: guardrail_validation_ms },
    { code: "04_SANDBOX", label: "TRANSACTION EXEC", ms: sandboxed_execution_ms },
  ];

  return (
    <div className="border border-black bg-white p-4 rounded-none font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black pb-2.5 mb-3 flex-wrap gap-2">
        <div className="font-mono text-xs font-bold uppercase tracking-wider text-black">
          TELEMETRY // PIPELINE INSTRUMENTATION
        </div>
        <div className="border border-black bg-black text-white px-2 py-0.5 text-xs font-bold">
          TOTAL: {total_pipeline_ms}ms
        </div>
      </div>

      {/* Stark Segmented Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {stages.map((stage, idx) => (
          <div key={idx} className="border border-black bg-neutral-50 p-2.5">
            <span className="text-[10px] text-neutral-500 font-bold block uppercase tracking-wider">
              [{stage.code}]
            </span>
            <span className="font-bold text-sm text-black block mt-0.5">
              {stage.ms}
              <span className="text-[10px] font-normal text-neutral-500 ml-0.5">ms</span>
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5 uppercase">
              {Math.round((stage.ms / sumMs) * 100)}% DURATION
            </span>
          </div>
        ))}
      </div>

      {/* Hardware-Style Precision Bar */}
      <div className="mt-3 border border-black p-0.5 bg-neutral-100 flex h-3">
        <div
          style={{ width: `${getPercent(schema_introspection_ms)}%` }}
          className="bg-neutral-400 border-r border-black"
          title={`Catalog: ${schema_introspection_ms}ms`}
        />
        <div
          style={{ width: `${getPercent(llm_generation_ms)}%` }}
          className="bg-black border-r border-black"
          title={`LLM: ${llm_generation_ms}ms`}
        />
        <div
          style={{ width: `${getPercent(guardrail_validation_ms)}%` }}
          className="bg-neutral-600 border-r border-black"
          title={`Guardrail: ${guardrail_validation_ms}ms`}
        />
        <div
          style={{ width: `${getPercent(sandboxed_execution_ms)}%` }}
          className="bg-neutral-800"
          title={`Sandbox: ${sandboxed_execution_ms}ms`}
        />
      </div>

      {/* Readout Subtext */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 uppercase">
        <span>TIMER: HIGH_RES_PERFCOUNTER</span>
        <span>SLA TARGET: &lt;500MS ROUNDTRIP</span>
      </div>
    </div>
  );
};
