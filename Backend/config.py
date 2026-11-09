"""
Sunai Backend Configuration
Single source of truth for all backend tunable constants.
Rule: No magic numbers in code.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from Sunai root or Backend directory
root_dir = Path(__file__).resolve().parent.parent
env_path = root_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# Server Settings
HOST: str = "0.0.0.0"
PORT: int = 8000
WS_PATH: str = "/ws"

# Gnani Cloud API Credentials
GNANI_API_KEY: str = os.getenv("GNANI_API_KEY", "")

# STT (Prisma v3.0) Configuration
PRISMA_MODEL: str = "prisma-v3.0"
PRISMA_DEFAULT_LANGUAGE: str = "indic-auto"
PRISMA_CANDIDATE_LANGUAGES: list[str] = ["hi-IN", "mr-IN", "en-IN"]
PRISMA_SAMPLE_RATE: int = 16000
PRISMA_FORMAT: str = "transcribe"
PRISMA_CHUNK_SIZE: int = 1024

# TTS (Timbre) Configuration
TIMBRE_MODEL: str = "timbre-v2.5"
TIMBRE_SAMPLE_RATE: int = 16000
TIMBRE_CONTAINER: str = "wav"
TIMBRE_SPEED: float = 1.0
TIMBRE_VOICES: dict[str, str] = {
    "hi-IN": "Devika",
    "mr-IN": "Devika",
    "en-IN": "Pranav",
    "default": "Devika",
}

# Turn Management & Interruption Timers
TURN_SILENCE_THRESHOLD_MS: int = 700
PAUSE_FIRST_CHECK_MS: int = 400
SAFETY_TURN_LIMIT_SEC: int = 20
TEXT_FINISHED_MIN_CHARS: int = 3
STUB_CLASSIFIER_DECISION: str = "small_sound"  # Kept for backward compatibility
IDLE_CHECK_FIRST_TIMEOUT_SEC: float = 10.0
IDLE_CHECK_SECOND_TIMEOUT_SEC: float = 10.0

# Operating Mode: "pause_first" or "baseline"
DEFAULT_MODE: str = "pause_first"

# ---------------------------------------------------------------------
# Module 4: Interruption Classifier & Acoustic Thresholds
# ---------------------------------------------------------------------
NOISE_RMS_ENERGY_THRESHOLD: float = 0.015
NOISE_MAX_DURATION_SEC: float = 0.25
INTERRUPTION_WORD_COUNT_THRESHOLD: int = 3
UNCLEAR_MAX_RETRIES: int = 2

# Word Lists from separate editable interruption_words.py
from Backend.interruption_words import (
    SMALL_SOUND_WORDS,
    GO_ON_WORDS,
    STOP_WORDS,
    QUESTION_STARTERS,
)

BACKCHANNEL_WORDS: set[str] = SMALL_SOUND_WORDS

# Prompt phrase when unclear repeats 2+ times
UNCLEAR_REPEAT_SLOWLY: dict[str, str] = {
    "hi-IN": "कृपया धीरे-धीरे और साफ़ बोलें।",
    "mr-IN": "कृपया हळू आणि स्पष्ट बोला.",
    "en-IN": "Please speak slowly and clearly.",
}

# ---------------------------------------------------------------------
# Module 5: RAG & Refusal Gate Configuration
# ---------------------------------------------------------------------
DOCUMENTS_DIR: Path = Path(__file__).resolve().parent / "documents"
MINILM_MODEL_PATH: Path = root_dir / "Models/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
MINILM_MAX_SEQ_LENGTH: int = 256
BM25_K1: float = 1.5
BM25_B: float = 0.75
RAG_RRF_K: int = 60
RAG_TOP_K: int = 3

# Refusal Gate Thresholds (Raw scores: refuse ONLY if BOTH are below)
# Tuned via Backend/tune_rag.py on on-topic vs off-topic distributions
RAG_VECTOR_SIMILARITY_THRESHOLD: float = 0.35
RAG_BM25_THRESHOLD: float = 6.50

# Audio Cache Configuration
AUDIO_CACHE_DIR: Path = Path(__file__).resolve().parent / "audio_cache"

# Pre-recorded Cache Phrases (Section 12 / 14)
# In Devanagari for Indic accuracy, and English
CACHE_PHRASES: dict[str, dict[str, str]] = {
    "ji": {
        "hi-IN": "जी?",
        "mr-IN": "जी?",
        "en-IN": "Pardon?",
    },
    "kya_kaha": {
        "hi-IN": "क्या कहा आपने?",
        "mr-IN": "तुम्ही काय म्हणालात?",
        "en-IN": "What did you say?",
    },
    "please_wait": {
        "hi-IN": "कृपया प्रतीक्षा करें, मैं जाँच रहा हूँ।",
        "mr-IN": "कृपया थांबा, मी तपासत आहे.",
        "en-IN": "Please wait, I am checking.",
    },
    "are_you_there": {
        "hi-IN": "क्या आप सुन रहे हैं?",
        "mr-IN": "तुम्ही ऐकत आहात का?",
        "en-IN": "Are you there?",
    },
    "goodbye": {
        "hi-IN": "अलविदा, फिर मिलेंगे।",
        "mr-IN": "निरोप, पुन्हा भेटू.",
        "en-IN": "Goodbye, take care.",
    },
    "not_in_docs": {
        "hi-IN": "माफ़ कीजिए, यह जानकारी मेरे पास उपलब्ध दस्तावेज़ों में नहीं है।",
        "mr-IN": "माफ करा, ही माहिती माझ्याकडील कागदपत्रांमध्ये उपलब्ध नाही.",
        "en-IN": "I do not have this information in my documents.",
    },
    "repeat_slowly": {
        "hi-IN": "कृपया धीरे-धीरे और साफ़ बोलें।",
        "mr-IN": "कृपया हळू आणि स्पष्ट बोला.",
        "en-IN": "Please speak slowly and clearly.",
    },
}

# Module 2 Fixed Reply Sentences
FIXED_REPLY_TEXT: dict[str, str] = {
    "hi-IN": "नमस्ते, मैं सुनाई हूँ। आपकी क्या मदद कर सकता हूँ?",
    "mr-IN": "नमस्कार, मी सुनाई आहे. मी तुम्हाला कशी मदत करू शकतो?",
    "en-IN": "Hello, I am Sunai. How can I help you today?",
    "default": "नमस्ते, मैं सुनाई हूँ। आपकी क्या मदद कर सकता हूँ?",
}

# ---------------------------------------------------------------------
# Module 6: LLM (Qwen via llama.cpp), Sentence Splitting & Translation
# ---------------------------------------------------------------------
LLAMA_SERVER_URL: str = os.getenv("LLAMA_SERVER_URL", "http://127.0.0.1:8080")
LLAMA_SERVER_BIN: Path = Path(r"C:\Users\neild\AppData\Local\Microsoft\WinGet\Packages\ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe\llama-server.exe")
QWEN_GGUF_MODEL_PATH: Path = root_dir / "Models/hub/models--unsloth--Qwen3.5-4B-GGUF/snapshots/e87f176479d0855a907a41277aca2f8ee7a09523/Qwen3.5-4B-UD-Q5_K_XL.gguf"
LLM_CONTEXT_SIZE: int = 1024
LLM_MAX_TOKENS: int = 160
LLM_TEMPERATURE: float = 0.0
LLM_ENABLE_THINKING: bool = False
FIRST_SENTENCE_WAIT_TIMEOUT_SEC: float = 1.5
MIN_SENTENCE_CHAR_LEN: int = 6
HISTORY_MAX_TURNS: int = 4

# ---------------------------------------------------------------------
# Module 7: Metrics, Logging & Mode Comparison
# ---------------------------------------------------------------------
METRICS_LOG_DIR: Path = Path(__file__).resolve().parent / "logs"
METRICS_LOG_FILE: Path = METRICS_LOG_DIR / "metrics.jsonl"
INTERRUPTIONS_LOG_FILE: Path = METRICS_LOG_DIR / "interruptions.jsonl"
DEFAULT_TIME_TO_PAUSE_MS: float = 45.0  # Typical browser-side VAD audio pause latency



