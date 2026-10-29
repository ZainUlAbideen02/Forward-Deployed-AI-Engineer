"use client";

import React, { useState } from "react";
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

// Strict monochrome / grayscale shades for charts
const MONO_CHART_COLORS = ["#000000", "#52525b", "#a1a1aa", "#27272a", "#71717a", "#d4d4d8"];

export const ResultsVisualizer: React.FC<ResultsVisualizerProps> = ({
  result,
  suggestedVisualization = "table",
}) => {
  const [activeTab, setActiveTab] = useState<"table" | "chart">(
    suggestedVisualization === "table" ? "table" : "chart"
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;

  if (!result.success) {
    return (
      <div className="border border-black bg-white p-5 rounded-none font-mono">
        <div className="border-b border-black pb-2 mb-3 font-bold text-xs uppercase text-red-600">
          [EXECUTION HALTED // DATABASE REPORT]
        </div>
        <p className="text-xs text-neutral-600 mb-2">The database returned an error or aborted the transaction:</p>
        <div className="border border-black bg-neutral-100 p-3 text-xs text-black break-words leading-relaxed">
          {result.error || "No result data available."}
        </div>
      </div>
    );
  }

  const { rows, columns, row_count, execution_time_ms } = result;

  if (row_count === 0) {
    return (
      <div className="border border-black bg-white p-6 text-center font-mono rounded-none">
        <span className="font-bold text-xs uppercase block text-black">
          [ZERO RECORDS RETURNED]
        </span>
        <span className="text-[11px] text-neutral-500 mt-1 block">
          Execution duration: {execution_time_ms}ms. Query satisfied read-only invariants.
        </span>
      </div>
    );
  }

  const sampleRow = rows[0] || {};
  const numericKeys = columns.filter((col) => typeof sampleRow[col] === "number");
  const categoricalKeys = columns.filter((col) => typeof sampleRow[col] === "string");

  const xKey = categoricalKeys[0] || columns[0];
  const yKey = numericKeys[0] || columns[1] || columns[0];

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return <span className="text-neutral-400">NULL</span>;
    if (typeof val === "number") {
      if (key.toLowerCase().includes("spend") || key.toLowerCase().includes("cost")) {
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return val.toLocaleString();
    }
    if (typeof val === "boolean") {
      return val ? "TRUE" : "FALSE";
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
    <div className="border border-black bg-white rounded-none">
      {/* Visualizer Top Bar */}
      <div className="px-4 py-2.5 border-b border-black bg-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab("table")}
              className={`font-mono text-xs uppercase px-3 py-1 font-bold border border-black transition-colors ${
                activeTab === "table" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              [TABLE]
            </button>
            <button
              onClick={() => setActiveTab("chart")}
              className={`font-mono text-xs uppercase px-3 py-1 font-bold border-t border-b border-r border-black transition-colors ${
                activeTab === "chart" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              [CHART]
            </button>
          </div>

          <span className="font-mono text-xs text-black border border-black bg-neutral-100 px-2 py-1 font-bold">
            {row_count} ROWS // {execution_time_ms}ms
          </span>
        </div>

        <button
          onClick={handleExportCSV}
          title="Export CSV"
          className="border border-black bg-white hover:bg-black hover:text-white px-2.5 py-1 text-xs font-mono uppercase font-bold transition-colors"
        >
          [EXPORT CSV]
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === "table" ? (
          /* Table View: High density spreadsheet */
          <div className="space-y-3">
            <div className="overflow-x-auto border border-black">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    {columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="border border-black px-3 py-2 text-[11px] uppercase font-bold tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                    >
                      {columns.map((col, cIdx) => (
                        <td
                          key={cIdx}
                          className="border border-neutral-200 px-3 py-1.5 whitespace-nowrap text-xs text-black"
                        >
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
              <div className="flex items-center justify-between font-mono text-xs pt-1">
                <span className="text-neutral-500 uppercase">
                  PAGE {page} OF {totalPages} ({rows.length} TOTAL ROWS)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border border-black bg-white px-2 py-0.5 uppercase font-bold disabled:opacity-30 hover:bg-black hover:text-white"
                  >
                    [PREV]
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="border border-black bg-white px-2 py-0.5 uppercase font-bold disabled:opacity-30 hover:bg-black hover:text-white"
                  >
                    [NEXT]
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Chart View: Strict Monochrome Visualizations */
          <div className="py-2">
            {suggestedVisualization === "metric" || (rows.length === 1 && columns.length === 1) ? (
              /* Single Metric Card */
              <div className="border border-black bg-white p-6 max-w-sm mx-auto text-center font-mono">
                <span className="text-[11px] uppercase text-neutral-500 font-bold block mb-1">
                  {columns[0]}
                </span>
                <div className="text-4xl font-extrabold text-black tracking-tight">
                  {formatCellValue(columns[0], rows[0][columns[0]])}
                </div>
                <span className="text-[10px] text-neutral-500 uppercase mt-2 block">
                  MEASURED LIVE // POSTGRESQL 16
                </span>
              </div>
            ) : suggestedVisualization === "line" ? (
              /* Line Chart */
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" />
                    <XAxis
                      dataKey={xKey}
                      stroke="#000000"
                      fontSize={11}
                      tickLine={true}
                      tick={{ fill: "#000000", fontFamily: "monospace" }}
                    />
                    <YAxis
                      stroke="#000000"
                      fontSize={11}
                      tickLine={true}
                      tick={{ fill: "#000000", fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#000000",
                        borderRadius: 0,
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={yKey}
                      stroke="#000000"
                      strokeWidth={2}
                      dot={{ fill: "#000000", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : suggestedVisualization === "pie" && rows.length <= 10 ? (
              /* Pie Chart */
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#000000",
                        borderRadius: 0,
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Pie
                      data={rows}
                      dataKey={yKey}
                      nameKey={xKey}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      stroke="#000000"
                      label
                    >
                      {rows.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MONO_CHART_COLORS[index % MONO_CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Default Monochrome Bar Chart */
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows.slice(0, 20)} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#e4e4e7" />
                    <XAxis
                      dataKey={xKey}
                      stroke="#000000"
                      fontSize={11}
                      tickLine={true}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tick={{ fill: "#000000", fontFamily: "monospace" }}
                    />
                    <YAxis
                      stroke="#000000"
                      fontSize={11}
                      tickLine={true}
                      tick={{ fill: "#000000", fontFamily: "monospace" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#000000",
                        borderRadius: 0,
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    />
                    <Bar dataKey={yKey} fill="#000000" radius={[0, 0, 0, 0]} />
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
