/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../server";

// Mock GoogleGenAI client to prevent real network calls to Gemini during tests
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: function() {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify([
              {
                id: "pledge-carpool-2",
                title: "Carpool Weekly",
                description: "Share rides to reduce travel emissions.",
                category: "transportation",
                savings: 5.4,
                difficulty: "Easy"
              }
            ]),
          }),
        },
      };
    },
    Type: {
      ARRAY: "ARRAY",
      OBJECT: "OBJECT",
      STRING: "STRING",
      NUMBER: "NUMBER",
    },
  };
});

describe("Express Server API Endpoints", () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = "mocked-key";
  });

  it("GET /api/health should return status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("time");
  });

  it("GET /api/config should return key presence info", async () => {
    const res = await request(app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasApiKey", true);
  });

  it("POST /api/coach/chat should return 200 when parameters are correct", async () => {
    const res = await request(app)
      .post("/api/coach/chat")
      .send({
        vertical: "eco-commuter",
        message: "Hello Aero",
        footprint: {
          totalDaily: 10,
          breakdown: { transport: 4, food: 3, energy: 2, waste: 1 }
        },
        history: []
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("text");
    expect(res.body).toHaveProperty("coachName", "Aero");
  });

  it("POST /api/coach/chat should return 200 for mindful-eater vertical", async () => {
    const res = await request(app)
      .post("/api/coach/chat")
      .send({
        vertical: "mindful-eater",
        message: "Hello Sprout",
        footprint: {
          totalDaily: 10,
          breakdown: { transport: 4, food: 3, energy: 2, waste: 1 }
        },
        history: []
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("coachName", "Sprout");
  });

  it("POST /api/coach/chat should return 200 for green-homemaker vertical", async () => {
    const res = await request(app)
      .post("/api/coach/chat")
      .send({
        vertical: "green-homemaker",
        message: "Hello Kelvin",
        footprint: {
          totalDaily: 10,
          breakdown: { transport: 4, food: 3, energy: 2, waste: 1 }
        },
        history: []
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("coachName", "Kelvin");
  });

  it("POST /api/coach/suggestions should return 200 when parameters are correct", async () => {
    const res = await request(app)
      .post("/api/coach/suggestions")
      .send({
        vertical: "eco-commuter",
        footprint: {
          totalDaily: 10,
          breakdown: { transport: 4, food: 3, energy: 2, waste: 1 }
        },
        completedPledges: []
      });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("title", "Carpool Weekly");
  });
});
