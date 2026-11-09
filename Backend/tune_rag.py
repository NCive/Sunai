"""
RAG Score Tuning Script for Sunai Voice Assistant.
Runs 15 on-topic and 15 off-topic questions against the indexed documents in Backend/documents.
Computes and displays raw cosine similarity scores, raw BM25 scores, and RRF scores.
Demonstrates the separation gap and calculates optimal Refusal Gate thresholds.
"""

import sys
from pathlib import Path
import numpy as np

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from Backend import config
from Backend.rag import HybridRetriever, DocumentIngester

ON_TOPIC_QUESTIONS = [
    "Who are the founders of Gnani.ai?",
    "Where is Gnani.ai headquartered?",
    "What industries does Gnani.ai serve?",
    "How many Indian languages are supported by Gnani speech engines?",
    "What is Prisma speech-to-text latency?",
    "Can Prisma handle mixed languages like Hinglish?",
    "What is Timbre and what is its Mean Opinion Score?",
    "What audio formats does Timbre output?",
    "What is Armour365 voice biometrics?",
    "How fast does Armour365 authenticate a caller in 1:1 verification?",
    "How does Armour365 detect deepfakes and replay attacks?",
    "What security standards and compliance certifications does Armour365 meet?",
    "What problem does Sunai assistant solve with pause-first turn taking?",
    "What states does the Sunai state machine transition through?",
    "How does Sunai handle conversational interruptions when callers speak?",
]

OFF_TOPIC_QUESTIONS = [
    "What is the recipe for baking chocolate chip cookies?",
    "How far is the Moon from planet Earth in kilometers?",
    "Who won the FIFA Football World Cup in 2022?",
    "What is Newton's second law of motion in physics?",
    "How do I change the engine oil in a Toyota Camry car?",
    "What is the capital city of Australia?",
    "Can you write a short poem about autumn leaves?",
    "How does photosynthesis convert sunlight into glucose in plants?",
    "What is the plot of Shakespeare's famous play Hamlet?",
    "What are the basic rules of playing the game of cricket?",
    "How do modern airplanes generate aerodynamic lift to fly?",
    "What are the common symptoms of influenza and colds?",
    "How do supermassive black holes form in outer space?",
    "What is the current exchange rate of US Dollar to Japanese Yen?",
    "Who painted the Mona Lisa portrait in Italy?",
]


