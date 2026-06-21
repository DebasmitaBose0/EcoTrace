/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssessmentData, CategoryBreakdown, DailyLogEntry } from "../types";

// Emission Factors (kg CO2e)
export const VEHICLE_FACTORS = {
  "none": 0.0,
  "electric": 0.08,     // kg CO2e per mile (EV grid emissions)
  "hybrid": 0.18,       // kg CO2e per mile
  "gas-average": 0.32,  // kg CO2e per mile (Standard sedan)
  "gas-suv": 0.46,      // kg CO2e per mile (SUV, Pickup truck)
};

export const DIET_FACTORS = {
  "vegan": 1.7,         // kg CO2e per day
  "vegetarian": 2.6,    // kg CO2e per day
  "poultry-fish": 3.9,  // kg CO2e per day
  "average-meat": 5.4,  // kg CO2e per day
  "heavy-meat": 7.5,    // kg CO2e per day
};

export const HEATING_FACTORS = {
  "none": 0,
  "electric": 0.002,     // per sqft per day
  "gas-oil": 0.004,      // per sqft per day
};

export const GRID_COEF = {
  "solar": 0.04,        // kg CO2e per kWh
  "mixed": 0.22,        // kg CO2e per kWh
  "standard-grid": 0.42 // kg CO2e per kWh (US / Global grid average)
};

/**
 * Calculates the baseline daily carbon footprint (kg CO2e) across categories.
 */
export function calculateBaseline(assessment: AssessmentData): CategoryBreakdown {
  // 1. Transportation Baseline
  const commuteMilesDaily = (assessment.commuteMilesPerWeek || 0) / 7;
  const vehicleFactor = VEHICLE_FACTORS[assessment.vehicleType] || 0.32;
  const transportCarDaily = commuteMilesDaily * vehicleFactor;
  
  // Transit (bus/train): average speed 25mph, factor 0.12 kg CO2e/mile
  const transitHoursDaily = (assessment.transitHoursPerWeek || 0) / 7;
  const transitMilesDaily = transitHoursDaily * 25;
  const transportTransitDaily = transitMilesDaily * 0.12;

  // Flights: average flight is 1200 miles each way = ~2400 miles. CO2 factor 0.18 kg CO2e/mile.
  // Net of ~430 kg CO2e per flight total.
  const flightsDaily = ((assessment.flightsPerYear || 0) * 430) / 365;

  const totalTransport = transportCarDaily + transportTransitDaily + flightsDaily;

  // 2. Diet Baseline
  let foodBase = DIET_FACTORS[assessment.dietType] || 5.4;
  
  // Adjust for food waste levels
  if (assessment.foodWasteLevel === "low") {
    foodBase -= 0.4;
  } else if (assessment.foodWasteLevel === "high") {
    foodBase += 1.2;
  }

  // Adjust for local/organic percentage (up to 12% savings if 100% organic/local)
  const organicSavings = assessment.organicLocalRatio * 0.12 * foodBase;
  const totalFood = Math.max(1.2, foodBase - organicSavings);

  // 3. Home Energy Baseline
  const electricityKwhDaily = (assessment.electricityKwhPerMonth || 350) / 30;
  const gridFactor = GRID_COEF[assessment.electricitySource] || 0.42;
  const electricityDaily = electricityKwhDaily * gridFactor;

  // Heating
  const heatingDaily = (assessment.houseSizeSqft || 1500) * (HEATING_FACTORS[assessment.heatingSource] || 0.002);

  const totalEnergy = electricityDaily + heatingDaily;

  // 4. Waste/Recycling Baseline
  // Global municipal waste baseline emission per Capita is ~1.8 kg CO2e per day.
  let totalWaste = 1.8;
  
  // Recycling reduces baseline up to 0.7 kg CO2e
  totalWaste -= assessment.wasteRecyclingRate * 0.7;

  // Composting organics reduces methane emission from landfill up to 0.4 kg CO2e
  if (assessment.compostsOrganics) {
    totalWaste -= 0.4;
  }

  totalWaste = Math.max(0.3, totalWaste);

  return {
    transport: Number(totalTransport.toFixed(2)),
    food: Number(totalFood.toFixed(2)),
    energy: Number(totalEnergy.toFixed(2)),
    waste: Number(totalWaste.toFixed(2)),
  };
}

