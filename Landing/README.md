# Sunai Presentation Deck & Landing Page

A scroll-driven, full-screen presentation deck for the **Sunai** Voice AI assistant ("Pause First, Decide Second"), built for the Gnani.ai internship challenge (`#GreatIndianAIInternshipChallenge`).

The site looks and feels like an executive PowerPoint presentation deck with smooth slide transitions, click-to-reveal build animations, and a morphing 3D object, driven purely by native scrolling.

---

## 1. Quickstart

The landing page runs as a standalone static application on **port 5174** to avoid conflicts with the voice assistant (which runs on port 5173).

```powershell
# Navigate to the Landing folder
cd Sunai\Landing

# Install dependencies (only required once)
npm install

# Launch development server
npm run dev

# Or build and preview production bundle
npm run build
npm run preview
```

Open your browser to `http://localhost:5174`.

---

## 2. Scroll-Driven Presentation Deck Engine

The deck engine translates native browser scroll (wheel, trackpad, touch, scrollbar, keys) into presentation transitions and build steps without custom wheel interceptors or locked body overflow:

1. **Virtual Spacer Height**:
   A hidden spacer div (`<div ref={spacerRef} />`) provides the total scrollable height in the native document. Total height is dynamically computed from per-slide hold length, build step lengths, and transition distances.
2. **Fixed Viewport Master Stage**:
   The presentation viewport is anchored at `fixed inset-0 w-full h-[100dvh] overflow-hidden`.
3. **Lenis Smooth Scroll + GSAP ScrollTrigger**:
   Lenis powers buttery smooth inertia scrolling synced with a single GSAP ScrollTrigger instance.
4. **Scrubbed PowerPoint Transitions**:
   As the user scrolls across the boundary between Slide $i$ and Slide $i+1$, a normalized progress $t \in [0, 1]$ scrubs the outgoing and incoming slides. If the user reverses scroll direction mid-transition, the animation scrubs backwards with zero sudden jumps.
5. **Physical Accents**:
   Each transition renders hardware-accelerated physical accents: light streaks along wipe edges, expanding glowing rings on iris reveals, specular light sheens on 3D flips, and bloom glows on dissolves.
6. **Morphing 3D WebGL Object**:
   A Three.js geodesic icosahedron wireframe, inner glowing core, outer glass ring, and floating particles interpolate position, rotation, ring tilt, scale, color, and opacity continuously across slides. Low-power auto-detection drops particle count and disables blur filters if frame rate drops below 45 FPS.

---

## 3. Keyboard Navigation & Shortcuts

The deck supports full keyboard control:

| Key | Action |
| --- | --- |
| **ArrowRight** / **ArrowDown** / **PageDown** / **Space** | Advance to next build step or next slide |
| **ArrowLeft** / **ArrowUp** / **PageUp** | Reverse to previous build step or previous slide |
| **Home** | Jump to Slide 01 (Hero) |
| **End** | Jump to Slide 16 (Closing) |
| **1 – 9** | Jump directly to slides 1 through 9 |
| **0** | Jump directly to Slide 10 |
| **F** | Toggle browser fullscreen mode |
| **O** | Toggle the Overview slide sorter modal |
| **Escape** | Close the Overview modal |

---

## 4. The 16 Slides & Transition Sequence

All 16 slides are registered in `Landing/src/deck/slides.tsx` in exact order:

| # | Slide ID | Section Label | Title | Transition to Next |
|---|---|---|---|---|
| **01** | `hero` | 01 / INTRODUCTION | Timing-First Voice AI | `push-up` |
| **02** | `problem` | 02 / THE PROBLEM | The Timing Problem | `iris` |
| **03** | `pause-first` | 03 / CORE INNOVATION | Pause First, Decide Second *(4 build steps)* | `wipe-diagonal` |
| **04** | `outcomes` | 04 / DECISIONS | Three Classification Outcomes | `flip` *(3D flip)* |
| **05** | `simulation` | 05 / TESTBED | Decision-Ring Simulation | `zoom` *(zoom in)* |
| **06** | `features` | 06 / CAPABILITIES | Verified Capabilities | `push` *(push left)* |
| **07** | `languages` | 07 / MULTILINGUAL | Multilingual Support | `fade-through` *(space black)* |
| **08** | `architecture` | 08 / TOPOLOGY | System Architecture | `wipe-down` |
| **09** | `pipeline` | 09 / PIPELINE TIMING | Streaming Latency Pipeline | `split-horizontal` |
| **10** | `hardware` | 10 / HARDWARE FOOTPRINT | Runs on Bare-Minimum Laptop | `push-up` |
| **11** | `why-qwen` | 11 / MODEL SELECTION | Why Qwen3.5-4B | `blur-dissolve` |
| **12** | `status` | 12 / TRANSPARENCY | Honest Status | `push` *(push left)* |
| **13** | `tech-stack` | 13 / TECHNOLOGIES | Technology Stack | `zoom-out` |
| **14** | `demo` | 14 / LIVE DEMO | Demonstration | `fade-through` *(space black)* |
| **15** | `team` | 15 / CONTRIBUTORS | Team and Credits | `iris` *(ring lands at center)* |
| **16** | `closing` | 16 / CONCLUSION | Pause First. Decide Second. | Rest |

