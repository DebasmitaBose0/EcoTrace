/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, CategoryBreakdown, Persona } from "../types";
import { MessageSquare, Send, Sparkles, AlertCircle, RefreshCw, Bike, Utensils, Home, User } from "lucide-react";

interface AiCoachChatProps {
  vertical: Persona;
  footprint: {
    totalDaily: number;
    breakdown: CategoryBreakdown;
  };
  hasApiKey: boolean;
  onApiKeyMissing: () => void;
}

export default function AiCoachChat({ vertical, footprint, hasApiKey, onApiKeyMissing }: AiCoachChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Map vertical options to details
  const coachMap = {
    "eco-commuter": {
      name: "Aero",
      title: "Sustainable Transit & Mobility Strategist",
      accent: "border-blue-100 bg-blue-50/50 text-blue-900",
      avatar: Bike,
      bgColor: "bg-blue-600",
      bubbleColor: "bg-blue-50 border border-blue-100 text-slate-800",
      welcome: "Hi there! I'm Aero, your Sustainable Transit Coach. Ready to slash your daily travel emissions? Ask me how to optimize commutes, set up micro-carpooling, pick efficient vehicle combinations, or handle flight offsets!"
    },
    "mindful-eater": {
      name: "Sprout",
      title: "Conscious Food & Eco-Diet Specialist",
      accent: "border-emerald-100 bg-emerald-50/50 text-emerald-900",
      avatar: Utensils,
      bgColor: "bg-emerald-600",
      bubbleColor: "bg-emerald-50 border border-emerald-100 text-slate-800",
      welcome: "Welcome to the eco-kitchen! I'm Sprout, your Conscious Diet and Sourcing Coach. Let's design low-impact meal replacements, reduce food scraps, and transition to plant-forward living. What are we cooking today?"
    },
    "green-homemaker": {
      name: "Kelvin",
      title: "Passive Energy & Modern Home Consultant",
      accent: "border-amber-100 bg-amber-50/50 text-amber-900",
      avatar: Home,
      bgColor: "bg-amber-600",
      bubbleColor: "bg-amber-50 border border-amber-100 text-slate-800",
      welcome: "Greetings, efficiency enthusiast! I'm Kelvin, your Passive Household energy advisor. Let's audit your utility heating, tackle standby vampire loads, and audit resource waste together. Ask me anything!"
    }
  };

  const coach = coachMap[vertical] || coachMap["eco-commuter"];



  // Initialize welcome message when vertical changes
  useEffect(() => {
    setMessages([
      {
        role: "model",
        message: coach.welcome,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [vertical]);

  // Handle scrolling to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === "" || loading) return;

    const userText = input.trim();
    setInput("");

    // Append user message local-side
    const userMsg: ChatMessage = {
      role: "user",
      message: userText,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Prepared history inside payload
      const historyPayload = messages.map((m) => ({
        role: m.role,
        message: m.message
      }));

      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          footprint,
          history: historyPayload,
          message: userText
        })
      });

      const data = await res.json();

      if (res.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            message: data.text,
            timestamp: new Date().toISOString()
          }
        ]);
      } else if (data.error === "GEMINI_API_KEY_MISSING") {
        onApiKeyMissing();
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            message: "I am currently running in offline fallback mode because no active Gemini API key is configured. Please provide a valid GEMINI_API_KEY in the 'Settings > Secrets' panel to activate my neural coach mode!",
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        throw new Error(data.message || "Failed to call Gemini Coach server proxy.");
      }
    } catch (err: any) {
      console.error(err);
      // Give local fallback answers if key missing or server error
      let fallbackText = "I encountered a routing error communicating with the deep coach. Let's make a positive ecological baseline habit anyway! Remember that turning down your thermostat by just 1°C saves up to 10% of heating energy annually.";
      if (!hasApiKey) {
        fallbackText = `[Offline Coach Fallback - ${coach.name}]: Let me review your context. Your current daily emission index is ${footprint.totalDaily.toFixed(1)} kg CO2e. To reduce this, start by making one small, highly targeted behavior switch matching our ${vertical.replace("-", " ")} profile today! Set up a custom check list below. (Note: Configure your GEMINI_API_KEY in Settings > Secrets to unlock personalized generative AI coaching!).`;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          message: fallbackText,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Human-friendly text display formatting helper for paragraphs and bullet points
  const formatCoachMessage = (text: string) => {
    return text.split("\n\n").map((para, pIdx) => {
      // If it looks like a list
      if (para.startsWith("- ") || para.startsWith("* ") || /^\d+\./.test(para.trim())) {
        const lines = para.split("\n");
        return (
          <ul key={pIdx} className="list-disc pl-5 my-2.5 space-y-1.5 leading-relaxed text-slate-700 text-sm">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
              return <li key={lIdx}>{cleanLine}</li>;
            })}
          </ul>
        );
      }
      return (
        <p key={pIdx} className="leading-relaxed text-slate-700 text-sm mb-2.5 last:mb-0">
          {para}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[520px] overflow-hidden" id="ai-coach">
      {/* Coach Header */}
      <div className={`p-4 border-b flex items-center justify-between ${coach.bgColor} text-white`}>
        <div className="flex items-center space-x-3 text-left">
          <div className="text-2xl p-1.5 bg-white/10 rounded-lg backdrop-blur-sm flex items-center justify-center">
            {React.createElement(coach.avatar, { className: "h-5 w-5 text-white" })}
          </div>
          <div>
            <h3 className="font-display font-bold text-sm leading-tight flex items-center gap-1.5">
              <span>AI Coach {coach.name}</span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-300 fill-current animate-pulse" />
            </h3>
            <span className="text-white/80 text-[10px] uppercase font-mono tracking-wider">{coach.title}</span>
          </div>
        </div>

        {/* API Indicator */}
        <div className="text-xs">
          {!hasApiKey ? (
            <span className="bg-red-500/20 border border-red-400 text-red-100 px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" /> API Key Offline
            </span>
          ) : (
            <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1">
              ● AI Active
            </span>
          )}
        </div>
      </div>

      {/* Secrets Help Notification if Key Missing */}
      {!hasApiKey && (
        <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-start space-x-3 text-amber-800 text-xs text-left shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Neural Intelligence is Disabled:</span>
            <p className="text-slate-600 leading-relaxed">
              Define `GEMINI_API_KEY` inside **Settings &gt; Secrets** of your AI Studio console to unleash the active, responsive Gemini smart assistant.
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Profile Bubble icon */}
              <div
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 ${
                  isUser ? "bg-slate-700 text-white" : "bg-white shadow-sm border text-slate-700"
                }`}
              >
                {isUser ? <User className="h-4 w-4 text-white" /> : React.createElement(coach.avatar, { className: "h-4 w-4" })}
              </div>

              {/* Text Bubble content */}
              <div className="max-w-[85%] text-left">
                <div
                  className={`p-3.5 rounded-2xl shadow-xs text-xs md:text-sm ${
                    isUser
                      ? "bg-slate-800 text-white rounded-tr-none"
                      : `${coach.bubbleColor} rounded-tl-none`
                  }`}
                >
                  {isUser ? <p className="leading-relaxed">{m.message}</p> : formatCoachMessage(m.message)}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-2.5 flex-row">
            <div className="w-7 h-7 rounded-lg bg-white shadow-sm border text-slate-500 text-sm flex items-center justify-center">
              {React.createElement(coach.avatar, { className: "h-4 w-4" })}
            </div>
            <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-xs text-slate-500">
              <div className="flex space-x-1 items-center py-1 px-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Form area */}
      <form onSubmit={sendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Coach ${coach.name} for eco-advice...`}
          disabled={loading}
          className="flex-1 bg-slate-50 border border-slate-200 text-sm rounded-lg py-2.5 px-3 focus:outline-none focus:bg-white focus:border-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          id="coach-send-btn"
          disabled={input.trim() === "" || loading}
          className="p-2.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
