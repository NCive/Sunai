"""
Sunai RAG Module Package.
Provides ingestion, dual indexing (BM25 + all-MiniLM-L6-v2), RRF ranking,
and raw-score refusal gate.
"""

from Backend.rag.ingest import DocumentChunk, DocumentIngester
from Backend.rag.index import BM25Index, VectorIndex
from Backend.rag.retrieve import HybridRetriever, RetrievalResult

__all__ = [
    "DocumentChunk",
    "DocumentIngester",
    "BM25Index",
    "VectorIndex",
    "HybridRetriever",
    "RetrievalResult",
]

