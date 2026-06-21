import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Lazy initialization of Gemini SDK
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

// 1. Health check & configuration check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/config", (req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    appUrl: process.env.APP_URL || null
  });
});

// 2. Coach Chat Proxy Route
app.post("/api/coach/chat", async (req, res) => {
  try {
    const { vertical, footprint, history, message } = req.body;
    
    // Check if key is present
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "Please configure your GEMINI_API_KEY in the 'Settings > Secrets' panel to unlock the full AI carbon coach experience."
      });
    }

    // Determine the system instruction based on selected vertical
    let systemInstruction = "";
    let coachName = "";
    
    if (vertical === "eco-commuter") {
      coachName = "Aero";
      systemInstruction = `You are 'Aero', an expert Transit & Daily Mobility Carbon Coach. Your goal is to help the user understand, monitor, and reduce their transport-related carbon footprint.
Focus heavily on:
- Biking, walking, and electric micromobility
- Public transit optimization (trains, subways, buses)
- Transitioning to hybrid/EV vehicles vs ICE cars
- High-occupancy carpooling and eco-driving strategies (e.g. steady speeds, proper tire inflation)
- Strategies for long distance travel (flight avoidance, rail alternatives, direct vs layover options)
- Remote work benefits and route optimization

Keep your responses conversational, practical, highly encouraging, and split into clear, readable paragraphs. Use bullet points for specific recommendations. Do not use overly dry scientific jargon, but speak passionately about travel alternatives and emission numbers. Mention CO2 emission savings when appropriate. Speak to the user as their helpful transit strategist.`;
    } else if (vertical === "mindful-eater") {
      coachName = "Sprout";
      systemInstruction = `You are 'Sprout', an expert Sustainable Food & Eco-Dietary Specialist. Your goal is to help the user reduce their carbon footprint through mindful culinary decisions, plant-forward transitions, and reducing kitchen waste.
Focus heavily on:
- Plant-based foods (legumes, nuts, vegetables) vs high-impact animal proteins (beef, lamb, dairy)
- Sourcing locally, seasonally, and supporting regeneratively farmed foods
- Minimizing food waste (smart shopping lists, meal prepping, creative leftovers, and composting)
- Cooking efficiency (lids on pots, using electric kettles, toaster ovens vs large ovens)
- Single-use packaging avoidance and bulk shopping

Keep your responses warm, welcoming, friendly, and practical. Use bullet points for specific ingredient substitutions, simple recipes, or shopping tips. Speak to the user as a supportive kitchen coach who believes in 'small changes, big impact'.`;
    } else if (vertical === "green-homemaker") {
      coachName = "Kelvin";
      systemInstruction = `You are 'Kelvin', an expert Passive Home Energy & Sustainable Living Consultant. Your goal is to help the user slash heating, cooling, electricity, water, and trash footprints in their living space.
Focus heavily on:
- Smart heating and cooling strategies (thermostat offsets, weather stripping, thick curtains, natural drafts)
- Electrical efficiency (Vampire power strips, LED swap, washing laundry in cold water, line drying clothes)
- Water conservation habits (low-flow aerators, shorter showers, greywater reuse)
- Household waste (composting, recycling properly, reducing plastics, repairs over replacements)
- Renewable energy options (residential solar, green electricity tariffs, heat pumps)

Keep your responses analytical but hands-on, ultra-practical, and logical. Use bullet points for DIY home inspections, energy audits, and simple product comparisons. Speak to the user as a trusted technical friend who loves efficiency engineering.`;
    } else {
      coachName = "EcoCoach";
      systemInstruction = `You are a generalized Green Living and Carbon Footprint Coach. Help the user discover easy ways to live sustainably, track emissions, and save carbon across all high-impact domains: travel, diet, and household energy. Keep responses structured, helpful, and highly positive.`;
    }

    // Prepare full contents sequence for stateless prompt history
    // history is expected to be an array of: { role: "user" | "model", parts: [{ text: string }] }
    const contentsPayload = [];
    
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contentsPayload.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.message || msg.parts?.[0]?.text || "" }]
        });
      }
    }
    
    // Add current footprint stats context inside the user request to ground the model
    const footprintContext = footprint 
      ? `\n\n[USER CURRENT CARBON STATS: Daily Footprint: ${footprint.totalDaily.toFixed(1)} kg CO2e. Breakdown - Transport: ${footprint.breakdown.transport.toFixed(1)} kg, Food: ${footprint.breakdown.food.toFixed(1)} kg, Energy: ${footprint.breakdown.energy.toFixed(1)} kg, Waste: ${footprint.breakdown.waste.toFixed(1)} kg. Primary Focus Area Selected: ${vertical}]`
      : "";

    contentsPayload.push({
      role: "user",
      parts: [{ text: `${message}${footprintContext}` }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    res.json({
      text: response.text,
      coachName
    });

  } catch (error: any) {
    console.error("Error in AI coach chat:", error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR", message: error.message });
  }
});

// 3. Personalized Pledges/Suggestions Route
app.post("/api/coach/suggestions", async (req, res) => {
  try {
    const { vertical, footprint, completedPledges } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "Gemini API Key missing. Returning default fallback challenges."
      });
    }

    const completedText = completedPledges && completedPledges.length > 0 
      ? `The user has already completed/completed pledges: ${JSON.stringify(completedPledges)}.`
      : "The user has no completed pledges yet.";

    const promptText = `Generate exactly 4 highly specific, personalized, actionable carbon reduction "Pledged Green Deeds" or habit commitments for an individual whose chosen lifestyle focus profile is "${vertical}".
    
    User Current Footprint Stats:
    - Transport Emission: ${footprint?.breakdown?.transport || 6.2} kg CO2e/day
    - Food Emission: ${footprint?.breakdown?.food || 4.5} kg CO2e/day
    - Energy/Home Emission: ${footprint?.breakdown?.energy || 5.8} kg CO2e/day
    - Waste Emission: ${footprint?.breakdown?.waste || 1.1} kg CO2e/day
    - Total Footprint: ${footprint?.totalDaily || 17.6} kg CO2e/day (Global average is ~12 kg, goal is <5 kg)

    ${completedText}

    Please design 4 fresh pledges. Ensure that at least 2 pledges are directly focused on their selected primary focus domain "${vertical}", and the remaining 2 target their other high emission categories to provide a holistic strategy.
    
    Format the output as a strict JSON array containing exactly 4 items, each matching the following TypeScript structure:
    {
      id: string (unique identifier like 'pledge-carpool-2', 'pledge-thermostat-1', etc.),
      title: string (short, engaging action name, e.g. "Line Dry Your Clothes"),
      description: string (one clear sentence explaining what to do and how it helps),
      category: "transportation" | "diet" | "energy" | "waste",
      savings: number (estimated carbon emission savings in kg CO2e per WEEK as a simple number, e.g. 5.4),
      difficulty: "Easy" | "Medium" | "Hard"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique slug, e.g. pledge-walk-short" },
              title: { type: Type.STRING, description: "Action title, action-oriented" },
              description: { type: Type.STRING, description: "Detailed description of the pledge item" },
              category: { type: Type.STRING, description: "Matching one of: transportation, diet, energy, waste" },
              savings: { type: Type.NUMBER, description: "Weekly kilograms of CO2e saved by this action" },
              difficulty: { type: Type.STRING, description: "Difficulty level: Easy, Medium, or Hard" }
            },
            required: ["id", "title", "description", "category", "savings", "difficulty"]
          }
        }
      }
    });

    const suggestions = JSON.parse(response.text || "[]");
    res.json(suggestions);

  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    // Return standard fallback challenges if there's any API issue
    res.status(500).json({ error: "SUGGESTION_GENERATION_FAILED", message: error.message });
  }
});

// 4. Vite Dev Server and Static Assets pipeline
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
