# EcoPulse: Smart Carbon Footprint Tracker

EcoPulse is a premium, interactive web application designed to help individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights. It is specifically tailored for the **Urban Commuter & Professional** persona.

## 🌿 Persona: The Urban Commuter & Professional
Daily routines and workspaces heavily impact personal emissions. EcoPulse focuses on:
1. **Daily Commutes**: Captures transport modes (EV, Petrol/Diesel, Transit, Active Commute) and distances.
2. **Work Setup (WFH vs. Office)**: Dynamically calculates workspace offsets and device carbon overhead (monitors, laptops).
3. **Diet & Delivery Services**: Evaluates primary diet selections and delivery order frequencies (which introduce significant single-use packaging and transit impacts).

## 🚀 Key Features
- **Interactive Carbon Calculator**: Computes annual carbon footprint baseline in real-time as users modify settings.
- **Dynamic Chart Analysis**: Responsive SVG-based donut chart rendering breakdown of footprint divisions.
- **Daily Action Logger**: Dynamic checklist to log daily reductions (e.g., opting for public transit, declining single-use packaging).
- **Gamification & Consistency**: Integrates streaks and carbon badge achievements (Transit Hero, Green Eater, Carbon Cutter).
- **AI-Powered Coaching Assistant**: Generates customized coaching recommendations by analyzing largest emissions drivers (hotspots) in real-time.

## 🧮 Logic & Emission Factor Assumptions
All footprint calculations are done in Metric Tons of CO₂ equivalent ($CO_2e$) per year based on standard environmental datasets:
- **Commuter Driving (Fossil-Fuel)**: $0.17 \text{ kg } CO_2e/\text{km}$
- **Electric Vehicle (EV)**: $0.05 \text{ kg } CO_2e/\text{km}$ (representing grid power production overhead)
- **Public Transit**: $0.03 \text{ kg } CO_2e/\text{km}$
- **Active Commute (Walking/Cycling)**: $0 \text{ kg } CO_2e/\text{km}$
- **WFH Day Credit**: Reduces emissions by $0.15 \text{ metric tons } CO_2e/\text{year}$ per remote work day due to eliminated corporate building overhead.
- **Workspace Devices**: $0.08 \text{ metric tons } CO_2e/\text{year}$ per active professional device (laptops, secondary monitors).
- **Diets**: Vegan ($0.7\text{t}$), Vegetarian ($1.1\text{t}$), Balanced ($1.7\text{t}$), Meat-Heavy ($2.9\text{t}$).
- **Packaging/Delivery Orders**: $1.5 \text{ kg } CO_2e/\text{order}$.

## 🛠️ Stack & Structure
- **Core**: Vanilla HTML5 (Semantic Structure) & Javascript (Dynamic State & SVGs)
- **Styling**: Modern, responsive CSS3 Grid & Flexbox featuring dark/light theme, custom Outfit typography, glassmorphic UI elements, and sleek hover effects.
- **No external heavy libraries**: Making the entire site light, reliable, and compliant with size limitations (<10MB).
