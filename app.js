// State Management
const STATE_KEY = 'ecopulse_user_state';
const DEFAULT_STATE = {
  theme: 'dark',
  commuteMode: 'gas-car',
  commuteDistance: 25,
  wfhDays: 2,
  deviceCount: 3,
  dietType: 'balanced',
  deliveryMeals: 4,
  streak: 0,
  lastLogDate: null,
  completedHabits: [], // Stores ids of completed habits for today
  totalReductions: 0 // Accumulator for logged reductions
};

let state = { ...DEFAULT_STATE };

// Define Carbon Emission Coefficients (Metric Tons CO2e per year baseline equivalents / daily equivalents)
// Calculations assume ~220 working days/year for commute and WFH calculations.
const COEFFICIENTS = {
  // Commute (kg CO2e per km)
  commute: {
    'gas-car': 0.17,
    'electric-car': 0.05,
    'public-transit': 0.03,
    'active-commute': 0,
    'none': 0
  },
  // Work Environment
  wfhDayCredit: 0.15, // metric tons CO2e reduced per year per WFH day (by avoiding corporate overhead/commutes)
  deviceBaseline: 0.08, // metric tons CO2e per device per year
  
  // Food & Diet (Metric tons CO2e per year)
  diet: {
    'meat-heavy': 2.9,
    'balanced': 1.7,
    'vegetarian': 1.1,
    'vegan': 0.7
  },
  // Deliveries (kg CO2e per order, including packaging and delivery transit)
  deliveryOrder: 1.5
};

// Daily Action Checklists definition
const HABITS = [
  { id: 'public-transit', title: 'Took Public Transit', desc: 'Avoided driving a private fossil fuel car today.', savings: 1500, icon: '🚇' },
  { id: 'skip-packaging', title: 'Declined Packaging', desc: 'Requested no single-use plastics or cutlery with delivery.', savings: 200, icon: '📦' },
  { id: 'wfh-savings', title: 'Work From Home Day', desc: 'Eliminated commuter footprint and office overhead.', savings: 2200, icon: '🏠' },
  { id: 'plant-meals', title: 'Strict Plant-Based Day', desc: 'Substituted all meat/dairy meals with plant alternatives.', savings: 1800, icon: '🥗' },
  { id: 'device-standby', title: 'Power Down Off-Hours', desc: 'Shut down monitors and laptops during non-working hours.', savings: 400, icon: '🔌' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  populateHabits();
  calculateFootprint();
  updateStreakUI();
});

// Load state from LocalStorage
function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    try {
      state = { ...DEFAULT_STATE, ...JSON.parse(saved) };
      // Check if day has changed to reset daily completed habits
      const today = new Date().toDateString();
      if (state.lastLogDate !== today) {
        state.completedHabits = [];
      }
    } catch (e) {
      state = { ...DEFAULT_STATE };
    }
  }
  
  // Set theme
  document.documentElement.setAttribute('data-theme', state.theme);
  
  // Sync inputs with state
  document.getElementById('commute-mode').value = state.commuteMode;
  document.getElementById('commute-distance').value = state.commuteDistance;
  document.getElementById('wfh-days').value = state.wfhDays;
  document.getElementById('device-count').value = state.deviceCount;
  document.getElementById('diet-type').value = state.dietType;
  document.getElementById('delivery-meals').value = state.deliveryMeals;
}

// Save state to LocalStorage
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    saveState();
  });

  // Dynamic Calculator Inputs
  const inputs = [
    'commute-mode', 'commute-distance', 'wfh-days', 
    'device-count', 'diet-type', 'delivery-meals'
  ];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      let val = e.target.value;
      if (e.target.type === 'number') {
        val = parseFloat(val) || 0;
      }
      const camelCaseId = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
      state[camelCaseId] = val;
      saveState();
      calculateFootprint();
    });
    // Add input listener for real-time calculations while typing
    if (document.getElementById(id).type === 'number') {
      document.getElementById(id).addEventListener('input', (e) => {
        let val = parseFloat(e.target.value) || 0;
        const camelCaseId = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        state[camelCaseId] = val;
        saveState();
        calculateFootprint();
      });
    }
  });
}

// Populate Daily Habits
function populateHabits() {
  const container = document.getElementById('habits-container');
  container.innerHTML = '';

  HABITS.forEach(habit => {
    const isCompleted = state.completedHabits.includes(habit.id);
    const item = document.createElement('div');
    item.className = `habit-item ${isCompleted ? 'completed' : ''}`;
    item.dataset.id = habit.id;
    
    item.innerHTML = `
      <div class="habit-checkbox"></div>
      <div class="habit-details">
        <span class="habit-title">${habit.icon} ${habit.title}</span>
        <span class="habit-desc">${habit.desc}</span>
      </div>
      <span class="habit-points">-${habit.savings}g</span>
    `;

    item.addEventListener('click', () => toggleHabit(habit.id));
    container.appendChild(item);
  });
  
  updateReductionMetric();
}

