# Mausam Vaani (मौसम वाणी)

**A bilingual, voice-first weather and crop advisory web app for Indian farmers, with a separate analytics workspace for agronomists and researchers.**

Built with Next.js 14, TypeScript, Gemini multimodal AI, and multi-model weather data (ECMWF, GFS) from Open-Meteo.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4_MD3-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini Multimodal AI](https://img.shields.io/badge/Google_Gemini-2.5_%2F_2.0_%2F_1.5_Flash-8E75B2?logo=google)](https://ai.google.dev/)
[![Open-Meteo](https://img.shields.io/badge/Weather_Data-ECMWF_IFS_%2B_GFS-orange)](https://open-meteo.com/)

---

## Why this exists

Most weather apps assume an English-reading user on a fast connection. A smallholder farmer in rural India often has neither. They need to know whether to irrigate, spray, sow, or harvest, and they need the answer in spoken Hindi on a weak mobile network.

Mausam Vaani solves this with a **dual-mode architecture**: an accessible, voice-driven interface for farmers (**Kisan Mode**), paired with a deep meteorological telemetry and early-warning workspace for researchers and district officers (**Explorer Mode**).

---

## Two modes, two audiences

### 1. Kisan Mode (किसान मोड) — For Farmers
High-contrast, large-touch-target UI designed around voice input and Hindi (Devanagari).

| Feature | What it does |
|---|---|
| **Voice assistant (वाक सहायक)** | Hands-free speech in Hindi/English. Direct audio fallback to Gemini Multimodal AI when browser STT fails; responds with natural spoken voice. |
| **My Land (मेरी ज़मीन)** | Land area and water source setup; camera upload of soil photos for AI diagnosis against ICAR / Soil Health Card parameters. |
| **Crop Advisory (फसल सलाह)** | Kharif / Rabi / Zaid crop guidance based on live soil moisture (0-1cm), local climate, and soil drainage. |
| **Emergency Alerts (मौसम चेतावनी)** | Color-coded CAP-CP (NDMA / IMD) emergency alerts with audio directives and step-by-step actions. |
| **2G mode** | Stripped-down, lightweight UI and offline baseline for unstable or slow mobile connections. |

### 2. Explorer Mode (एक्सप्लोरर मोड) — For Agronomists & Officers
A comprehensive meteorological workspace for agronomists, researchers, and district administrators.

| Feature | What it does |
|---|---|
| **Multi-model telemetry** | Pulls ECMWF IFS (0.25°) and NOAA GFS forecasts, scoring consensus agreement between them. |
| **Doppler radar map** | Interactive Leaflet map with live RainViewer reflectivity, wind particles, and 9 IMD radar station radius rings. |
| **Early warning simulator** | Simulates CAP alert broadcasts over Cell Broadcast, SMS, and IVR with official 853/960Hz dual-tone sirens. |
| **Agromet bulletin (GKMS)** | Auto-generates official district advisory bulletins with print/PDF export formatting. |
| **Livestock THI & worker safety** | Cattle Temperature-Humidity Index (NRC formula) and WBGT-based safe working windows for field labour. |
| **Monsoon deficit tracker** | District-level cumulative rainfall tracking against Long Period Average (LPA) benchmarks. |
| **Journey weather planner** | Route weather calculator across agricultural corridors (e.g., Indore–Bhopal, Lucknow–Varanasi). |
| **Climate AI Copilot** | Multi-turn research assistant grounded in ICAR practices and live weather telemetry. |

---

## Tech stack

| Layer | Tools | Purpose |
|---|---|---|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript | Full-stack server/client architecture, SSR streaming |
| **Styling** | Tailwind CSS, Material Design 3 tokens | Accessible high-contrast rural UI tokens |
| **AI** | Google Generative AI (Gemini 2.5 Flash / 2.0 / 1.5) | Audio query processing, soil CV diagnosis, agronomy copilot |
| **Speech & Audio** | Server Neural TTS (`/api/tts`), Web Speech API, Web Audio API | Low-latency Hindi neural voice, emergency siren synthesis |
| **Maps** | Leaflet, React-Leaflet, OpenStreetMap, RainViewer | Doppler radar reflectivity and wind vector layers |
| **Weather data** | Open-Meteo (ECMWF IFS, GFS, Air Quality API) | Multi-model consensus telemetry, PM2.5/PM10/AQI |

---

## Engineering highlights

- **Resilient AI fallback:** Cascades requests across `gemini-2.5-flash` $\to$ `gemini-2.0-flash` $\to$ `gemini-1.5-flash` so quota limits or version changes never break the assistant.
- **Server-side neural Hindi TTS:** Native browser Hindi voices sound robotic. A custom route (`/api/tts`) chunks text at Devanagari punctuation boundaries (`।`), synthesizes in parallel, and streams cached neural audio.
- **Leaflet SSR resolution:** Prevented Next.js App Router hydration crashes (`window is not defined`) via dynamic client imports and manual retina icon asset remapping.
- **Zero-key offline resilience:** An internal ICAR rule-based engine and a sub-300ms normalized query cache allow the app to run seamlessly even without an API key or when offline.
- **Multi-model ensemble consensus:** Evaluates temperature delta ($\Delta T$) and precipitation variance between ECMWF IFS and NOAA GFS to give users an empirical forecast confidence score.

---

## Getting started

**Requirements:** Node.js 18+ and npm or yarn.

```bash
git clone https://github.com/AnimeshForged/Mausam-Vaani.git
cd Mausam-Vaani
npm install
```

Create a `.env.local` file in the project root:

```bash
# Optional: Live AI features (app has built-in offline agronomy reasoning if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
```

Run locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (Kisan Mode: `?mode=kisan` | Explorer Mode: `?mode=explorer`).

Production build:

```bash
npm run build
npm run start
```

---

## Limitations

- **Computer vision soil estimation:** Smartphone photograph analysis provides approximate visual classification, texture, and moisture indicators; it cannot substitute laboratory chemical soil assay for precise N-P-K (ppm) or micronutrient testing.
- **Dialectal acoustic variations:** While Hindi and Hinglish queries are supported, highly localized rural dialects (e.g., Malvi, Nimadi, Bhojpuri) may experience higher speech-to-text word error rates in noisy field environments.
- **Radar coverage boundaries:** Doppler radar reflectivity relies on RainViewer feeds and proximity to active IMD radar stations (150–250 km radius); peripheral mountainous or deep inland regions have reduced radar resolution.


## Future Scope

- **Vernacular dialect models:** Integration with AI4Bharat / Bhashini models to extend voice support across regional dialects (Bhojpuri, Bundeli, Marwari, Marathi, Telugu).
- **Offline PWA & telecom gateways:** Service Worker background sync for full offline PWA usage, paired with direct SMS and IVR voice broadcasts via telecom gateways for zero-internet reach.
- **IoT & micro-station telemetry:** Ingesting live readings from on-farm LoRaWAN soil moisture probes and local automated weather stations (AWS).
- **Satellite multispectral imagery:** Integrating Sentinel-2 / Landsat NDVI (Normalized Difference Vegetation Index) layers for remote crop canopy stress and pest monitoring.

