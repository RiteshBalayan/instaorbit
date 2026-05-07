# InstaOrbit — Comprehensive Technical Documentation

**Version:** 1.0  
**Last Updated:** June 2025  
**Classification:** Company Confidential — Engineering Reference Document  
**Prepared by:** Engineering Team, InstaOrbit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [System Architecture](#3-system-architecture)
4. [Getting Started](#4-getting-started)
5. [Frontend Application](#5-frontend-application)
   - 5.1 [Application Entry & Routing](#51-application-entry--routing)
   - 5.2 [Home Page & Authentication](#52-home-page--authentication)
   - 5.3 [Trajectory Planner — Main Workspace](#53-trajectory-planner--main-workspace)
   - 5.4 [Spacecraft Designer (CAD)](#54-spacecraft-designer-cad)
   - 5.5 [Constellation Optimiser](#55-constellation-optimiser)
6. [State Management Architecture](#6-state-management-architecture)
   - 6.1 [Redux Store Overview](#61-redux-store-overview)
   - 6.2 [Satellite Configuration Slice](#62-satellite-configuration-slice)
   - 6.3 [Particles & Trace Points Slice](#63-particles--trace-points-slice)
   - 6.4 [Timer & Simulation Clock Slice](#64-timer--simulation-clock-slice)
   - 6.5 [Current State Slice (Live Satellite State)](#65-current-state-slice-live-satellite-state)
   - 6.6 [Communication & Links Slice](#66-communication--links-slice)
   - 6.7 [Ground Station Slice](#67-ground-station-slice)
   - 6.8 [View & Layout Slice](#68-view--layout-slice)
   - 6.9 [Working Project & Trajectory List](#69-working-project--trajectory-list)
   - 6.10 [Multi-Tab Synchronisation (BroadcastChannel)](#610-multi-tab-synchronisation-broadcastchannel)
7. [Simulation Engine](#7-simulation-engine)
   - 7.1 [Orbital Mechanics — Theory & Implementation](#71-orbital-mechanics--theory--implementation)
   - 7.2 [Frontend Simulator (Real-Time Mode)](#72-frontend-simulator-real-time-mode)
   - 7.3 [Backend Simulation Server](#73-backend-simulation-server)
   - 7.4 [Bulk Simulation Mode](#74-bulk-simulation-mode)
   - 7.5 [Propagation Models](#75-propagation-models)
   - 7.6 [Orbital Manoeuvre (Burn) System](#76-orbital-manoeuvre-burn-system)
8. [Attitude Determination & Control](#8-attitude-determination--control)
   - 8.1 [LVLH Reference Frame](#81-lvlh-reference-frame)
   - 8.2 [Quaternion Mathematics](#82-quaternion-mathematics)
   - 8.3 [Pointing Modes](#83-pointing-modes)
   - 8.4 [Slew Rate Limiting](#84-slew-rate-limiting)
   - 8.5 [Component Articulation](#85-component-articulation)
9. [Coordinate Transform Pipeline](#9-coordinate-transform-pipeline)
   - 9.1 [Physical Constants](#91-physical-constants)
   - 9.2 [Reference Frames](#92-reference-frames)
   - 9.3 [Transform Functions](#93-transform-functions)
   - 9.4 [Scene Coordinate System](#94-scene-coordinate-system)
10. [Communication & Link Budget Analysis](#10-communication--link-budget-analysis)
    - 10.1 [Link Budget Theory](#101-link-budget-theory)
    - 10.2 [Link Engine Architecture](#102-link-engine-architecture)
    - 10.3 [Contact Windows](#103-contact-windows)
    - 10.4 [Link Constraints & Validation](#104-link-constraints--validation)
    - 10.5 [QKD Network Path Analysis](#105-qkd-network-path-analysis)
11. [Time-Series Database (TSDB)](#11-time-series-database-tsdb)
    - 11.1 [Architecture & Motivation](#111-architecture--motivation)
    - 11.2 [Database Schema](#112-database-schema)
    - 11.3 [REST API](#113-rest-api)
    - 11.4 [WebSocket Protocol](#114-websocket-protocol)
    - 11.5 [Frontend Client](#115-frontend-client)
    - 11.6 [Resolution & Caching Strategy](#116-resolution--caching-strategy)
12. [3D Visualisation Engine](#12-3d-visualisation-engine)
    - 12.1 [Globe Renderer](#121-globe-renderer)
    - 12.2 [Satellite Renderer](#122-satellite-renderer)
    - 12.3 [Satellite Body Model & Articulation](#123-satellite-body-model--articulation)
    - 12.4 [Body Frame View (LVLH)](#124-body-frame-view-lvlh)
    - 12.5 [Ground Station Renderer](#125-ground-station-renderer)
    - 12.6 [Van Allen Belt Visualisation](#126-van-allen-belt-visualisation)
    - 12.7 [Earth Material & Shaders](#127-earth-material--shaders)
13. [2D Map Visualisation](#13-2d-map-visualisation)
    - 13.1 [Leaflet Integration](#131-leaflet-integration)
    - 13.2 [Ground Track Rendering](#132-ground-track-rendering)
    - 13.3 [Sub-Solar Point](#133-sub-solar-point)
14. [User Interface Components](#14-user-interface-components)
    - 14.1 [Top Bar & Project Management](#141-top-bar--project-management)
    - 14.2 [Menu Bar](#142-menu-bar)
    - 14.3 [Add Satellite Panel](#143-add-satellite-panel)
    - 14.4 [Walker Constellation Generator](#144-walker-constellation-generator)
    - 14.5 [Link Manager Panel](#145-link-manager-panel)
    - 14.6 [Ground Station Configuration](#146-ground-station-configuration)
    - 14.7 [Bulk Simulation Controls](#147-bulk-simulation-controls)
    - 14.8 [Timeline & Playback Controls](#148-timeline--playback-controls)
    - 14.9 [Viewport Layout System](#149-viewport-layout-system)
15. [Cloud Persistence & Collaboration](#15-cloud-persistence--collaboration)
    - 15.1 [Firebase Authentication](#151-firebase-authentication)
    - 15.2 [Firestore Data Model](#152-firestore-data-model)
    - 15.3 [Save / Load / Iterate Workflow](#153-save--load--iterate-workflow)
    - 15.4 [State Sanitisation for Cloud Storage](#154-state-sanitisation-for-cloud-storage)
16. [API Reference](#16-api-reference)
    - 16.1 [Simulation Server (Port 3001)](#161-simulation-server-port-3001)
    - 16.2 [TSDB Server (Port 3002)](#162-tsdb-server-port-3002)
17. [Data Flow Diagrams](#17-data-flow-diagrams)
    - 17.1 [Real-Time Simulation Loop](#171-real-time-simulation-loop)
    - 17.2 [Bulk Simulation Pipeline](#172-bulk-simulation-pipeline)
    - 17.3 [Link Budget Computation Flow](#173-link-budget-computation-flow)
    - 17.4 [Cloud Save/Load Flow](#174-cloud-saveload-flow)
18. [Physics Reference](#18-physics-reference)
    - 18.1 [Two-Body Problem](#181-two-body-problem)
    - 18.2 [Keplerian Orbital Elements](#182-keplerian-orbital-elements)
    - 18.3 [Anomaly Conversions](#183-anomaly-conversions)
    - 18.4 [SGP4 Propagation](#184-sgp4-propagation)
    - 18.5 [Link Budget Equations](#185-link-budget-equations)
    - 18.6 [Eclipse Geometry](#186-eclipse-geometry)
    - 18.7 [Sun Position Model](#187-sun-position-model)
19. [Performance & Scalability](#19-performance--scalability)
20. [Project Structure Reference](#20-project-structure-reference)
21. [Technology Stack](#21-technology-stack)
22. [Glossary](#22-glossary)

---

## 1. Executive Summary

**InstaOrbit** is a browser-based Space Engineering Design Lab that enables engineers, physicists, and mission designers to plan satellite trajectories, design satellite constellations, analyse communication link budgets, and visualise orbital mechanics — all from within a web browser.

The platform combines:

- **Real-time and bulk orbit propagation** using Keplerian and SGP4 models
- **3D globe visualisation** with Three.js, showing satellites, orbits, attitude, and articulated spacecraft components
- **2D ground track maps** via Leaflet with sub-satellite point tracking
- **Full attitude determination system** with quaternion-based pointing, slew-rate limiting, and multi-target priority resolution
- **Communication link budget analysis** including free-space path loss, SNR computation, contact windows, and QKD network path analysis
- **Time-series database** (SQLite + WebSocket) for efficient storage and playback of simulation history
- **Cloud persistence** through Firebase for authentication, project saving, and collaboration
- **Walker constellation generator** for rapid deployment of standard constellation patterns

The system is designed for **single-user and collaborative workflows**, enabling engineers to iterate on mission designs, save progress to the cloud, and share results with team members.

---

## 2. Product Overview

### 2.1 What InstaOrbit Does

InstaOrbit provides three main tools accessible from the home page:

| Tool | Route | Description |
|------|-------|-------------|
| **Trajectory Planner** | `/trajectoryplanner` | Full orbit simulation workspace with 3D/2D views, satellite management, link analysis, and timeline playback |
| **Spacecraft Designer** | `/cad` | Parametric 3D spacecraft shape editor |
| **Constellation Optimiser** | `/constellation` | Constellation design with coverage analysis |

### 2.2 Target Users

- **Aerospace Engineers** — Orbit design, manoeuvre planning, link margin analysis
- **Systems Engineers** — End-to-end mission architecture, constellation trade studies
- **Physicists** — Orbital mechanics research, reference frame validation
- **Mission Analysts** — Contact window scheduling, ground station coverage
- **Investors & Stakeholders** — Visual demonstrations of mission concepts

### 2.3 Key Capabilities

1. **Orbital Propagation** — Keplerian (analytical) and SGP4 (TLE-based) orbit propagation with sub-second timestep resolution
2. **Impulsive Manoeuvres** — Delta-V burns defined in the VNB (Velocity-Normal-Binormal) frame, applied at scheduled times
3. **Attitude Simulation** — Nadir-pointing, target-tracking, and sun-tracking with quaternion-based attitude, slew-rate limiting via SLERP
4. **Articulated Components** — Solar panels (1-DOF) and laser pointers (2-DOF) with per-axis constraint clamping
5. **Link Budget Analysis** — Real-time and bulk computation of FSPL, aperture gain, channel loss, SNR, link margin, photon rates, and data rates
6. **Contact Window Detection** — Automatic AOS/LOS detection with elevation angle, distance, and Earth-occlusion constraints
7. **QKD Network Analysis** — Quantum key distribution path analysis with direct, relay, and store-and-forward modes
8. **Walker Constellation Generation** — Standard T/P/F Walker Delta patterns with automatic satellite deployment
9. **Multi-View Layout** — Split-screen with 3D globe, 2D ground track map, and body-frame views simultaneously
10. **Cloud Persistence** — Google authentication, project save/load, iteration history with thumbnail capture
11. **Timeline Playback** — Scrub through simulation history with vis-timeline integration and event markers
12. **Time-Series Database** — Efficient SQLite-backed storage with WebSocket-based sliding window synchronisation

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                           │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  React    │  │  Redux Store │  │  Three.js    │  │  Leaflet   │ │
│  │  Router   │  │  (11 slices) │  │  (R3F/Drei)  │  │  Maps      │ │
│  └──────────┘  └──────┬───────┘  └──────────────┘  └────────────┘ │
│                       │                                             │
│  ┌────────────────────┼────────────────────────────────────────┐   │
│  │              Frontend Services Layer                         │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ TSDB Client  │  │ Firebase SDK  │  │ Sim Fetcher  │       │   │
│  │  │ (WS + REST)  │  │ (Auth + DB)   │  │ (HTTP POST)  │       │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │   │
│  └─────────┼─────────────────┼─────────────────┼───────────────┘   │
│            │                 │                 │                     │
└────────────┼─────────────────┼─────────────────┼────────────────────┘
             │                 │                 │
     ┌───────▼───────┐  ┌─────▼─────┐  ┌───────▼───────┐
     │  TSDB Server   │  │ Firebase  │  │  Sim Server   │
     │  (Port 3002)   │  │  Cloud    │  │  (Port 3001)  │
     │  Express + WS  │  │           │  │  Express      │
     │  SQLite (WAL)  │  │ Firestore │  │  SGP4 + Kepl. │
     └────────────────┘  │ Auth      │  │  Attitude     │
                         └───────────┘  │  Link Budget  │
                                        └───────────────┘
```

### 3.2 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Framework** | React 18.2 + Vite 5.2 | Component-based SPA with hot module replacement |
| **3D Rendering** | Three.js 0.165, @react-three/fiber 8.16, @react-three/drei 9.106 | WebGL globe, satellites, orbits, attitude visualisation |
| **2D Maps** | Leaflet 1.9.4, react-leaflet | Ground track plotting, ground station placement |
| **State Management** | Redux Toolkit 2.2.5 | Centralised application state with 11 slices |
| **Simulation Server** | Express.js (Node.js), port 3001 | Orbit propagation, attitude, link budget computation |
| **TSDB** | Express.js + ws, better-sqlite3, port 3002 | Time-series storage with WebSocket subscriptions |
| **SGP4 Library** | ootk 4.0.1 | NORAD SGP4/SDP4 orbit propagation from TLE data |
| **Authentication** | Firebase Auth (Google OAuth) | User identity and access management |
| **Cloud Database** | Firestore | Project persistence and sharing |
| **Animation** | Framer Motion | Page transitions and UI animations |
| **Timeline** | vis-timeline | Interactive timeline with event markers |
| **Styling** | CSS + styled-components + MUI | Dark-themed aerospace UI |

### 3.3 Repository Structure

```
instaorbit/
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── main.jsx               # Entry point, Redux Provider
│   │   ├── App.jsx                # React Router (4 routes)
│   │   ├── HomePage.jsx           # Landing page with tool cards
│   │   │
│   │   ├── Store/                 # Redux Toolkit slices
│   │   │   ├── store.jsx          # configureStore (11 slices)
│   │   │   ├── satelliteSlice.jsx # Satellite configs & body frames
│   │   │   ├── StateTimeSeries.jsx# Trace points & TSDB cache
│   │   │   ├── timeSlice.jsx      # Simulation clock & events
│   │   │   ├── CurrentState.jsx   # Live satellite state (pos/vel/att)
│   │   │   ├── communicationSlice.jsx # Links & contact windows
│   │   │   ├── groundStationSlice.jsx # Ground station configs
│   │   │   ├── View.jsx           # Viewport layout & display settings
│   │   │   ├── workingProject.jsx # Current project reference
│   │   │   ├── trajectorySlice.jsx# Trajectory list management
│   │   │   ├── groupSlice.jsx     # Satellite grouping
│   │   │   ├── authSlice.jsx      # Authentication state
│   │   │   └── broadcastMiddleware.jsx # Multi-tab sync
│   │   │
│   │   ├── TrajectoryPlanner/     # Main feature area
│   │   │   ├── TrajectoryPlanner.jsx  # Root container
│   │   │   ├── Simulation/        # Orbit propagation logic
│   │   │   │   ├── Simulator.jsx  # Per-satellite real-time sim
│   │   │   │   ├── StackSimulator.jsx # Maps over all satellites
│   │   │   │   ├── Functions.jsx  # Orbital mechanics (Kepler eq.)
│   │   │   │   ├── BodyFrameTransforms.jsx # Quaternion math
│   │   │   │   └── RefrenceFrameConvertor.jsx # VNB frame
│   │   │   ├── Render/            # 3D/2D visualisation
│   │   │   │   ├── GlobeRender.jsx    # Earth + atmosphere + sun
│   │   │   │   ├── SatelliteRender.jsx# Orbit + trace + body
│   │   │   │   ├── SatelliteBodyModel.jsx # Articulated 3D model
│   │   │   │   ├── BodyFrameView.jsx  # LVLH sat-centered view
│   │   │   │   ├── GroundStationRender.jsx # 3D ground stations
│   │   │   │   ├── VonAllenBelt.jsx   # Radiation belt visual
│   │   │   │   ├── EarthMaterial.jsx  # Day/night/cloud shader
│   │   │   │   ├── LeafletMapRender.jsx # 2D map container
│   │   │   │   └── LeafletMapOverlays.jsx # Map markers & tracks
│   │   │   └── Windows/           # UI panels & layout
│   │   │       ├── Globe.jsx      # Main viewport container
│   │   │       ├── GlobeAndTimer.jsx # Globe + timeline layout
│   │   │       ├── Timer.jsx      # Timeline panel
│   │   │       ├── Topbar/        # Top navigation
│   │   │       │   ├── TopBar.jsx # Project bar
│   │   │       │   └── MenuBar.jsx# Action bar
│   │   │       └── Sidebar/       # Configuration panels
│   │   │           ├── AddSatellite.jsx   # Satellite creator/editor
│   │   │           ├── AddConstellation.jsx # Walker generator
│   │   │           ├── LinkManager.jsx    # Link management
│   │   │           ├── LinkEngine.jsx     # Headless link compute
│   │   │           ├── LinkAnalysisTab.jsx# QKD analysis
│   │   │           ├── BulkSimControls.jsx# Batch simulation
│   │   │           └── linkComputation.js # Frontend link budget
│   │   │
│   │   ├── transforms/            # Coordinate transform library
│   │   │   ├── index.js           # Barrel export
│   │   │   ├── constants.js       # WGS-84 & astro constants
│   │   │   ├── gmst.js            # GMST computation
│   │   │   ├── eci2ecef.js        # ECI↔ECEF rotation
│   │   │   ├── ecef2geodetic.js   # ECEF↔geodetic
│   │   │   ├── sunPosition.js     # Sun ECI direction
│   │   │   ├── sceneCoords.js     # km↔scene unit conversion
│   │   │   ├── rotations.js       # Rotation primitives
│   │   │   └── pipeline.js        # High-level composite transforms
│   │   │
│   │   ├── services/
│   │   │   └── timeSeriesClient.js # TSDB client (REST + WS)
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useTSDB.js        # TSDB lifecycle management
│   │   │   ├── useTracePoints.js  # Per-satellite trace data
│   │   │   └── useLinkStates.js   # Link state lookup
│   │   │
│   │   ├── features/              # Feature modules
│   │   │   └── topbar/            # TopBar feature
│   │   │       └── hooks/
│   │   │           └── useProjectOperations.js # Save/Load operations
│   │   │
│   │   ├── firebase/              # Firebase integration
│   │   │   ├── firebase.jsx       # Firebase app init
│   │   │   ├── firebaseUtils.jsx  # Firestore CRUD
│   │   │   ├── buildSavePayload.js# State sanitisation
│   │   │   ├── googleauth.jsx     # Google OAuth
│   │   │   ├── login.jsx          # Login component
│   │   │   ├── signup.jsx         # Signup component
│   │   │   └── signout.jsx        # Sign-out component
│   │   │
│   │   ├── Constelation/          # Constellation module
│   │   ├── CAD/                   # CAD module
│   │   └── Styles/                # CSS stylesheets
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── server/                    # Simulation server (port 3001)
│   │   ├── index.js               # Express + Swagger setup
│   │   ├── routes/
│   │   │   └── propagation.js     # /simulate & /simulate-bulk
│   │   ├── attitude.js            # Attitude computation engine
│   │   ├── linkComputation.js     # Link budget computation
│   │   ├── transforms.js          # Server-side coordinate transforms
│   │   ├── functions.js           # Orbital mechanics functions
│   │   └── swagger.js             # OpenAPI 3.0 spec
│   │
│   └── tsdb/                      # Time-series database (port 3002)
│       ├── index.js               # Express + WebSocket server
│       ├── db.js                  # SQLite schema & prepared stmts
│       └── routes/                # REST endpoints
│           ├── sessions.js
│           ├── tracePoints.js
│           └── linkStates.js
│
├── index.html                     # Vite HTML entry
├── package.json                   # Root package (workspace)
└── vite.config.js                 # Vite configuration
```

---

## 4. Getting Started

### 4.1 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A modern browser (Chrome, Firefox, Edge) with WebGL support

### 4.2 Installation

```bash
# Clone the repository
git clone <repo-url>
cd instaorbit

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend/server
npm install
cd ../tsdb
npm install
```

### 4.3 Running the Development Environment

```bash
# Terminal 1 — Simulation Server
cd backend/server
node index.js
# → Listening on port 3001 (Swagger UI at http://localhost:3001/api-docs)

# Terminal 2 — TSDB Server
cd backend/tsdb
node index.js
# → REST on port 3002, WebSocket on ws://localhost:3002

# Terminal 3 — Frontend Dev Server
cd frontend
npm run dev
# → Vite dev server at http://localhost:5173
```

### 4.4 Building for Production

```bash
cd frontend
npm run build    # → outputs to build/
npm run preview  # → preview the built site
npm run deploy   # → deploy to GitHub Pages via gh-pages
```

---

## 5. Frontend Application

### 5.1 Application Entry & Routing

**`src/main.jsx`** is the application entry point. It wraps the app in the Redux `<Provider>` and renders `<App />`.

**`src/App.jsx`** defines the application routing:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `HomePage` | Landing page with tool selection |
| `/trajectoryplanner` | `TrajectoryPlanner` | Main simulation workspace |
| `/cad` | `Cad` | Spacecraft shape editor |
| `/constellation` | `ConstelationView` | Constellation design tool |

### 5.2 Home Page & Authentication

The **HomePage** (`src/HomePage.jsx`) presents:

- **Navigation bar** with InstaOrbit logo and authentication controls
- **Hero section** with animated star background ("Space Engineering Design Lab")
- **Tool cards** for Trajectory Planner, Spacecraft Designer, and Constellation Optimiser
- **Custom cursor** with animated ring effect (Framer Motion)

**Authentication** is handled via Firebase:
- Google OAuth sign-in via popup
- Email/password sign-up and login
- Auth state persisted in Redux (`authSlice`)
- Auth modal component for seamless login flow

### 5.3 Trajectory Planner — Main Workspace

The **Trajectory Planner** (`src/TrajectoryPlanner/TrajectoryPlanner.jsx`) is the primary workspace. It mounts:

1. **`useTSDB` hook** — Initialises a TSDB session on mount, syncs the sliding window as RenderTime changes
2. **`GlobeAndTimer`** — Main layout container
3. **`RightToolbar`** — Collapsible configuration panel

The layout hierarchy:

```
TrajectoryPlanner
 ├── useTSDB (hook — TSDB lifecycle)
 ├── GlobeAndTimer
 │    ├── Globe
 │    │    ├── TopBar (project management)
 │    │    ├── MenuBar (action buttons)
 │    │    ├── LinkEngine (headless link computation)
 │    │    ├── SimuStackSatellites (headless simulation)
 │    │    └── ViewPanel(s) — based on layout config:
 │    │         ├── 3D Globe (Canvas + GlobeRender)
 │    │         ├── 2D Map (LeafletMapRender)
 │    │         └── Body Frame (BodyFrameView)
 │    └── Timer (timeline panel)
 └── RightToolbar (satellite list, bulk sim, links, etc.)
```

### 5.4 Spacecraft Designer (CAD)

The CAD module (`src/CAD/`) provides a parametric 3D spacecraft shape editor with:
- Shape primitives (rectangles, cones, circles)
- Shape list management
- Interactive 3D viewport

### 5.5 Constellation Optimiser

The Constellation module (`src/Constelation/`) provides:
- 3D globe view (`ThreeDView.jsx`)
- 2D Leaflet map (`LeafletMap.jsx`)
- Ground coverage analysis (`GroundMap.jsx`)
- Layer management (`Layers.jsx`)
- Slim top bar with navigation controls

---

## 6. State Management Architecture

### 6.1 Redux Store Overview

The application uses **Redux Toolkit** with 11 slices configured in `src/Store/store.jsx`:

```
Store
 ├── auth           — User authentication state
 ├── particles      — Trace points, TSDB cache (visibleTracePoints, lowResTimelines)
 ├── timer          — Simulation clock, events, bookmarks, eclipse states
 ├── CurrentState   — Live satellite positions, velocities, attitudes
 ├── satellites     — Satellite configurations & body frames
 ├── groups         — Satellite grouping
 ├── workingProject — Current project reference (trajectory ID, iteration)
 ├── view           — Viewport layout, display toggles, reference frame
 ├── trajectoryList — Saved trajectory metadata
 ├── groundStations — Ground station configurations
 └── communication  — Links, contact windows, link metrics, handovers
```

A custom **BroadcastChannel middleware** (`broadcastMiddleware.jsx`) enables master→daughter tab state synchronisation, throttled via `requestAnimationFrame`.

### 6.2 Satellite Configuration Slice

**File:** `src/Store/satelliteSlice.jsx`

Each satellite configuration contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `name` | string | Display name |
| `propagator` | `'InstaOrbit'` \| `'SGP4'` | Propagation model selection |
| `InitialCondition` | object | Keplerian elements (a, e, i, Ω, ω, ν) |
| `color` | string | Hex colour for rendering |
| `burns` | array | Scheduled impulsive manoeuvres |
| `bodyFrame` | object | Attitude and component configuration |
| `Simulation` | boolean | Whether simulation is active |
| `Tracktail` | number | Number of trace points to display |
| `FutureTrack` | boolean | Show predicted future orbit |
| `Tube` | boolean | Render orbit as tube geometry |

**Body Frame Configuration:**

```javascript
defaultBodyFrame() → {
  bodyShape: 'rectangle',          // 'rectangle' | 'cone' | 'circle'
  dimensions: { x: 0.03, y: 0.03, z: 0.03 },
  pointingMode: 'nadir',           // 'nadir' | 'target'
  slewRateDegSec: 1.0,             // Maximum slew rate (°/s)
  pointingTargets: [],             // Priority-ordered target list
  components: [],                  // Articulated sub-components
}
```

**Component System:**

Components represent physically articulated subsystems mounted on the satellite body:

```javascript
createComponent(type) → {
  id: <uuid>,
  type: 'solarPanel' | 'laserPointer',
  name: 'Solar Panel 1' | 'Laser Pointer 1',
  parentAxis: '+Y',                // Mounting axis on satellite body
  offset: 0.04,                    // Distance from body centre
  pointingMode: 'default',         // 'default' | 'target' | 'fixed'
  pointingTargets: [],             // Component-level targets
  fixedAngles: { a1: 0, a2: 0 },  // Fixed articulation angles
  // Constraint ranges:
  minA1Deg: -180, maxA1Deg: 180,   // Axis 1 limits
  minA2Deg: -90, maxA2Deg: 90,     // Axis 2 limits (2-DOF only)
}
```

- **Solar Panels** — 1 degree of freedom (rotation about mounting axis, tracked by `a1`)
- **Laser Pointers** — 2 degrees of freedom (azimuth `a1` + elevation `a2`)

### 6.3 Particles & Trace Points Slice

**File:** `src/Store/StateTimeSeries.jsx` (slice name: `particles`)

This slice manages the **simulation history** for each satellite:

| Field | Type | Description |
|-------|------|-------------|
| `particles[]` | array | Per-satellite trace point arrays |
| `visibleTracePoints{}` | object | TSDB high-resolution windowed data (±60s around RenderTime) |
| `lowResTimelines{}` | object | TSDB low-resolution data (every 10th point) for timeline rendering |

Each **trace point** contains:

```javascript
{
  time: 0,         // Simulation elapsed time (seconds)
  x, y, z,         // Scene-unit position
  mapX, mapY,      // Legacy 2D map coordinates
  lat, lon, alt,   // Geodetic coordinates
  vx, vy, vz,      // Velocity (km/s)
  quaternion,       // [qx, qy, qz, qw] attitude quaternion
  component_angles, // { componentId: { a1, a2 } }
}
```

**Key Actions:**
- `initializeParticles({ id, name, tracePoints })` — Create a new particle entry
- `addTracePoint({ id, tracePoint })` — Append a single point (capped at 50,000)
- `bulkLoadTracePoints({ id, tracePoints })` — Replace all trace points (bulk sim results)
- `setVisibleTracePoints({ id, points })` — Update TSDB windowed data
- `setLowResTimelines({ id, points })` — Update TSDB low-res timeline

### 6.4 Timer & Simulation Clock Slice

**File:** `src/Store/timeSlice.jsx`

The timer manages the simulation clock and event system:

| Field | Type | Description |
|-------|------|-------------|
| `starttime` | number | UTC epoch (ms) of simulation start |
| `elapsedTime` | number | Current simulation time (seconds from start) |
| `RenderTime` | number | Timeline playhead position (seconds) — independent of live sim |
| `isRunning` | boolean | Whether the simulator is active |
| `coupled` | boolean | Whether RenderTime follows elapsedTime |
| `timeStep` | number | Simulation timestep (seconds) |
| `renderStep` | number | Render interval (seconds) |
| `playbackSpeed` | number | Speed multiplier (1x, 2x, 5x, 10x) |
| `simulationDuration` | number | Maximum simulation duration (seconds) |
| `loopMode` | boolean | Whether simulation loops at end |
| `timePoints[]` | array | Named bookmarks |
| `events[]` | array | Timeline event markers |
| `eclipseStates{}` | object | Per-satellite eclipse state |
| `orbitalEvents[]` | array | Detected orbital events (apogee, perigee, AOS, LOS) |

**Event Types:** `burn`, `eclipse_entry`, `eclipse_exit`, `aos` (acquisition of signal), `los` (loss of signal), `apogee`, `perigee`, `custom`

**Coupled vs Decoupled Mode:**
- **Coupled:** RenderTime advances with elapsedTime — the 3D view shows the live simulation
- **Decoupled:** RenderTime is independent — the user can scrub through history while simulation continues

### 6.5 Current State Slice (Live Satellite State)

**File:** `src/Store/CurrentState.jsx`

Stores the **instantaneous state** of each satellite as computed by the simulation engine:

```javascript
{
  id: 0,
  coordinates: { time, x, y, z, mapX, mapY, lat, lon, alt },
  elements: { a, e, ν, Ω, ω, i },     // Current orbital elements
  velocity: { vx, vy, vz },            // km/s in ECI
  attitude: {
    quaternion: [qx, qy, qz, qw],     // Body→ECI rotation
    pointingTarget: null | { ... },
    isSlewing: false,
    slewProgress: 0,
  },
  // Derived quantities (auto-computed):
  kineticEnergy, potentialEnergy, totalEnergy,
  altitude,                              // km above Earth surface
  speed,                                 // km/s orbital speed
  orbitalPeriod,                         // seconds
  inEclipse, eclipseFraction,            // Eclipse state
  subSatLat, subSatLon,                  // Sub-satellite point
  lastUpdate: Date.now(),
}
```

**Derived Value Computation:**

The slice automatically computes derived quantities from position and velocity:
- **Altitude** = $|\mathbf{r}| - R_\oplus$ where $R_\oplus = 6378.137$ km
- **Speed** = $|\mathbf{v}|$
- **Specific Energy** = $\frac{v^2}{2} - \frac{\mu}{r}$
- **Orbital Period** = $2\pi\sqrt{a^3/\mu}$

### 6.6 Communication & Links Slice

**File:** `src/Store/communicationSlice.jsx`

Manages the **inter-satellite and satellite-to-ground communication link** system:

**Link Configuration:**
```javascript
{
  id: <uuid>,
  txId: 'sat-0',              // Transmitter endpoint
  rxId: 'gs-station1',        // Receiver endpoint
  wavelengthNm: 1550,         // Optical wavelength (nm)
  txPowerW: 0.3,              // Transmit power (W)
  txApertureCm: 5,            // Tx aperture diameter (cm)
  rxApertureCm: 20,           // Rx aperture diameter (cm)
  txOpticalLossDb: 2,         // Tx optical losses (dB)
  rxOpticalLossDb: 2,         // Rx optical losses (dB)
  pointingLossDb: 1,          // Pointing loss (dB)
  atmosphericLossDb: 3,       // Atmospheric attenuation (dB)
  requiredMarginDb: 3,        // Required link margin (dB)
  dataRateMbps: 10,           // Target data rate (Mbps)
}
```

**Global Thresholds:**
- `minElevationDeg: 5` — Minimum elevation angle for ground links
- `maxDistanceKm: 50000` — Maximum link range

**Contact Windows:**

Contact windows track AOS (Acquisition of Signal) and LOS (Loss of Signal) events:

```javascript
{
  id: <uuid>,
  linkId: 'link-001',
  simStart: 1719792000000,    // UTC epoch of AOS
  simEnd: 1719793200000,      // UTC epoch of LOS
  closed: true,               // Whether window is complete
}
```

The system uses a coalesced open/close/extend pattern:
1. **Open** — When link conditions are first met
2. **Extend** — While conditions remain satisfied
3. **Close** — When conditions are no longer met

Maximum 500 contact windows per link (FIFO eviction).

**Bulk Simulation Lookup:**

After a bulk simulation, `activeLinksAtTime` provides an O(1) lookup table:

```javascript
activeLinksAtTime: {
  "0": { "link-001": { inLink: true, snrDb: 42.3, ... } },
  "1": { "link-001": { inLink: true, snrDb: 41.8, ... } },
  ...
}
```

### 6.7 Ground Station Slice

**File:** `src/Store/groundStationSlice.jsx`

Each ground station is configured with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g. `gs-1719792000000`) |
| `name` | string | Station name |
| `lat` | number | Geodetic latitude (°) |
| `lon` | number | Geodetic longitude (°) |
| `altKm` | number | Altitude above sea level (km) |
| `antennaGainDb` | number | Antenna gain (dB) |
| `frequencyMhz` | number | Operating frequency (MHz) |
| `txPowerW` | number | Transmit power (W) |
| `minElevationDeg` | number | Minimum elevation constraint (°) |
| `maxRangeKm` | number | Maximum tracking range (km) |
| `operationalHours` | object | Daily operational window |
| `trackingMode` | string | Tracking capability |

### 6.8 View & Layout Slice

**File:** `src/Store/View.jsx`

Controls the visual display state:

**Display Toggles:**
| Toggle | Default | Description |
|--------|---------|-------------|
| `Grid` | `true` | Reference grid in 3D view |
| `Axis` | `true` | Coordinate axes indicator |
| `VonAllenBelt` | `true` | Radiation belt visualisation |
| `HDEarth` | `true` | High-definition Earth textures |
| `Sun` | `true` | Sun object and lighting |
| `AmbientLight` | `true` | Ambient scene lighting |
| `trackWindow` | `false` | Limit ground track to ±1 hour |

**Reference Frame:**
- `'EarthInertial'` — ECI frame: Earth rotates beneath fixed orbits
- `'EarthFixed'` — ECEF frame: Earth stationary, orbits precess

**Layout System:**

```javascript
layout: {
  mode: 'single' | 'split',
  left: { type: '3d' | '2d' | 'bodyFrame', satelliteId?: number },
  right: { type: '3d' | '2d' | 'bodyFrame', satelliteId?: number },
}
```

Supports arbitrary combinations:
- Single 3D globe
- Single 2D map
- Side-by-side 3D + 2D
- 3D globe + body frame view for a specific satellite
- Any combination

### 6.9 Working Project & Trajectory List

**`workingProject` slice** tracks the currently loaded project:

```javascript
{
  trajectoryID: 'abc-123',
  trajectoryName: 'GEO Transfer Study',
  itterationName: 'v3-with-burns',
  itterationID: 'iter-456',
  itterationImage: 'data:image/png;base64,...',  // Thumbnail
  tsdbSessionId: 'session-789',                  // TSDB session for this iteration
}
```

**`trajectorySlice`** manages the list of all user trajectories with metadata:
- Archive/unarchive support
- Tags for organisation
- Thumbnail images (captured via html2canvas)
- Iteration count tracking

### 6.10 Multi-Tab Synchronisation (BroadcastChannel)

**File:** `src/Store/broadcastMiddleware.jsx`

InstaOrbit supports a **master/daughter tab** architecture:

1. **Master Tab** — Runs the simulation, dispatches state updates
2. **Daughter Tab(s)** — Receive synchronised state via `BroadcastChannel` API

The middleware:
- Intercepts Redux dispatches on the master tab
- Serialises state (stripping heavy data: tracePoints, activeLinksAtTime)
- Broadcasts via `BroadcastChannel('instaorbit-state')`
- Daughter tabs receive and apply state via `SET_*` extra reducers
- Throttled via `requestAnimationFrame` to prevent flooding

---

## 7. Simulation Engine

### 7.1 Orbital Mechanics — Theory & Implementation

InstaOrbit solves the **two-body problem** (Keplerian motion) to propagate satellite orbits. The fundamental equation is:

$$\ddot{\mathbf{r}} = -\frac{\mu}{r^3}\mathbf{r}$$

where $\mu = 398600.4418 \text{ km}^3/\text{s}^2$ is Earth's standard gravitational parameter (WGS-84).

**Keplerian Orbital Elements:**

| Symbol | Name | Description |
|--------|------|-------------|
| $a$ | Semi-major axis | Size of the orbit (km) |
| $e$ | Eccentricity | Shape (0 = circular, 0 < e < 1 = elliptical) |
| $i$ | Inclination | Tilt relative to equatorial plane (rad) |
| $\Omega$ | RAAN | Right ascension of ascending node (rad) |
| $\omega$ | Argument of periapsis | Orientation of ellipse in orbital plane (rad) |
| $\nu$ | True anomaly | Position along orbit (rad) |

**Implementation:** `src/TrajectoryPlanner/Simulation/Functions.jsx` and `backend/server/functions.js`

### 7.2 Frontend Simulator (Real-Time Mode)

**File:** `src/TrajectoryPlanner/Simulation/Simulator.jsx`

The `RealSimulator` component manages per-satellite real-time propagation:

```
For each satellite:
  1. Read current simulation time from Redux (elapsedTime)
  2. POST to backend /simulate with:
     - Orbital elements
     - Current time
     - Burns list
     - Body frame configuration
     - Ground station positions
     - Other satellite positions
  3. Receive back: position, velocity, geodetic, attitude, component angles
  4. Dispatch to Redux:
     - CurrentState.updateCoordinate (live state)
     - particles.addTracePoint (history)
     - timeSeriesClient.ingestTracePoint (TSDB storage)
  5. Handle speed multiplier > 1x by filling intermediate steps
```

**Gap-Filling for Fast Playback:**

When `playbackSpeed > 1`, the simulator computes intermediate timesteps to maintain physical accuracy. For example, at 10x speed, it computes 10 steps per real second, each 1 second of simulation time.

**Stack Simulator** (`StackSimulator.jsx`) maps over all satellite configurations and renders a `RealSimulator` for each.

### 7.3 Backend Simulation Server

**File:** `backend/server/index.js` (Express, port 3001)

The simulation server provides:

1. **`POST /simulate`** — Single timestep propagation
2. **`POST /simulate-bulk`** — Multi-satellite batch propagation over a time range
3. **Swagger UI** at `/api-docs` — Interactive API documentation

**Single-Step Simulation (`POST /simulate`):**

Request body:
```json
{
  "elements": { "a": 7000, "e": 0.001, "M": 0, "Ω": 0, "ω": 0, "i": 0.9 },
  "time": 120.0,
  "propagator": "InstaOrbit",
  "burns": [],
  "bodyFrame": { ... },
  "starttime": 1719792000000,
  "allSatellites": [...],
  "groundStations": [...]
}
```

Response:
```json
{
  "position": [6800.0, 1200.0, 300.0],
  "velocity": [-1.2, 6.8, 0.5],
  "geodetic": { "lat": 28.5, "lon": -80.6, "alt": 421.0 },
  "attitude": {
    "quaternion": [0.1, 0.2, 0.3, 0.9],
    "pointingTarget": { "name": "Ground Station 1", "type": "groundStation" },
    "isSlewing": false,
    "slewProgress": 1.0
  },
  "componentAngles": {
    "comp-001": { "a1": 45.0 },
    "comp-002": { "a1": 30.0, "a2": -15.0 }
  }
}
```

### 7.4 Bulk Simulation Mode

**File:** `backend/server/routes/propagation.js` (`POST /simulate-bulk`)

Bulk simulation propagates **all satellites over a time range** in a single request, computing:

1. Position & velocity at each timestep
2. Geodetic coordinates (lat/lon/alt)
3. Attitude quaternion with target resolution
4. Component articulation angles
5. Link budget for all configured links
6. Contact window detection

**Request:**
```json
{
  "satellites": [{ "id": 0, "elements": {...}, "propagator": "InstaOrbit", ... }],
  "starttime": 1719792000000,
  "duration": 5400,
  "step": 1,
  "links": [...],
  "groundStations": [...]
}
```

**Response:** Arrays of trace points per satellite, link states per timestep, and contact windows.

**Performance:** The bulk endpoint processes all satellites in parallel at each timestep, enabling multi-hour simulations to complete in seconds.

### 7.5 Propagation Models

**Keplerian (InstaOrbit):**

1. Compute mean motion: $n = \sqrt{\mu/a^3}$
2. Advance mean anomaly: $M(t) = M_0 + n \cdot t$
3. Solve Kepler's equation iteratively: $M = E - e \sin E$ (Newton-Raphson, tolerance $10^{-10}$)
4. Convert eccentric anomaly to true anomaly: $\nu = 2 \arctan\left(\sqrt{\frac{1+e}{1-e}} \tan\frac{E}{2}\right)$
5. Convert to Cartesian via the rotation matrix: $\mathbf{R}(\Omega, i, \omega)$

**SGP4 (NORAD):**

Uses the `ootk` library to propagate from Two-Line Element (TLE) sets. TLEs encode orbital elements in the SGP4/SDP4 format with perturbation models including:
- J2 oblateness
- Atmospheric drag
- Solar radiation pressure
- Third-body effects (Sun/Moon)

### 7.6 Orbital Manoeuvre (Burn) System

Burns are defined in the **VNB (Velocity-Normal-Binormal) frame**:

| Component | Direction | Physical Meaning |
|-----------|-----------|------------------|
| $\Delta V_V$ | Along velocity | Raises/lowers orbit altitude |
| $\Delta V_N$ | Orbit normal | Changes inclination |
| $\Delta V_B$ | Completes right-hand frame | Cross-track manoeuvre |

Each burn is specified as:
```javascript
{
  time: 3600,           // Trigger time (seconds from start)
  deltaV: [0.1, 0, 0],  // [dV, dN, dB] in km/s
  applied: false,        // Whether burn has been executed
}
```

**VNB Frame Construction:**

```javascript
V̂ = v/|v|                    // Velocity direction
N̂ = (r × v)/|r × v|          // Orbit normal
B̂ = V̂ × N̂                    // Binormal (completes frame)
```

The delta-V is transformed from VNB to ECI and applied as an instantaneous velocity change:

$$\mathbf{v}_{\text{new}} = \mathbf{v}_{\text{old}} + \Delta V_V \hat{V} + \Delta V_N \hat{N} + \Delta V_B \hat{B}$$

After burn application, new orbital elements are computed from the updated state vector.

---

## 8. Attitude Determination & Control

### 8.1 LVLH Reference Frame

The **Local Vertical Local Horizontal (LVLH)** frame is the primary attitude reference, following the STK/GMAT convention:

$$\hat{Z}_{\text{LVLH}} = -\hat{R} \quad \text{(nadir — toward Earth)}$$

$$\hat{Y}_{\text{LVLH}} = -\frac{\mathbf{R} \times \mathbf{V}}{|\mathbf{R} \times \mathbf{V}|} \quad \text{(negative orbit normal)}$$

$$\hat{X}_{\text{LVLH}} = \hat{Y}_{\text{LVLH}} \times \hat{Z}_{\text{LVLH}} \quad \text{(approximately along-track)}$$

The LVLH quaternion is constructed from these basis vectors using the rotation matrix → quaternion conversion.

### 8.2 Quaternion Mathematics

**File:** `src/TrajectoryPlanner/Simulation/BodyFrameTransforms.jsx`

The attitude system uses **unit quaternions** $\mathbf{q} = (q_x, q_y, q_z, q_w)$ with $|\mathbf{q}| = 1$.

**Key Operations:**

| Operation | Formula |
|-----------|---------|
| **Multiply** | $\mathbf{q}_1 \otimes \mathbf{q}_2$ — Hamilton product |
| **Conjugate** | $\mathbf{q}^* = (-q_x, -q_y, -q_z, q_w)$ |
| **Rotate vector** | $\mathbf{v}' = \mathbf{q} \otimes (v_x, v_y, v_z, 0) \otimes \mathbf{q}^*$ |
| **SLERP** | $\text{slerp}(\mathbf{q}_0, \mathbf{q}_1, t) = \mathbf{q}_0 \frac{\sin((1-t)\theta)}{\sin\theta} + \mathbf{q}_1 \frac{\sin(t\theta)}{\sin\theta}$ |
| **Euler → Quat** | ZYX convention conversion |
| **Quat → Euler** | Extract roll, pitch, yaw |

### 8.3 Pointing Modes

**File:** `backend/server/attitude.js`

The attitude system supports multiple pointing modes:

**1. Nadir Pointing (default)**
- Body Z-axis points toward Earth centre
- Simplest mode, used for Earth observation
- Quaternion = LVLH quaternion

**2. Target Pointing**
- Body Z-axis points toward a specified target
- Targets can be: other satellites, ground stations, or the Sun
- Priority-ordered target list with condition checking

**Target Resolution Algorithm:**

```
For each target in priority order:
  1. Compute target position in ECI
  2. Check conditions:
     a. Distance ≤ maxRangeKm
     b. Elevation ≥ minElevationDeg (for ground targets)
     c. No Earth occlusion (closest approach > Earth radius)
     d. Not in Earth's shadow (for sun targets)
  3. If all conditions pass → use this target
  4. If no target satisfies → fall back to nadir pointing
```

**Target-Pointing Quaternion Construction:**

Given satellite position $\mathbf{p}$ and target position $\mathbf{t}$:

1. Desired Z-axis: $\hat{z}_{\text{body}} = \frac{\mathbf{t} - \mathbf{p}}{|\mathbf{t} - \mathbf{p}|}$
2. Temporary up: $\hat{u} = \hat{z}_{\text{body}} \times \hat{V}$ (orthogonalised)
3. X-axis: $\hat{x}_{\text{body}} = \hat{u} \times \hat{z}_{\text{body}}$
4. Y-axis: $\hat{y}_{\text{body}} = \hat{z}_{\text{body}} \times \hat{x}_{\text{body}}$
5. Quaternion from rotation matrix $[\hat{x}, \hat{y}, \hat{z}]$

### 8.4 Slew Rate Limiting

When the desired attitude differs from the current attitude, the system applies **slew-rate limiting** via Spherical Linear Interpolation (SLERP):

1. Compute angular difference: $\theta = 2 \arccos(|\mathbf{q}_{\text{current}} \cdot \mathbf{q}_{\text{desired}}|)$
2. Maximum allowed rotation per timestep: $\theta_{\max} = \dot{\theta}_{\max} \cdot \Delta t$ (where $\dot{\theta}_{\max}$ is the configured slew rate in °/s)
3. Interpolation parameter: $t = \min\left(\frac{\theta_{\max}}{\theta}, 1.0\right)$
4. Apply SLERP: $\mathbf{q}_{\text{new}} = \text{slerp}(\mathbf{q}_{\text{current}}, \mathbf{q}_{\text{desired}}, t)$

The attitude response includes:
- `isSlewing: true/false` — Whether the satellite is currently rotating
- `slewProgress: 0.0–1.0` — Fraction of required rotation completed

### 8.5 Component Articulation

**File:** `backend/server/attitude.js` (function `computeComponentAngles`)

After the satellite body attitude is determined, each mounted component computes its own articulation angles:

**Solar Panels (1-DOF):**

Solar panels have a single rotation axis (the mounting axis). The angle `a1` is computed to maximise sun exposure:

1. Transform sun direction to body frame
2. Project onto the plane perpendicular to the mounting axis
3. Compute angle from reference vector: $a_1 = \arctan2(\text{proj} \cdot \text{ref}_\perp, \text{proj} \cdot \text{ref})$
4. Clamp to constraint range: $a_1 \in [\text{min}_{A1}, \text{max}_{A1}]$

**Laser Pointers (2-DOF):**

Laser pointers have azimuth (a1) and elevation (a2):

1. Transform target direction to body frame
2. Project onto the component's local frame
3. Compute azimuth: $a_1 = \arctan2(d_x, d_z)$ in the mounting plane
4. Compute elevation: $a_2 = \arcsin(d_y)$ above/below the mounting plane
5. Clamp both angles to constraint ranges

**Pointing Modes per Component:**
- `'default'` — Solar panels track sun; laser pointers track the satellite's primary target
- `'target'` — Component has its own priority-ordered target list (independent of satellite body)
- `'fixed'` — Component stays at fixed angles (`fixedAngles.a1`, `fixedAngles.a2`)

---

## 9. Coordinate Transform Pipeline

### 9.1 Physical Constants

**File:** `src/transforms/constants.js`

| Constant | Value | Description |
|----------|-------|-------------|
| `EARTH_MU` | 398600.4418 km³/s² | Standard gravitational parameter (WGS-84) |
| `EARTH_RADIUS_EQ` | 6378.137 km | WGS-84 equatorial radius |
| `EARTH_FLATTENING` | 1/298.257223563 | WGS-84 flattening |
| `EARTH_ROT_RATE` | 7.2921159×10⁻⁵ rad/s | Mean sidereal rotation rate (IAU 2000) |
| `OBLIQUITY_J2000` | 23.4392911° | Mean obliquity of ecliptic at J2000.0 |
| `J2000_EPOCH_MS` | 2000-01-01T12:00:00 UTC | J2000.0 epoch |
| `SCALE_FACTOR` | 3185.5 | km per Three.js scene unit |
| `SCENE_EARTH_RADIUS` | ~2.0 | Earth radius in scene units |
| `AU_KM` | 149,597,870.7 km | 1 Astronomical Unit |

### 9.2 Reference Frames

InstaOrbit uses four coordinate frames:

```
   ECI (Earth-Centred Inertial)
    │
    │  rotate by GMST
    ▼
   ECEF (Earth-Centred Earth-Fixed)
    │
    │  geodetic conversion
    ▼
   Geodetic (lat, lon, alt)
    │
    │  scale by SCALE_FACTOR
    ▼
   Scene (Three.js world units)
```

**ECI (Earth-Centred Inertial):**
- Origin at Earth's centre
- X-axis toward vernal equinox (♈)
- Z-axis toward celestial north pole
- Inertial frame — does not rotate with Earth
- All orbital mechanics computed in this frame

**ECEF (Earth-Centred Earth-Fixed):**
- Rotates with the Earth
- X-axis through intersection of prime meridian and equator
- Converted from ECI via Greenwich Mean Sidereal Time (GMST) rotation about Z

**Geodetic:**
- Latitude (°), Longitude (°), Altitude (km above reference ellipsoid)
- WGS-84 ellipsoid model with iterative algorithm

**Scene:**
- Three.js world coordinates
- 1 scene unit = 3185.5 km
- Earth radius ≈ 2.0 scene units

### 9.3 Transform Functions

**File:** `src/transforms/pipeline.js`

| Function | Transform | Usage |
|----------|-----------|-------|
| `eciToGeodetic(eciKm, utcMs)` | ECI → GMST → ECEF → geodetic | Satellite sub-point |
| `geodeticToECI(geo, utcMs)` | geodetic → ECEF → GMST⁻¹ → ECI | Ground station in ECI |
| `eciToScene(eciKm)` | ECI → scene units | Satellite 3D position |
| `geodeticToScene(geo)` | geodetic → ECEF → scene | Ground station in ECEF view |
| `geodeticToSceneECI(geo, utcMs)` | geodetic → ECI → scene | Ground station in ECI view |
| `sunDirectionScene(utcMs)` | Sun ECI unit vector | Sun positioning |
| `sunGeodetic(utcMs)` | Sun ECI → ECEF → geodetic | Sub-solar point |

**GMST Computation:**

$$\theta_{\text{GMST}} = 280.46061837° + 360.98564736629 \cdot d + 0.000387933 \cdot T^2$$

where $d$ is Julian days since J2000.0 and $T$ is Julian centuries.

### 9.4 Scene Coordinate System

The Three.js scene uses a scaled version of the ECI or ECEF frame (depending on the selected reference system):

- **Scale Factor:** 1 scene unit = 3185.5 km
- **Earth radius** = 6378.137 / 3185.5 ≈ 2.002 scene units
- **Coordinate axes:** Same orientation as the selected reference frame (Y-up in Three.js convention is mapped appropriately)

When rendering in **EarthInertial** mode, the Earth mesh rotates by GMST each frame, while satellites remain at their ECI positions. In **EarthFixed** mode, the Earth is stationary and satellite positions are transformed to ECEF before rendering.

---

## 10. Communication & Link Budget Analysis

### 10.1 Link Budget Theory

The link budget computes the signal quality between two endpoints (satellite-to-satellite or satellite-to-ground). The key equation:

$$P_{\text{rx}} = P_{\text{tx}} + G_{\text{tx}} - L_{\text{FSPL}} + G_{\text{rx}} - L_{\text{optical}} - L_{\text{pointing}} - L_{\text{atm}}$$

Where all quantities are in dB/dBm, and:

**Free-Space Path Loss (FSPL):**

$$L_{\text{FSPL}} = 20\log_{10}\left(\frac{4\pi d}{\lambda}\right) \text{ dB}$$

where $d$ is the distance in metres and $\lambda$ is the wavelength in metres.

**Aperture Gain:**

$$G = 10\log_{10}\left(\frac{\eta \pi^2 D^2}{\lambda^2}\right) \text{ dB}$$

where $D$ is the aperture diameter, $\lambda$ is the wavelength, and $\eta$ is the antenna efficiency.

**Signal-to-Noise Ratio:**

$$\text{SNR}_{\text{dB}} = P_{\text{rx}} - N_{\text{floor}}$$

where the noise floor depends on the receiver bandwidth and temperature.

**Link Margin:**

$$\text{Margin} = \text{SNR}_{\text{dB}} - \text{SNR}_{\text{required}} - \text{Margin}_{\text{required}}$$

### 10.2 Link Engine Architecture

**File:** `src/TrajectoryPlanner/Windows/Sidebar/LinkEngine.jsx`

The `LinkEngine` is a **headless React component** (renders nothing to the DOM) that computes link states in three modes:

| Mode | Trigger | Data Source |
|------|---------|-------------|
| **BULK** | After bulk simulation | `activeLinksAtTime` lookup table |
| **TSDB** | TSDB data available | `visibleLinkStates` from TSDB window |
| **LIVE** | Real-time simulation | Compute on-the-fly from `CurrentState` positions |

In LIVE mode, the engine:
1. Reads current satellite and ground station positions from Redux
2. Computes link budget for each configured link
3. Updates link results in the communication slice
4. Opens/extends/closes contact windows based on link state

### 10.3 Contact Windows

Contact windows represent continuous periods of communication availability:

```
Timeline:
  ──────[===AOS=========LOS===]──────[===AOS====LOS===]──────
        │                     │      │                 │
     Window Open          Window   Window            Window
                          Close    Open              Close
```

**Detection Logic:**
1. At each timestep, evaluate link conditions (elevation, distance, occlusion)
2. If `inLink` transitions from false → true: **AOS** — open a new contact window
3. If `inLink` remains true: **extend** the current window's `simEnd`
4. If `inLink` transitions from true → false: **LOS** — close the current window

### 10.4 Link Constraints & Validation

Before computing a link budget, multiple geometric constraints are checked:

**1. Elevation Angle (ground station links):**

The elevation angle is computed in the **ENU (East-North-Up)** frame at the ground station:

$$\text{el} = \arcsin\left(\hat{d} \cdot \hat{U}\right)$$

where $\hat{d}$ is the satellite direction and $\hat{U}$ is the local Up vector.

Must exceed `minElevationDeg` (default: 5°).

**2. Earth Occlusion:**

Tests whether the line of sight passes through the Earth. Uses closest-approach geometry:

$$d_{\min} = |\mathbf{A} + t_{\min} \cdot \mathbf{AB}|$$

where $t_{\min} = -\frac{\mathbf{A} \cdot \mathbf{AB}}{|\mathbf{AB}|^2}$ and $\mathbf{A}$, $\mathbf{B}$ are the endpoint positions. If $d_{\min} < R_\oplus$, the link is occluded.

**3. Maximum Distance:**

Range must be within `maxDistanceKm` (default: 50,000 km).

**4. Sun Shadow (for sun-tracking targets):**

Checks if the satellite is in Earth's shadow using a simplified cylindrical shadow model.

### 10.5 QKD Network Path Analysis

**File:** `src/TrajectoryPlanner/Windows/Sidebar/qkdNetworkAnalysis.js`

The QKD (Quantum Key Distribution) network analysis engine evaluates quantum communication paths between network nodes:

**Analysis Modes:**

1. **Direct Connectivity** — Point-to-point quantum channel between two endpoints
2. **Real-Time Relay** — Multi-hop quantum relay through intermediate satellites
3. **Store-and-Forward** — Satellite stores quantum keys and physically carries them to the next hop
4. **Multi-Hop Analysis** — Graph-based path finding through the network

**Metrics Computed:**
- Connectivity windows (when quantum channel is available)
- Gap analysis (periods without quantum connectivity)
- Key generation rates
- Network path reliability

---

## 11. Time-Series Database (TSDB)

### 11.1 Architecture & Motivation

The TSDB is a lightweight microservice designed to solve the memory problem of storing millions of simulation trace points in the browser:

**Problem:** A 1-hour simulation at 1 Hz for 24 satellites generates ~86,400 trace points per satellite × 24 satellites ≈ 2 million records. Storing all of this in Redux causes performance degradation.

**Solution:** Offload historical data to a SQLite database with:
- **WAL (Write-Ahead Logging)** for concurrent read/write
- **WebSocket subscriptions** for real-time data push
- **Resolution-aware queries** for efficient timeline rendering
- **Sliding window** for high-resolution data around the playhead

### 11.2 Database Schema

**File:** `backend/tsdb/db.js`

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

-- Trace points table (18 columns)
CREATE TABLE trace_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  satellite_id INTEGER NOT NULL,
  time REAL NOT NULL,           -- Simulation elapsed time (s)
  x REAL, y REAL, z REAL,       -- Scene-unit position
  vx REAL, vy REAL, vz REAL,    -- Velocity (km/s)
  lat REAL, lon REAL, alt REAL,  -- Geodetic
  mapX REAL, mapY REAL,         -- Legacy 2D coordinates
  qx REAL, qy REAL, qz REAL, qw REAL,  -- Attitude quaternion
  component_angles TEXT,         -- JSON: { compId: { a1, a2 } }
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Link states table
CREATE TABLE link_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  time REAL NOT NULL,
  in_link BOOLEAN,
  range_km REAL,
  elevation_deg REAL,
  snr_db REAL,
  link_margin REAL,
  rx_power_dbm REAL,
  data TEXT,                    -- JSON: additional metrics
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Contact windows table
CREATE TABLE contact_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  link_id TEXT NOT NULL,
  sim_start REAL,
  sim_end REAL,
  closed BOOLEAN DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

**Performance Configuration:**
```sql
PRAGMA journal_mode = WAL;      -- Write-ahead logging
PRAGMA cache_size = -64000;     -- 64 MB page cache
PRAGMA mmap_size = 268435456;   -- 256 MB memory-mapped I/O
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
```

### 11.3 REST API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create a new session |
| `GET` | `/sessions/:id` | Get session metadata |
| `DELETE` | `/sessions/:id` | Delete session and all data |
| `POST` | `/trace-points` | Ingest single trace point |
| `POST` | `/trace-points/bulk` | Ingest batch of trace points |
| `GET` | `/trace-points/:sessionId/:satId` | Query trace points with time range and resolution |
| `GET` | `/trace-points/:sessionId/:satId/meta` | Get metadata (count, time range) |
| `POST` | `/link-states` | Ingest single link state |
| `POST` | `/link-states/bulk` | Ingest batch of link states |
| `GET` | `/link-states/:sessionId/:linkId` | Query link states with time range |

### 11.4 WebSocket Protocol

The TSDB supports WebSocket connections for real-time data streaming:

**Messages (client → server):**

```javascript
// Subscribe to a satellite's trace points
{ type: 'subscribe', sessionId: 'abc', satelliteId: 0, channel: 'tracePoints' }

// Unsubscribe
{ type: 'unsubscribe', sessionId: 'abc', satelliteId: 0, channel: 'tracePoints' }

// Query data
{ type: 'query', sessionId: 'abc', satelliteId: 0, tMin: 0, tMax: 3600, resolution: 10 }

// Ingest data
{ type: 'ingest', sessionId: 'abc', satelliteId: 0, data: { ... } }

// Ping
{ type: 'ping' }
```

**Messages (server → client):**

```javascript
// Subscription data push
{ type: 'data', channel: 'tracePoints', satelliteId: 0, points: [...] }

// Pong
{ type: 'pong' }
```

### 11.5 Frontend Client

**File:** `src/services/timeSeriesClient.js` (612 lines)

The `TimeSeriesClient` class manages the TSDB connection lifecycle:

```javascript
class TimeSeriesClient {
  // Lifecycle
  async init(sessionName)     // Create session, open REST + WS
  async flush()               // Ensure all data is written
  async destroy()             // Clean up connections

  // Ingestion
  async ingestTracePoint(satId, point)
  async ingestBulkTracePoints(satId, points)
  async ingestLinkState(linkId, state)
  async ingestBulkLinkStates(linkId, states)

  // Querying
  async syncToTime(renderTime)   // Update sliding window
  async refreshLowRes()          // Refresh low-res timeline data
  async getTracePointMeta(satId) // Get count and time range
  async getSatIds()              // List all satellite IDs in session

  // Session
  get sessionId()
}
```

### 11.6 Resolution & Caching Strategy

The TSDB client uses a **two-tier caching strategy**:

**1. Low-Resolution Timeline (lowResTimelines):**
- Queries every 10th trace point
- Used for full-timeline rendering (orbit paths, ground tracks)
- Refreshed periodically as new data arrives
- Stored in Redux: `particles.lowResTimelines[satId]`

**2. High-Resolution Window (visibleTracePoints):**
- Full-resolution data within ±60 seconds of the current RenderTime
- Slides as the user scrubs the timeline
- Used for precise attitude visualisation and metric readouts
- Stored in Redux: `particles.visibleTracePoints[satId]`

**Sliding Window Sync:**

```
Timeline: ──────────────────────────────────────────────→ time
                       ┌──────────────────────┐
                       │  ±60s high-res window │
                       │    (full resolution)  │
                       └──────────┬───────────┘
                                  │
                            RenderTime (playhead)

Full timeline: ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  (every 10th point)
```

When `RenderTime` changes, the client:
1. Computes the new window boundaries: `[RenderTime - 60, RenderTime + 60]`
2. Queries the TSDB for full-resolution data in that range
3. Dispatches to Redux: `setVisibleTracePoints({ satId, points })`
4. Components read from `useTracePoints(satId)` which merges TSDB + legacy data

---

## 12. 3D Visualisation Engine

### 12.1 Globe Renderer

**File:** `src/TrajectoryPlanner/Render/GlobeRender.jsx`

The globe renderer creates the 3D Earth scene using React Three Fiber:

**Scene Components:**
- **Earth Sphere** — Day/night texture with custom shader, cloud layer, atmospheric glow
- **Sun** — Positioned using the ecliptic→equatorial transform with obliquity correction
- **Directional Light** — Follows the sun position for realistic lighting
- **Ambient Light** — Configurable base illumination
- **Stars** — Background starfield (drei `<Stars />`)
- **Grid** — Reference grid overlay (toggleable)
- **Axis Helper** — Coordinate axes indicator (toggleable)
- **Van Allen Belts** — Radiation belt visualisation (toggleable)
- **Satellite Renderers** — One per satellite (via `StackSatellites`)
- **Ground Station Renderers** — 3D building + antenna models
- **Link Lines** — Visual connection lines between linked endpoints
- **Orbit Controls** — Camera orbit with mouse interaction (drei `<OrbitControls>`)

**Sun Position Model:**

The sun's position in ECI is computed using a simplified solar position model:

1. Compute Julian centuries from J2000.0
2. Mean longitude and mean anomaly of the Sun
3. Ecliptic longitude: $\lambda = L_0 + 1.9146° \sin(M)$
4. Transform from ecliptic to equatorial using obliquity ($\epsilon = 23.4393°$):

$$x_{\text{ECI}} = \cos\lambda$$
$$y_{\text{ECI}} = \cos\epsilon \cdot \sin\lambda$$
$$z_{\text{ECI}} = \sin\epsilon \cdot \sin\lambda$$

**Reference Frame Switching:**

When `ReferenceSystem === 'EarthFixed'`:
- Earth mesh rotation is locked
- Satellite positions are transformed: ECI → ECEF via GMST rotation
- GMST is cached and updated at 1-second intervals for performance

When `ReferenceSystem === 'EarthInertial'`:
- Satellite positions remain in ECI
- Earth mesh rotates by GMST each frame

### 12.2 Satellite Renderer

**File:** `src/TrajectoryPlanner/Render/SatelliteRender.jsx` (722 lines)

Each satellite is rendered as a complex 3D group:

**Visual Components:**
1. **Orbit Ellipse** — Computed from current orbital elements, rendered as a `<Line>` with gradient colour
2. **Trace Line** — Historical ground track as a polyline, colour-coded, with configurable tail length
3. **Tube Geometry** — Optional solid tube along the orbit path (toggle)
4. **Satellite Body Model** — Articulated 3D model with components (via `SatelliteBodyModel`)
5. **Labels** — Satellite name display

**Orbit Ellipse Computation:**

The orbit ellipse is generated by sampling true anomaly from 0 to 2π:
1. For each sample angle, compute position in the perifocal frame
2. Transform to ECI via the orbital element rotation matrix
3. Convert to scene coordinates

**Track Horizon Windowing:**

When `trackWindow` is enabled, the trace line is limited to ±1 hour (3600 seconds) around the current time. This prevents visual clutter during long simulations.

**GMST Caching:**

In EarthFixed mode, the GMST value is cached and only recomputed when the time changes by ≥ 1 second. This eliminates redundant trigonometric computations in the render loop.

### 12.3 Satellite Body Model & Articulation

**File:** `src/TrajectoryPlanner/Render/SatelliteBodyModel.jsx` (575 lines)

The `SatelliteBodyModel` renders a configurable 3D spacecraft with articulated components:

**Body Shapes:**
- **Rectangle** — Box geometry (default)
- **Cone** — Cone geometry
- **Circle** — Sphere geometry

**Component Rendering:**

Each component is positioned relative to the satellite body using:

1. **Parent Axis** — Which face of the satellite body the component mounts to (+X, -X, +Y, -Y, +Z, -Z)
2. **Offset** — Distance from the body centre
3. **Rest Orientation** — Euler rotation that orients the component's local +Y along the mounting direction

**Solar Panel Mesh:**
- Silver metallic border frame
- Blue-indigo solar cell surface with metalness
- Golden grid lines (3×3) simulating cell boundaries
- 1-DOF articulation: rotates about mounting axis by angle `a1`

The articulation quaternion is computed as:
1. Build rest orientation using `makeBasis()` to align local +Z (panel face) toward the reference vector
2. Apply articulation rotation about the mount axis by `a1` degrees
3. Combine: `finalQuat = articulationQuat × restQuat`

**Laser Pointer Mesh:**
- Cylindrical body with metallic finish
- 2-DOF articulation: azimuth (`a1`) and elevation (`a2`)

### 12.4 Body Frame View (LVLH)

**File:** `src/TrajectoryPlanner/Render/BodyFrameView.jsx` (631 lines)

The Body Frame View provides a **satellite-centred perspective** where the camera orbits around the selected satellite. Everything is rendered in the LVLH frame:

**Scene Contents:**
- **Earth** — Positioned and sized relative to the satellite, with day/night shader
- **Atmospheric Glow** — Custom shader for atmospheric halo
- **Sun** — Positioned using ECI→LVLH transform
- **Satellite Body Model** — Full articulated model at the origin
- **Other Satellites** — Rendered at their LVLH-relative positions
- **Ground Stations** — Positioned in LVLH coordinates
- **Link Lines** — Communication links rendered between endpoints

**LVLH Transform:**

Every object's ECI position is transformed to the LVLH frame:

$$\mathbf{p}_{\text{LVLH}} = \begin{bmatrix} \hat{X}_{\text{LVLH}} \\ \hat{Y}_{\text{LVLH}} \\ \hat{Z}_{\text{LVLH}} \end{bmatrix} (\mathbf{p}_{\text{ECI}} - \mathbf{r}_{\text{sat}})$$

This view is invaluable for:
- Verifying attitude pointing accuracy
- Inspecting component articulation angles
- Visualising link geometry from the satellite's perspective
- Understanding the LVLH reference frame orientation

### 12.5 Ground Station Renderer

**File:** `src/TrajectoryPlanner/Render/GroundStationRender.jsx`

Ground stations are rendered as 3D models positioned on the Earth's surface:

**Visual Elements:**
- **Building base** — Box geometry with brown material
- **Building top** — Flat roof section
- **Antenna dish** — Cone geometry with silver metallic material, continuously rotating
- **Antenna base** — Cylindrical support strut

**Positioning:**

Ground stations use the coordinate transform pipeline:
- In EarthFixed mode: `geodeticToScene(lat, lon, alt)` — static position
- In EarthInertial mode: `geodeticToSceneECI(lat, lon, alt, utcMs)` — rotates with GMST

The station orientation is computed by looking outward along the surface normal.

### 12.6 Van Allen Belt Visualisation

**File:** `src/TrajectoryPlanner/Render/VonAllenBelt.jsx`

Renders Earth's Van Allen radiation belts as semi-transparent wireframe torus geometries:

- **Inner Belt** — Blue torus at ~2.5 Earth radii
- **Anomaly Region** — Partial blue torus at ~2.6 Earth radii (π/10 arc)
- **Outer Belt** — Orange torus at ~2.7 Earth radii

The belts have randomly varying rotations updated every second, simulating the dynamic nature of trapped particle populations.

### 12.7 Earth Material & Shaders

**File:** `src/TrajectoryPlanner/Render/EarthMaterial.jsx`

Custom GLSL shaders provide realistic Earth rendering:

**Day/Night Blending:**
- Day texture: high-resolution Earth photograph
- Night texture: city lights
- Blending based on the dot product between surface normal and sun direction

**Atmospheric Glow:**

Vertex shader:
```glsl
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Fragment shader:
```glsl
uniform float c, p;
varying vec3 vNormal;
void main() {
  float intensity = pow(c - dot(vNormal, vec3(0,0,1)), p);
  gl_FragColor = vec4(0.0, 0.5, 1.0, 0.2) * intensity;
}
```

This creates a blue glow at the Earth's limb that fades toward the viewer.

**Cloud Layer:**
- Semi-transparent cloud texture rendered as a slightly larger sphere
- Slow rotation independent of Earth rotation

---

## 13. 2D Map Visualisation

### 13.1 Leaflet Integration

**File:** `src/TrajectoryPlanner/Render/LeafletMapRender.jsx`

The 2D ground track map uses **Leaflet** with the CartoDB Dark Matter tile layer:

```
Tile URL: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
```

Features:
- Dark-themed map tiles (no API key required)
- World copy jump for seamless panning
- Zoom levels 1–18
- Custom legend toggle

### 13.2 Ground Track Rendering

**File:** `src/TrajectoryPlanner/Render/LeafletMapOverlays.jsx`

Overlays rendered on the Leaflet map:

| Overlay | Type | Description |
|---------|------|-------------|
| **SatelliteMarker** | CircleMarker | Current satellite position (colour-coded) |
| **GroundTrack** | Polyline | Historical orbital path (dashed line) |
| **GroundStationMarker** | DivIcon | Antenna SVG icon at station lat/lon |
| **SubSolarMarker** | CircleMarker | Sub-solar point (orange dot) |
| **Link Lines** | Polyline | Active communication links (yellow dashed) |
| **MapLegend** | HTML overlay | Colour-coded legend |

**Anti-Meridian Handling:**

Ground tracks that cross the ±180° meridian are split into separate segments using the `splitAtAntimeridian()` utility to prevent lines wrapping across the entire map.

**World Copy Rendering:**

All overlays are rendered at three longitude offsets (-360°, 0°, +360°) so that markers appear on every visible copy of the world map when panning.

**Track Position from Timeline:**

During playback, the satellite marker position is derived from trace points rather than live state:

```javascript
const idx = findLastIndexLE(tracePoints, RenderTime);
const pos = tracePoints[idx]; // lat/lon at the playhead time
```

This enables accurate historical playback even when the simulator is not running.

### 13.3 Sub-Solar Point

The sub-solar point is computed using the sun position model:

1. Compute sun direction in ECI at current UTC time
2. Transform to geodetic: `sunGeodetic(utcMs)` → `{ lat, lon }`
3. Normalise longitude to [-180°, +180°]
4. Render as an orange circle marker on the map

---

## 14. User Interface Components

### 14.1 Top Bar & Project Management

**File:** `src/TrajectoryPlanner/Windows/Topbar/TopBar.jsx`

The Top Bar provides project management controls:

- **Project Display** — Shows current trajectory and iteration name
- **Action Buttons:**
  - New Trajectory — Creates a fresh project
  - Save — Saves current state to Firebase
  - Save As — Creates a new iteration/trajectory
  - Load — Opens the project browser
  - View Mode — Toggle between globe/map/split views
  - Control Panel — Toggle the right sidebar
- **Authentication Section** — User info and sign-out

**Modals:**
- `NewTrajectoryModal` — Create new trajectory with name input
- `SaveModal` — Confirm save with optional screenshot capture
- `SaveAsModal` — Save as new iteration with name input
- `ProjectPopup` — Browse and load saved trajectories/iterations

### 14.2 Menu Bar

**File:** `src/TrajectoryPlanner/Windows/Topbar/MenuBar.jsx` (471 lines)

The Menu Bar sits below the Top Bar and provides quick-access action buttons:

| Button | Icon | Action |
|--------|------|--------|
| Add Satellite | 🛰️ | Opens satellite configuration modal |
| Add Ground Station | 📡 | Opens ground station placement modal (with map picker) |
| Add Constellation | 🌐 | Opens Walker constellation generator |
| Configure Link | 🔗 | Opens link management panel |
| Configuration | ⚙️ | Toggles the right toolbar flyout |

**Render Playback Controls:**
- Play/Pause — Start/stop timeline playback
- Rewind — Step backward
- Fast Forward — Jump forward (10× speed)
- Speed indicator — Shows current playback rate

**Ground Station Modal:**
- Interactive Leaflet mini-map for location selection
- Click-to-place latitude/longitude
- Manual coordinate input
- Altitude configuration

### 14.3 Add Satellite Panel

**File:** `src/TrajectoryPlanner/Windows/Sidebar/AddSatellite.jsx` (961 lines)

A comprehensive satellite configuration panel with five tabs:

**Tab 1 — Basic:**
- Satellite name
- Colour picker (react-color SketchPicker)
- Propagator selection (InstaOrbit / SGP4)
- Live preview toggle

**Tab 2 — Orbital:**
- Semi-major axis (km) — with drag-number input
- Eccentricity (0–1)
- Inclination (°)
- RAAN / Ascending node (°)
- Argument of periapsis (°)
- True anomaly (°)
- Start time offset

**Tab 3 — Burns:**
- Add/remove impulsive manoeuvres
- Delta-V components in VNB frame
- Burn trigger time
- Drag-to-reorder support

**Tab 4 — Pointing:**
- Pointing mode selection (Nadir / Target)
- Slew rate (°/s)
- Target list with priority ordering
- Target types: satellite, ground station, sun
- Add/remove/reorder targets
- Visibility toggle per target

**Tab 5 — Components:**
- Add solar panels and laser pointers
- Configure mounting axis (+X, -X, +Y, -Y, +Z, -Z)
- Set constraint ranges (min/max angles)
- Component pointing mode (default/target/fixed)
- Component-level target lists

**DragNumberInput:**

A custom numeric input that supports three interaction modes:
1. **Mouse drag** — Drag left/right to change value
2. **Mouse wheel** — Scroll to increment/decrement
3. **Keyboard** — Direct number entry

**Initial Position Computation:**

When a satellite is added, its initial ECI position is computed from the Keplerian elements:
1. Convert true anomaly → eccentric anomaly → mean anomaly
2. Call `keplerianToCartesian(elements)` to get position and velocity
3. Compute LVLH quaternion for initial attitude
4. Compute geodetic coordinates for the initial trace point
5. Dispatch satellite config, particle, and current state to Redux

### 14.4 Walker Constellation Generator

**File:** `src/TrajectoryPlanner/Windows/Sidebar/AddConstellation.jsx` (397 lines)

Generates standard **Walker Delta/Star constellations** using the notation **i:T/P/F**:

| Parameter | Symbol | Description |
|-----------|--------|-------------|
| Total Satellites | T | Total number of satellites |
| Orbital Planes | P | Number of equally-spaced planes |
| Phasing | F | Inter-plane phasing parameter (0 to P-1) |
| Inclination | i | Common orbital inclination (°) |
| Semi-Major Axis | a | Common orbit size (km) |
| Eccentricity | e | Common eccentricity |

**Walker Distribution Formula:**

For plane $n$ (0-indexed) and satellite $s$ within that plane:

$$\Omega_n = n \cdot \frac{360°}{P}$$

$$\nu_{n,s} = s \cdot \frac{360°}{S} + n \cdot F \cdot \frac{360°}{T}$$

where $S = T/P$ is the number of satellites per plane.

**Features:**
- Colour-per-plane option (automatic palette with 15 distinct colours)
- Derived orbital information display (perigee altitude, apogee altitude, period)
- Validation (T divisible by P, valid eccentricity, altitude above surface)
- Batch dispatch: all satellites added in a single operation

### 14.5 Link Manager Panel

**File:** `src/TrajectoryPlanner/Windows/Sidebar/LinkManager.jsx` (809 lines)

The Link Manager provides comprehensive communication link management:

**Sections:**

1. **Quick Add** — Select transmitter and receiver, create link with default parameters
2. **Node Graph** — Interactive SVG-based topology diagram
   - Radial star layout when a node is selected
   - Solid lines for configured links, dashed for potential links
   - "Connect All / Disconnect All" toggle per node
3. **Link Cards** — Per-link expandable cards showing:
   - Live metrics (range, elevation, SNR, margin, Rx power)
   - Status indicator (green = in link, red = no link)
   - Advanced parameter editor (wavelength, power, apertures, losses)
   - Contact window history (last 10 windows with AOS/LOS times)
4. **Global Thresholds** — Minimum elevation, maximum distance

### 14.6 Ground Station Configuration

Ground stations are added via the MenuBar's ground station modal:

1. **Name** — Station identifier
2. **Location** — Set via interactive map click or manual lat/lon entry
3. **Altitude** — km above sea level
4. **Advanced** (in ground station slice):
   - Antenna gain, frequency, transmit power
   - Minimum elevation constraint
   - Maximum tracking range
   - Operational hours
   - Tracking mode

### 14.7 Bulk Simulation Controls

**File:** `src/TrajectoryPlanner/Windows/Sidebar/BulkSimControls.jsx` (222 lines)

The Bulk Simulation panel allows running multi-hour simulations in batch mode:

**Parameters:**
- Duration (seconds) — Total simulation length
- Timestep (seconds) — Propagation interval

**Process:**
1. Collect all satellite configs, links, and ground stations from Redux
2. POST to `/simulate-bulk` with the complete scenario
3. On response:
   - Load trace points into Redux (`bulkLoadTracePoints`)
   - Ingest into TSDB (`ingestBulkTracePoints`)
   - Load contact windows into communication slice
   - Load active link states into `activeLinksAtTime`
4. Update timeline to reflect the new data range

### 14.8 Timeline & Playback Controls

**File:** `src/TrajectoryPlanner/Windows/Timer.jsx`

The timeline uses the **vis-timeline** library for interactive temporal navigation:

**Features:**
- **Timeline Bar** — Scrollable/zoomable timeline showing simulation duration
- **Event Markers** — Burns, eclipses, AOS/LOS events, apogee/perigee
- **Playhead** — Draggable marker representing RenderTime
- **Zoom Controls** — Zoom in, zoom out, zoom to fit
- **Satellite Bars** — Per-satellite activity bars showing simulation coverage
- **Endpoint Filter** — Filter timeline events by satellite or ground station
- **Playback** — Play/pause/rewind/fast-forward with configurable speed

**PlayheadOverlay:**

A transparent overlay sits above the vis-timeline DOM, capturing mouse events for the draggable playhead. Dragging the playhead dispatches `updateRenderTime()` to Redux, which triggers:
1. TSDB sliding window sync via `useTSDB`
2. 3D/2D view updates via trace point lookup
3. Metric updates via link state lookup

### 14.9 Viewport Layout System

**File:** `src/TrajectoryPlanner/Windows/Globe.jsx`

The viewport system supports flexible layout configurations:

**Single View:**
- Full-size 3D globe, 2D map, or body frame view

**Split View:**
- Side-by-side panels with a draggable divider
- Left and right panels independently configured
- Any combination of 3D/2D/bodyFrame views

**View Types:**
| Type | Component | Description |
|------|-----------|-------------|
| `3d` | `GlobeRender` | Three.js 3D globe with satellites |
| `2d` | `LeafletMapRender` | Leaflet 2D ground track map |
| `bodyFrame` | `BodyFrameView` | Satellite-centred LVLH view |

**Legacy Compatibility:**

The system supports both the new layout configuration (`layout.left`/`layout.right`) and legacy `viewMode` strings (`'globe'`, `'map'`, `'both'`) for backward compatibility.

**Error Boundaries:**

Each view panel is wrapped in an `<ErrorBoundary>` component that catches rendering errors and displays a fallback message, preventing a single view crash from taking down the entire application.

---

## 15. Cloud Persistence & Collaboration

### 15.1 Firebase Authentication

**File:** `src/firebase/firebase.jsx`, `src/firebase/googleauth.jsx`

Authentication is handled via Firebase Auth with Google OAuth:

- **Google Sign-In** — Popup-based OAuth flow
- **Email/Password** — Traditional sign-up and login
- **Auth State** — Persisted in Redux (`authSlice`) with `onAuthStateChanged` listener
- **Protected Operations** — Save/Load require authentication

### 15.2 Firestore Data Model

**File:** `src/firebase/firebaseUtils.jsx`

```
Firestore Structure:
  users/
    {userId}/
      trajectories/
        {trajectoryId}/
          name: "GEO Transfer Study"
          tags: ["GEO", "transfer"]
          archived: false
          thumbnail: "data:image/png;base64,..."
          createdAt: Timestamp
          updatedAt: Timestamp
          iterations/
            {iterationId}/
              name: "v3-with-burns"
              image: "data:image/png;base64,..."
              tsdbSessionId: "session-789"
              createdAt: Timestamp
              data: {
                satellites: [...],
                timer: {...},
                particles: {...},
                communication: {...},
                groundStations: {...},
                view: {...},
              }
```

**Operations:**
| Function | Description |
|----------|-------------|
| `newTrajectory(userId, name, data, image)` | Create new trajectory with initial iteration |
| `saveIteration(userId, trajectoryId, name, data, image)` | Save new iteration to existing trajectory |
| `updateIteration(userId, trajectoryId, iterationId, data, image)` | Update existing iteration |
| `fetchTrajectories(userId)` | List all trajectories |
| `fetchIterations(userId, trajectoryId)` | List iterations for a trajectory |
| `loadIteration(userId, trajectoryId, iterationId)` | Load full iteration data |
| `archiveTrajectory(userId, trajectoryId)` | Soft-delete a trajectory |
| `deleteTrajectory(userId, trajectoryId)` | Hard-delete a trajectory |

### 15.3 Save / Load / Iterate Workflow

**File:** `src/features/topbar/hooks/useProjectOperations.js`

**Save Flow:**
1. User clicks "Save" → `handleSave()`
2. Optionally capture screenshot via `html2canvas`
3. Build save payload from Redux state (sanitised)
4. If TSDB session exists, persist `tsdbSessionId` in payload
5. Call `updateIteration()` or `saveIteration()` on Firestore
6. Show success notification

**Save As Flow:**
1. User enters new name → `handleSaveAs()`
2. Build sanitised save payload
3. Call `newTrajectory()` or `saveIteration()` with new name
4. Update `workingProject` slice with new IDs
5. Show success notification

**Load Flow:**
1. User browses trajectory list → selects iteration → `handleLoaded()`
2. Fetch iteration data from Firestore
3. Dispatch `SET_*` actions to replace all Redux slices
4. If `tsdbSessionId` exists, reconnect TSDB client
5. Update `workingProject` with loaded trajectory/iteration info

### 15.4 State Sanitisation for Cloud Storage

**File:** `src/firebase/buildSavePayload.js`

Before saving to Firestore, the Redux state is **sanitised** to remove large transient data:

**Stripped Fields:**
- `particles[].tracePoints` — Can contain 50,000+ entries (rebuilt from TSDB on load)
- `communication.activeLinksAtTime` — Large lookup table (rebuilt from bulk sim)
- `communication.visibleLinkStates` — TSDB windowed data (ephemeral)
- `particles.visibleTracePoints` — TSDB windowed data (ephemeral)
- `particles.lowResTimelines` — TSDB cached data (ephemeral)

**Preserved Fields:**
- Satellite configurations and body frames
- Timer settings and bookmarks
- Communication link configurations
- Ground station configurations
- View and layout settings
- Working project metadata
- TSDB session ID (for reconnection)

This reduces the Firestore document size from potentially hundreds of megabytes to a few kilobytes.

---

## 16. API Reference

### 16.1 Simulation Server (Port 3001)

**Base URL:** `http://localhost:3001`  
**Documentation:** `http://localhost:3001/api-docs` (Swagger UI)

#### POST /simulate

**Description:** Propagate a single satellite for one timestep.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `elements` | object | ✅ | Orbital elements `{ a, e, M, Ω, ω, i }` |
| `time` | number | ✅ | Elapsed simulation time (seconds) |
| `propagator` | string | ❌ | `'InstaOrbit'` (default) or `'SGP4'` |
| `burns` | array | ❌ | List of burn objects |
| `bodyFrame` | object | ❌ | Body frame configuration |
| `starttime` | number | ❌ | UTC epoch (ms) of simulation start |
| `allSatellites` | array | ❌ | Other satellite positions (for target pointing) |
| `groundStations` | array | ❌ | Ground station configs (for target pointing) |
| `previousAttitude` | object | ❌ | Previous quaternion (for slew limiting) |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `position` | number[3] | ECI position [x, y, z] in km |
| `velocity` | number[3] | ECI velocity [vx, vy, vz] in km/s |
| `geodetic` | object | `{ lat, lon, alt }` in degrees and km |
| `elements` | object | Updated orbital elements |
| `attitude` | object | Quaternion, pointing target, slew state |
| `componentAngles` | object | Per-component articulation angles |

#### POST /simulate-bulk

**Description:** Bulk-propagate all satellites over a time range.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `satellites` | array | ✅ | Array of satellite configs |
| `starttime` | number | ✅ | UTC epoch (ms) |
| `duration` | number | ✅ | Total duration (seconds) |
| `step` | number | ✅ | Timestep (seconds) |
| `links` | array | ❌ | Communication link configs |
| `groundStations` | array | ❌ | Ground station configs |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `tracePoints` | object | `{ satId: TracePoint[] }` |
| `linkStates` | object | `{ time: { linkId: LinkState } }` |
| `contactWindows` | array | Contact window objects |

### 16.2 TSDB Server (Port 3002)

**Base URL:** `http://localhost:3002`

#### Sessions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions` | Create session → `{ id }` |
| `GET` | `/sessions/:id` | Get session info |
| `DELETE` | `/sessions/:id` | Delete session |

#### Trace Points

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| `POST` | `/trace-points` | — | Ingest single point |
| `POST` | `/trace-points/bulk` | — | Ingest batch |
| `GET` | `/trace-points/:sessionId/:satId` | `tMin, tMax, resolution` | Query points |
| `GET` | `/trace-points/:sessionId/:satId/meta` | — | Get metadata |

#### Link States

| Method | Path | Query Params | Description |
|--------|------|-------------|-------------|
| `POST` | `/link-states` | — | Ingest single state |
| `POST` | `/link-states/bulk` | — | Ingest batch |
| `GET` | `/link-states/:sessionId/:linkId` | `tMin, tMax` | Query states |

---

## 17. Data Flow Diagrams

### 17.1 Real-Time Simulation Loop

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Timer Tick  │────▶│  Simulator   │────▶│  Backend      │
│ (elapsedTime │     │ (per satellite)│    │  /simulate    │
│  advances)   │     └──────┬───────┘     └───────┬───────┘
└─────────────┘            │                      │
                           │  POST request        │  Response
                           │  (elements, burns,   │  (position, velocity,
                           │   bodyFrame, etc.)   │   attitude, angles)
                           │                      │
                           ▼                      ▼
                    ┌──────────────────────────────────────┐
                    │          Redux Dispatches              │
                    │                                        │
                    │  1. CurrentState.updateCoordinate()    │
                    │     → live position/velocity/attitude  │
                    │                                        │
                    │  2. particles.addTracePoint()          │
                    │     → append to history array          │
                    │                                        │
                    │  3. tsdbClient.ingestTracePoint()      │
                    │     → store in SQLite                  │
                    └──────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────────┐
                    ▼                ▼                    ▼
             ┌───────────┐   ┌───────────┐   ┌────────────────┐
             │ 3D Globe  │   │ 2D Map    │   │ Metrics Panel  │
             │ (R3F)     │   │ (Leaflet) │   │ (link budget)  │
             └───────────┘   └───────────┘   └────────────────┘
```

### 17.2 Bulk Simulation Pipeline

```
┌──────────────┐     ┌────────────────────┐
│ BulkSimPanel │────▶│  POST /simulate-   │
│ (duration,   │     │  bulk              │
│  step)       │     │                    │
└──────────────┘     │  For each timestep:│
                     │  ├─ Propagate all  │
                     │  ├─ Compute att.   │
                     │  ├─ Compute links  │
                     │  └─ Detect AOS/LOS │
                     └────────┬───────────┘
                              │ Full results
                              ▼
                     ┌────────────────────┐
                     │  Frontend Handler  │
                     │                    │
                     │  1. bulkLoadTrace- │
                     │     Points() → Redux│
                     │                    │
                     │  2. ingestBulk-    │
                     │     TracePoints()  │
                     │     → TSDB         │
                     │                    │
                     │  3. Load contact   │
                     │     windows → Redux│
                     │                    │
                     │  4. Load active-   │
                     │     LinksAtTime    │
                     │     → Redux        │
                     └────────────────────┘
```

### 17.3 Link Budget Computation Flow

```
  Satellite A position ──┐
                         ├──▶ Distance computation ──▶ FSPL
  Satellite B position ──┘
         │                                              │
         ├──▶ Earth occlusion check ──▶ LOS blocked?    │
         │                                              │
         ├──▶ Elevation angle (ENU) ──▶ Below minimum?  │
         │                                              ▼
         │                              ┌───────────────────┐
         └──────────────────────────────│  Link Budget Calc │
                                        │                   │
                                        │  Rx Power = Tx    │
                                        │    + Gtx - FSPL   │
                                        │    + Grx - Losses  │
                                        │                   │
                                        │  SNR = Rx - Noise │
                                        │  Margin = SNR -   │
                                        │    Required       │
                                        └─────────┬─────────┘
                                                  │
                                           ┌──────┴──────┐
                                           │  inLink?    │
                                           │  (margin>0  │
                                           │   && el>min │
                                           │   && !occl) │
                                           └──────┬──────┘
                                                  │
                                         ┌────────┴────────┐
                                         ▼                 ▼
                                   Open/Extend        Close Contact
                                   Contact Window     Window
```

### 17.4 Cloud Save/Load Flow

```
SAVE:
  Redux State ──▶ buildSavePayload() ──▶ Firestore
       │              │                      │
       │              ├─ Strip tracePoints    ├─ users/{uid}/
       │              ├─ Strip activeLinks    │   trajectories/{tid}/
       │              ├─ Keep configs         │     iterations/{iid}/
       │              └─ Keep TSDB sessionId  │       data: { ... }
       │                                     │       image: base64
       ├─ html2canvas ──▶ screenshot ────────┘
       │
       └─ Update workingProject slice

LOAD:
  Firestore ──▶ loadIteration() ──▶ Redux SET_* actions
       │                                │
       │  Iteration data               ├─ SET_SATELLITES
       │  (configs only,               ├─ SET_TIMER
       │   no heavy arrays)            ├─ SET_CURRENTSTATE
       │                               ├─ SET_COMMUNICATION
       │                               ├─ SET_GROUNDSTATIONS
       │                               └─ SET_VIEW
       │
       └─ tsdbSessionId ──▶ reconnect TSDB client
```

---

## 18. Physics Reference

### 18.1 Two-Body Problem

The two-body problem describes the motion of a satellite around Earth, neglecting perturbations:

$$\ddot{\mathbf{r}} = -\frac{\mu}{r^3}\mathbf{r}$$

where:
- $\mathbf{r}$ is the position vector (km) from Earth's centre
- $r = |\mathbf{r}|$ is the distance
- $\mu = 398600.4418$ km³/s² is Earth's gravitational parameter

The solution is a conic section (ellipse for bound orbits) described by six orbital elements.

### 18.2 Keplerian Orbital Elements

The six classical orbital elements uniquely define an orbit:

| Element | Symbol | Range | Description |
|---------|--------|-------|-------------|
| Semi-major axis | $a$ | > 0 km | Orbit size |
| Eccentricity | $e$ | [0, 1) | Orbit shape |
| Inclination | $i$ | [0, π] rad | Tilt from equator |
| RAAN | $\Omega$ | [0, 2π] rad | Ascending node longitude |
| Arg. of periapsis | $\omega$ | [0, 2π] rad | Periapsis orientation |
| True anomaly | $\nu$ | [0, 2π] rad | Position along orbit |

**Keplerian to Cartesian conversion:**

1. Position in perifocal frame:

$$r = \frac{a(1-e^2)}{1 + e\cos\nu}$$

$$\mathbf{r}_{\text{PQW}} = r\begin{pmatrix}\cos\nu \\ \sin\nu \\ 0\end{pmatrix}$$

2. Velocity in perifocal frame:

$$\mathbf{v}_{\text{PQW}} = \sqrt{\frac{\mu}{a(1-e^2)}}\begin{pmatrix}-\sin\nu \\ e + \cos\nu \\ 0\end{pmatrix}$$

3. Rotation to ECI via $\mathbf{R} = R_z(-\Omega) \cdot R_x(-i) \cdot R_z(-\omega)$

### 18.3 Anomaly Conversions

**Mean Anomaly → Eccentric Anomaly (Kepler's Equation):**

$$M = E - e\sin E$$

Solved iteratively using Newton-Raphson:

$$E_{n+1} = E_n - \frac{E_n - e\sin E_n - M}{1 - e\cos E_n}$$

Convergence criterion: $|E_{n+1} - E_n| < 10^{-10}$

**Eccentric Anomaly → True Anomaly:**

$$\nu = 2\arctan\left(\sqrt{\frac{1+e}{1-e}}\tan\frac{E}{2}\right)$$

**True Anomaly → Eccentric Anomaly:**

$$E = 2\arctan\left(\sqrt{\frac{1-e}{1+e}}\tan\frac{\nu}{2}\right)$$

**Eccentric Anomaly → Mean Anomaly:**

$$M = E - e\sin E$$

### 18.4 SGP4 Propagation

SGP4 (Simplified General Perturbations 4) is the standard NORAD orbit propagation model. It uses Two-Line Element (TLE) sets as input and accounts for:

- **J2 oblateness** — Earth's equatorial bulge causes RAAN regression and argument of perigee advance
- **Atmospheric drag** — Causes orbital decay (encoded in TLE as B* drag term)
- **Solar/lunar gravitational perturbations** — Third-body effects
- **Solar radiation pressure** — Particularly important for high-altitude orbits

InstaOrbit uses the `ootk` library (v4.0.1) for SGP4 propagation, which implements the NORAD SPACETRACK Report No. 3 algorithm.

### 18.5 Link Budget Equations

**Free-Space Path Loss:**

$$\text{FSPL} = 20\log_{10}\left(\frac{4\pi d}{\lambda}\right) \text{ dB}$$

where:
- $d$ = distance between endpoints (m)
- $\lambda = c / f$ = wavelength (m)
- For optical: $\lambda = 1550$ nm (typical)

**Aperture Gain (simplified):**

$$G = 10\log_{10}\left(\frac{\eta \pi^2 D^2}{\lambda^2}\right) \text{ dB}$$

where:
- $D$ = aperture diameter (m)
- $\eta$ = antenna efficiency (typically 0.55)
- $\lambda$ = wavelength (m)

**Received Power:**

$$P_{\text{rx}} = P_{\text{tx}} + G_{\text{tx}} - \text{FSPL} + G_{\text{rx}} - L_{\text{optical,tx}} - L_{\text{optical,rx}} - L_{\text{pointing}} - L_{\text{atm}}$$

**Photon Rate:**

$$R_{\text{photon}} = \frac{P_{\text{rx}}}{E_{\text{photon}}} = \frac{P_{\text{rx}} \lambda}{hc}$$

where $h = 6.626 \times 10^{-34}$ J·s is Planck's constant and $c = 3 \times 10^8$ m/s.

### 18.6 Eclipse Geometry

The eclipse detection uses a simplified cylindrical shadow model:

A satellite at position $\mathbf{r}_{\text{sat}}$ is in eclipse when the angle between the satellite-to-sun direction and the satellite-to-Earth-centre direction is small enough that the Earth blocks the sun.

**Simplified check:**

$$\text{inShadow} = (\mathbf{r}_{\text{sat}} \cdot \hat{s} < 0) \land (|\mathbf{r}_{\text{sat}} - (\mathbf{r}_{\text{sat}} \cdot \hat{s})\hat{s}| < R_\oplus)$$

where $\hat{s}$ is the sun direction unit vector and $R_\oplus$ is Earth's radius.

### 18.7 Sun Position Model

The sun's position in ECI is computed using a simplified analytical model:

1. **Julian centuries** from J2000.0:

$$T = \frac{\text{JD} - 2451545.0}{36525}$$

2. **Mean longitude:**

$$L_0 = 280.46646° + 36000.76983° \cdot T$$

3. **Mean anomaly:**

$$M = 357.52911° + 35999.05029° \cdot T$$

4. **Ecliptic longitude:**

$$\lambda = L_0 + 1.9146° \sin M + 0.02° \sin 2M$$

5. **Transform to equatorial (ECI) using obliquity:**

$$\epsilon = 23.4393° - 0.01300° \cdot T$$

$$\hat{x} = \cos\lambda, \quad \hat{y} = \cos\epsilon \sin\lambda, \quad \hat{z} = \sin\epsilon \sin\lambda$$

This model is accurate to approximately 1° over several decades, sufficient for eclipse detection and solar panel pointing.

---

## 19. Performance & Scalability

### 19.1 Frontend Performance Optimisations

| Technique | Implementation |
|-----------|---------------|
| **TSDB offloading** | Trace points moved from Redux to SQLite, preventing browser memory exhaustion |
| **Resolution-aware caching** | Low-res (every 10th point) for timeline, high-res (±60s) for viewport |
| **GMST caching** | Computed once per second, cached in refs |
| **useFrame vs useState** | Component angles updated via refs inside useFrame to avoid React re-renders |
| **BroadcastChannel throttling** | Multi-tab sync throttled via requestAnimationFrame |
| **Trace point cap** | Redux arrays capped at 50,000 entries (FIFO eviction) |
| **Contact window cap** | Maximum 500 windows per link |
| **Orbital event cap** | Maximum 100 events per satellite |
| **Binary search** | `findLastIndexLE()` for O(log n) trace point lookup by time |
| **Track windowing** | Optional ±1 hour trace line limit |
| **Error boundaries** | Prevent single component failure from crashing the entire app |

### 19.2 Backend Performance Optimisations

| Technique | Implementation |
|-----------|---------------|
| **SQLite WAL mode** | Concurrent readers with single writer |
| **Prepared statements** | Pre-compiled SQL for all operations |
| **Memory-mapped I/O** | 256 MB mmap for fast disk access |
| **64 MB page cache** | Reduced disk reads |
| **Bulk insert** | Batch trace point ingestion |
| **Parallel propagation** | Bulk sim processes satellites in parallel per timestep |

### 19.3 Scaling Considerations

| Scenario | Current Limit | Bottleneck |
|----------|--------------|------------|
| Satellites per session | ~50 | Browser rendering performance |
| Simulation duration | ~24 hours at 1 Hz | TSDB storage (~100 MB) |
| Links | ~100 | O(n²) contact window computation |
| Trace points per satellite | 50,000 (Redux) / unlimited (TSDB) | Memory / disk |
| Concurrent tabs | Master + 3–4 daughters | BroadcastChannel bandwidth |

---

## 20. Project Structure Reference

### 20.1 Frontend Dependencies (key packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.2 | UI framework |
| `react-dom` | 18.2 | DOM rendering |
| `react-router-dom` | 6.x | Client-side routing |
| `@reduxjs/toolkit` | 2.2.5 | State management |
| `react-redux` | 9.x | React-Redux bindings |
| `three` | 0.165 | 3D rendering engine |
| `@react-three/fiber` | 8.16 | React renderer for Three.js |
| `@react-three/drei` | 9.106 | Three.js helpers & abstractions |
| `leaflet` | 1.9.4 | 2D map rendering |
| `react-leaflet` | 4.x | React bindings for Leaflet |
| `firebase` | 10.x | Authentication & Firestore |
| `framer-motion` | 11.x | Animations |
| `vis-timeline` | 7.x | Interactive timeline |
| `@mui/material` | 5.x | Material UI components |
| `styled-components` | 6.x | CSS-in-JS |
| `react-color` | 2.x | Colour picker |
| `html2canvas` | 1.x | Screenshot capture |
| `rc-slider` | 10.x | Range slider |
| `vite` | 5.2 | Build tool |
| `@vitejs/plugin-react` | 4.x | React plugin for Vite |

### 20.2 Backend Dependencies (key packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.x | HTTP server |
| `cors` | 2.x | Cross-origin requests |
| `ws` | 8.x | WebSocket server |
| `better-sqlite3` | 11.x | SQLite database |
| `ootk` | 4.0.1 | SGP4 orbit propagation |
| `swagger-jsdoc` | 6.x | API documentation |
| `swagger-ui-express` | 5.x | Swagger UI |
| `uuid` | 9.x | Unique identifier generation |

---

## 21. Technology Stack

### 21.1 Architecture Diagram (Component Level)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            BROWSER                                       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     React Application                               │ │
│  │                                                                     │ │
│  │  ┌─────────┐  ┌───────────────────────────┐  ┌──────────────────┐  │ │
│  │  │ Router  │  │      Redux Store           │  │   Firebase SDK   │  │ │
│  │  │         │  │  ┌──────┐ ┌──────┐        │  │   (Auth + DB)    │  │ │
│  │  │ /       │  │  │sats  │ │timer │ ...×11 │  └──────────────────┘  │ │
│  │  │ /traj   │  │  └──────┘ └──────┘        │                        │ │
│  │  │ /cad    │  │  ┌──────────────────────┐  │  ┌──────────────────┐  │ │
│  │  │ /const  │  │  │ BroadcastMiddleware  │──┼──│ Daughter Tabs    │  │ │
│  │  └─────────┘  │  └──────────────────────┘  │  └──────────────────┘  │ │
│  │               └───────────────────────────┘                        │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │ │
│  │  │  Three.js Scene  │  │   Leaflet Map    │  │  vis-timeline    │  │ │
│  │  │  (R3F + Drei)    │  │   (2D tracks)    │  │  (events)        │  │ │
│  │  │                  │  │                  │  │                  │  │ │
│  │  │  • GlobeRender   │  │  • Sat markers   │  │  • Burns         │  │ │
│  │  │  • SatelliteRndr │  │  • Ground tracks │  │  • Eclipses      │  │ │
│  │  │  • BodyFrameView │  │  • GS markers    │  │  • AOS/LOS       │  │ │
│  │  │  • GroundStation │  │  • Sub-solar     │  │  • Playhead      │  │ │
│  │  │  • VanAllenBelt  │  │  • Link lines    │  │                  │  │ │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │                   Services Layer                              │   │ │
│  │  │  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐  │   │ │
│  │  │  │ TimeSeriesClient│  │ SimFetcher     │  │ LinkEngine   │  │   │ │
│  │  │  │ (WS + REST)     │  │ (HTTP POST)    │  │ (headless)   │  │   │ │
│  │  │  └────────┬────────┘  └───────┬────────┘  └──────────────┘  │   │ │
│  │  └───────────┼───────────────────┼─────────────────────────────┘   │ │
│  └──────────────┼───────────────────┼─────────────────────────────────┘ │
│                 │                   │                                    │
└─────────────────┼───────────────────┼────────────────────────────────────┘
                  │                   │
        ┌─────────▼──────┐   ┌───────▼──────────┐   ┌──────────────┐
        │ TSDB Server    │   │ Sim Server       │   │ Firebase     │
        │ :3002          │   │ :3001            │   │ Cloud        │
        │                │   │                  │   │              │
        │ Express + WS   │   │ Express          │   │ Auth         │
        │ SQLite (WAL)   │   │                  │   │ Firestore    │
        │                │   │ • Kepler prop.   │   │              │
        │ Tables:        │   │ • SGP4 (ootk)    │   │ users/       │
        │ • sessions     │   │ • Attitude       │   │   trajs/     │
        │ • trace_points │   │ • Link budget    │   │     iters/   │
        │ • link_states  │   │ • Component artic│   │              │
        │ • contact_wins │   │ • Swagger docs   │   │              │
        └────────────────┘   └──────────────────┘   └──────────────┘
```

---

## 22. Glossary

| Term | Definition |
|------|-----------|
| **AOS** | Acquisition of Signal — moment a satellite rises above the minimum elevation angle as seen from a ground station |
| **Apogee** | Highest point in an elliptical orbit (farthest from Earth) |
| **Attitude** | The orientation of a spacecraft in 3D space, expressed as a quaternion |
| **Body Frame** | Coordinate system fixed to the spacecraft body |
| **Burn** | An impulsive orbital manoeuvre (instantaneous velocity change) |
| **Contact Window** | A continuous period during which communication is possible between two endpoints |
| **Delta-V (ΔV)** | Change in velocity required for an orbital manoeuvre (km/s) |
| **ECEF** | Earth-Centred Earth-Fixed — a coordinate frame that rotates with the Earth |
| **ECI** | Earth-Centred Inertial — a non-rotating coordinate frame |
| **Eclipse** | Period when a satellite is in Earth's shadow |
| **ENU** | East-North-Up — a local tangent plane coordinate system |
| **FSPL** | Free-Space Path Loss — signal attenuation due to spreading over distance |
| **Geodetic** | Coordinates on Earth's surface: latitude, longitude, altitude |
| **GMST** | Greenwich Mean Sidereal Time — the angle between the vernal equinox and Greenwich meridian |
| **Ground Track** | The path traced by the sub-satellite point on Earth's surface |
| **Inclination** | The angle between the orbital plane and Earth's equatorial plane |
| **J2000** | A standard epoch (Jan 1, 2000, 12:00 TT) used as the reference for coordinate systems |
| **Kepler's Equation** | $M = E - e\sin E$ — relates mean anomaly to eccentric anomaly |
| **Link Budget** | Accounting of all gains and losses in a communication signal path |
| **Link Margin** | The excess signal strength above the minimum required for reliable communication |
| **LOS** | Loss of Signal — moment a satellite drops below the minimum elevation angle |
| **LVLH** | Local Vertical Local Horizontal — a reference frame centred on the satellite |
| **Mean Anomaly** | An angle that increases uniformly with time, proportional to the area swept |
| **Nadir** | The direction from a satellite directly toward Earth's centre |
| **Perigee** | Lowest point in an elliptical orbit (closest to Earth) |
| **Propagation** | Computing the future state of a satellite from its current orbital elements |
| **QKD** | Quantum Key Distribution — secure key exchange using quantum mechanics |
| **Quaternion** | A four-component number (qx, qy, qz, qw) used to represent 3D rotations without gimbal lock |
| **RAAN (Ω)** | Right Ascension of the Ascending Node — the longitude where the orbit crosses the equator northward |
| **Scene Units** | Three.js world coordinates, where 1 unit = 3185.5 km |
| **Semi-Major Axis** | Half the longest diameter of an elliptical orbit |
| **SGP4** | Simplified General Perturbations 4 — NORAD's standard orbit propagation model |
| **SLERP** | Spherical Linear Interpolation — smooth interpolation between two quaternions |
| **Slew** | The act of rotating a spacecraft from one attitude to another |
| **SNR** | Signal-to-Noise Ratio — the strength of the signal relative to background noise |
| **Sub-Satellite Point** | The point on Earth's surface directly below a satellite |
| **TLE** | Two-Line Element — a standardised format for encoding satellite orbital data |
| **True Anomaly (ν)** | The actual angular position of a satellite along its orbit |
| **TSDB** | Time-Series Database — InstaOrbit's SQLite-backed data storage service |
| **VNB** | Velocity-Normal-Binormal — a reference frame for defining orbital manoeuvres |
| **Walker Constellation** | A standard constellation pattern defined by T/P/F (total/planes/phasing) |
| **WGS-84** | World Geodetic System 1984 — the standard Earth reference ellipsoid |

---

*This document covers the InstaOrbit codebase as of June 2025. For the most current information, refer to the source code and inline documentation.*

*© InstaOrbit — All Rights Reserved*
