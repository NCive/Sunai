"""
BM25 and Dense Vector Indexing for Sunai RAG.
Builds both BM25Okapi and all-MiniLM-L6-v2 vector embeddings at startup.
All math is vectorized with NumPy for maximum performance.
"""

import math
import re
import string
import logging
from typing import List, Tuple, Dict
import numpy as np

from Backend import config
from Backend.rag.ingest import DocumentChunk

logger = logging.getLogger(__name__)

PUNCT_REGEX = re.compile(f"[{re.escape(string.punctuation)}]")


def tokenize_for_bm25(text: str) -> List[str]:
    """Tokenizes text into lowercase word tokens, removing punctuation."""
    cleaned = PUNCT_REGEX.sub(" ", text.lower())
    return [w for w in cleaned.split() if w]


class BM25Index:
    """
    Standard BM25Okapi index implementation.
    Calculates exact BM25 scores for document chunks given a query.
    """

    def __init__(self, chunks: List[DocumentChunk], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self.corpus_size = len(chunks)
        self.doc_tokens: List[List[str]] = []
        self.doc_lens: List[int] = []
        self.avgdl: float = 0.0
        self.doc_freqs: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}

        self._build_index()

    def _build_index(self) -> None:
        """Computes vocabulary, document frequencies, and IDF values."""
        if not self.chunks:
            return

        total_length = 0
        for chunk in self.chunks:
            tokens = tokenize_for_bm25(chunk.text)
            self.doc_tokens.append(tokens)
            self.doc_lens.append(len(tokens))
            total_length += len(tokens)

            # Unique terms in doc
            for term in set(tokens):
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1

        self.avgdl = (total_length / self.corpus_size) if self.corpus_size > 0 else 1.0

        # Compute IDF with standard Okapi smoothing
        for term, freq in self.doc_freqs.items():
            self.idf[term] = math.log(1.0 + (self.corpus_size - freq + 0.5) / (freq + 0.5))

        logger.info(
            f"[BM25Index] Indexed {self.corpus_size} chunks, vocab size: {len(self.idf)}, avgdl: {self.avgdl:.1f}"
        )

    def get_scores(self, query: str) -> np.ndarray:
        """
        Computes raw BM25 scores for all document chunks.
        Returns a 1D numpy array of length corpus_size.
        """
        scores = np.zeros(self.corpus_size, dtype=np.float32)
        if self.corpus_size == 0:
            return scores

        query_tokens = tokenize_for_bm25(query)
        if not query_tokens:
            return scores

        for token in query_tokens:
            if token not in self.idf:
                continue

            idf = self.idf[token]
            for i, doc_terms in enumerate(self.doc_tokens):
                tf = doc_terms.count(token)
                if tf > 0:
                    numerator = tf * (self.k1 + 1.0)
                    denominator = tf + self.k1 * (1.0 - self.b + self.b * (self.doc_lens[i] / self.avgdl))
                    scores[i] += idf * (numerator / denominator)

        return scores


class VectorIndex:
    """
    Dense vector embedding index using all-MiniLM-L6-v2.
    Embeds document chunks at startup and performs cosine similarity search.
    """

    def __init__(self, chunks: List[DocumentChunk]):
        self.chunks = chunks
        self.tokenizer = None
        self.model = None
        self.embeddings: Optional[np.ndarray] = None  # Shape: (N, 384)

        self._load_model_and_index()

    def _load_model_and_index(self) -> None:
        """Loads local MiniLM model from cache and encodes all document chunks."""
        from transformers import AutoTokenizer, AutoModel
        import torch

        model_path = str(config.MINILM_MODEL_PATH)
        logger.info(f"[VectorIndex] Loading all-MiniLM-L6-v2 from {model_path}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModel.from_pretrained(model_path)
        self.model.eval()

        if not self.chunks:
            self.embeddings = np.zeros((0, 384), dtype=np.float32)
            return

        texts = [c.text for c in self.chunks]
        self.embeddings = self._encode(texts)
        logger.info(f"[VectorIndex] Encoded {len(self.chunks)} chunks into vector matrix {self.embeddings.shape}")

    def _encode(self, texts: List[str]) -> np.ndarray:
        """
        Generates mean-pooled, L2-normalized embeddings for a list of texts.
        Returns numpy array of shape (len(texts), 384).
        """
        import torch

        if not texts:
            return np.zeros((0, 384), dtype=np.float32)

        # Tokenize with max sequence length 256
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=config.MINILM_MAX_SEQ_LENGTH,
            return_tensors="pt",
        )

        with torch.no_grad():
            outputs = self.model(**encoded)
            # Mean pooling over token embeddings with attention mask
            token_embeddings = outputs[0]  # First element has last_hidden_state
            attention_mask = encoded["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
            sum_embeddings = torch.sum(token_embeddings * attention_mask, 1)
            sum_mask = torch.clamp(attention_mask.sum(1), min=1e-9)
            mean_pooled = sum_embeddings / sum_mask

            # L2 normalize
            normalized = torch.nn.functional.normalize(mean_pooled, p=2, dim=1)
            return normalized.cpu().numpy()

    def get_scores(self, query: str) -> np.ndarray:
        """
        Computes raw cosine similarity scores between query and all indexed chunks.
        Returns 1D numpy array of length corpus_size with values in [-1.0, 1.0].
        """
        if self.embeddings is None or self.embeddings.shape[0] == 0:
            return np.zeros(0, dtype=np.float32)

        if not query.strip():
            return np.zeros(self.embeddings.shape[0], dtype=np.float32)

        query_vec = self._encode([query])[0]  # Shape: (384,)
        # Dot product of normalized vectors equals cosine similarity
        sims = np.dot(self.embeddings, query_vec)
        return sims

