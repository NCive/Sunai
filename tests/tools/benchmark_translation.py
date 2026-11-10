"""
Translation Benchmark Script for Sunai Voice Assistant.
Times per-sentence translation for Hindi, Marathi, and Hinglish.
Reports average and worst-case latency.
Plan Section 10 & Module 6 compliant.
"""

import time
import sys
from pathlib import Path
import statistics

root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from Backend.translate import translate, QwenTranslator, set_global_translator

BENCHMARK_SENTENCES = [
    "Gnani.ai is a leading conversational AI company based in Bangalore.",
    "The speech engine provides sub-300ms latency for streaming voice applications.",
    "Armour365 authenticates callers in under three seconds with voice biometrics.",
    "Sunai uses pause-first turn taking to classify user interruptions accurately.",
    "I do not have this information in my documents.",
]

TARGET_LANGUAGES = [
    ("Hindi", "hi-IN"),
    ("Marathi", "mr-IN"),
    ("Hinglish", "hi-Latn"),
]


def run_benchmark():
    print("=========================================================================================")
    print("SUNAI TRANSLATION BENCHMARK: HINDI, MARATHI & HINGLISH")
    print("=========================================================================================\n")

    # Ensure QwenTranslator is active
    translator = QwenTranslator()
    set_global_translator(translator)

    overall_results = {}

    for lang_name, lang_code in TARGET_LANGUAGES:
        print(f"--- Benchmarking: {lang_name} ({lang_code}) ---")
        times = []
        samples = []

        for i, text in enumerate(BENCHMARK_SENTENCES, 1):
            t0 = time.perf_counter()
            out = translate(text, from_lang="en", to_lang=lang_code)
            dt_ms = (time.perf_counter() - t0) * 1000.0
            times.append(dt_ms)
            samples.append((text, out, dt_ms))
            print(f"  Sentence {i}: [{dt_ms:6.1f} ms] -> {out}")

        avg_ms = statistics.mean(times)
        worst_ms = max(times)
        best_ms = min(times)
        overall_results[lang_name] = {
            "avg": avg_ms,
            "worst": worst_ms,
            "best": best_ms,
            "samples": samples,
        }
        print(f"  --> {lang_name} Stats: Avg = {avg_ms:.1f} ms | Worst = {worst_ms:.1f} ms | Best = {best_ms:.1f} ms\n")

    print("=========================================================================================")
    print("SUMMARY COMPARISON TABLE")
    print("=========================================================================================")
    print(f"{'Target Language':<18} | {'Avg Latency (ms)':<18} | {'Worst Latency (ms)':<20} | {'Best Latency (ms)':<18}")
    print("-" * 85)
    for lang_name, stats in overall_results.items():
        print(f"{lang_name:<18} | {stats['avg']:<18.1f} | {stats['worst']:<20.1f} | {stats['best']:<18.1f}")
    print("=========================================================================================\n")


if __name__ == "__main__":
    run_benchmark()
