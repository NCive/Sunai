"""
Hybrid RAG Retriever for Sunai Voice Assistant.
Executes dual retrieval (BM25 + all-MiniLM-L6-v2 vectors), merges with Reciprocal Rank Fusion (RRF),
evaluates the raw-score Refusal Gate, and provides the top retrieved source chunks.
"""

import logging
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
import numpy as np

from Backend import config
from Backend.rag.ingest import DocumentChunk, DocumentIngester
from Backend.rag.index import BM25Index, VectorIndex

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """Encapsulates the complete hybrid retrieval decision and top retrieved chunks."""
    refused: bool
    top_chunks: List[DocumentChunk]
    top_vector_score: float
    top_bm25_score: float
    top_rrf_score: float
    sources: List[str]
    context_text: str
    titles: List[str] = field(default_factory=list)
    source_details: List[dict] = field(default_factory=list)


class HybridRetriever:
    """
    Combines dense vector retrieval and sparse BM25 retrieval with RRF ranking
    and a dual-threshold raw score Refusal Gate.
    """

    def __init__(self, chunks: Optional[List[DocumentChunk]] = None):
        if chunks is None:
            ingester = DocumentIngester()
            self.chunks = ingester.ingest_documents()
        else:
            self.chunks = chunks

        logger.info(f"[Retriever] Building BM25 and Vector indices for {len(self.chunks)} chunks...")
        self.bm25_index = BM25Index(self.chunks, k1=config.BM25_K1, b=config.BM25_B)
        self.vector_index = VectorIndex(self.chunks)
        logger.info("[Retriever] Indexes ready.")

    def retrieve(self, query: str, top_k: Optional[int] = None) -> RetrievalResult:
        """
        Executes hybrid retrieval:
        1. Computes raw cosine similarity vector scores.
        2. Computes raw BM25 scores.
        3. Evaluates Refusal Gate on RAW scores (refuse if BOTH below thresholds).
        4. Applies Reciprocal Rank Fusion (RRF) with k=60 to merge ranks.
        5. Returns top_k chunks and source file names.
        """
        k = top_k or config.RAG_TOP_K
        rrf_k = config.RAG_RRF_K
        num_chunks = len(self.chunks)

        if num_chunks == 0 or not query.strip():
            return RetrievalResult(
                refused=True,
                top_chunks=[],
                top_vector_score=0.0,
                top_bm25_score=0.0,
                top_rrf_score=0.0,
                sources=[],
                context_text="",
            )

        # 1. Raw Vector & BM25 Scores
        vector_scores = self.vector_index.get_scores(query)
        bm25_scores = self.bm25_index.get_scores(query)

        max_vector_score = float(np.max(vector_scores)) if len(vector_scores) > 0 else 0.0
        max_bm25_score = float(np.max(bm25_scores)) if len(bm25_scores) > 0 else 0.0

        # 2. Refusal Gate Check (Raw Scores)
        # Refuse ONLY if BOTH top raw vector similarity and top raw BM25 are below their thresholds
        vector_refused = max_vector_score < config.RAG_VECTOR_SIMILARITY_THRESHOLD
        bm25_refused = max_bm25_score < config.RAG_BM25_THRESHOLD
        is_refused = vector_refused and bm25_refused

        logger.info(
            f"[Retriever] Query: '{query[:40]}...' | Raw Vector: {max_vector_score:.4f} (th={config.RAG_VECTOR_SIMILARITY_THRESHOLD}) | "
            f"Raw BM25: {max_bm25_score:.4f} (th={config.RAG_BM25_THRESHOLD}) | Refused: {is_refused}"
        )

        if is_refused:
            return RetrievalResult(
                refused=True,
                top_chunks=[],
                top_vector_score=max_vector_score,
                top_bm25_score=max_bm25_score,
                top_rrf_score=0.0,
                sources=[],
                context_text="",
            )

        # 3. Reciprocal Rank Fusion (RRF)
        # Rank by vector score descending (1-based rank)
        vector_order = np.argsort(-vector_scores)
        vector_ranks = {chunk_idx: rank + 1 for rank, chunk_idx in enumerate(vector_order)}

        # Rank by BM25 score descending (1-based rank)
        bm25_order = np.argsort(-bm25_scores)
        bm25_ranks = {chunk_idx: rank + 1 for rank, chunk_idx in enumerate(bm25_order)}

        # Compute RRF score for each chunk
        rrf_scores = np.zeros(num_chunks, dtype=np.float32)
        for i in range(num_chunks):
            rv = vector_ranks[i]
            rb = bm25_ranks[i]
            rrf_scores[i] = (1.0 / (rrf_k + rv)) + (1.0 / (rrf_k + rb))

        # Sort chunks by RRF score descending
        rrf_ranked_indices = np.argsort(-rrf_scores)[:k]
        top_chunks = [self.chunks[i] for i in rrf_ranked_indices]
        max_rrf_score = float(rrf_scores[rrf_ranked_indices[0]]) if len(rrf_ranked_indices) > 0 else 0.0

        # Extract unique sources preserving rank order
        sources: List[str] = []
        titles: List[str] = []
        source_details: List[dict] = []
        seen_docs = set()
        for c in top_chunks:
            if c.doc_name not in seen_docs:
                seen_docs.add(c.doc_name)
                sources.append(c.doc_name)
                if c.title and c.title not in titles:
                    titles.append(c.title)
                source_details.append({
                    "doc_name": c.doc_name,
                    "title": c.title or c.doc_name,
                    "source_urls": c.source_urls or [],
                })

        # Compile concatenated context text for LLM
        context_text = "\n\n".join(
            f"[{c.doc_name}]: {c.text}" for c in top_chunks
        )

        return RetrievalResult(
            refused=False,
            top_chunks=top_chunks,
            top_vector_score=max_vector_score,
            top_bm25_score=max_bm25_score,
            top_rrf_score=max_rrf_score,
            sources=sources,
            context_text=context_text,
            titles=titles,
            source_details=source_details,
        )

