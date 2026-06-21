/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { DailyLogEntry, CategoryBreakdown, Persona } from "../types";
import { TrendingDown, TreePine, AlertTriangle, List, Star, Zap, Leaf, Trash2, Bike, Utensils, Home, Flame, Inbox, Car, Download, FileText, LineChart } from "lucide-react";

interface DashboardStatsProps {
  vertical: Persona;
  baseline: CategoryBreakdown;
  logs: DailyLogEntry[];
  onRemoveLog: (id: string) => void;
}

export default function DashboardStats({ vertical, baseline, logs, onRemoveLog }: DashboardStatsProps) {
  // Let's analyze logs
  const totalLogs = logs.length;
  const currentLog = logs[0] || null; // standard today's entry

  // Computed averages over logged records
  const averageDailyEmissions = totalLogs > 0 
    ? logs.reduce((sum, l) => sum + l.actualEmissionsCo2e, 0) / totalLogs 
    : 0;

  const totalCarbonSaved = logs.reduce((sum, l) => sum + l.savedCo2e, 0);

  const baselineTotal = baseline.transport + baseline.food + baseline.energy + baseline.waste;

  // Slices for SVG donut
  const breakdown = currentLog 
    ? {
        transport: currentLog.milesDriven * 0.32 + currentLog.milesTransit * 0.08,
        // food logged or fallback
        food: currentLog.servingsRedMeat * 4.0 + currentLog.servingsPoultryFish * 1.3 + currentLog.mealsPlantBased * 0.5 + 0.8,
        energy: baseline.energy - (currentLog.shorterShowerDone ? 0.6 : 0) - (currentLog.thermostatOffsetUsed ? 1.25 : 0) - (currentLog.phantomPowerCut ? 0.35 : 0),
        waste: 1.8 - (currentLog.recycledFully ? 0.7 : 0) - (currentLog.compostedFully ? 0.4 : 0)
      } 
    : baseline;

  const calculatedTotal = breakdown.transport + breakdown.food + breakdown.energy + breakdown.waste;

  // Let's render a nice SVG Bar comparison
  const categories = [
    { name: "Transportation", val: breakdown.transport, base: baseline.transport, color: "bg-blue-500", svgColor: "#3b82f6", icon: <Bike className="h-4 w-4 text-blue-500 shrink-0" /> },
    { name: "Diet & Sourcing", val: breakdown.food, base: baseline.food, color: "bg-emerald-500", svgColor: "#10b981", icon: <Utensils className="h-4 w-4 text-emerald-500 shrink-0" /> },
    { name: "Home Energy", val: breakdown.energy, base: baseline.energy, color: "bg-amber-500", svgColor: "#f59e0b", icon: <Home className="h-4 w-4 text-amber-500 shrink-0" /> },
    { name: "Waste Disposal", val: breakdown.waste, base: baseline.waste, color: "bg-purple-500", svgColor: "#a855f7", icon: <Trash2 className="h-4 w-4 text-purple-500 shrink-0" /> }
  ];

  const savingsStatus = baselineTotal - averageDailyEmissions;

  // Get last 7 logs sorted chronologically for the trend line
  const trendLogs = [...logs]
    .slice(0, 7)
    .reverse(); // oldest first

  const maxValY = Math.max(15, ...trendLogs.map(l => l.actualEmissionsCo2e), baselineTotal);
  const yScaleMax = Math.ceil(maxValY / 5) * 5;
  
  const width = 600;
  const height = 240;
  const paddingLeft = 45;
  const paddingBottom = 35;
  const paddingTop = 20;
  const paddingRight = 20;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = trendLogs.map((log, idx) => {
    const x = paddingLeft + (idx * (chartWidth / Math.max(1, trendLogs.length - 1)));
    const y = height - paddingBottom - (log.actualEmissionsCo2e / yScaleMax) * chartHeight;
    return { x, y, value: log.actualEmissionsCo2e, date: log.date };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  // Baseline line Y position
  const baselineY = height - paddingBottom - (baselineTotal / yScaleMax) * chartHeight;

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Date", "Miles Driven", "Miles Transit", "Miles Active", "Red Meat Servings", "Poultry/Fish Servings", "Plant Meals", "Food Waste", "Shower Saved", "Temp Saved", "Vampire Saved", "Recycled", "Composted", "Emissions (kg CO2e)", "Saved (kg CO2e)"];
    const rows = logs.map(l => [
      l.date,
      l.milesDriven,
      l.milesTransit,
      l.milesBikedWalked,
      l.servingsRedMeat,
      l.servingsPoultryFish,
      l.mealsPlantBased,
      l.foodWastedScore,
      l.shorterShowerDone ? "Yes" : "No",
      l.thermostatOffsetUsed ? "Yes" : "No",
      l.phantomPowerCut ? "Yes" : "No",
      l.recycledFully ? "Yes" : "No",
      l.compostedFully ? "Yes" : "No",
      l.actualEmissionsCo2e.toFixed(2),
      l.savedCo2e.toFixed(2)
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ecotrace_carbon_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="dashboard-stats">
      
      {/* Dashboard Export and Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="text-left">
          <h2 className="text-xl font-display font-bold text-slate-800">Carbon Analytics Center</h2>
          <p className="text-xs text-slate-500">View real-time savings calculations and download footprint audits.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="h-4 w-4" />
            <span>Download PDF Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV Data</span>
          </button>
        </div>
      </div>
      
      {/* 4 Quick Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 bg-white rounded-xl border border-slate-100 text-left">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">Target Baseline</span>
          <span className="text-xl font-mono font-bold text-slate-700">{baselineTotal.toFixed(1)} kg</span>
          <div className="text-xs text-slate-400 mt-1">Daily global goal is &lt;5kg</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-100 text-left">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">Avg Today Logged</span>
          <span className="text-xl font-mono font-bold text-slate-700">
            {totalLogs > 0 ? `${averageDailyEmissions.toFixed(1)} kg` : "N/A"}
          </span>
          <div className="text-xs text-slate-400 mt-1">{totalLogs} days logged</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-100 text-left">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">Active Streak</span>
          <span className="text-xl font-mono font-bold text-emerald-600 flex items-center gap-1.5">
            {totalLogs > 0 ? (
              <>
                <Flame className="h-5 w-5 text-orange-500 fill-orange-500 animate-pulse shrink-0" />
                <span>{totalLogs} Days</span>
              </>
            ) : (
              "0 Days"
            )}
          </span>
          <div className="text-xs text-slate-400 mt-1">Keep logging daily deeds</div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-left">
          <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-800 block mb-1">Cumulative Saving</span>
          <span className="text-xl font-mono font-black text-emerald-700">
            {totalCarbonSaved > 0 ? `-${totalCarbonSaved.toFixed(1)} kg` : "0.0 kg"}
          </span>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <TreePine className="h-3 w-3" /> Equivalent to {Math.max(0, (totalCarbonSaved / 0.15)).toFixed(1)} tree hours
          </div>
        </div>

      </div>

      {/* Main Row: Visual breakdown and actual vs baseline comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Visual category progress comparison bar chart */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 text-left space-y-4">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
              <TrendingDown className="h-4.5 w-4.5 text-emerald-500" />
              Category Footprint Audit: Baseline vs Today
            </h3>
            <p className="text-slate-500 text-xs">A visual diagnostic comparing calibrated norms against logged performance.</p>
          </div>

          <div className="space-y-4 pt-2">
            {categories.map((c) => {
              // Calculate percentages for render bars
              const maxVal = Math.max(12, baselineTotal);
              const basePct = Math.min(100, (c.base / maxVal) * 100);
              const valPct = Math.min(100, (c.val / maxVal) * 100);
              
              const savedAmount = c.base - c.val;

              return (
                <div key={c.name} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50/50 transition">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">{c.icon} <span>{c.name}</span></span>
                    <span className="font-mono">
                      {c.val.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">vs base {c.base.toFixed(1)} kg</span>
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {/* Baseline Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className="absolute bg-slate-300 h-1.5 rounded-full" style={{ width: `${basePct}%` }} />
                    </div>
                    {/* Logged Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className={`${c.color} h-2 rounded-full transition-all duration-300`} style={{ width: `${valPct}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <span>Baseline Track</span>
                    <span className={`${savedAmount >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {savedAmount >= 0 ? ` saved -${savedAmount.toFixed(1)} kg` : ` overshot +${Math.abs(savedAmount).toFixed(1)} kg`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sizing Indicator legends */}
          <div className="flex items-center space-x-4 border-t border-slate-50 pt-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 bg-slate-300 rounded-full" /> Baseline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1.5 bg-emerald-500 rounded-full" /> Today's Logged Value
            </span>
          </div>
        </div>

        {/* Circular Donut Gauge showing footprint breakdown */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 text-left flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-800 text-base">Carbon Output Breakdown</h3>
            <p className="text-slate-500 text-xs">Distribution of CO2 emissions currently logged for today (kg CO2e).</p>
          </div>

          {/* SVG Pie Representation */}
          <div className="flex items-center justify-center p-4">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                
                {/* Dynamically segments slices */}
                {(() => {
                  let accumulatedPercent = 0;
                  return categories.map((c, idx) => {
                    if (calculatedTotal === 0) return null;
                    const percent = c.val / calculatedTotal;
                    const strokeDasharray = `${percent * 2 * Math.PI * 38} ${2 * Math.PI * 38}`;
                    const strokeDashoffset = `-${accumulatedPercent * 2 * Math.PI * 38}`;
                    accumulatedPercent += percent;

                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={c.svgColor}
                        strokeWidth="12"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 hover:opacity-90"
                      />
                    );
                  });
                })()}
              </svg>
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Output</span>
                <span className="text-2xl font-mono font-black text-slate-800 leading-tight">
                  {calculatedTotal.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">kg CO2e</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-slate-50">
            {categories.map((c) => {
              const share = calculatedTotal > 0 ? (c.val / calculatedTotal) * 100 : 0;
              return (
                <div key={c.name} className="flex items-center gap-1.5 text-slate-500">
                  <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: c.svgColor }} />
                  <span className="truncate">{c.name}</span>
                  <span className="text-slate-700 font-bold ml-auto">{share.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Historical Footprint Trend (X-Y Axis Chart) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 text-left space-y-4">
        <div>
          <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-2">
            <LineChart className="h-4.5 w-4.5 text-emerald-500" />
            Historical Footprint Trend (X-Y Axis Chart)
          </h3>
          <p className="text-slate-500 text-xs">Timeline representation of actual daily carbon output compared to your custom baseline target.</p>
        </div>

        {trendLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            No historical logs available to map trend. Log some activities first!
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] p-2">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                  {/* Linear Gradient for shaded area under curve */}
                  <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const yVal = yScaleMax * pct;
                  const yPos = height - paddingBottom - (pct * chartHeight);
                  return (
                    <g key={idx} className="opacity-40">
                      <line 
                        x1={paddingLeft} 
                        y1={yPos} 
                        x2={width - paddingRight} 
                        y2={yPos} 
                        stroke="#e2e8f0" 
                        strokeDasharray={pct === 0 ? "0" : "4 4"}
                        strokeWidth={pct === 0 ? 2 : 1}
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={yPos + 4} 
                        fill="#94a3b8" 
                        textAnchor="end" 
                        className="text-[10px] font-mono font-medium"
                      >
                        {yVal.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Date Labels */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <line 
                      x1={p.x} 
                      y1={height - paddingBottom} 
                      x2={p.x} 
                      y2={height - paddingBottom + 5} 
                      stroke="#cbd5e1" 
                      strokeWidth="1.5"
                    />
                    <text 
                      x={p.x} 
                      y={height - paddingBottom + 18} 
                      fill="#94a3b8" 
                      textAnchor="middle" 
                      className="text-[9px] font-mono font-medium"
                    >
                      {p.date.slice(5)} {/* slice YYYY-MM-DD to MM-DD */}
                    </text>
                  </g>
                ))}

                {/* Target Baseline Dotted Line */}
                <line 
                  x1={paddingLeft} 
                  y1={baselineY} 
                  x2={width - paddingRight} 
                  y2={baselineY} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  strokeWidth="2" 
                  opacity="0.6"
                />
                <text 
                  x={width - paddingRight} 
                  y={baselineY - 6} 
                  fill="#ef4444" 
                  textAnchor="end" 
                  className="text-[9px] font-mono font-bold"
                >
                  Baseline Target ({baselineTotal.toFixed(1)} kg)
                </text>

                {/* Area under the line */}
                <path d={areaD} fill="url(#trend-gradient)" />

                {/* Main Trend Line path */}
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Projection lines connecting dots to X-axis (drawn under dots) */}
                {points.map((p, idx) => (
                  <line 
                    key={`proj-${idx}`}
                    x1={p.x}
                    y1={p.y}
                    x2={p.x}
                    y2={height - paddingBottom}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                ))}

                {/* Dots & Values */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="4.5" 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth="2" 
                    />
                    {/* Value Badge label */}
                    <rect
                      x={p.x - 16}
                      y={p.y - 23}
                      width="32"
                      height="13"
                      rx="3"
                      fill="#0f172a"
                    />
                    <text 
                      x={p.x} 
                      y={p.y - 13} 
                      fill="#ffffff" 
                      textAnchor="middle" 
                      className="text-[9px] font-mono font-bold"
                    >
                      {p.value.toFixed(1)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Daily activity logs list */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 text-left">
        <h3 className="font-display font-bold text-slate-800 text-base mb-4 flex items-center justify-between border-b border-slate-50 pb-3">
          <span className="flex items-center gap-2">
            <List className="h-4.5 w-4.5 text-slate-500" />
            Footprint Logging History
          </span>
          <span className="text-xs bg-slate-100 text-slate-500 font-mono py-0.5 px-3 rounded-full">
            {logs.length} entries preserved
          </span>
        </h3>

        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm max-w-sm mx-auto flex flex-col items-center gap-2">
            <Inbox className="h-8 w-8 text-slate-300" />
            <span>Your logging repository is currently empty. Use the Daily Green Actions sheet above to log carbon behaviors for past/current dates.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  <th className="py-2.5 px-2">Date</th>
                  <th className="py-2.5 px-2">Transport (mi)</th>
                  <th className="py-2.5 px-2">Meals (Meat vs Pot)</th>
                  <th className="py-2.5 px-2">Household Deeds</th>
                  <th className="py-2.5 px-2 text-right">Actual Output</th>
                  <th className="py-2.5 px-2 text-right">CO2 Saved</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const savedValue = log.savedCo2e;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-2 font-mono font-medium text-slate-700">{log.date}</td>
                      <td className="py-3 px-2">
                        <span className="text-slate-600 block flex items-center gap-1"><Car className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Driven: {log.milesDriven} mi</span>
                        <span className="text-slate-400 block flex items-center gap-1"><Bike className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Walked: {log.milesBikedWalked} mi</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-600 block flex items-center gap-1"><Utensils className="h-3.5 w-3.5 text-rose-500 shrink-0" /> Meat servings: {log.servingsRedMeat}</span>
                        <span className="text-slate-400 block flex items-center gap-1"><Leaf className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Veg meal count: {log.mealsPlantBased}</span>
                      </td>
                      <td className="py-3 px-2 space-y-0.5">
                        {log.shorterShowerDone && <span className="inline-flex bg-slate-100 text-[9px] font-mono px-1.5 py-0.5 rounded text-amber-800">Shower &lt;5m</span>}
                        {log.thermostatOffsetUsed && <span className="inline-block bg-slate-100 text-[9px] font-mono px-1.5 py-0.5 rounded text-amber-800 ml-1">Temp Offset</span>}
                        {log.phantomPowerCut && <span className="inline-block bg-slate-100 text-[9px] font-mono px-1.5 py-0.5 rounded text-amber-800 ml-1">Vamp Power Cut</span>}
                        {!log.shorterShowerDone && !log.thermostatOffsetUsed && !log.phantomPowerCut && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-700 text-right font-bold">
                        {log.actualEmissionsCo2e.toFixed(1)} kg
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-mono font-black ${savedValue >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {savedValue >= 0 ? `-${savedValue.toFixed(1)} kg` : `+${Math.abs(savedValue).toFixed(1)} kg`}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => onRemoveLog(log.id)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
