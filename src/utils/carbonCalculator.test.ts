/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { 
  calculateBaseline, 
  calculateDailyEntryEmissions, 
  DEFAULT_ASSESSMENT,
  VEHICLE_FACTORS,
  DIET_FACTORS
} from "./carbonCalculator";

describe("carbonCalculator", () => {
  describe("calculateBaseline", () => {
    it("should correctly compute standard baseline targets", () => {
      const result = calculateBaseline(DEFAULT_ASSESSMENT);
      
      expect(result).toHaveProperty("transport");
      expect(result).toHaveProperty("food");
      expect(result).toHaveProperty("energy");
      expect(result).toHaveProperty("waste");

      // Verify mathematical structures
      expect(result.transport).toBeGreaterThan(0);
      expect(result.food).toBeGreaterThan(0);
      expect(result.energy).toBeGreaterThan(0);
      expect(result.waste).toBeGreaterThan(0);
    });

    it("should calculate zero personal transport factor when vehicleType is none", () => {
      const assessment = {
        ...DEFAULT_ASSESSMENT,
        vehicleType: "none" as const,
        commuteMilesPerWeek: 0,
        transitHoursPerWeek: 0,
        flightsPerYear: 0
      };
      const result = calculateBaseline(assessment);
      expect(result.transport).toBe(0);
    });

    it("should apply dietary factors correctly based on vegan choice", () => {
      const assessment = {
        ...DEFAULT_ASSESSMENT,
        dietType: "vegan" as const,
        foodWasteLevel: "low" as const,
        organicLocalRatio: 0.0
      };
      const result = calculateBaseline(assessment);
      // Vegan base: 1.7, low waste: -0.4 = 1.3
      expect(result.food).toBeCloseTo(1.3);
    });

    it("should correctly offset composted and recycled waste", () => {
      const assessment = {
        ...DEFAULT_ASSESSMENT,
        wasteRecyclingRate: 1.0, // 100% recycling saves 0.7 kg
        compostsOrganics: true // saves 0.4 kg
      };
      const result = calculateBaseline(assessment);
      // Max waste: 1.8 - 0.7 - 0.4 = 0.7 kg
      expect(result.waste).toBeCloseTo(0.7);
    });
  });

  describe("calculateDailyEntryEmissions", () => {
    const mockBaseline = {
      transport: 5.0,
      food: 4.5,
      energy: 3.5,
      waste: 1.2
    };

    it("should correctly calculate zero emissions day relative to baseline", () => {
      const logEntry = {
        id: "test-log-1",
        date: "2026-06-21",
        milesDriven: 0,
        milesTransit: 0,
        milesBikedWalked: 10,
        servingsRedMeat: 0,
        servingsPoultryFish: 0,
        mealsPlantBased: 0, // defaults to food baseline
        foodWastedScore: "none" as const,
        shorterShowerDone: true, // saves 0.6
        thermostatOffsetUsed: true, // saves 1.25
        phantomPowerCut: true, // saves 0.35
        recycledFully: true, // saves 0.7
        compostedFully: true // saves 0.4
      };

      const result = calculateDailyEntryEmissions(logEntry, mockBaseline);
      
      // Expected emissions:
      // Transport: 0
      // Food: 4.5 (since no meals logged)
      // Energy: 3.5 - 0.6 - 1.25 - 0.35 = 1.3
      // Waste: 1.8 - 0.7 - 0.4 = 0.7
      // Total: 0 + 4.5 + 1.3 + 0.7 = 6.5
      expect(result.actual).toBeCloseTo(6.5);
      
      // Baseline Total: 5.0 + 4.5 + 3.5 + 1.2 = 14.2
      // Saved: 14.2 - 6.5 = 7.7
      expect(result.saved).toBeCloseTo(7.7);
    });

    it("should handle heavy red meat emissions accurately", () => {
      const logEntry = {
        id: "test-log-2",
        date: "2026-06-21",
        milesDriven: 10, // 10 * 0.32 = 3.2
        milesTransit: 0,
        milesBikedWalked: 0,
        servingsRedMeat: 2, // 2 * 4.0 = 8.0
        servingsPoultryFish: 0,
        mealsPlantBased: 1, // 1 * 0.5 = 0.5
        foodWastedScore: "lots" as const, // +1.0
        shorterShowerDone: false,
        thermostatOffsetUsed: false,
        phantomPowerCut: false,
        recycledFully: false,
        compostedFully: false
      };

      const result = calculateDailyEntryEmissions(logEntry, mockBaseline);
      // Food: 8.0 + 0.5 + 0.8 (buffer) + 1.0 (waste) = 10.3
      // Transport: 3.2
      // Energy: 3.5
      // Waste: 1.8
      // Total: 3.2 + 10.3 + 3.5 + 1.8 = 18.8
      expect(result.actual).toBeCloseTo(18.8);
    });
  });
});
