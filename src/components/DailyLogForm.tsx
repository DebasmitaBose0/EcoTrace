/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DailyLogEntry, CategoryBreakdown } from "../types";
import { calculateDailyEntryEmissions } from "../utils/carbonCalculator";
import { PlusCircle, Calendar, Car, Utensils, Zap, Trash2, ShieldCheck, HelpCircle, Leaf } from "lucide-react";

interface DailyLogFormProps {
  baseline: CategoryBreakdown;
  onSave: (entry: DailyLogEntry) => void;
  selectedDate: string;
}

export default function DailyLogForm({ baseline, onSave, selectedDate }: DailyLogFormProps) {
  // Transport
  const [milesDriven, setMilesDriven] = useState<number>(0);
  const [milesTransit, setMilesTransit] = useState<number>(0);
  const [milesBikedWalked, setMilesBikedWalked] = useState<number>(0);

  // Food
  const [servingsRedMeat, setServingsRedMeat] = useState<number>(0);
  const [servingsPoultryFish, setServingsPoultryFish] = useState<number>(0);
  const [mealsPlantBased, setMealsPlantBased] = useState<number>(0);
  const [foodWastedScore, setFoodWastedScore] = useState<"none" | "some" | "lots">("none");

  // Home
  const [shorterShowerDone, setShorterShowerDone] = useState<boolean>(false);
  const [thermostatOffsetUsed, setThermostatOffsetUsed] = useState<boolean>(false);
  const [phantomPowerCut, setPhantomPowerCut] = useState<boolean>(false);

  // Waste
  const [recycledFully, setRecycledFully] = useState<boolean>(false);
  const [compostedFully, setCompostedFully] = useState<boolean>(false);

  const [notes, setNotes] = useState<string>("");

  // Live emission outcome counters
  const [stats, setStats] = useState({ actual: 0, saved: 0 });

  // Recalculate preview on field shifts
  useEffect(() => {
    const previewData = {
      id: "",
      date: selectedDate,
      milesDriven,
      milesTransit,
      milesBikedWalked,
      servingsRedMeat,
      servingsPoultryFish,
      mealsPlantBased,
      foodWastedScore,
      shorterShowerDone,
      thermostatOffsetUsed,
      phantomPowerCut,
      recycledFully,
      compostedFully
    };
    const res = calculateDailyEntryEmissions(previewData, baseline);
    setStats(res);
  }, [
    milesDriven, milesTransit, milesBikedWalked,
    servingsRedMeat, servingsPoultryFish, mealsPlantBased, foodWastedScore,
    shorterShowerDone, thermostatOffsetUsed, phantomPowerCut,
    recycledFully, compostedFully, selectedDate, baseline
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEntry: DailyLogEntry = {
      id: `log-${Date.now()}`,
      date: selectedDate,
      milesDriven,
      milesTransit,
      milesBikedWalked,
      servingsRedMeat,
      servingsPoultryFish,
      mealsPlantBased,
      foodWastedScore,
      shorterShowerDone,
      thermostatOffsetUsed,
      phantomPowerCut,
      recycledFully,
      compostedFully,
      actualEmissionsCo2e: stats.actual,
      savedCo2e: stats.saved,
      notes: notes.trim() !== "" ? notes : undefined
    };
    onSave(finalEntry);
    
    // Optional: reset fields back to neutral levels or keep them as standard shortcuts
    setNotes("");
  };

  const totalBaseline = baseline.transport + baseline.food + baseline.energy + baseline.waste;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-left" id="log-form">
      {/* Form Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <h3 className="font-display font-medium tracking-tight">Log Daily Green Actions</h3>
        </div>
        <div className="bg-slate-800 text-slate-300 font-mono text-xs px-3 py-1 rounded-full border border-slate-700">
          Logging Date: {selectedDate}
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* SECTION 1: TRANSPORT */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-2">
            <Car className="h-4 w-4 text-blue-500" />
            1. Daily Transport Log
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="miles-driven" className="block text-xs font-medium text-slate-500 mb-1">Miles Driven (Gas Car)</label>
              <input
                id="miles-driven"
                type="number"
                min="0"
                max="500"
                value={milesDriven || ""}
                onChange={(e) => setMilesDriven(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="miles-transit" className="block text-xs font-medium text-slate-500 mb-1">Miles Public Transit</label>
              <input
                id="miles-transit"
                type="number"
                min="0"
                max="500"
                value={milesTransit || ""}
                onChange={(e) => setMilesTransit(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="miles-biked-walked" className="block text-xs font-medium text-slate-500 mb-1">Biked, Walked, or Skated (mi)</label>
              <input
                id="miles-biked-walked"
                type="number"
                min="0"
                max="100"
                value={milesBikedWalked || ""}
                onChange={(e) => setMilesBikedWalked(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DIET */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-2">
            <Utensils className="h-4 w-4 text-emerald-500" />
            2. Daily Meals & Waste
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="servings-red-meat" className="block text-xs font-medium text-slate-500 mb-1">Red Meat Portions (Beef/Pork)</label>
              <input
                id="servings-red-meat"
                type="number"
                min="0"
                max="10"
                value={servingsRedMeat || ""}
                onChange={(e) => setServingsRedMeat(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="servings-poultry-fish" className="block text-xs font-medium text-slate-500 mb-1">Poultry, Fish, or Egg Portions</label>
              <input
                id="servings-poultry-fish"
                type="number"
                min="0"
                max="10"
                value={servingsPoultryFish || ""}
                onChange={(e) => setServingsPoultryFish(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="meals-plant-based" className="block text-xs font-medium text-slate-500 mb-1">Fully Plant-Based Meals</label>
              <input
                id="meals-plant-based"
                type="number"
                min="0"
                max="10"
                value={mealsPlantBased || ""}
                onChange={(e) => setMealsPlantBased(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <fieldset className="border-0 p-0 m-0 space-y-1.5">
              <legend className="block text-xs font-medium text-slate-500 mb-1.5">How much edible food went to waste today?</legend>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "none", label: "Zero Waste", icon: <Leaf className="h-4 w-4 text-emerald-600 shrink-0" /> },
                  { id: "some", label: "Some scraps", icon: <Utensils className="h-4 w-4 text-amber-500 shrink-0" /> },
                  { id: "lots", label: "Leftovers tossed", icon: <Trash2 className="h-4 w-4 text-rose-500 shrink-0" /> }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFoodWastedScore(item.id as "none" | "some" | "lots")}
                    className={`py-2 px-3 rounded-lg border text-xs text-center font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      foodWastedScore === item.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* SECTION 3: HOME ENERGY */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            3. Home Energy Stewardship
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 border border-slate-100 transition cursor-pointer">
              <input
                id="shorter-shower"
                type="checkbox"
                checked={shorterShowerDone}
                onChange={(e) => setShorterShowerDone(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
              />
              <label htmlFor="shorter-shower" className="text-xs cursor-pointer select-none w-full">
                <span className="font-bold text-slate-700 block">Shorter Shower Taken (&lt; 5 minutes)</span>
                <span className="text-slate-400">Saves substantial hot water thermal energy (saves ~0.6 kg CO2e)</span>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 border border-slate-100 transition cursor-pointer">
              <input
                id="thermostat-offset"
                type="checkbox"
                checked={thermostatOffsetUsed}
                onChange={(e) => setThermostatOffsetUsed(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
              />
              <label htmlFor="thermostat-offset" className="text-xs cursor-pointer select-none w-full">
                <span className="font-bold text-slate-700 block">Ecological Thermostat Offset</span>
                <span className="text-slate-400">Adjusted thermostat by ±2°F (or off) during peak or sleep hours (saves ~1.2 kg CO2e)</span>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 border border-slate-100 transition cursor-pointer">
              <input
                id="phantom-power"
                type="checkbox"
                checked={phantomPowerCut}
                onChange={(e) => setPhantomPowerCut(e.target.checked)}
                className="h-4 w-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
              />
              <label htmlFor="phantom-power" className="text-xs cursor-pointer select-none w-full">
                <span className="font-bold text-slate-700 block">Cut Standby "Vampire Code" Power</span>
                <span className="text-slate-400">Unplugged appliances or turned off active power strips when not in use (saves ~0.35 kg CO2e)</span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 4: WASTE */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-2">
            <Trash2 className="h-4 w-4 text-purple-500" />
            4. Waste Management
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 border border-slate-100 transition cursor-pointer">
              <input
                id="recycled-fully"
                type="checkbox"
                checked={recycledFully}
                onChange={(e) => setRecycledFully(e.target.checked)}
                className="h-4 w-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
              />
              <label htmlFor="recycled-fully" className="text-xs cursor-pointer select-none w-full">
                <span className="font-bold text-slate-700 block">Fully Cleaned & Recycled</span>
                <span className="text-slate-400">Separated metals, cardboard, and clean plastics today</span>
              </label>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 border border-slate-100 transition cursor-pointer">
              <input
                id="composted-fully"
                type="checkbox"
                checked={compostedFully}
                onChange={(e) => setCompostedFully(e.target.checked)}
                className="h-4 w-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
              />
              <label htmlFor="composted-fully" className="text-xs cursor-pointer select-none w-full">
                <span className="font-bold text-slate-700 block">100% Organics Composted</span>
                <span className="text-slate-400">Rotting material was cleanly added to a bin/yard stack</span>
              </label>
            </div>
          </div>
        </div>

        {/* SHORT NOTES */}
        <div>
          <label htmlFor="activity-notes" className="block text-xs font-semibold text-slate-500 mb-1">Activity Notes / Reflection (Optional)</label>
          <input
            id="activity-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Worked from home, dinner prep with local spinach..."
            maxLength={140}
            className="w-full bg-slate-50/50 border border-slate-200 text-sm rounded-lg p-2 focus:bg-white focus:border-slate-400 focus:outline-none"
          />
        </div>

        {/* CARBON OUTCOME DISPLAY PANEL */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Baseline Carbon Target vs. Log Output</div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
              <div>
                <span className="text-xs text-slate-400 block font-mono">My Baseline</span>
                <span className="font-mono text-xl font-bold text-slate-300">{totalBaseline.toFixed(1)} kg</span>
              </div>
              <div className="hidden md:block text-slate-600 text-xl">/</div>
              <div>
                <span className="text-xs text-slate-400 block font-mono">Today's Output</span>
                <span className="font-mono text-xl font-bold text-red-400">{stats.actual.toFixed(1)} kg</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-right hidden sm:block">
              <span className="text-xs text-emerald-400 block uppercase font-bold">Dynamic Savings</span>
              <span className="text-xs text-slate-300">
                {stats.saved >= 0 ? `${stats.saved.toFixed(1)} kg CO2e saved` : `${Math.abs(stats.saved).toFixed(1)} kg CO2e over baseline`}
              </span>
            </div>
            
            <button
              type="submit"
              id="submit-daily-log"
              className={`px-3.5 py-2 rounded-lg text-sm font-bold shadow-md cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
                stats.saved > 0 
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4" /> Save Log
            </button>
          </div>
        </div>

      </div>
    </form>
  );
}
