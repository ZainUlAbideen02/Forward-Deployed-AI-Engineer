"use client";

import React, { useEffect, useState } from "react";
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
    <header className="border-b border-black bg-white sticky top-0 z-50 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* System Title */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-black flex-shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-bold text-sm tracking-tight text-black uppercase">
              SAFE-SQL // ENTERPRISE GATEWAY
            </span>
            <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
              [DEFENSE-IN-DEPTH]
            </span>
          </div>
        </div>

        {/* Technical Instrument Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="border border-black bg-white px-2 py-1 text-black">
            <span className="text-neutral-500 mr-1.5 font-normal">ROLE:</span>
            <span className="font-bold">readonly_analyst</span>
          </div>

          <div className="border border-black bg-white px-2 py-1 text-black">
            <span className="text-neutral-500 mr-1.5 font-normal">POSTGRES:</span>
            {loading ? (
              <span className="text-neutral-500">POLLING...</span>
            ) : health ? (
              <span className="font-bold">● ONLINE</span>
            ) : (
              <span className="text-neutral-500">○ OFFLINE</span>
            )}
          </div>

          <div className="border border-black bg-white px-2 py-1 text-black">
            <span className="text-neutral-500 mr-1.5 font-normal">API:</span>
            {loading ? (
              <span className="text-neutral-500">POLLING...</span>
            ) : health ? (
              <span className="font-bold">● 200_OK</span>
            ) : (
              <span className="font-bold text-red-600">○ 503_DOWN</span>
            )}
          </div>

          <button
            onClick={fetchHealth}
            disabled={isRefreshing}
            title="Refresh status"
            className="border border-black bg-white hover:bg-black hover:text-white px-2.5 py-1 transition-colors uppercase font-bold"
          >
            {isRefreshing ? "[REFRESHING]" : "[SYNC]"}
          </button>
        </div>
      </div>
    </header>
  );
};
