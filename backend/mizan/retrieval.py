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
        # "<doc> | <article>" queries (the citation audit's form) resolve
        # deterministically by label — no ranking involved.
        m = re.match(r"^\s*([\w\-.]+)\s*\|\s*(.+?)\s*$", query)
        if m:
            doc, art = m.group(1).lower(), m.group(2).lower()
            exact = [c for c in self.chunks
                     if c.doc_name.lower() == doc and c.article.lower() == art]
            if exact:
                return exact[:top_k]
        scores = self._bm25.get_scores(tokenize(query))
        # laws anchor, guides supplement: primary legislation gets a modest
        # ranking boost so a guide's paraphrase never crowds the law itself
        # out of the window the model (and the citations) will rely on.
        adj = [s * (0.85 if "Guide" in self.chunks[i].doc_name else 1.0)
               for i, s in enumerate(scores)]
        order = sorted(range(len(adj)), key=lambda i: -adj[i])[:top_k]
        return [self.chunks[i] for i in order if adj[i] > 0]