/**
 * Calculates a single day's logged emissions and the carbon saved against baseline.
 */
export function calculateDailyEntryEmissions(
  entry: Omit<DailyLogEntry, "actualEmissionsCo2e" | "savedCo2e">,
  baseline: CategoryBreakdown
): { actual: number; saved: number } {
  // Let's calculate today's transport
  // 1. Transport logged
  const drivenEmission = entry.milesDriven * 0.32; // Standard gas car emissions for logging simplicity
  const transitEmission = entry.milesTransit * 0.08; // transit factor
  // Bike/walk is zero emission!
  const todayTransport = drivenEmission + transitEmission;

  // 2. Food logged
  // Meat (red) servings is extremely high-impact: ~4.0 kg per serving!
  // Poultry/fish: ~1.2 kg per serving
  // Veg/plain meal: ~0.6 kg per meal
  let todayFood = 0;
  todayFood += entry.servingsRedMeat * 4.0;
  todayFood += entry.servingsPoultryFish * 1.3;
  todayFood += entry.mealsPlantBased * 0.5;
  
  // Add baseline if no meal details logged, or scale logically
  const totalMealsLogged = entry.mealsPlantBased + (entry.servingsRedMeat > 0 ? 1 : 0) + (entry.servingsPoultryFish > 0 ? 1 : 0);
  if (totalMealsLogged === 0) {
    // default to dietary baseline if they didn't specify meals today
    todayFood = baseline.food;
  } else {
    // Add snack buffers
    todayFood += 0.8;
    // Food wasted score
    if (entry.foodWastedScore === "some") {
      todayFood += 0.3;
    } else if (entry.foodWastedScore === "lots") {
      todayFood += 1.0;
    }
  }

  // 3. Energy logged
  // Start with home energy daily baseline, then reduce for specific active deeds done today!
  let todayEnergy = baseline.energy;
  if (entry.shorterShowerDone) {
    todayEnergy -= 0.6; // saves 0.6 kg CO2e (~15 gallons of heated water saved)
  }
  if (entry.thermostatOffsetUsed) {
    todayEnergy -= 1.25; // saves 1.25 kg CO2e (averaging temperature offset habits)
  }
  if (entry.phantomPowerCut) {
    todayEnergy -= 0.35; // saves 0.35 kg CO2e by shutting down standby loads
  }
  todayEnergy = Math.max(0.1, todayEnergy);

  // 4. Waste logged
  let todayWaste = 1.8;
  if (entry.recycledFully) {
    todayWaste -= 0.7;
  }
  if (entry.compostedFully) {
    todayWaste -= 0.4;
  }
  todayWaste = Math.max(0.3, todayWaste);

  const actual = Number((todayTransport + todayFood + todayEnergy + todayWaste).toFixed(2));
  
  // Total baseline matches the categories sum
  const baselineTotal = baseline.transport + baseline.food + baseline.energy + baseline.waste;
  
  // Savings is baseline minus actual
  let saved = Number((baselineTotal - actual).toFixed(2));
  
  // If baseline was super low and actual was high, saved can be negative, which is mathematically correct!
  return {
    actual,
    saved
  };
}

/**
 * Default standard baseline if player has not completed calibration assessment yet
 */
export const DEFAULT_ASSESSMENT: AssessmentData = {
  vehicleType: "gas-average",
  commuteMilesPerWeek: 120,
  transitHoursPerWeek: 2,
  flightsPerYear: 2,
  dietType: "average-meat",
  foodWasteLevel: "medium",
  organicLocalRatio: 0.2,
  electricityKwhPerMonth: 400,
  electricitySource: "standard-grid",
  heatingSource: "gas-oil",
  houseSizeSqft: 1600,
  wasteRecyclingRate: 0.4,
  compostsOrganics: false,
};
