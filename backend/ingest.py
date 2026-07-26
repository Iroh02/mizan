"""Build the corpus: PDFs (and .txt) in data/regulations/ → data/chunks.json

Usage:  python ingest.py            (reads data/regulations/, writes data/chunks.json)

Commit data/chunks.json to the repo so Render never needs the PDFs at runtime.
"""
from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

from pypdf import PdfReader

from mizan.chunker import chunk_document
from mizan.config import MAX_CHARS


def load_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages)
    return path.read_text(encoding="utf-8", errors="ignore")


def main(src="data/regulations", out="data/chunks.json"):
    chunks = []
    files = [p for p in sorted(Path(src).iterdir())
             if p.suffix.lower() in (".pdf", ".txt") and not p.name.startswith("SAMPLE")]
    if not files:
        raise SystemExit(f"No PDFs/TXT files found in {src}/ — download the FTA laws first (see data/regulations/README.md).")
    for f in files:
        doc_chunks = chunk_document(load_text(f), doc_name=f.stem, max_chars=MAX_CHARS)
        print(f"{f.name}: {len(doc_chunks)} chunks")
        chunks.extend(doc_chunks)
    Path(out).parent.mkdir(exist_ok=True)
    Path(out).write_text(json.dumps([asdict(c) for c in chunks]), encoding="utf-8")
    print(f"Wrote {len(chunks)} chunks → {out}")


if __name__ == "__main__":
    main(*sys.argv[1:])
