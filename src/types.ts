/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Persona = "eco-commuter" | "mindful-eater" | "green-homemaker";

export interface CategoryBreakdown {
  transport: number; // kg CO2e per day
  food: number;      // kg CO2e per day
  energy: number;    // kg CO2e per day
  waste: number;     // kg CO2e per day
}

export interface AssessmentData {
  // Transport Options
  vehicleType: "none" | "electric" | "hybrid" | "gas-average" | "gas-suv";
  commuteMilesPerWeek: number;
  transitHoursPerWeek: number;
  flightsPerYear: number;

  // Diet Options
  dietType: "vegan" | "vegetarian" | "poultry-fish" | "average-meat" | "heavy-meat";
  foodWasteLevel: "low" | "medium" | "high";
  organicLocalRatio: number; // 0 to 1 scaling, e.g. 0.3 for 30%

  // Home Energy
  electricityKwhPerMonth: number;
  electricitySource: "solar" | "mixed" | "standard-grid";
  heatingSource: "none" | "electric" | "gas-oil";
  houseSizeSqft: number;

  // Waste habits
  wasteRecyclingRate: number; // 0 to 1 scaling, e.g. 0.5
  compostsOrganics: boolean;
}

export interface DailyLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  
  // Transportlogged
  milesDriven: number;
  milesTransit: number;
  milesBikedWalked: number;
  
  // Food logged
  servingsRedMeat: number;
  servingsPoultryFish: number;
  mealsPlantBased: number;
  foodWastedScore: "none" | "some" | "lots"; // none, some, lots
  
  // Homelogged
  shorterShowerDone: boolean; // short showers (<5 mins) saves carbon
  thermostatOffsetUsed: boolean; // offset heating/cooling saves carbon
  phantomPowerCut: boolean;     // unplugging vampire load saves carbon
  
  // Waste logged
  recycledFully: boolean;
  compostedFully: boolean;
  
  // Computed values for this specific logged day
  actualEmissionsCo2e: number; // in kg CO2e
  savedCo2e: number;           // in kg CO2e compared to average baseline
  notes?: string;
}

export interface Pledge {
  id: string;
  title: string;
  description: string;
  category: "transportation" | "diet" | "energy" | "waste";
  savings: number; // kg CO2e per week saved
  difficulty: "Easy" | "Medium" | "Hard";
  pledgedAt: string; // ISO date when pledged
  completedAt: string | null; // ISO date when completed, or null if active
}

export interface ChatMessage {
  role: "user" | "model";
  message: string;
  timestamp: string;
}
