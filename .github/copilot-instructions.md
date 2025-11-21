# InstaOrbit — Copilot Instructions

Purpose: help AI coding agents become productive quickly by highlighting the project's architecture, key files, conventions, and developer workflows.

**Big Picture**
- **Frontend React app:** Single-page React + Vite application. Entry point: `src/main.jsx` -> `src/App.jsx`.
- **Rendering:** Uses React Three Fiber and Three.js (`@react-three/fiber`, `@react-three/drei`) for 3D visualization (see `src/components/ThreeDView.jsx`, `src/components/Viewer.jsx`).
- **State management:** Redux Toolkit with slices under `src/Store/` (e.g. `authSlice.jsx`, `satelliteSlice.jsx`, `timeSlice.jsx`, `StateTimeSeries`). The store is configured in `src/Store/store.jsx` and provided in `src/main.jsx`.
- **Simulation logic:** Orbit/simulation code is implemented in the frontend (JS) under `src/TrajectoryPlanner/Simulation/` — heavy numerical logic lives in files such as `Simulator.jsx`, `Functions.jsx`, `RefrenceFrameConvertor.jsx`.
- **Cloud & Auth:** Firebase is used for cloud state syncing and auth. See `src/firebase/*` (e.g. `firebase.jsx`, `googleauth.jsx`, `firebaseUtils.jsx`).

**Key Files & Where to Look (examples)**
- `package.json` — scripts and deps. Use `npm run dev` (Vite) for local dev; `npm run build` then `npm run deploy` (gh-pages) for publishing.
- `src/main.jsx` — React entry and `Provider` for Redux.
- `src/App.jsx` — Router and main routes (routes include `/trajectoryplanner`, `/cad`, `/constellation`).
- `src/Store/` — Redux slices; add or update state here following existing slice patterns.
- `src/TrajectoryPlanner/` — Main feature area. Look in `Simulation/` for numerical code and `Render/` for UI/3D render components.
- `src/components/` — Shared UI components (TopBar, Viewer, Leaflet map, etc.).

**Build / Dev / Debug workflows**
- Install: `npm install`.
- Dev: `npm run dev` (Vite dev server). Note: README mentions `http://localhost:3000` but Vite defaults to port `5173` unless changed—use the terminal output from `npm run dev`.
- Build: `npm run build` (produces `build/` directory). Preview built site: `npm run preview`.
- Deploy (GitHub Pages): `npm run deploy` uses `gh-pages -d build`.
- Lint: `npm run lint` (ESLint configured; use to enforce code style).

**Project-specific conventions & patterns**
- Redux slices live as single-file modules named `*Slice.jsx` or feature names (e.g. `workingProject.jsx`). Follow existing structure: export reducers as default and keep actions/selectors in same file.
- UI routing is file-based via `react-router-dom` in `src/App.jsx`. Add routes there for new top-level pages.
- Heavy simulations are computed client-side in the `TrajectoryPlanner` feature. Avoid putting unsupported native modules into these files — prefer pure JS numeric work compatible with browser.
- 3D components use React Three Fiber patterns. Keep Three.js objects into components under `Render/` or `components/Viewer.jsx` and avoid mixing DOM-only logic inside render loops.
- Firebase usage is centralized under `src/firebase/`. Use `firebaseUtils.jsx` for helpers and `googleauth.jsx` for OAuth patterns.

**Integration points & external dependencies**
- React + Vite (dev/build): `vite`, `@vitejs/plugin-react`.
- Three.js ecosystem: `three`, `@react-three/fiber`, `@react-three/drei`.
- Firebase for auth & state sync.
- Leaflet for 2D maps (`react-leaflet` and `leaflet`).
- Redux Toolkit for global state.

**What to avoid / watch-outs**
- README contains an outdated port reference (`3000`). Confirm actual dev server port (`vite` uses `5173` by default).
- Simulation code is performance-sensitive and lives in `src/TrajectoryPlanner/Simulation/`; be cautious about introducing blocking UI work. If adding heavy computation, consider web workers or throttling updates.
- The codebase mixes `.jsx` files across UI, store, and simulation. Keep naming and locations consistent with existing structure to avoid confusion.

**How to make typical changes**
- Add a new UI page: create component under `src/` or `src/components/`, then add a route in `src/App.jsx`.
- Add new global state: create a slice under `src/Store/` following the pattern in `authSlice.jsx` and register it in `src/Store/store.jsx`.
- Update simulation logic: modify files under `src/TrajectoryPlanner/Simulation/`. Keep pure math separated from React side-effects and components.

If anything in this file is unclear or you'd like more examples (e.g., common Redux slice template, Three.js component pattern, or a pointer to where simulation constants live), tell me which area to expand and I will iterate.
