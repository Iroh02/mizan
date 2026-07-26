"""Structure-aware chunker for legal text: split on Article headers, keep the
article label as chunk metadata and as a context prefix (contextual-chunking-lite).
"""
from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str      # "[<doc_name> | <article>]\n<body>"
    body: str
    article: str
    doc_name: str


def _split_sentences(p: str, max_chars: int) -> list[str]:
    sents = p.split(". ")
    pieces, buf = [], ""
    for i, s in enumerate(sents):
        s2 = s + (". " if i < len(sents) - 1 else "")
        if not buf:
            buf = s2
        elif len(buf) + len(s2) <= max_chars:
            buf += s2
        else:
            pieces.append(buf)
            buf = s2
    if buf:
        pieces.append(buf)
    return pieces


def _split_bounded(t: str, max_chars: int) -> list[str]:
    if len(t) <= max_chars:
        return [t]
    out, buf = [], ""
    for p in t.split("\n"):
        for piece in ([p] if len(p) <= max_chars else _split_sentences(p, max_chars)):
            if not buf:
                buf = piece
            elif len(buf) + 1 + len(piece) <= max_chars:
                buf += "\n" + piece
            else:
                out.append(buf)
                buf = piece
    if buf:
        out.append(buf)
    return out


def chunk_document(text: str, doc_name: str, max_chars: int = 1800) -> list[Chunk]:
    if not text or not text.strip():
        return []
    parts = re.split(r"(?m)^(Article\s+(?:\(\s*\d+\s*\)|\d+).*)$", text)
    sections: list[tuple[str, str]] = []
    if parts[0].strip():
        sections.append(("Preamble", parts[0].strip()))
    for i in range(1, len(parts), 2):
        header = parts[i].strip()
        m = re.match(r"Article\s+\(?\s*(\d+)\s*\)?", header)
        label = f"Article {m.group(1)}" if m else header[:40]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        sections.append((label, (header + "\n" + body).strip()))
    chunks: list[Chunk] = []
    for label, sec in sections:
        for b in _split_bounded(sec, max_chars):
            chunks.append(Chunk(
                text=f"[{doc_name} | {label}]\n{b}",
                body=b, article=label, doc_name=doc_name,
            ))
    return chunks
