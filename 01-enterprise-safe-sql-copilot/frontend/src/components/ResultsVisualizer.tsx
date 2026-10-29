"use client";

import React, { useState } from "react";
import {
  Table,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Hash,
  Download,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { QueryExecutionResult } from "@/types";

interface ResultsVisualizerProps {
  result: QueryExecutionResult;
  suggestedVisualization?: "table" | "bar" | "line" | "metric" | "pie";
}

const CHART_COLORS = ["#38bdf8", "#818cf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"];

export const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({
  result,
  suggestedVisualization = "table",
}) => {
  const [activeTab, setActiveTab] = useState<"table" | "chart">(
    suggestedVisualization === "table" ? "table" : "chart"
  );
  const [page, setPage] = useState(1);
  const pageSize = 8;

  if (!result.success) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="text-center py-6 text-slate-400">
          <p className="text-rose-400 font-semibold mb-1">Execution Aborted or Encountered an Error</p>
          <p className="text-xs font-mono text-slate-400 max-w-lg mx-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
            {result.error || "No result data available."}
          </p>
        </div>
      </div>
    );
  }

  const { rows, columns, row_count, execution_time_ms } = result;

  if (row_count === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm text-center py-10">
        <p className="text-slate-300 font-medium">0 rows returned</p>
        <p className="text-xs text-slate-500 mt-1">
          Query executed successfully in {execution_time_ms}ms, but no records matched the conditions.
        </p>
      </div>
    );
  }

  // Identify categorical and numeric fields for dynamic charting
  const sampleRow = rows[0] || {};
  const numericKeys = columns.filter((col) => typeof sampleRow[col] === "number");
  const categoricalKeys = columns.filter((col) => typeof sampleRow[col] === "string");

  const xKey = categoricalKeys[0] || columns[0];
  const yKey = numericKeys[0] || columns[1] || columns[0];

  // Pagination calculations
  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-600 italic">null</span>;
    if (typeof val === "number") {
      if (key.toLowerCase().includes("spend") || key.toLowerCase().includes("cost")) {
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return val.toLocaleString();
    }
    if (typeof val === "boolean") {
      return (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            val ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}
        >
          {val ? "true" : "false"}
        </span>
      );
    }
    return String(val);
  };

  const handleExportCSV = () => {
    if (!rows.length) return;
    const header = columns.join(",");
    const csvRows = rows.map((r) =>
      columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Header with View Tabs & Metrics */}
      <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Tab buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "table"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setActiveTab("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "chart"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Visualization</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
              {row_count} rows
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-mono font-medium">{execution_time_ms}ms</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExportCSV}
          title="Download as CSV"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="p-5">
        {activeTab === "table" ? (
          /* Table View */
          <div>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#070b14] uppercase text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3 tracking-wider">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {paginatedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                      {columns.map((col, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap font-mono text-[11px]">
                          {formatCellValue(col, row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, rows.length)} of{" "}
                  {rows.length} rows
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-mono text-slate-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Dynamic Chart View */
          <div className="py-2">
            {suggestedVisualization === "metric" || (rows.length === 1 && columns.length === 1) ? (
              /* Single Metric Card */
              <div className="p-8 rounded-2xl bg-gradient-to-tr from-slate-950 to-slate-900 border border-sky-500/30 text-center max-w-sm mx-auto shadow-2xl">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold block mb-2">
                  {columns[0]}
                </span>
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300 font-mono">
                  {formatCellValue(columns[0], rows[0][columns[0]])}
                </div>
                <span className="text-[11px] text-emerald-400 font-mono mt-3 inline-block">
                  ✓ Measured live from database
                </span>
              </div>
            ) : suggestedVisualization === "line" ? (
              /* Line Chart */
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={xKey}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1120",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={yKey}
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ fill: "#38bdf8", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : suggestedVisualization === "pie" && rows.length <= 10 ? (
              /* Pie Chart */
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1120",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Pie
                      data={rows}
                      dataKey={yKey}
                      nameKey={xKey}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {rows.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Default Bar Chart */
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.slice(0, 20)} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey={xKey}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1120",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey={yKey} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
