"use client";

import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, Database, Server, RefreshCw, Cpu } from "lucide-react";
import { HealthStatus } from "@/types";

interface HeaderProps {
  apiBaseUrl: string;
}

export const Header: React.FC<HeaderProps> = ({ apiBaseUrl }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchHealth = async () => {
    try {
      setIsRefreshing(true);
      // Health is at the root /health endpoint of the backend
      const rootUrl = apiBaseUrl.replace("/api/v1", "");
      const res = await fetch(`${rootUrl}/health`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  return (
    <header className="border-b border-slate-800 bg-[#0b1120]/80 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="h-full w-full bg-[#0b1120] rounded-[10px] flex items-center justify-center">
              <Shield className="h-5 w-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Enterprise Safe SQL Copilot
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v0.2.0 FDE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AST Security Guardrail • Sandboxed PostgreSQL • Telemetry Pipeline
            </p>
          </div>
        </div>

        {/* Cockpit Status Metrics */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Active Role Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">DB Role:</span>
            <code className="text-emerald-400 font-mono font-semibold">readonly_analyst</code>
          </div>

          {/* Database Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 shadow-sm">
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Postgres 16:</span>
            {loading ? (
              <span className="text-slate-500 animate-pulse">checking...</span>
            ) : health ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                offline / mock
              </span>
            )}
          </div>

          {/* API Backend Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 shadow-sm">
            <Server className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-slate-400 font-medium">API:</span>
            {loading ? (
              <span className="text-slate-500 animate-pulse">polling...</span>
            ) : health ? (
              <span className="text-sky-400 font-medium">operational</span>
            ) : (
              <span className="text-rose-400 font-medium">offline</span>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={fetchHealth}
            disabled={isRefreshing}
            title="Refresh health status"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
