"""Mizan API. Run locally:  uvicorn app:app --reload --port 8000"""
from __future__ import annotations

import base64
from functools import lru_cache

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import json

from fastapi.responses import StreamingResponse

from mizan.agent import run_agent, run_agent_events
from mizan.config import CHAT_MODEL, CHUNKS_PATH, MAX_AGENT_ITERS, TOP_K
from mizan.tools import extract_invoice, make_retriever_tool, vat_calculator

app = FastAPI(title="Mizan", version="0.2.0",
              description="Agentic tax-compliance copilot for UAE SMEs. Compliance assistance, not tax advice.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP: open CORS; restrict to the Vercel domain post-demo
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str
    history: list[dict] = []   # prior turns: [{"role": "user"|"assistant", "content": "..."}]
    company: str | None = None  # optional company context (demo-company mode / future profiles)


def _with_company(history: list[dict], company: str | None) -> list[dict]:
    """Prepend company context as a conversation turn so answers become entity-aware."""
    if not company or not company.strip():
        return history
    return [{"role": "user", "content": f"Context about my company (use this when answering): {company.strip()}"},
            {"role": "assistant", "content": "Noted — I'll take your company context into account and still cite the law for every claim."},
            *history]


@lru_cache(maxsize=1)
def _runtime():
    from mizan.llm import LLM
    from mizan.retrieval import Retriever
    llm = LLM()
    retriever = Retriever.from_file(CHUNKS_PATH)
    tools = [make_retriever_tool(retriever, top_k=TOP_K), vat_calculator]
    import hashlib
    corpus_hash = hashlib.md5(open(CHUNKS_PATH, "rb").read()).hexdigest()[:8]
    meta = {"model": CHAT_MODEL, "corpus_chunks": len(retriever.chunks),
            "corpus_version": corpus_hash,
            "app_version": app.version}  # provenance for the audit defence file
    return llm, tools, meta


@app.get("/health")
def health(deep: bool = False):
    """Basic: client + corpus load. With ?deep=1: one real (tiny) model call —
    catches quota/key failures that a shallow check cannot. Use deep before demos,
    not in monitors (it costs tokens)."""
    try:
        llm, _, _ = _runtime()
        if deep:
            resp = llm.chat_with_tools(
                [{"role": "user", "content": "Reply with exactly: OK"}], [])
            return {"ok": True, "model_reachable": bool(resp.content)}
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "detail": str(e)}


@app.post("/ask")
def ask(req: AskRequest):
    if not req.question.strip():
        raise HTTPException(400, "question is empty")
    llm, tools, meta = _runtime()
    try:
        result = run_agent(req.question.strip(), llm, tools,
                           max_iters=MAX_AGENT_ITERS,
                           history=_with_company(req.history, req.company))
    except Exception as e:
        raise HTTPException(502, f"LLM call failed: {e}")
    return {"answer": result.answer, "abstained": result.abstained,
            "iterations": result.iterations, "tool_trace": result.tool_trace,
            "retrieved": result.retrieved, "meta": meta}


@app.post("/ask/stream")
def ask_stream(req: AskRequest):
    """Server-sent events: live tool-call status while the agent works, then the final answer."""
    if not req.question.strip():
        raise HTTPException(400, "question is empty")
    llm, tools, meta = _runtime()

    def gen():
        try:
            for ev in run_agent_events(req.question.strip(), llm, tools,
                                       max_iters=MAX_AGENT_ITERS,
                                       history=_with_company(req.history, req.company)):
                if ev.get("type") == "final":
                    ev = {**ev, "meta": meta}
                yield f"data: {json.dumps(ev)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': f'LLM call failed: {e}'})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/extract-invoice")
async def extract(file: UploadFile = File(...)):
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(400, "Upload a PNG/JPEG/WebP image of the invoice.")
    data = await file.read()
    if len(data) > 8_000_000:
        raise HTTPException(400, "Image too large (max 8MB).")
    llm, _, _ = _runtime()
    try:
        return extract_invoice(llm, base64.b64encode(data).decode(), file.content_type)
    except Exception as e:
        raise HTTPException(502, f"Extraction failed: {e}")
