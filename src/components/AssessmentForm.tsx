/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AssessmentData, Persona } from "../types";
import { DEFAULT_ASSESSMENT } from "../utils/carbonCalculator";
import { Leaf, Car, Utensils, Zap, Trash2, ArrowRight, Sparkles, Check, Flame } from "lucide-react";

interface AssessmentFormProps {
  currentAssessment: AssessmentData;
  onSave: (assessment: AssessmentData, recommendedPersona: Persona) => void;
}

export default function AssessmentForm({ currentAssessment, onSave }: AssessmentFormProps) {
  const [data, setData] = useState<AssessmentData>({ ...currentAssessment });
  const [step, setStep] = useState<number>(0); // 0: Persona Selection, 1: Transport, 2: Diet, 3: Energy & Waste, 4: Calibration Summary

  const [selectedPersona, setSelectedPersona] = useState<Persona>("eco-commuter");

  const updateField = (field: keyof AssessmentData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const calculateTempBaseline = () => {
    // Quick estimation for live slider previews
    const trans = ((data.commuteMilesPerWeek / 7) * (data.vehicleType === "gas-suv" ? 0.46 : data.vehicleType === "gas-average" ? 0.32 : data.vehicleType === "hybrid" ? 0.18 : data.vehicleType === "electric" ? 0.08 : 0)) + 
                  ((data.transitHoursPerWeek * 25 / 7) * 0.12) + 
                  ((data.flightsPerYear * 430) / 365);
    
    let food = data.dietType === "heavy-meat" ? 7.5 : data.dietType === "average-meat" ? 5.4 : data.dietType === "poultry-fish" ? 3.9 : data.dietType === "vegetarian" ? 2.6 : 1.7;
    if (data.foodWasteLevel === "low") food -= 0.4;
    if (data.foodWasteLevel === "high") food += 1.2;
    food -= data.organicLocalRatio * 0.12 * food;
    food = Math.max(1.2, food);

    const electricityDaily = (data.electricityKwhPerMonth / 30) * (data.electricitySource === "solar" ? 0.04 : data.electricitySource === "mixed" ? 0.22 : 0.42);
    const heatingDaily = data.houseSizeSqft * (data.heatingSource === "none" ? 0 : data.heatingSource === "electric" ? 0.002 : 0.004);
    const energy = electricityDaily + heatingDaily;

    let waste = 1.8 - (data.wasteRecyclingRate * 0.7) - (data.compostsOrganics ? 0.4 : 0);
    waste = Math.max(0.3, waste);

    return { trans, food, energy, waste, total: trans + food + energy + waste };
  };

  const tempStats = calculateTempBaseline();

  // Auto-tune or recommend persona based on highest category
  const runCalibration = () => {
    const stats = calculateTempBaseline();
    const categories = [
      { id: "eco-commuter" as Persona, val: stats.trans },
      { id: "mindful-eater" as Persona, val: stats.food },
      { id: "green-homemaker" as Persona, val: stats.energy + stats.waste }
    ];
    // Sort descending
    categories.sort((a, b) => b.val - a.val);
    const rec = categories[0].id;
    onSave(data, selectedPersona);
  };

  const personas = [
    {
      id: "eco-commuter" as Persona,
      title: "Sustainable Transit Coach",
      instructor: "Aero",
      desc: "Focus on carpooling, public transit, biking, electric micromobility, and eco-friendly route optimizations.",
      color: "border-blue-200 hover:border-blue-400 bg-blue-50/50",
      activeColor: "ring-2 ring-blue-500 border-blue-500 bg-blue-50",
      badgeColor: "bg-blue-100 text-blue-800",
      icon: <Car className="h-5 w-5 text-blue-600" />
    },
    {
      id: "mindful-eater" as Persona,
      title: "Conscious Food & Agri Specialist",
      instructor: "Sprout",
      desc: "Emphasize plant-forward substitutions, minimal packaging, reduced food waste, local organic sizing, and composting.",
      color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/50",
      activeColor: "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50",
      badgeColor: "bg-emerald-100 text-emerald-800",
      icon: <Utensils className="h-5 w-5 text-emerald-600" />
    },
    {
      id: "green-homemaker" as Persona,
      title: "Passive Home Energy Consultant",
      instructor: "Kelvin",
      desc: "Concentrate on smart HVAC management, electricity offset, vampire device savings, hot water conservation, and recycling.",
      color: "border-amber-200 hover:border-amber-400 bg-amber-50/50",
      activeColor: "ring-2 ring-amber-500 border-amber-500 bg-amber-50",
      badgeColor: "bg-amber-100 text-amber-800",
      icon: <Zap className="h-5 w-5 text-amber-600" />
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto overflow-hidden" id="assessment-panel">
      {/* Step Header Indicator */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Leaf className="h-5 w-5 text-emerald-400" />
          <span className="font-display font-medium text-white tracking-tight">Footprint Setup Wizard</span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Step {step + 1} of 5
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5">
        <div 
          className="bg-emerald-500 h-1.5 transition-all duration-300" 
          style={{ width: `${((step + 1) / 5) * 100}%` }}
        />
      </div>

      <div className="p-6 md:p-8">
        
        {/* STEP 0: PERSONA SELECT */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-display font-bold text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Select Your Carbon Hero Persona
              </h2>
              <p className="text-slate-500 mt-2 text-sm">
                Each challenge vertical provides a customized dashboard, dedicated Gemini AI mentor, and personalized habit challenges focused directly on that ecological domain. Select the focus path you are most interested in targeting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {personas.map((p) => {
                const isActive = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    id={`persona-btn-${p.id}`}
                    onClick={() => setSelectedPersona(p.id)}
                    className={`p-5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                      isActive ? p.activeColor : p.color
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {p.icon}
                        </div>
                        {isActive && (
                          <span className="text-xs font-mono bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" /> Selected
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-base">{p.title}</h3>
                        <span className="text-xs font-mono text-slate-400">AI Coach: {p.instructor}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl flex items-start space-x-3 text-slate-500 text-xs leading-relaxed">
              <Leaf className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <strong>How this works:</strong> Selecting a primary focus concentrates your customized metrics around that category. However, you will still be able to log transit, meals, and home energy activities. You can calibrate this setting anytime.
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: TRANSPORT */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-500" />
                Transportation Configuration
              </h2>
              <p className="text-slate-500 text-sm mt-1">Calibrate your weekly transit habits and vehicle parameters.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="vehicle-select" className="block text-sm font-medium text-slate-700 mb-1">Primary Commute Vehicle Type</label>
                <select
                  id="vehicle-select"
                  value={data.vehicleType}
                  onChange={(e) => updateField("vehicleType", e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="none">No Personal Vehicle (Walk, Bike, Public Transit Only)</option>
                  <option value="electric">Electric Vehicle (EV / Tesla / Rivian)</option>
                  <option value="hybrid">Hybrid / Plug-in Hybrid (e.g. Prius)</option>
                  <option value="gas-average">Average Gas Sedan / Compact Car</option>
                  <option value="gas-suv">Heavy Gas Vehicle / SUV / Pickup Truck</option>
                </select>
              </div>

              {data.vehicleType !== "none" && (
                 <div>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <label htmlFor="commute-miles-range" className="font-medium">Weekly Driving Distance (Personal Car)</label>
                    <span className="font-mono text-slate-500">{data.commuteMilesPerWeek} miles / week</span>
                  </div>
                  <input
                    id="commute-miles-range"
                    aria-label="Weekly Driving Distance in miles"
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={data.commuteMilesPerWeek}
                    onChange={(e) => updateField("commuteMilesPerWeek", Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 px-1 mt-1">
                    <span>0 mi</span>
                    <span>150 mi (average)</span>
                    <span>300 mi</span>
                    <span>500+ mi</span>
                  </div>
                </div>
              )}

               <div>
                <div className="flex justify-between text-sm text-slate-700 mb-1">
                  <label htmlFor="transit-hours-range" className="font-medium">Weekly Public Transit Usage (Buses, Subways, Commuter Trains)</label>
                  <span className="font-mono text-slate-500">{data.transitHoursPerWeek} hours / week</span>
                </div>
                <input
                  id="transit-hours-range"
                  aria-label="Weekly Public Transit Usage in hours"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={data.transitHoursPerWeek}
                  onChange={(e) => updateField("transitHoursPerWeek", Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 px-1 mt-1">
                  <span>0 hrs</span>
                  <span>5 hrs</span>
                  <span>15 hrs</span>
                  <span>40 hrs</span>
                </div>
              </div>

               <div>
                <div className="flex justify-between text-sm text-slate-700 mb-1">
                  <label htmlFor="flights-year-range" className="font-medium">Flights Taken Annually (Short-haul & Long-haul)</label>
                  <span className="font-mono text-slate-500">{data.flightsPerYear} flights / year</span>
                </div>
                <input
                  id="flights-year-range"
                  aria-label="Flights Taken Annually"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={data.flightsPerYear}
                  onChange={(e) => updateField("flightsPerYear", Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-slate-400 px-1 mt-1">
                  <span>0 flights</span>
                  <span>2 flights (average)</span>
                  <span>6 flights</span>
                  <span>20+ flights</span>
                </div>
              </div>
            </div>

            {/* Live Estimator Indicator */}
            <div className="bg-blue-50/50 p-4 rounded-xl flex justify-between items-center border border-blue-100">
              <span className="text-xs font-medium text-slate-600">Transit Baseline Estimation:</span>
              <span className="text-sm font-mono font-bold text-blue-600">{tempStats.trans.toFixed(1)} kg CO2e / day</span>
            </div>
          </div>
        )}

        {/* STEP 2: DIET */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Utensils className="h-5 w-5 text-emerald-500" />
                Diet & Food Selection
              </h2>
              <p className="text-slate-500 text-sm mt-1">Sourcing, diet type, and waste have a massive compound effect on daily agricultural methane levels.</p>
            </div>

            <div className="space-y-5">
               <div>
                <label htmlFor="diet-type-select" className="block text-sm font-medium text-slate-700 mb-1">Diet Style</label>
                <select
                  id="diet-type-select"
                  value={data.dietType}
                  onChange={(e) => updateField("dietType", e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="vegan">100% Vegan (Plant-based, no eggs/dairy)</option>
                  <option value="vegetarian">Vegetarian (No meat/fish, consumes dairy/eggs)</option>
                  <option value="poultry-fish">Poultry & Fish Only (Consumes chicken/seafood, no beef/lamb)</option>
                  <option value="average-meat">Average Meat Eater (Eats pork/beef occasionally, some dairy)</option>
                  <option value="heavy-meat">Heavy Meat Consumer (Eats beef, mutton, or red meat daily)</option>
                </select>
              </div>

               <div>
                <label htmlFor="organic-local-range" className="block text-sm font-medium text-slate-700 mb-1">How much of your groceries are Organic, Local, or Seasonal?</label>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="font-mono text-xs text-slate-400">0%</span>
                  <input
                    id="organic-local-range"
                    aria-label="Organic Local Sourcing Ratio"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={data.organicLocalRatio}
                    onChange={(e) => updateField("organicLocalRatio", Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <span className="font-mono text-xs text-slate-400">100%</span>
                </div>
                <div className="text-right text-xs font-mono text-emerald-600 mt-1">
                  Est. selection: {Math.round(data.organicLocalRatio * 100)}% locally sourced
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kitchen Food-Waste Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {["low", "medium", "high"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => updateField("foodWasteLevel", level)}
                      className={`py-2 px-4 rounded-lg border text-sm capitalize text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        data.foodWasteLevel === level
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      {level === "low" ? (
                        <>
                          <Utensils className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Minimal Trash</span>
                        </>
                      ) : level === "medium" ? (
                        <>
                          <Trash2 className="h-4 w-4 text-slate-500 shrink-0" />
                          <span>Average</span>
                        </>
                      ) : (
                        <>
                          <Flame className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>Frequent Scraps</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Estimator Indicator */}
            <div className="bg-emerald-50/50 p-4 rounded-xl flex justify-between items-center border border-emerald-100">
              <span className="text-xs font-medium text-slate-600">Dietary Baseline Estimation:</span>
              <span className="text-sm font-mono font-bold text-emerald-600">{tempStats.food.toFixed(1)} kg CO2e / day</span>
            </div>
          </div>
        )}

        {/* STEP 3: ENERGY */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Home Energy & Conservation Habits
              </h2>
              <p className="text-slate-500 text-sm mt-1">Calibrate heating capacities, grids, and recycling thresholds.</p>
            </div>

            <div className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="house-size-input" className="block text-sm font-medium text-slate-700 mb-1">Representative House Size (Sqft)</label>
                  <input
                    id="house-size-input"
                    type="number"
                    min="100"
                    max="10000"
                    value={data.houseSizeSqft}
                    onChange={(e) => updateField("houseSizeSqft", Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="electric-kwh-input" className="block text-sm font-medium text-slate-700 mb-1">Avg Monthly Electric Use (kWh)</label>
                  <input
                    id="electric-kwh-input"
                    type="number"
                    min="0"
                    max="3000"
                    value={data.electricityKwhPerMonth}
                    onChange={(e) => updateField("electricityKwhPerMonth", Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

               <div>
                <label htmlFor="electric-source-select" className="block text-sm font-medium text-slate-700 mb-1">Electricity Grid Source</label>
                <select
                  id="electric-source-select"
                  value={data.electricitySource}
                  onChange={(e) => updateField("electricitySource", e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2.5 focus:border-amber-500"
                >
                  <option value="standard-grid">Standard Utility Grid (Average Coal/Gas Mix)</option>
                  <option value="mixed">Mixed (Utility + Residential Solar panels / Green Tariffs)</option>
                  <option value="solar">100% Clean / Off-Grid Solar Power / Wind</option>
                </select>
              </div>
 
              <div>
                <label htmlFor="heating-source-select" className="block text-sm font-medium text-slate-700 mb-1">Primary Heating Source</label>
                <select
                  id="heating-source-select"
                  value={data.heatingSource}
                  onChange={(e) => updateField("heatingSource", e.target.value)}
                  className="w-full bg-white border border-slate-200 text-sm rounded-lg p-2.5 focus:border-amber-500"
                >
                  <option value="none">No actively carbonized climate system required</option>
                  <option value="electric">Electric HVAC / High Efficiency Heat Pump</option>
                  <option value="gas-oil">Gas Furnace / Fuel Oil Heater</option>
                </select>
              </div>

               <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="composts-organics-checkbox" className="text-sm font-medium text-slate-700 block">Composts Organics regularly?</label>
                    <span className="text-xs text-slate-400">Diverts scrap food from anaerobic landfills.</span>
                  </div>
                  <input
                    id="composts-organics-checkbox"
                    type="checkbox"
                    checked={data.compostsOrganics}
                    onChange={(e) => updateField("compostsOrganics", e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                </div>
 
                <div>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <label htmlFor="waste-recycling-range" className="font-medium">How much of your plastic/paper/metal waste is recycled?</label>
                    <span className="font-mono text-slate-500">{Math.round(data.wasteRecyclingRate * 100)}%</span>
                  </div>
                  <input
                    id="waste-recycling-range"
                    aria-label="Waste Recycling Rate"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={data.wasteRecyclingRate}
                    onChange={(e) => updateField("wasteRecyclingRate", Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Live Estimator Indicator */}
            <div className="bg-amber-50/50 p-4 rounded-xl flex justify-between items-center border border-amber-100">
              <span className="text-xs font-medium text-slate-600">Energy & Waste Baseline:</span>
              <span className="text-sm font-mono font-bold text-amber-600">{(tempStats.energy + tempStats.waste).toFixed(1)} kg CO2e / day</span>
            </div>
          </div>
        )}

        {/* STEP 4: CALIBRATION SUMMARY */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="text-center">
              <div className="inline-flex p-3 bg-emerald-50 rounded-full text-emerald-600 mb-2">
                <Leaf className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-800 tracking-tight">Calibration Successfully Computed!</h2>
              <p className="text-slate-500 text-sm mt-1">Here is your estimated baseline daily emission profile.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-blue-600 text-xs font-medium uppercase tracking-wider mb-1">
                  <Car className="h-4 w-4" /> Transport
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">{tempStats.trans.toFixed(1)}</div>
                <div className="text-xs text-slate-400 mt-1">kg CO2e / day</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wider mb-1">
                  <Utensils className="h-4 w-4" /> Diet/Food
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">{tempStats.food.toFixed(1)}</div>
                <div className="text-xs text-slate-400 mt-1">kg CO2e / day</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wider mb-1">
                  <Zap className="h-4 w-4" /> Energy
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">{tempStats.energy.toFixed(1)}</div>
                <div className="text-xs text-slate-400 mt-1">kg CO2e / day</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-purple-600 text-xs font-medium uppercase tracking-wider mb-1">
                  <Trash2 className="h-4 w-4" /> Waste
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">{tempStats.waste.toFixed(1)}</div>
                <div className="text-xs text-slate-400 mt-1">kg CO2e / day</div>
              </div>
            </div>

            <div className="bg-emerald-950 text-emerald-50 rounded-xl p-5 border border-emerald-900 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="text-xs text-emerald-300 font-mono tracking-wider uppercase">Baseline Daily Carbon Output</div>
                <div className="text-3xl font-mono font-black text-white flex items-baseline gap-1">
                  {tempStats.total.toFixed(1)} <span className="text-sm font-normal text-emerald-300">kg CO2e / day</span>
                </div>
                <p className="text-xs text-emerald-200/80 leading-relaxed max-w-md">
                  Your baseline footprint is estimated at {((tempStats.total * 365) / 1000).toFixed(1)} metric tons CO2e annually. The global average sits at ~4.5 tons/capita, while standard targets are below 2.0.
                </p>
              </div>
              <div className="text-center font-mono py-2 px-3 border border-emerald-800 bg-emerald-900 rounded-lg">
                <span className="text-xs text-emerald-300 block mb-1">Recommended Coach Path</span>
                <span className="text-sm font-bold bg-white text-emerald-950 px-2.5 py-0.5 rounded-full capitalize">
                  {selectedPersona.replace("-", " ")}
                </span>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 leading-relaxed italic block mt-2 text-center">
              "We don't need a handful of people doing zero waste perfectly. We need millions of people doing it imperfectly." — Anne Marie Bonneau
            </div>
          </div>
        )}

        {/* Nav Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-6 bg-white shrink-0">
          {step > 0 ? (
            <button
              onClick={handleBack}
              id="assessment-back"
              className="px-5 py-2 rounded-lg text-slate-500 border border-slate-200 text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              id="assessment-next"
              className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium flex items-center gap-2 cursor-pointer transition-all"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={runCalibration}
              id="assessment-finish"
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              Complete setup! <Check className="h-4 w-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
