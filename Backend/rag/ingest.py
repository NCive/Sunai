"""
Document Ingestion and Chunking for Sunai RAG.
Reads English text and markdown documents from the docs/ knowledge base,
splits them into short paragraph chunks, and verifies they fit within
the MiniLM-L6-v2 maximum sequence length (256 tokens).
"""

import os
import re
import logging
from dataclasses import dataclass, field
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
    title: Optional[str] = None
    source_urls: List[str] = field(default_factory=list)


def extract_front_matter(raw_text: str) -> tuple[Optional[str], List[str], str]:
    """
    Extracts title, source_urls, and body text from markdown front matter.
    Format:
    ---
    title: <Title>
    source_urls:
      - <url>
    retrieved_date: YYYY-MM-DD
    ---
    Returns: (title, source_urls, body_text)
    """
    title = None
    source_urls: List[str] = []
    body_text = raw_text

    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", raw_text, re.DOTALL)
    if fm_match:
        fm_content = fm_match.group(1)
        body_text = raw_text[fm_match.end():]

        # Extract title
        title_match = re.search(r"^title:\s*(.+)$", fm_content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip().strip("\"'")

        # Extract source_urls list
        urls_match = re.search(r"source_urls:\s*\n((?:\s*-\s*.+\n?)+)", fm_content)
        if urls_match:
            for url_line in urls_match.group(1).splitlines():
                cleaned_url = re.sub(r"^\s*-\s*", "", url_line).strip().strip("\"'")
                if cleaned_url:
                    source_urls.append(cleaned_url)

    return title, source_urls, body_text


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
            raise RuntimeError(
                f"[RAG Ingest] Documents directory '{self.documents_dir}' does not exist. "
                "Please ensure the docs directory exists and contains knowledge base files (.md or .txt)."
            )

        # Ingest only top-level files in docs/ (non-recursive, skip project/ and README)
        doc_files = sorted(
            [
                f for f in self.documents_dir.iterdir()
                if f.is_file()
                and f.suffix.lower() in (".md", ".txt")
                and f.name.lower() != "readme.md"
            ]
        )

        if not doc_files:
            raise RuntimeError(
                f"[RAG Ingest] No .md or .txt document files found in '{self.documents_dir}'. "
                "Please place knowledge base documents in the docs directory."
            )

        logger.info(
            f"[RAG Ingest] Ingesting {len(doc_files)} document files from {self.documents_dir}: "
            f"{[f.name for f in doc_files]}"
        )

        for file_path in doc_files:
            try:
                raw_text = file_path.read_text(encoding="utf-8")
            except Exception as e:
                logger.error(f"[RAG Ingest] Failed to read {file_path}: {e}")
                continue

            title, source_urls, body_text = extract_front_matter(raw_text)
            cleaned_text = clean_markdown_headers(body_text)
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
                                        title=title,
                                        source_urls=source_urls,
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
                                title=title,
                                source_urls=source_urls,
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
                            title=title,
                            source_urls=source_urls,
                        )
                    )
                    chunk_idx += 1

        logger.info(f"[RAG Ingest] Successfully ingested {len(chunks)} chunks across {len(doc_files)} documents.")
        return chunks

