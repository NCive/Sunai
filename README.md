# SUNAI: Pause-First Conversational Voice Assistant
> *"Most voice bots either talk over you or stop for every sound. Sunai fixes the timing."*

Sunai is a production-grade, low-latency multilingual voice assistant built for the **Gnani AI Hackathon**. Powered by **Gnani Prisma v3.0 STT**, **Gnani Timbre v2.5 TTS**, **Qwen3.5-4B** (via llama.cpp), and a hybrid **BM25 + all-MiniLM-L6-v2 RAG pipeline**, Sunai fluently supports **Hindi, Marathi, Hinglish, and Indian English**.

The core innovation is **Pause-First Interruption**: when the user makes a sound during assistant speech, Sunai pauses instantly in the browser, evaluates the audio over a calibrated check window (300–500 ms), and classifies it into **noise**, **backchannel nod ("haan", "hmm")**, **go-on prompt**, or **true interruption**. Backchannels resume speech seamlessly from the exact paused word; true interruptions abort immediately and listen.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------------+
|                                    BROWSER (React + Three.js)                           |
|  - 16 kHz Mono Mic Capture (Web Audio API with AEC, NS, AGC)                           |
|  - Instant Client-Side Pause on VAD Start (<50ms Time-to-Pause)                         |
|  - WebGL Audio-Reactive Particle Sphere with Calibrated Decision Ring                   |
|  - Real-Time Conversation Timeline Taskbar & Mode Comparison Dashboard                  |
+--------------------------------------------+--------------------------------------------+
                                             | WebSocket Protocol (Binary PCM + JSON)
+--------------------------------------------v--------------------------------------------+
|                                   BACKEND (FastAPI + WebSocket)                         |
|  +-----------------------------------------------------------------------------------+  |
|  | State Machine: IDLE -> LISTENING -> THINKING -> SPEAKING -> PAUSED -> SLEEP       |  |
|  +-----------------------------------------------------------------------------------+  |
|  | Interruption Classifier: Multilingual Roman & Devanagari (Hindi, Marathi, Hinglish)|  |
|  +-----------------------------------------------------------------------------------+  |
|  | Hybrid RAG Gate: BM25Okapi + all-MiniLM-L6-v2 Vectors (Dual Raw-Score Refusal)    |  |
|  +-----------------------------------------------------------------------------------+  |
|  | LLM Client: Qwen3.5-4B via llama.cpp (Thinking OFF, Mid-Generation Cancel)        |  |
|  +-----------------------------------------------------------------------------------+  |
|  | Speech Services: Gnani Prisma v3.0 STT & Gnani Timbre v2.5 TTS (16 kHz Mono)     |  |
|  +-----------------------------------------------------------------------------------+  |
|  | Metrics Logger: 8 Sequential Stage Timestamps & Automated Comparative Mode Stats  |  |
+-----------------------------------------------------------------------------------------+
```

---

## Prerequisites

1. **Operating System:** Windows 10/11, macOS, or Linux.
2. **Python:** Python 3.12+ (64-bit).
3. **Node.js:** Node.js 18+ and npm.
4. **llama.cpp:** `llama-server` binary with Vulkan / CUDA / Metal support.
5. **Gnani Cloud API Key:** A valid `GNANI_API_KEY` for Prisma STT and Timbre TTS.

---

## Installation & Setup

### 1. Clone & Configure Environment
In the `Sunai` project directory:
```bash
cp .env.example .env
```
Edit `.env` to include your Gnani API key:
```ini
GNANI_API_KEY=vach_your_gnani_api_key_here
HOST=0.0.0.0
PORT=8000
LLAMA_SERVER_URL=http://127.0.0.1:8080
```

### 2. Python Backend Dependencies
Install all backend requirements:
```bash
pip install -r requirements.txt
```

### 3. Frontend Setup
Navigate to the `Frontend` directory and install packages:
```bash
cd Frontend
npm install
cd ..
```

---

## Running the Application (3 Easy Steps)

Run the three processes in separate terminal tabs:

### Step 1: Start `llama-server` (Local Qwen3.5-4B LLM)
```powershell
& "C:\Users\<username>\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe" `
  -m "Models\hub\models--unsloth--Qwen3.5-4B-GGUF\snapshots\e87f176479d0855a907a41277aca2f8ee7a09523\Qwen3.5-4B-UD-Q5_K_XL.gguf" `
  -c 1024 -ngl 99 --port 8080 --host 127.0.0.1
```
*(Server confirms `listening on http://127.0.0.1:8080` with Vulkan GPU offload).*

### Step 2: Start Sunai Backend (FastAPI + WebSocket)
```powershell
python -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
```
*(Backend pre-warms audio cache, loads BM25 and MiniLM vectors into memory, and listens on `ws://127.0.0.1:8000/ws`).*

### Step 3: Start Sunai Frontend (Vite)
```powershell
cd Frontend
npm run dev
```
Open **`http://localhost:5173`** in Google Chrome or Edge.

---

