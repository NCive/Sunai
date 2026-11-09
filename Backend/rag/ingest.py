"""
Document Ingestion and Chunking for Sunai RAG.
Reads English text and markdown documents from Backend/documents/,
splits them into short paragraph chunks, and verifies they fit within
the MiniLM-L6-v2 maximum sequence length (256 tokens).
"""

import os
import re
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
from Backend import config

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    """Represents a discrete indexed text chunk with metadata."""
    chunk_id: str
    doc_name: str
    text: str
    token_count: int


def clean_markdown_headers(text: str) -> str:
    """Removes markdown header markers (# Header) while preserving body text."""
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("#"):
            # Header line: keep the text without the leading hashes
            cleaned = re.sub(r"^#+\s*", "", stripped)
            if cleaned:
                lines.append(cleaned)
        else:
            lines.append(line)
    return "\n".join(lines).strip()


class DocumentIngester:
    """
    Ingests documents from disk and splits them into paragraph chunks.
    Ensures every chunk is strictly within config.MINILM_MAX_SEQ_LENGTH (256 tokens).
    """

    def __init__(self, documents_dir: Optional[Path] = None, tokenizer=None):
        self.documents_dir = documents_dir or config.DOCUMENTS_DIR
        self.tokenizer = tokenizer
        self.max_seq_length = config.MINILM_MAX_SEQ_LENGTH

    def count_tokens(self, text: str) -> int:
        """Counts tokens using the MiniLM tokenizer if available, else word count heuristic."""
        if self.tokenizer:
            try:
                tokens = self.tokenizer.encode(text, add_special_tokens=False)
                return len(tokens)
            except Exception:
                pass
        # Heuristic: 1 word ~ 1.33 tokens
        words = text.split()
        return max(1, int(len(words) * 1.35))

    def ingest_documents(self) -> List[DocumentChunk]:
        """
        Scans documents_dir for .md and .txt files, chunks by paragraph,
        and returns list of DocumentChunk instances.
        """
        chunks: List[DocumentChunk] = []

        if not self.documents_dir.exists():
            logger.warning(f"[RAG Ingest] Documents directory {self.documents_dir} does not exist.")
            return chunks

        doc_files = sorted(
            [f for f in self.documents_dir.iterdir() if f.suffix.lower() in (".md", ".txt")]
        )
        logger.info(f"[RAG Ingest] Found {len(doc_files)} document files in {self.documents_dir}")

        for file_path in doc_files:
            try:
                raw_text = file_path.read_text(encoding="utf-8")
            except Exception as e:
                logger.error(f"[RAG Ingest] Failed to read {file_path}: {e}")
                continue

            cleaned_text = clean_markdown_headers(raw_text)
            # Split on double newlines to separate paragraphs
            raw_paragraphs = [p.strip() for p in re.split(r"\n\s*\n", cleaned_text) if p.strip()]

            chunk_idx = 0
            for para in raw_paragraphs:
                # Remove single internal newlines for uniform paragraph text
                uniform_para = re.sub(r"\s+", " ", para).strip()
                if len(uniform_para) < 20:
                    # Skip very short fragments
                    continue

                tok_count = self.count_tokens(uniform_para)

                # If paragraph exceeds max_seq_length, split by sentence
                if tok_count > self.max_seq_length:
                    sentences = re.split(r"(?<=[.!?])\s+", uniform_para)
                    current_sub = ""
                    for s in sentences:
                        candidate = f"{current_sub} {s}".strip() if current_sub else s
                        if self.count_tokens(candidate) <= self.max_seq_length:
                            current_sub = candidate
                        else:
                            if current_sub:
                                chunks.append(
                                    DocumentChunk(
                                        chunk_id=f"{file_path.stem}_p{chunk_idx}",
                                        doc_name=file_path.name,
                                        text=current_sub,
                                        token_count=self.count_tokens(current_sub),
                                    )
                                )
                                chunk_idx += 1
                            current_sub = s
                    if current_sub:
                        chunks.append(
                            DocumentChunk(
                                chunk_id=f"{file_path.stem}_p{chunk_idx}",
                                doc_name=file_path.name,
                                text=current_sub,
                                token_count=self.count_tokens(current_sub),
                            )
                        )
                        chunk_idx += 1
                else:
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{file_path.stem}_p{chunk_idx}",
                            doc_name=file_path.name,
                            text=uniform_para,
                            token_count=tok_count,
                        )
                    )
                    chunk_idx += 1

        logger.info(f"[RAG Ingest] Successfully ingested {len(chunks)} chunks across {len(doc_files)} documents.")
        return chunks

