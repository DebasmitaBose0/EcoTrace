/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Pledge, CategoryBreakdown, Persona } from "../types";
import { Sparkles, Calendar, Plus, Check, Award, Flame, Zap, ShieldCheck, Loader2, Bike, Utensils, Trash2 } from "lucide-react";

interface PledgeBoardProps {
  vertical: Persona;
  footprint: {
    totalDaily: number;
    breakdown: CategoryBreakdown;
  };
  activePledges: Pledge[];
  onCommit: (title: string, description: string, category: Pledge["category"], savings: number, difficulty: Pledge["difficulty"]) => void;
  onComplete: (id: string) => void;
  onAbandon: (id: string) => void;
}

export default function PledgeBoard({ vertical, footprint, activePledges, onCommit, onComplete, onAbandon }: PledgeBoardProps) {
  const [ideas, setIdeas] = useState<Omit<Pledge, "pledgedAt" | "completedAt">[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Generate customized pledges from Gemini AI on load or demand
  const loadPledgeSuggestions = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/coach/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          footprint,
          completedPledges: activePledges.filter(p => !!p.completedAt).map(p => p.title)
        })
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setIdeas(data);
      } else {
        throw new Error(data.message || "Failed to compile custom suggestions.");
      }
    } catch (e: any) {
      console.warn("Generating AI suggestion suggestions failed. Loading smart default suggestions.", e);
      // Give realistic fallback suggestions if API is offline or has error
      const defaults: Omit<Pledge, "pledgedAt" | "completedAt">[] = [
        {
          id: "pledge-carpool-1",
          title: "Carpool to Work Twice",
          description: "Coordinate commutes with a partner to halve vehicle emissions on selected days.",
          category: "transportation",
          savings: 12.4,
          difficulty: "Medium"
        },
        {
          id: "pledge-meatless-1",
          title: "Introduce Meatless Mondays",
          description: "Ditch chicken or burger portions for fully plant-based alternatives today.",
          category: "diet",
          savings: 7.2,
          difficulty: "Easy"
        },
        {
          id: "pledge-thermostat-2",
          title: "Thermostat Off-Sets (2°F)",
          description: "Shift heating/cooling offset by 2°F during peak ventilation hours.",
          category: "energy",
          savings: 4.8,
          difficulty: "Easy"
        },
        {
          id: "pledge-compost-1",
          title: "Launch a Kitchen Composting Bin",
          description: "Divert household apple cores, coffee grinds, and lettuce layers away from landfills.",
          category: "waste",
          savings: 3.5,
          difficulty: "Medium"
        }
      ];
      setIdeas(defaults);
      setApiError("Active connection offline. Showing standard calibrated green actions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPledgeSuggestions();
  }, [vertical]);

  const handlePledgeAdd = (idea: Omit<Pledge, "pledgedAt" | "completedAt">) => {
    onCommit(idea.title, idea.description, idea.category, idea.savings, idea.difficulty);
    // Remove from the suggestions list in state so they don't click twice
    setIdeas((prev) => prev.filter((item) => item.title !== idea.title));
  };

  // Sorter
  const pending = activePledges.filter((p) => !p.completedAt);
  const finished = activePledges.filter((p) => p.completedAt);

  // Math savings calculations
  const totalProjectedSavings = pending.reduce((sum, p) => sum + p.savings, 0);
  const totalCompletedSavings = finished.reduce((sum, p) => sum + p.savings, 0);

  const getDifficultyStyle = (dif: Pledge["difficulty"]) => {
    if (dif === "Easy") return "bg-green-50 text-green-700 border-green-200";
    if (dif === "Medium") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const getCategoryIcon = (cat: Pledge["category"]) => {
    if (cat === "transportation") return <Bike className="h-4 w-4 text-blue-500 shrink-0" />;
    if (cat === "diet") return <Utensils className="h-4 w-4 text-emerald-500 shrink-0" />;
    if (cat === "energy") return <Zap className="h-4 w-4 text-amber-500 shrink-0" />;
    return <Trash2 className="h-4 w-4 text-purple-500 shrink-0" />;
  };

  return (
    <div className="space-y-6" id="pledge-board">
      
      {/* Pledge stats card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-emerald-950 text-emerald-50 rounded-2xl border border-emerald-900 shadow-xs flex items-center justify-between">
          <div className="text-left space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-300">Pledges Committed</span>
            <div className="text-3xl font-mono font-black">{pending.length} Active</div>
            <p className="text-xs text-emerald-200/80">Pending completion steps</p>
          </div>
          <Flame className="h-8 w-8 text-amber-400 shrink-0" />
        </div>

        <div className="p-5 bg-emerald-900 text-emerald-50 rounded-2xl border border-emerald-800 shadow-xs flex items-center justify-between">
          <div className="text-left space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-300">Projected Savings</span>
            <div className="text-3xl font-mono font-black">{totalProjectedSavings.toFixed(1)} <span className="text-xs">kg/wk</span></div>
            <p className="text-xs text-emerald-200/80">Projected weekly CO2 offset</p>
          </div>
          <Zap className="h-8 w-8 text-emerald-300 shrink-0 animate-pulse" />
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="text-left space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Pledges Fulfilled</span>
            <div className="text-3xl font-mono font-bold text-slate-800">{finished.length} Done</div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Saved {totalCompletedSavings.toFixed(1)} kg CO2e</span>
            </p>
          </div>
          <Award className="h-8 w-8 text-emerald-600 shrink-0" />
        </div>
      </div>

      {/* Suggestion list */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-4 mb-6">
          <div>
            <h3 className="font-display font-bold text-slate-800 text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500 fill-emerald-100" />
              Tailored Carbon Reduction Pledges
            </h3>
            <p className="text-slate-500 text-xs">AI-synthesized habits mapping to your largest carbon baselines.</p>
          </div>
          <button
            onClick={loadPledgeSuggestions}
            disabled={loading}
            id="refresh-pledges"
            className="self-start sm:self-auto py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto-Regenerate"}
          </button>
        </div>

        {apiError && (
          <div className="my-2 text-[11px] font-mono text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
            {apiError}
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-400 font-mono">Generating scientific offsets via Gemini pipeline...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((id, index) => (
              <div
                key={id.id || index}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xs transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{getCategoryIcon(id.category)}</span>
                      {id.title}
                    </span>
                    <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${getDifficultyStyle(id.difficulty)}`}>
                      {id.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{id.description}</p>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100/50 pt-3 mt-3">
                  <span className="text-xs text-emerald-600 font-mono font-medium flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
                    <span>Offset: -{id.savings.toFixed(1)} kg / week</span>
                  </span>
                  <button
                    onClick={() => handlePledgeAdd(id)}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-md cursor-pointer transition flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Commit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Committed List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Pledges */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-left">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-3 mb-4">
            Active Commitments ({pending.length})
          </h3>

          {pending.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              You haven't committed to any active pledges yet! Select and commit from the AI recommendation cards above to kick-start your habit cycle.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/20 hover:bg-slate-50/70 transition"
                >
                  <div className="text-left space-y-0.5 max-w-xs">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{getCategoryIcon(p.category)}</span>
                      {p.title}
                    </div>
                    <p className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                      <span>Offset: {p.savings} kg/week</span>
                      <span>•</span>
                      <span>Difficulty: {p.difficulty}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onComplete(p.id)}
                      className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer transition"
                    >
                      <Check className="h-3 w-3" /> Complete
                    </button>
                    <button
                      onClick={() => onAbandon(p.id)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] p-1 font-medium transition cursor-pointer"
                    >
                      Drop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed History */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-left">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-3 mb-4">
            Completed Pledges ({finished.length})
          </h3>

          {finished.length === 0 ? (
            <div className="py-12 text-center text-slate-300 text-xs leading-relaxed max-w-xs mx-auto">
              Nothing completed yet. Work on maintaining your committed deeds, then mark them done to earn badges and save kilograms!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
              {finished.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200"
                >
                  <div className="text-left">
                    <span className="text-xs font-medium text-slate-700 flex items-center gap-1 line-through decoration-slate-300 decoration-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {p.title}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600">
                      Saved -{p.savings} kg CO2e / week
                    </span>
                  </div>
                  <span className="text-[9px] font-mono bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