// Toggle Daily Habit State
function toggleHabit(habitId) {
  const index = state.completedHabits.indexOf(habitId);
  const today = new Date().toDateString();
  
  if (index === -1) {
    state.completedHabits.push(habitId);
    // Add to streak logic
    if (state.lastLogDate !== today) {
      if (state.lastLogDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (state.lastLogDate === yesterday.toDateString()) {
          state.streak += 1;
        } else {
          state.streak = 1;
        }
      } else {
        state.streak = 1;
      }
      state.lastLogDate = today;
    }
  } else {
    state.completedHabits.splice(index, 1);
    // If no habits completed today, we don't break the streak immediately, but limit streak growth.
  }
  
  saveState();
  populateHabits();
  updateStreakUI();
  calculateFootprint(); // Recalculate to update achievements
}

// Update streak display
function updateStreakUI() {
  const streakVal = document.getElementById('metric-streak');
  const streakText = document.getElementById('streak-level');
  
  streakVal.textContent = state.streak;
  if (state.streak === 0) {
    streakText.textContent = 'Start logging to begin!';
  } else if (state.streak < 3) {
    streakText.textContent = '🌱 Off to a great start!';
  } else if (state.streak < 7) {
    streakText.textContent = '🔥 Consistent Carbon Cutter!';
  } else {
    streakText.textContent = '🏆 Climate Action Champion!';
  }
}

// Update Daily Reductions counter
function updateReductionMetric() {
  let dailySavings = 0;
  state.completedHabits.forEach(habitId => {
    const habit = HABITS.find(h => h.id === habitId);
    if (habit) dailySavings += habit.savings;
  });
  
  document.getElementById('metric-reductions').textContent = dailySavings.toLocaleString();
}

// Perform baseline Carbon Footprint calculation & render interactive visual elements
function calculateFootprint() {
  // Commuter calculations
  // Baseline commuter emissions: 220 working days/year * daily distance * co2 rate
  const annualCommuteDays = Math.max(0, 5 - state.wfhDays) * 44; // approx days/year commuting
  const commuteCoef = COEFFICIENTS.commute[state.commuteMode] || 0;
  const transitFootprint = (state.commuteDistance * commuteCoef * annualCommuteDays) / 1000; // in metric tons

  // Home workspace / WFH calculations
  // Baseline overhead from home workspace
  const workspaceFootprint = state.deviceCount * COEFFICIENTS.deviceBaseline;
  // WFH Credits: energy saved by not commuting + reduced office building overhead
  const wfhOffset = state.wfhDays * COEFFICIENTS.wfhDayCredit;
  const netEnergyFootprint = Math.max(0.1, workspaceFootprint - wfhOffset);

  // Diet calculations
  const dietFootprint = COEFFICIENTS.diet[state.dietType] || 1.7;

  // Delivery meals calculations
  const deliveryFootprint = (state.deliveryMeals * 52 * COEFFICIENTS.deliveryOrder) / 1000; // in metric tons

  // Total baseline footprint
  const totalFootprint = parseFloat((transitFootprint + netEnergyFootprint + dietFootprint + deliveryFootprint).toFixed(1));
  
  // Render stats
  document.getElementById('metric-footprint').textContent = totalFootprint;

  // Render comparative trend
  const regionalAvg = 5.2; // average regional footprint for urban professionals (tons)
  const diffPct = Math.round(((regionalAvg - totalFootprint) / regionalAvg) * 100);
  const trendElement = document.getElementById('metric-trend');
  if (diffPct >= 0) {
    trendElement.className = 'stat-trend trend-down';
    trendElement.innerHTML = `<span style="font-weight: 700;">↓ ${diffPct}%</span> vs regional professional avg`;
  } else {
    trendElement.className = 'stat-trend trend-up';
    trendElement.innerHTML = `<span style="font-weight: 700;">↑ ${Math.abs(diffPct)}%</span> vs regional professional avg`;
  }

  // Draw Pie Chart SVG
  renderChart({
    Transit: transitFootprint,
    Energy: netEnergyFootprint,
    Diet: dietFootprint,
    Deliveries: deliveryFootprint
  });

  // Run AI/Smart Assistant engine based on hotspots
  generateSmartInsights(transitFootprint, netEnergyFootprint, dietFootprint, deliveryFootprint, totalFootprint);
  
  // Check achievements
  updateAchievements(totalFootprint);
}

