# Mausam Vaani (मौसम वाणी)
> **Hyperlocal Multimodal Weather & Agricultural Advisory Platform for Indian Agriculture**

Mausam Vaani is a dual-mode, bilingual (Hindi & English) climate and agrometeorology application designed for smallholder Indian farmers as well as agronomists, researchers, and climate analysts.

---

## 🌟 Core Architecture & Dual Modes

The platform offers two specialized operational interfaces:

### 1. किसान मोड (Kisan Mode)
A voice-first, high-contrast, tactile interface optimized for rural farmers across India:
- **वाक सहायक (Rural Voice Assistant)**: Real-time hands-free speech input with bilingual Gemini Copilot analysis, speaking natural Devanagari Hindi or English.
- **मेरी ज़मीन (My Land Setup & Soil Diagnostics)**: Land area, water source selection, and multimodal AI soil photograph diagnosis following ICAR / Soil Health Card benchmarks.
- **फसल सलाह (Crop Advisory)**: Dynamic seasonal crop recommendations (Kharif, Rabi, Zaid) based on soil moisture, climate parameters, and soil taxonomy.
- **मौसम चेतावनी (EWS Emergency Alerts)**: Color-coded CAP-CP alerts (NDMA / IMD) with audio directives and step-by-step farmer action guides.
- **2G / Degraded Network Mode**: Ultra-lightweight fallback ensuring rural accessibility even on slow 2G mobile data connections.

### 2. एक्सप्लोरर मोड (Explorer Mode)
A comprehensive meteorological workspace for agricultural officers, researchers, and district administrators:
- **Current Weather & High-Resolution Telemetry**: Live multi-model atmospheric telemetry (ECMWF, GFS, Open-Meteo) with consensus scoring.
- **Doppler Radar Map**: Interactive Leaflet-powered radar with live rain reflectivity layers, storm tracking, and cloud overlay.
- **Climate Analytics & Synoptic Trends**: 7-day precipitation anomalies, temperature deviations, and automated Agromet Bulletin generator.
- **Monsoon Deficit Tracker**: Cumulative district-level rainfall monitoring against long-period averages (LPA).
- **Work Safety & Livestock THI**: Temperature-Humidity Index (THI) for dairy cattle and Wet-Bulb Globe Temperature (WBGT) labor safety windows.
- **Journey Weather Planner**: Route-based weather forecasting between source and destination districts.
- **Climate AI Copilot**: Advanced meteorological and agronomic query terminal with session memory and multi-source consensus verification.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Material Design 3 tokens
- **Maps**: Leaflet & React-Leaflet with OpenStreetMap and RainViewer Doppler radar tiles
- **AI & Multimodal**: Google Generative AI (Gemini 2.5 Flash / 1.5 Flash fallback)
- **Audio & Speech**: Web Speech API (`SpeechSynthesis`, `webkitSpeechRecognition`) with client-side audio prewarming and dynamic rate control
- **Weather Telemetry**: Open-Meteo API (Multi-model consensus: ECMWF IFS, GFS, Air Quality API)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Production
```bash
npm run build
npm run start
```