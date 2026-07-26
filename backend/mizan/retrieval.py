"""BM25 retrieval over the chunked corpus.

MVP decision (be able to defend this): BM25-only, no embeddings. Legal text is
full of exact tokens (article numbers, 'designated zone', '0%', 'AED 375,000')
where lexical search is strong, it needs no API key, no model download, and it
fits Render's free tier. Hybrid dense+BM25 with reranking is the planned v2 —
see the roadmap in README.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from rank_bm25 import BM25Okapi

from mizan.chunker import Chunk


def tokenize(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


class Retriever:
    def __init__(self, chunks: list[Chunk]):
        if not chunks:
            raise ValueError("No chunks — run `python ingest.py data/regulations/` first.")
        self.chunks = chunks
        self._bm25 = BM25Okapi([tokenize(c.text) for c in chunks])

    @classmethod
    def from_file(cls, path: str) -> "Retriever":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls([Chunk(**d) for d in data])

    def search(self, query: str, top_k: int = 5) -> list[Chunk]:
        scores = self._bm25.get_scores(tokenize(query))
        order = sorted(range(len(scores)), key=lambda i: -scores[i])[:top_k]
        return [self.chunks[i] for i in order if scores[i] > 0]