def run_tuning():
    print("=" * 115)
    print("SUNAI RAG TUNING: 15 ON-TOPIC VS 15 OFF-TOPIC QUESTIONS")
    print("=" * 115)

    ingester = DocumentIngester()
    chunks = ingester.ingest_documents()
    print(f"\n[Info] Ingested {len(chunks)} paragraph chunks across {len(set(c.doc_name for c in chunks))} documents.")
    for c in chunks:
        print(f"  - Chunk '{c.chunk_id}' ({c.doc_name}): {c.token_count} tokens (Limit: {config.MINILM_MAX_SEQ_LENGTH})")

    retriever = HybridRetriever(chunks=chunks)

    on_topic_vector_scores = []
    on_topic_bm25_scores = []
    off_topic_vector_scores = []
    off_topic_bm25_scores = []

    header = f"{'#':<3} | {'Type':<8} | {'Question':<48} | {'Raw Vector':<11} | {'Raw BM25':<10} | {'Top Source':<20}"
    sep = "-" * len(header)
    print("\n" + sep)
    print(header)
    print(sep)

    # 1. Evaluate On-Topic Questions
    for i, q in enumerate(ON_TOPIC_QUESTIONS, 1):
        v_scores = retriever.vector_index.get_scores(q)
        b_scores = retriever.bm25_index.get_scores(q)

        max_v = float(np.max(v_scores)) if len(v_scores) > 0 else 0.0
        max_b = float(np.max(b_scores)) if len(b_scores) > 0 else 0.0

        best_idx = int(np.argmax(v_scores)) if len(v_scores) > 0 else 0
        best_doc = chunks[best_idx].doc_name if chunks else "none"

        on_topic_vector_scores.append(max_v)
        on_topic_bm25_scores.append(max_b)

        print(f"{i:<3} | {'ON-TOPIC':<8} | {q:<48} | {max_v:<11.4f} | {max_b:<10.4f} | {best_doc:<20}")

    print(sep)

    # 2. Evaluate Off-Topic Questions
    for i, q in enumerate(OFF_TOPIC_QUESTIONS, 16):
        v_scores = retriever.vector_index.get_scores(q)
        b_scores = retriever.bm25_index.get_scores(q)

        max_v = float(np.max(v_scores)) if len(v_scores) > 0 else 0.0
        max_b = float(np.max(b_scores)) if len(b_scores) > 0 else 0.0

        best_idx = int(np.argmax(v_scores)) if len(v_scores) > 0 else 0
        best_doc = chunks[best_idx].doc_name if chunks else "none"

        off_topic_vector_scores.append(max_v)
        off_topic_bm25_scores.append(max_b)

        print(f"{i:<3} | {'OFF-TOP':<8} | {q:<48} | {max_v:<11.4f} | {max_b:<10.4f} | {best_doc:<20}")

    print(sep)

    # Compute Statistical Summaries
    print("\n" + "=" * 60)
    print("SCORE DISTRIBUTION & SEPARATION ANALYSIS")
    print("=" * 60)

    on_v_min, on_v_mean, on_v_max = min(on_topic_vector_scores), np.mean(on_topic_vector_scores), max(on_topic_vector_scores)
    off_v_min, off_v_mean, off_v_max = min(off_topic_vector_scores), np.mean(off_topic_vector_scores), max(off_topic_vector_scores)

    on_b_min, on_b_mean, on_b_max = min(on_topic_bm25_scores), np.mean(on_topic_bm25_scores), max(on_topic_bm25_scores)
    off_b_min, off_b_mean, off_b_max = min(off_topic_bm25_scores), np.mean(off_topic_bm25_scores), max(off_topic_bm25_scores)

    print(f"RAW VECTOR COSINE SIMILARITY:")
    print(f"  - On-Topic : Min = {on_v_min:.4f}, Mean = {on_v_mean:.4f}, Max = {on_v_max:.4f}")
    print(f"  - Off-Topic: Min = {off_v_min:.4f}, Mean = {off_v_mean:.4f}, Max = {off_v_max:.4f}")
    v_gap = on_v_min - off_v_max
    print(f"  - Vector Separation Gap (Min On-Topic - Max Off-Topic): {v_gap:+.4f}")

    print(f"\nRAW BM25 SCORES:")
    print(f"  - On-Topic : Min = {on_b_min:.4f}, Mean = {on_b_mean:.4f}, Max = {on_b_max:.4f}")
    print(f"  - Off-Topic: Min = {off_b_min:.4f}, Mean = {off_b_mean:.4f}, Max = {off_b_max:.4f}")
    b_gap = on_b_min - off_b_max
    print(f"  - BM25 Separation Gap (Min On-Topic - Max Off-Topic): {b_gap:+.4f}")

    # Optimal Suggested Thresholds:
    # A query is REFUSED only if BOTH raw_vector < threshold_v AND raw_bm25 < threshold_b
    suggested_v_threshold = round((on_v_min + off_v_max) / 2.0, 3)
    suggested_b_threshold = round(max(off_b_max + 0.3, 1.5), 2)

    print("\n" + "=" * 60)
    print("RECOMMENDED REFUSAL GATE THRESHOLDS")
    print("=" * 60)
    print(f"  RAG_VECTOR_SIMILARITY_THRESHOLD : {suggested_v_threshold}")
    print(f"  RAG_BM25_THRESHOLD              : {suggested_b_threshold}")
    print("Refusal Rule: Refuse ONLY if raw_vector < threshold AND raw_bm25 < threshold.\n")

    return {
        "on_topic_vector": on_topic_vector_scores,
        "on_topic_bm25": on_topic_bm25_scores,
        "off_topic_vector": off_topic_vector_scores,
        "off_topic_bm25": off_topic_bm25_scores,
        "suggested_v_th": suggested_v_threshold,
        "suggested_b_th": suggested_b_threshold,
    }


if __name__ == "__main__":
    run_tuning()