## 2-Minute Demo Script: Pause-First vs. Baseline

This script is designed for live evaluation, pitch presentations, and side-by-side comparison.

| Timestamp | Phase | Action | What to Observe & Explain |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:35** | **The Problem (Baseline Mode)** | 1. In the right sidebar, click **"Baseline (Stop-on-Voice)"**.<br>2. Click **Start Mic** and ask in Hindi: *"Gnani.ai ke baare mein batao"*. <br>3. As Sunai begins answering, make a natural listening nod: *"Haan..."* or *"Hmm"*. | • **Bot cuts off dead immediately.** It stops speaking, dumps the queue, and leaves an awkward silence.<br>• Explain: *"Existing voice bots treat every sound as a hard stop. In natural human conversation, people nod and say 'haan' while listening. Baseline mode wrongly aborts 60%+ of user turns."* |
| **0:36 – 1:15** | **The Solution (Pause-First Mode)** | 1. Switch mode to **"✓ Pause-First (Sunai)"**.<br>2. Ask: *"What is Prisma speech engine latency?"*<br>3. While the bot speaks, say: *"Haan, accha"*. | • **Audio pauses instantly (<50ms)** — no talk-over.<br>• **Decision Ring on the Sphere** fills for 400ms, turns **Vibrant Green**, and displays badge: `Backchannel Detected ("Haan") • Resuming playback`.<br>• The bot **resumes smoothly** from the exact paused word without repeating or re-calling the LLM.<br>• Point to the **Conversation Timeline**: highlight the hatched amber `GAP (400ms)` showing the exact timing. |
| **1:16 – 1:40** | **True Interruption Handling** | 1. Bot continues explaining Prisma features.<br>2. Say firmly: *"Ruko, Armour365 kya hai?"* | • Audio pauses instantly.<br>• Interruption classifier identifies stop word *"Ruko"* and new question intent.<br>• Decision ring flashes **Crisp Red** with badge: `Interruption Confirmed • Stopping and listening`.<br>• Queue clears instantly, old generation aborts mid-sentence, and Sunai seamlessly transitions to answer the new question about Armour365 voice biometrics. |
| **1:41 – 2:00** | **RAG Refusal & Metrics Proof** | 1. Ask an off-topic query: *"What is the recipe for chocolate chip cookies?"*<br>2. Observe the instant refusal without LLM hallucination.<br>3. Open the **Stats Comparison Table** in the sidebar. | • **Refusal Gate triggers immediately**: raw vector (0.15) and raw BM25 (3.80) are below threshold; plays pre-recorded `not_in_docs.wav` in <100ms.<br>• **Stats Comparison Card shows empirical proof**:<br>&nbsp;&nbsp;- Baseline Wrong Stops: **62.5%**.<br>&nbsp;&nbsp;- Pause-First Wrong Stops: **0.0% [PITCH WIN]**.<br>&nbsp;&nbsp;- Average time to pause: **~45 ms**. |

---

## Automated Test Suites

Run any of the automated test suites from the project root:

```bash
# Module 8 Frontend Panels & Visual Metrics Test
cd Frontend
node --experimental-strip-types tests/module8_test.ts
node --experimental-strip-types tests/layout_test.ts
npm run build

# Module 2-7 Backend Tests
cd ../Backend
python test_module2.py    # Thin end-to-end WebSocket + Audio Cache
python test_module3.py    # Turn Manager & State Machine Transitions
python test_module4.py    # Real Interruption Classifier & Words
python test_module5.py    # RAG Hybrid Retrieval & Refusal Gate
python test_module7.py    # History Tracking & Mode Metrics
python tune_rag.py        # 15 On-Topic vs 15 Off-Topic Score Tuning
python benchmark_translation.py # Per-sentence translation latency benchmark
```

---

## Configuration Reference (`Backend/config.py`)

All tunable parameters are centralized in `Backend/config.py`:

| Parameter | Current Value | Purpose |
| :--- | :--- | :--- |
| `TURN_SILENCE_THRESHOLD_MS` | `700` | Silence duration to trigger end-of-turn. Tune to 600ms for faster turns or 800ms for deliberate speakers. |
| `PAUSE_FIRST_CHECK_MS` | `400` | Calibrated evaluation window before deciding whether to resume or abort. |
| `RAG_VECTOR_SIMILARITY_THRESHOLD` | `0.348` | Cosine similarity refusal boundary (On-Topic min is 0.5158; Off-Topic max is 0.1794). |
| `RAG_BM25_THRESHOLD` | `6.72` | Raw BM25 refusal boundary. Refusal triggers only if both vector and BM25 scores fail. |
| `SAFETY_TURN_LIMIT_SEC` | `20` | Max continuous speaking timeout to prevent runaway listening on noisy mics. |
| `IDLE_CHECK_TIMEOUT_SEC` | `10.0` | Inactivity silence before playing "Are you there?". |
| `IDLE_GOODBYE_TIMEOUT_SEC` | `10.0` | Subsequent silence before playing goodbye and transitioning to SLEEP. |

