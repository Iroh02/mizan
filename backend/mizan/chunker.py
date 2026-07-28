"""Structure-aware chunker for legal text.

v2 (corpus relabelling fix, 29 Jul):
- LAWS split on real "Article N" headings, with a guard so that reference
  lines ("Article 13 of this Decree-Law...") never open a new section.
- GUIDES are not organised by law articles — their line-start "Article N"
  strings are footnote references, which v1 mistook for headings (that is
  how a chunk discussing the Article 3 rate got labelled "Article 40").
  v2 windows the cleaned guide text and labels each chunk by the law
  article it actually DISCUSSES (dominant in-text reference): "re Article N",
  or "General" when nothing dominates.
- PENALTY DECISIONS additionally split their violations table into
  per-item chunks labelled "Table item N".
- Page-number lines and footnote-definition lines are stripped at ingest.
"""
from __future__ import annotations

import re
from collections import Counter
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


def _clean_debris(text: str) -> str:
    """Strip lone page-number lines and footnote-definition lines; repair
    pypdf digit-splitting in headings ("Article 7 6 - ..." -> "Article 76 - ...")."""
    text = re.sub(r"(?m)^(Article\s+)(\d)\s+(\d)(?=\s*[–—\-A-Z])", r"\g<1>\g<2>\g<3>", text)
    # digit-split headings anywhere on a line, when a dash-title follows
    text = re.sub(r"(Article\s+)(\d)\s+(\d)(?=\s*[–—\-])", r"\g<1>\g<2>\g<3>", text)
    # a heading glued mid-line after a page header: promote to line start
    text = re.sub(r"(?<!\n)(?=Article\s+\d+\s*[–—\-]\s+[A-Z])", "\n", text)
    text = re.sub(r"(?m)^\s*\d{1,4}\s*$\n?", "", text)
    text = re.sub(r"(?m)^\s*\d{1,3}\s+(Article|Articles|Cabinet Decision|Ministerial Decision|"
                  r"Federal Decree|FTA Decision)\b[^\n]*\.\s*$\n?", "", text)
    return text


# a line that *refers* to an article is not a heading
_REF_GUARD = re.compile(r"^Article\s+\d+(\(\d+\))?(\s*(,|and)\s*\d+(\(\d+\))?)*\s+of\b")
# a violations-table item: "7. Failure of the Registrant to ..." — items can
# start mid-line in the extraction, so no line anchor; the strictly increasing
# chain in _chunk_law is what separates real items from sub-clauses.
_TABLE_ITEM = re.compile(r"(?<![\d.])(\d{1,2})\s*\.\s+(?=[A-Z])")


def _emit(sections: list[tuple[str, str]], doc_name: str, max_chars: int) -> list[Chunk]:
    chunks: list[Chunk] = []
    for label, sec in sections:
        for b in _split_bounded(sec, max_chars):
            chunks.append(Chunk(text=f"[{doc_name} | {label}]\n{b}",
                                body=b, article=label, doc_name=doc_name))
    return chunks


def _chunk_law(text: str, doc_name: str, max_chars: int) -> list[Chunk]:
    parts = re.split(r"(?m)^(Article\s+(?:\(\s*\d+\s*\)|\d+).*)$", text)
    sections: list[tuple[str, str]] = []
    if parts[0].strip():
        sections.append(("Preamble", parts[0].strip()))
    for i in range(1, len(parts), 2):
        header = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        if _REF_GUARD.match(header) and sections:
            # reference line, not a heading — glue back onto the previous section
            label, prev = sections[-1]
            sections[-1] = (label, prev + "\n" + header + "\n" + body.strip())
            continue
        m = re.match(r"Article\s+\(?\s*(\d+)\s*\)?", header)
        label = f"Article {m.group(1)}" if m else header[:40]
        sections.append((label, (header + "\n" + body).strip()))
    if "Penalt" in doc_name:
        # split each section's violations table into per-item chunks.
        # Sub-clauses inside a penalty column also look like "1. ..." — real
        # item boundaries are the strictly increasing chain 1, 2, 3, ...
        expanded: list[tuple[str, str]] = []
        for label, sec in sections:
            hits, expect = [], 1
            for h in _TABLE_ITEM.finditer(sec):
                if int(h.group(1)) == expect:
                    hits.append(h)
                    expect += 1
            if len(hits) < 3:
                expanded.append((label, sec))
                continue
            if hits[0].start() > 0:
                expanded.append((label, sec[:hits[0].start()].strip()))
            for j, h in enumerate(hits):
                end = hits[j + 1].start() if j + 1 < len(hits) else len(sec)
                expanded.append((f"Table item {h.group(1)}", sec[h.start():end].strip()))
        sections = [(l, s) for l, s in expanded if s]
    return _emit(sections, doc_name, max_chars)


def _chunk_guide(text: str, doc_name: str, max_chars: int) -> list[Chunk]:
    sections: list[tuple[str, str]] = []
    for b in _split_bounded(text.strip(), max_chars):
        refs = Counter(re.findall(r"Article\s+\(?(\d+)\)?", b))
        top = refs.most_common(1)
        label = f"re Article {top[0][0]}" if top and (top[0][1] >= 2 or len(refs) == 1) else "General"
        sections.append((label, b))
    return _emit(sections, doc_name, max_chars)


def chunk_document(text: str, doc_name: str, max_chars: int = 1800) -> list[Chunk]:
    if not text or not text.strip():
        return []
    text = _clean_debris(text)
    if "Guide" in doc_name:
        return _chunk_guide(text, doc_name, max_chars)
    return _chunk_law(text, doc_name, max_chars)
