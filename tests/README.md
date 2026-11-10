# Sunai Test Suite & Developer Tools

This directory contains the automated test suites and evaluation tools for the Sunai voice assistant.

---

## Directory Structure

```
tests/
├── backend/                  # Python backend test suites
│   ├── test_bugfix_pass.py   # State machine, safety timers & silence finalization
│   ├── test_module2.py       # Gnani Prisma STT & Timbre TTS integration
│   ├── test_module3.py       # Turn management & 6-state state machine
│   ├── test_module4.py       # Interruption classification & acoustic thresholds
│   ├── test_module5.py       # Hybrid RAG retriever & refusal gate thresholds
│   ├── test_module6.py       # Qwen LLM streaming, sentence splitter & translation
│   ├── test_module7.py       # Metrics, conversation history & mode stats
│   ├── test_overlapping_voices.py # Epoch-based interruption audio cancellation
│   └── test_smalltalk.py     # Multilingual small-talk intent detection (64 cases)
├── frontend/                 # TypeScript frontend test suites
│   ├── module1_test.ts       # Audio capture, synthetic WAV & sphere math
│   ├── layout_test.ts        # Responsive layout & zero-overlap grid constraints
│   └── module8_test.ts       # Live captions, decision badges & latency UI
├── tools/                    # Benchmarking, tuning & analysis utilities
│   ├── tune_rag.py           # On-topic vs off-topic RAG threshold calibration
│   ├── benchmark_translation.py # Per-sentence translation latency benchmarks
│   └── compare_modes.py      # Statistical comparison of pause-first vs baseline
└── README.md                 # This file
```

---

## Running Backend Tests

Backend tests use `pytest` and can be run from the repository root:

```bash
# Run the entire backend test suite
pytest

# Run a specific backend test module
pytest tests/backend/test_smalltalk.py

# Run with verbose output and print statements
pytest -v -s tests/backend/test_module4.py
```

You can also run any test module directly with Python:

```bash
python tests/backend/test_smalltalk.py
python tests/backend/test_overlapping_voices.py
```

---

## Running Frontend Tests

Frontend tests run in Node.js (with native TypeScript type stripping) via the npm script in `Frontend/`:

```bash
cd Frontend
npm test
```

This sequentially executes:
1. `tests/frontend/module1_test.ts` - Audio math, synthetic WAV generator, and dot distribution.
2. `tests/frontend/layout_test.ts` - Viewport breakpoints, CSS Grid geometry, and zero-overlap clearances.
3. `tests/frontend/module8_test.ts` - Live caption states, decision badges, and metrics aggregations.

---

## Developer & Tuning Tools (`tests/tools/`)

### 1. RAG Score Tuning (`tests/tools/tune_rag.py`)
Calibrates the refusal gate thresholds by running 15 domain-specific on-topic queries and 15 out-of-domain off-topic queries against the knowledge base in `docs/`.
```bash
python tests/tools/tune_rag.py
```
**Output:**
- Vector cosine similarity separation gap (+0.33+ gap between on-topic and off-topic).
- BM25 score distribution.
- Recommended `RAG_VECTOR_SIMILARITY_THRESHOLD` and `RAG_BM25_THRESHOLD` values.

### 2. Translation Benchmark (`tests/tools/benchmark_translation.py`)
Benchmarks translation latency across English, Hindi, Marathi, and Hinglish using the configured translator backend.
```bash
python tests/tools/benchmark_translation.py
```

### 3. Mode Comparison (`tests/tools/compare_modes.py`)
Processes runtime logs (`metrics.jsonl` and `interruptions.jsonl`) to generate side-by-side comparison tables evaluating `pause_first` against `baseline` mode:
```bash
python tests/tools/compare_modes.py
```
**Metrics Evaluated:**
- Interruption classification accuracy
- Bot talk-over rate (false interruptions)
- Average interruption-to-pause latency
- Average turn latency and user satisfaction score

---

## Adding New Tests

### Adding a Backend Test
1. Create a new test file named `test_<feature>.py` in `tests/backend/`.
2. Ensure you import from `Backend`:
   ```python
   from pathlib import Path
   import sys
   root_dir = Path(__file__).resolve().parent.parent.parent
   if str(root_dir) not in sys.path:
       sys.path.insert(0, str(root_dir))
   from Backend import config
   ```
3. Pytest automatically discovers any function prefixed with `test_`.

### Adding a Frontend Test
1. Add a test script in `tests/frontend/<feature>_test.ts`.
2. Import configuration or components from `../../Frontend/src/...`.
3. Add the test execution command to the `"test"` script in `Frontend/package.json`.