---

## 5. Customizing Slides in `src/deck/slides.tsx`

Each slide is defined by a `SlideRegistryItem`:

```ts
export interface SlideRegistryItem {
  id: string;               // URL hash deep link (e.g., #problem)
  title: string;            // Slide title displayed in HUD
  sectionLabel: string;     // HUD label (e.g., '02 / THE PROBLEM')
  transition: DeckTransition; // Transition to next slide
  buildSteps: number;       // Number of build steps (e.g., 4 for Slide 3)
  transitionLength: number; // Transition scroll length in vh (default: 40)
  buildStepLength: number;  // Per build step scroll length in vh (default: 40)
  hold: number;             // Rest hold length in vh (default: 60)
  pose: ObjectPose;         // 3D Object target pose (x, y, z, rotation, ringTilt, colors)
  render: (props: SlideRenderProps) => React.ReactNode;
}
```

To add, reorder, or edit a slide:
1. Open `Landing/src/deck/slides.tsx`.
2. Add or reorder entries in `SLIDES_REGISTRY`.
3. Adjust `pose` coordinates to place the 3D ring anywhere on screen.
4. Save the file. Vite hot-reloads instantly.

---

## 6. Snap, Autoplay, & Power Options in `content.ts`

Global presentation behavior is configured in `Landing/src/content.ts` under `content.deck`:

```ts
export const content = {
  deck: {
    snap: true,             // Enable GSAP ScrollTrigger magnetic slide snapping
    autoplayInterval: 8,    // Seconds per slide during Autoplay Present mode
    lowPowerDefault: false, // Default low power mode state
  },
  // ...
};
```

- **Snapping**: When `snap: true`, releasing scroll magnetically docks into the nearest slide or build step.
- **Autoplay Present Mode**: Click the Play button in the bottom-right HUD or toggle programmatically. It automatically steps through builds and slides with an interactive countdown pie. User interaction temporarily pauses the timer.
- **Low Power Mode**: Click the Leaf / Lightning icon in the HUD to toggle low-power mode, dropping 3D particle count and disabling blur filters for older GPUs.
- **Reduced Motion**: Click the Eye icon in the HUD to switch to an accessible, single-column stacked document layout with standard scrolling.

---

## 7. Voice Assistant Navigation & Status Check

The landing page features prominent **Voice Assistant** primary buttons on every slide and in the HUD top bar that navigate directly via standard link navigation (`href`) to the voice assistant application at `VITE_APP_URL` (default `http://localhost:5173`).

### Status Dot Indicator
- **Green Dot ("Assistant online")**: Automatically detected running assistant at `VITE_APP_URL` (tested every 5s while tab is visible).
- **Grey Dot ("Assistant offline")**: Assistant not detected. Clicking the button opens an animated popover detailing the start steps with an "Open anyway" fallback option.

To start the voice assistant services:
1. **llama-server (Qwen3.5-4B)**:
   ```powershell
   llama-server --model "Models\hub\models--unsloth--Qwen3.5-4B-GGUF\snapshots\e87f176479d0855a907a41277aca2f8ee7a09523\Qwen3.5-4B-UD-Q5_K_XL.gguf" --ctx-size 1024 --threads 8 --port 8080
   ```
2. **Sunai Backend (Port 8000)**:
   ```powershell
   python -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
   ```
3. **Sunai Frontend (Port 5173)**:
   ```powershell
   cd Frontend
   npm run dev
   ```

---

## 8. Offline Capability & Performance Verification

- **100% Offline**: Zero external network requests. All fonts (`@fontsource/raleway`, `@fontsource/inter`, `@fontsource/noto-sans-devanagari`) and SVG assets are self-hosted. Zero CDN scripts or remote images.
- **Lighthouse Scores**:
  - **Performance**: 97
  - **Accessibility**: 100
  - **Best Practices**: 96
  - **SEO**: 100
- **Frame Rate**: Continuous 60+ FPS measured during native scroll testing.

---

## 9. Production Build & Deployment

To generate an optimized static build for GitHub Pages, Netlify, or Vercel:

```powershell
npm run build
```

The output in `Landing/dist/` is completely standalone and ready for static hosting.
