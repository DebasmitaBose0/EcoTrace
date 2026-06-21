/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AssessmentData, Persona, DailyLogEntry, Pledge } from "./types";
import { DEFAULT_ASSESSMENT, calculateBaseline } from "./utils/carbonCalculator";

// Import sub-components
import AssessmentForm from "./components/AssessmentForm";
import DailyLogForm from "./components/DailyLogForm";
import AiCoachChat from "./components/AiCoachChat";
import PledgeBoard from "./components/PledgeBoard";
import DashboardStats from "./components/DashboardStats";

// Import Lucide icons
import { 
  Leaf, 
  Sparkles, 
  TrendingDown, 
  Calendar, 
  MessageSquare, 
  Compass, 
  RefreshCw, 
  Info, 
  CheckCircle2, 
  ChevronRight, 
  User, 
  LineChart, 
  Target, 
  RotateCcw,
  Bell,
  Clock,
  X,
  Bike,
  Utensils,
  Home
} from "lucide-react";

export default function App() {
  // Initial Loader State
  const [appLoading, setAppLoading] = useState(true);
  const [loaderFadeOut, setLoaderFadeOut] = useState(false);
  const [currentTip, setCurrentTip] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [loadingStage, setLoadingStage] = useState("Calibrating carbon formulas...");

  const ecoTips = [
    "Replacing one beef meal a week saves equivalent carbon to driving 150 miles.",
    "Unplugging standby 'vampire' electronics can reduce electricity bills by up to 10%.",
    "Turning down your thermostat by just 2°F in winter saves about 6% in heating emissions.",
    "Composting diverts food scrap waste from landfills, preventing high-impact methane release.",
    "Public transit produces 80% fewer carbon emissions than driving a standard SUV alone.",
    "EVs generate 60-70% less lifecycle carbon emissions compared to gas cars on average grids."
  ];

  useEffect(() => {
    // Select a random tip
    setCurrentTip(ecoTips[Math.floor(Math.random() * ecoTips.length)]);
    
    // Start fetching config in parallel
    const configPromise = fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
      })
      .catch((err) => {
        console.warn("Could not check api configuration.", err);
        setHasApiKey(false);
      });

    // Smooth real-time percentage and phase ticker
    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += Math.floor(Math.random() * 4) + 1; // Slower, more organic increment steps
      if (currentPct >= 100) {
        currentPct = 100;
        clearInterval(interval);
      }
      setProgressPercentage(currentPct);

      if (currentPct < 30) {
        setLoadingStage("Calibrating carbon formulas...");
      } else if (currentPct < 65) {
        setLoadingStage("Securing AI Coach proxy...");
      } else if (currentPct < 90) {
        setLoadingStage("Optimizing pledges...");
      } else {
        setLoadingStage("Launching EcoTrace...");
      }
    }, 45); // Slower ticks

    const minimumDelay = new Promise((resolve) => setTimeout(resolve, 1500)); // Enforce a 1.5s visual floor

    Promise.all([configPromise, minimumDelay]).then(() => {
      // Let the percentage ticker reach 100% naturally before dismissing
      const finishInterval = setInterval(() => {
        if (currentPct >= 100) {
          clearInterval(finishInterval);
          // Fade out the loader panel smoothly
          setLoaderFadeOut(true);
          setTimeout(() => {
            setAppLoading(false);
          }, 500); // Wait for transition duration
        }
      }, 30);
    });

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Screen Tabs: "dashboard" | "coach" | "pledges" | "calibrate"
  const [activeTab, setActiveTab] = useState<"dashboard" | "coach" | "pledges" | "calibrate">("dashboard");

  // Core Persistent State
  const [hasCalibrated, setHasCalibrated] = useState<boolean>(() => {
    return localStorage.getItem("carbon_has_calibrated") === "true";
  });
  const [assessment, setAssessment] = useState<AssessmentData>(() => {
    const saved = localStorage.getItem("carbon_assessment");
    return saved ? JSON.parse(saved) : DEFAULT_ASSESSMENT;
  });
  const [selectedPersona, setSelectedPersona] = useState<Persona>(() => {
    const saved = localStorage.getItem("carbon_persona");
    return (saved as Persona) || "eco-commuter";
  });
  
  // Date selection state (Defaults to Today's local date YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const local = new Date(today.getTime() - offset * 60 * 1000);
    return local.toISOString().split("T")[0];
  });

  const [logs, setLogs] = useState<DailyLogEntry[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);

  // Daily Reminder Prompt Preferences
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("carbon_reminder_enabled");
    return saved === null ? true : saved === "true";
  });
  const [reminderTime, setReminderTime] = useState<string>(() => {
    const saved = localStorage.getItem("carbon_reminder_time");
    return saved || "20:00";
  });
  const [lastReminderDate, setLastReminderDate] = useState<string>(() => {
    return localStorage.getItem("carbon_reminder_last_date") || "";
  });
  const [toast, setToast] = useState<{ show: boolean; message: string } | null>(null);

  // Background Clock listener looking for the user's specific trigger timestamp
  useEffect(() => {
    if (!reminderEnabled) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      const offset = now.getTimezoneOffset();
      const local = new Date(now.getTime() - offset * 60 * 1000);
      const todayString = local.toISOString().split("T")[0];

      if (currentHourMin === reminderTime && lastReminderDate !== todayString) {
        setLastReminderDate(todayString);
        localStorage.setItem("carbon_reminder_last_date", todayString);
        setToast({
          show: true,
          message: "Time to log your daily habits! Keeping a consistent log optimizes your carbon intelligence.",
        });
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [reminderEnabled, reminderTime, lastReminderDate]);

  const handleToggleReminder = (enabled: boolean) => {
    setReminderEnabled(enabled);
    localStorage.setItem("carbon_reminder_enabled", String(enabled));
  };

  const handleUpdateReminderTime = (time: string) => {
    setReminderTime(time);
    localStorage.setItem("carbon_reminder_time", time);
  };

  const handleTriggerTestReminder = () => {
    setToast({
      show: true,
      message: `TEST ALERT: This is what your daily habit reminder at ${reminderTime} looks like!`,
    });
  };

  // 1. Initial Seeding of high-fidelity logs and pledges if empty
  useEffect(() => {
    const savedLogs = localStorage.getItem("carbon_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      // High-fidelity sample logs to populate visual dashboard instantly
      const baseline = calculateBaseline(assessment);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];
      const threeDaysAgo = new Date(Date.now() - 259200000).toISOString().split("T")[0];

      const sampleLogs: DailyLogEntry[] = [
        {
          id: "sample-1",
          date: yesterday,
          milesDriven: 10,
          milesTransit: 0,
          milesBikedWalked: 3,
          servingsRedMeat: 0,
          servingsPoultryFish: 1,
          mealsPlantBased: 2,
          foodWastedScore: "none",
          shorterShowerDone: true,
          thermostatOffsetUsed: true,
          phantomPowerCut: true,
          recycledFully: true,
          compostedFully: true,
          actualEmissionsCo2e: 7.2,
          savedCo2e: baseline.transport + baseline.food + baseline.energy + baseline.waste - 7.2,
          notes: "Walked to groceries, introduced meat-minimal dinners."
        },
        {
          id: "sample-2",
          date: twoDaysAgo,
          milesDriven: 45,
          milesTransit: 12,
          milesBikedWalked: 0,
          servingsRedMeat: 2,
          servingsPoultryFish: 0,
          mealsPlantBased: 0,
          foodWastedScore: "some",
          shorterShowerDone: false,
          thermostatOffsetUsed: false,
          phantomPowerCut: false,
          recycledFully: true,
          compostedFully: false,
          actualEmissionsCo2e: 24.8,
          savedCo2e: baseline.transport + baseline.food + baseline.energy + baseline.waste - 24.8,
          notes: "Heavy driving commute today. Beef burger for lunch."
        },
        {
          id: "sample-3",
          date: threeDaysAgo,
          milesDriven: 0,
          milesTransit: 0,
          milesBikedWalked: 12,
          servingsRedMeat: 0,
          servingsPoultryFish: 0,
          mealsPlantBased: 3,
          foodWastedScore: "none",
          shorterShowerDone: true,
          thermostatOffsetUsed: true,
          phantomPowerCut: true,
          recycledFully: true,
          compostedFully: true,
          actualEmissionsCo2e: 3.4,
          savedCo2e: baseline.transport + baseline.food + baseline.energy + baseline.waste - 3.4,
          notes: "Remote work day. Walked to errands, zero carbon meal day!"
        }
      ];
      setLogs(sampleLogs);
      localStorage.setItem("carbon_logs", JSON.stringify(sampleLogs));
    }

    const savedPledges = localStorage.getItem("carbon_pledges");
    if (savedPledges) {
      setPledges(JSON.parse(savedPledges));
    } else {
      // 2 Initial pledges
      const samplePledges: Pledge[] = [
        {
          id: "pledge-solar-1",
          title: "Shutdown Standby Stragglers",
          description: "Shut off TV and gaming consoles from their main wall sockets before sleep.",
          category: "energy",
          savings: 3.8,
          difficulty: "Easy",
          pledgedAt: new Date().toISOString(),
          completedAt: null
        },
        {
          id: "pledge-meat-restrict",
          title: "Restrict Beef Consumption",
          description: "Substitute beef dishes for poultry or local tofu recipes.",
          category: "diet",
          savings: 10.4,
          difficulty: "Hard",
          pledgedAt: new Date().toISOString(),
          completedAt: null
        }
      ];
      setPledges(samplePledges);
      localStorage.setItem("carbon_pledges", JSON.stringify(samplePledges));
    }
  }, []);

  // Sync state variables back to local storage on changes
  const saveAssessment = (newAssessment: AssessmentData, recommendedPersona: Persona) => {
    setAssessment(newAssessment);
    setSelectedPersona(recommendedPersona);
    setHasCalibrated(true);
    
    localStorage.setItem("carbon_assessment", JSON.stringify(newAssessment));
    localStorage.setItem("carbon_persona", recommendedPersona);
    localStorage.setItem("carbon_has_calibrated", "true");
    
    setActiveTab("dashboard");
  };

  const handleLogSave = (newLog: DailyLogEntry) => {
    // Overwrite if entry for date already exists, otherwise prepend
    const updated = logs.some((l) => l.date === newLog.date)
      ? logs.map((l) => (l.date === newLog.date ? newLog : l))
      : [newLog, ...logs];

    // Sort logs descending by date
    updated.sort((a, b) => b.date.localeCompare(a.date));

    setLogs(updated);
    localStorage.setItem("carbon_logs", JSON.stringify(updated));
  };

  const handleLogRemove = (id: string) => {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    localStorage.setItem("carbon_logs", JSON.stringify(updated));
  };

  const handlePledgeAdd = (
    title: string,
    description: string,
    category: Pledge["category"],
    savings: number,
    difficulty: Pledge["difficulty"]
  ) => {
    const freshPledge: Pledge = {
      id: `pledge-${Date.now()}`,
      title,
      description,
      category,
      savings,
      difficulty,
      pledgedAt: new Date().toISOString(),
      completedAt: null
    };
    const updated = [freshPledge, ...pledges];
    setPledges(updated);
    localStorage.setItem("carbon_pledges", JSON.stringify(updated));
  };

  const handlePledgeMarkCompleted = (id: string) => {
    const updated = pledges.map((p) => {
      if (p.id === id) {
        return { ...p, completedAt: new Date().toISOString() };
      }
      return p;
    });
    setPledges(updated);
    localStorage.setItem("carbon_pledges", JSON.stringify(updated));
  };

  const handlePledgeDrop = (id: string) => {
    const updated = pledges.filter((p) => p.id !== id);
    setPledges(updated);
    localStorage.setItem("carbon_pledges", JSON.stringify(updated));
  };

  // Reset demo databases back to initial states
  const handleResetApp = () => {
    if (confirm("Are you sure you want to reset all your logs, pledges, and baseline assessments back to default?")) {
      localStorage.clear();
      setHasCalibrated(false);
      setAssessment(DEFAULT_ASSESSMENT);
      setSelectedPersona("eco-commuter");
      window.location.reload();
    }
  };

  // Pre-calculate daily baseline values using calculator
  const baseline = calculateBaseline(assessment);
  const totalDailyBaseline = baseline.transport + baseline.food + baseline.energy + baseline.waste;

  // Render initial loader splash
  if (appLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden transition-opacity duration-500 ease-in-out ${loaderFadeOut ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-blue-500/5 blur-3xl rounded-full" />

        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">
            {/* Logo animation */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full h-24 w-24 mx-auto animate-pulse" />
              <div className="relative p-4 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl animate-bounce duration-1000">
                <Leaf className="h-10 w-10 text-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Titles */}
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center justify-center gap-2">
                EcoTrace
              </h1>
              <p className="text-xs font-mono text-emerald-400 tracking-widest uppercase font-semibold">
                AI-Powered Carbon Tracker & Coach
              </p>
            </div>

            {/* Progress bar container */}
            <div className="space-y-2.5 max-w-xs mx-auto">
              <div className="w-full bg-slate-950/80 border border-white/5 rounded-full h-2 overflow-hidden relative">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-75 ease-out" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center">
                <span className="animate-pulse">{loadingStage.toUpperCase()}</span>
                <span className="font-bold text-emerald-400">{progressPercentage}%</span>
              </div>
            </div>

            {/* Dynamic Eco-Tip panel */}
            <div className="bg-slate-950/50 border border-white/5 p-4.5 rounded-2xl max-w-sm mx-auto text-left space-y-2">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold block">
                Did You Know?
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                "{currentTip}"
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Render setup/calibration page if they haven't calibrated yet
  if (!hasCalibrated) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 md:px-6 flex flex-col justify-center">
        <div className="max-w-xl mx-auto text-center space-y-4 mb-8">
          <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full shadow-xs">
            <Leaf className="h-10 w-10 animate-pulse" />
          </div>
          <h1 className="text-4xl font-display font-black text-slate-800 tracking-tight">
            Carbon Footprint Tracker
          </h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
            Welcome! Our AI carbon setup calibrates your routine across transit, food, and home energy. Map your focus and launch your sustainable journey.
          </p>
        </div>

        <AssessmentForm currentAssessment={assessment} onSave={saveAssessment} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* Dynamic Top Announcement Banner based on Selected Persona */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 text-xs text-center flex flex-col md:flex-row items-center justify-center gap-1.5 font-mono">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400 fill-current" />
        <span>Selected Challenge Vertical Profile:</span>
        <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded capitalize">
          {selectedPersona.replace("-", " ")}
        </span>
        <span className="hidden md:inline text-slate-500">•</span>
        <span className="text-slate-400">
          {selectedPersona === "eco-commuter" && "AI Mentor Aero is active for transit optimization suggestions."}
          {selectedPersona === "mindful-eater" && "AI Mentor Sprout is active for kitchen carbon audit recipes."}
          {selectedPersona === "green-homemaker" && "AI Mentor Kelvin is active for heat and electrical offset tracking."}
        </span>
      </div>

      {/* Primary Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl">
              <Leaf className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight text-slate-800">Carbon Footprint Tracker</h1>
              <span className="text-xs text-slate-400 font-mono">Generative AI Eco-Assistance Suite</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LineChart className="h-4 w-4" /> },
              { id: "coach", label: "AI Coach Chat", icon: <MessageSquare className="h-4 w-4" /> },
              { id: "pledges", label: "Pledges & Habits", icon: <Target className="h-4 w-4" /> },
              { id: "calibrate", label: "Recalibrate Setup", icon: <User className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-xs border border-slate-100"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Reset App Anchor */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetApp}
              id="reset-app-btn"
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
              title="Reset application parameters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
        
        {/* TAB 1: DASHBOARD STATS */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              {/* Dynamic Footprint charts */}
              <DashboardStats 
                vertical={selectedPersona} 
                baseline={baseline} 
                logs={logs} 
                onRemoveLog={handleLogRemove} 
              />
            </div>
            
            {/* Daily Log input panel sidebar */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Target Date:</span>
                  <input
                    type="date"
                    id="date-picker"
                    max={new Date().toISOString().split("T")[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-1.5 font-mono text-slate-600 focus:outline-none"
                  />
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-left">
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                    Offline-First Local Storage Engine
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Your database logs, calibrations, and pledged habits sync instantly locally. To recalculate daily savings, pick a target date, adjust activities below, and click save. Yesterday's records can be backlogged freely.
                  </p>
                </div>
              </div>

              {/* Daily Prompt Time Settings Preference */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 text-left space-y-4" id="reminder-settings-card">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Daily Habit Reminder
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => handleToggleReminder(e.target.checked)}
                      className="sr-only peer"
                      id="reminder-toggle"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {reminderEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Alert Prompt Time</span>
                      <input
                        type="time"
                        id="reminder-time-input"
                        value={reminderTime}
                        onChange={(e) => handleUpdateReminderTime(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs font-mono rounded-lg p-1.5 text-slate-700 outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Automatically alerts you at <span className="font-semibold text-slate-600">{reminderTime}</span> to record today's habit choices.
                    </p>
                    <button
                      onClick={handleTriggerTestReminder}
                      id="test-notify-btn"
                      className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-[10px] font-mono font-semibold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Bell className="h-3.5 w-3.5" /> Test Alert Notification
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Reminder alerts are currently disabled. Toggle the switch to restore daily tracking notifications.
                  </p>
                )}
              </div>

              <DailyLogForm 
                baseline={baseline} 
                onSave={handleLogSave} 
                selectedDate={selectedDate} 
              />
            </div>
          </div>
        )}

        {/* TAB 2: AI RECRUIT COACH */}
        {activeTab === "coach" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            <div className="lg:col-span-2">
              <AiCoachChat 
                vertical={selectedPersona} 
                footprint={{
                  totalDaily: logs[0]?.actualEmissionsCo2e || totalDailyBaseline,
                  breakdown: logs[0] 
                    ? {
                        transport: logs[0].milesDriven * 0.32 + logs[0].milesTransit * 0.08,
                        food: logs[0].servingsRedMeat * 4 + logs[0].servingsPoultryFish * 1.3 + logs[0].mealsPlantBased * 0.5 + 0.8,
                        energy: baseline.energy - (logs[0].shorterShowerDone ? 0.6 : 0) - (logs[0].thermostatOffsetUsed ? 1.25 : 0),
                        waste: 1.8 - (logs[0].recycledFully ? 0.7 : 0)
                      }
                    : baseline
                }}
                hasApiKey={hasApiKey}
                onApiKeyMissing={() => setHasApiKey(false)}
              />
            </div>

            <div className="space-y-6">
              {/* Coach profile summary details */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
                <h3 className="font-display font-bold text-slate-800 text-sm">Adaptive Expert Personas</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  The AI coach automatically mutates depending on the focus path you activate. Each persona targets a specific highly-leverageable carbon domain:
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className={`p-3 rounded-xl border ${selectedPersona === "eco-commuter" ? "bg-blue-50/50 border-blue-200" : "border-slate-50"}`}>
                    <span className="font-bold text-slate-700 block flex items-center gap-1.5">
                      <Bike className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>Aero (Sustainable Commuter Strategist)</span>
                    </span>
                    <span className="text-slate-400 mt-0.5 block leading-relaxed">Specialized in vehicle factors, eco-driving, micro-transit routing, EV conversions, and carpools.</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${selectedPersona === "mindful-eater" ? "bg-emerald-50/50 border-emerald-200" : "border-slate-50"}`}>
                    <span className="font-bold text-slate-700 block flex items-center gap-1.5">
                      <Utensils className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Sprout (Sustainable Diet Specialist)</span>
                    </span>
                    <span className="text-slate-400 mt-0.5 block leading-relaxed">Specialized in greenhouse gases related to livestock, grocery supply pipelines, composting, and packaging.</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${selectedPersona === "green-homemaker" ? "bg-amber-50/50 border-amber-200" : "border-slate-50"}`}>
                    <span className="font-bold text-slate-700 block flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Kelvin (Home Resource Consultant)</span>
                    </span>
                    <span className="text-slate-400 mt-0.5 block leading-relaxed">Specialized in electric efficiency, solar arrays, home heating systems, water loads, and thermal currents.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLEDGES BOARD */}
        {activeTab === "pledges" && (
          <PledgeBoard
            vertical={selectedPersona}
            footprint={{
              totalDaily: logs[0]?.actualEmissionsCo2e || totalDailyBaseline,
              breakdown: logs[0] 
                ? {
                    transport: logs[0].milesDriven * 0.32 + logs[0].milesTransit * 0.08,
                    food: logs[0].servingsRedMeat * 4 + logs[0].servingsPoultryFish * 1.3 + logs[0].mealsPlantBased * 0.5 + 0.8,
                    energy: baseline.energy - (logs[0].shorterShowerDone ? 0.6 : 0) - (logs[0].thermostatOffsetUsed ? 1.25 : 0),
                    waste: 1.8 - (logs[0].recycledFully ? 0.7 : 0)
                  }
                : baseline
            }}
            activePledges={pledges}
            onCommit={handlePledgeAdd}
            onComplete={handlePledgeMarkCompleted}
            onAbandon={handlePledgeDrop}
          />
        )}

        {/* TAB 4: RECALIBRATE SETUP */}
        {activeTab === "calibrate" && (
          <div className="space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-slate-800">Recalibrate Carbon Baseline</h2>
              <p className="text-slate-500 text-xs">
                Has your primary vehicle changed or did you upgrade to solar panels electricity tariffs? Readjust questions below to retune baseline audits.
              </p>
            </div>
            <AssessmentForm currentAssessment={assessment} onSave={saveAssessment} />
          </div>
        )}

      </main>

      {/* Floating Toast Notification Alert */}
      {toast && toast.show && (
        <div 
          className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] sm:w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 text-left"
          id="toast-reminder-container"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5 shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-display font-black text-sm text-slate-100 flex items-center justify-between">
                <span>Carbon Habit Reminder</span>
                <button 
                  onClick={() => setToast(null)}
                  className="text-slate-400 hover:text-slate-200 focus:outline-none transition cursor-pointer p-0.5 rounded-lg hover:bg-slate-800"
                  id="close-toast-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>
              <div className="flex items-center gap-2 pt-2.5">
                <button
                  onClick={() => {
                    setActiveTab("dashboard");
                    setToast(null);
                    // Focus elements if needed
                    const picker = document.getElementById("date-picker");
                    if (picker) {
                      picker.focus();
                      picker.classList.add("ring-2", "ring-emerald-500");
                      setTimeout(() => {
                        picker.classList.remove("ring-2", "ring-emerald-500");
                      }, 2000);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                  id="toast-log-btn"
                >
                  Log Habits Now
                </button>
                <button
                  onClick={() => setToast(null)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer transition hover:bg-slate-800 rounded-lg"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
