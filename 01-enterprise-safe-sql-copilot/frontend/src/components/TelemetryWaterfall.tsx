"use client";

import React from "react";
import { Gauge, Clock, Cpu, ShieldCheck, Database, Zap } from "lucide-react";
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
    return Math.max(3, Math.min(100, Math.round((ms / sumMs) * 100)));
  };

  const stages = [
    {
      name: "Schema Introspection",
      ms: schema_introspection_ms,
      color: "bg-emerald-500",
      textColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      icon: Database,
    },
    {
      name: "LLM Generation",
      ms: llm_generation_ms,
      color: "bg-sky-500",
      textColor: "text-sky-400",
      borderColor: "border-sky-500/20",
      icon: Cpu,
    },
    {
      name: "AST Guardrail",
      ms: guardrail_validation_ms,
      color: "bg-indigo-500",
      textColor: "text-indigo-400",
      borderColor: "border-indigo-500/20",
      icon: ShieldCheck,
    },
    {
      name: "Sandboxed Exec",
      ms: sandboxed_execution_ms,
      color: "bg-amber-500",
      textColor: "text-amber-400",
      borderColor: "border-amber-500/20",
      icon: Zap,
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Pipeline Telemetry & Latency Waterfall
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-medium">
          <Clock className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-slate-400">Total:</span>
          <span className="text-white font-bold">{total_pipeline_ms}ms</span>
        </div>
      </div>

      {/* Segmented Horizontal Progress Bar */}
      <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800/80 mb-3.5">
        {stages.map((stage, idx) => (
          <div
            key={idx}
            style={{ width: `${getPercent(stage.ms)}%` }}
            title={`${stage.name}: ${stage.ms}ms`}
            className={`h-full ${stage.color} first:rounded-l-full last:rounded-r-full transition-all duration-500`}
          />
        ))}
      </div>

      {/* Stage Detail Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl bg-slate-950/50 border ${stage.borderColor} flex flex-col justify-between`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                <Icon className={`h-3.5 w-3.5 ${stage.textColor}`} />
                <span className="truncate">{stage.name}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-sm font-bold font-mono ${stage.textColor}`}>
                  {stage.ms}
                  <span className="text-[10px] font-normal text-slate-500 ml-0.5">ms</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {Math.round((stage.ms / sumMs) * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