// Render dynamic Pie Chart SVG
function renderChart(data) {
  const svg = document.getElementById('pie-chart');
  const legend = document.getElementById('chart-legend');
  legend.innerHTML = '';
  
  const colors = {
    Transit: 'var(--accent-emerald)',
    Energy: 'var(--accent-blue)',
    Diet: 'var(--accent-teal)',
    Deliveries: 'var(--accent-orange)'
  };

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  
  if (total === 0) {
    svg.innerHTML = `<circle r="16" cx="16" cy="16" fill="var(--border-color)" />`;
    return;
  }

  let accumulatedPercent = 0;
  let svgPaths = '';

  Object.entries(data).forEach(([key, val]) => {
    const percent = val / total;
    if (percent === 0) return;

    // Draw SVG circle components using stroke-dasharray/offset
    const strokeDash = `${percent * 100} ${100 - (percent * 100)}`;
    const strokeOffset = 100 - (accumulatedPercent * 100);
    
    svgPaths += `
      <circle r="15.915" cx="16" cy="16" 
              fill="transparent" 
              stroke="${colors[key]}" 
              stroke-width="3" 
              stroke-dasharray="${strokeDash}" 
              stroke-dashoffset="${strokeOffset}">
      </circle>
    `;

    accumulatedPercent += percent;

    // Add Legend Entry
    const legendItem = document.createElement('div');
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    legendItem.style.gap = '0.5rem';
    legendItem.innerHTML = `
      <span style="width: 12px; height: 12px; border-radius: 3px; background-color: ${colors[key]};"></span>
      <span style="font-size: 0.8125rem; font-weight: 500;">
        ${key}: <span style="font-weight: 700; color: var(--text-primary);">${(percent * 100).toFixed(0)}%</span> 
        <span style="color: var(--text-muted); font-size: 0.75rem;">(${val.toFixed(1)}t)</span>
      </span>
    `;
    legend.appendChild(legendItem);
  });

  svg.innerHTML = svgPaths;
}

// AI/Smart Assistant Assistant Engine
function generateSmartInsights(transit, energy, diet, deliveries, total) {
  const speechBubble = document.getElementById('assistant-speech-bubble');
  const hotspotText = document.getElementById('assistant-hotspot-text');
  
  // Find largest category
  const categories = [
    { name: 'Transit & Commuting', val: transit },
    { name: 'Home Workspace Energy', val: energy },
    { name: 'Dietary Selections', val: diet },
    { name: 'Packaging & Delivery Meals', val: deliveries }
  ];
  categories.sort((a, b) => b.val - a.val);
  const primaryHotspot = categories[0];
  
  hotspotText.textContent = `${primaryHotspot.name} makes up ${((primaryHotspot.val / (total || 1)) * 100).toFixed(0)}% of your carbon footprint. Focus on logging daily actions in this area.`;

  // Dynamic feedback messages
  let advice = "Hi there! I'm analyzing your urban professional routine. ";
  if (state.commuteMode === 'gas-car' && state.commuteDistance > 15) {
    advice += "Your daily driving is currently the single most effective target for reduction. Consider replacing at least 1-2 commutes per week with public transit or carpooling.";
  } else if (state.dietType === 'meat-heavy') {
    advice += "Red meat has a substantial agricultural footprint. Incorporating plant-based dinners just 2 days a week could reduce your baseline diet footprint by over 300kg CO2e annually.";
  } else if (state.deliveryMeals > 5) {
    advice += "Frequent food deliveries contribute high single-use packaging and short-haul transit footprint. Grouping orders or preparing food at home can help cut this down quickly.";
  } else if (state.wfhDays < 1) {
    advice += "Since you commute daily, check if your organization supports hybrid work arrangements. Remote setups are highly effective at lowering transport footprints!";
  } else {
    advice += "Your footprint is highly optimized! Make sure to log your active daily habits (like shutting down standby electronics) to keep pushing your baseline lower.";
  }
  
  speechBubble.textContent = advice;
}

// Achievement unlocking logic
function updateAchievements(totalFootprint) {
  // First Step Badge
  if (state.completedHabits.length > 0 || state.streak > 0) {
    document.getElementById('badge-first-step').classList.add('active');
  } else {
    document.getElementById('badge-first-step').classList.remove('active');
  }

  // Transit Hero Badge (active if choosing EV/Active/Transit and commuting)
  if (state.commuteMode === 'public-transit' || state.commuteMode === 'active-commute' || state.commuteMode === 'electric-car') {
    document.getElementById('badge-transit-hero').classList.add('active');
  } else {
    document.getElementById('badge-transit-hero').classList.remove('active');
  }

  // Green Eater Badge
  if (state.dietType === 'vegan' || state.dietType === 'vegetarian') {
    document.getElementById('badge-green-eater').classList.add('active');
  } else {
    document.getElementById('badge-green-eater').classList.remove('active');
  }

  // Carbon Cutter Badge (Under regional average of 5.2)
  if (totalFootprint < 5.2) {
    document.getElementById('badge-carbon-cutter').classList.add('active');
  } else {
    document.getElementById('badge-carbon-cutter').classList.remove('active');
  }
}
