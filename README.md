# Mizan (ميزان) — Agentic Tax-Compliance Copilot for UAE SMEs

![CI](https://github.com/Iroh02/mizan/actions/workflows/ci.yml/badge.svg)

Answers UAE Corporate Tax & VAT questions with **citations to the actual FTA law**, extracts invoices with vision AI, computes VAT deterministically — and **abstains rather than guesses** when the law doesn't clearly answer.

> Compliance assistance, not tax advice.

**Live demo:** https://frontend-nine-opal-91.vercel.app · **API:** https://mizan-jcdy.onrender.com (health: `/health`; free tier — first request after idle takes ~50s)

## Why this design

- **Agentic loop, hand-rolled** (`backend/mizan/agent.py`): the model decides which tools to call and when to stop — bounded iterations, full audit trail per answer.
- **Citations or silence**: every factual claim must come from retrieved law text, labeled `[doc | Article N]`. A 2024–25 Stanford study found purpose-built legal AI tools hallucinate 17–33% of the time; Mizan's answer to that is measured abstention, not marketing.
- **LLMs don't do math here**: VAT amounts come from a deterministic calculator tool.
- **BM25 retrieval** over structure-aware chunks (split on Article headers, context-labeled): keyless, light, strong on legal text full of exact terms. Hybrid dense+rerank is the v2 roadmap.
- **Stack**: FastAPI + React (Vite). LLM via any OpenAI-compatible API — default is Gemini's free tier.

## Repo map

```
backend/
  app.py            FastAPI: /ask, /extract-invoice, /health
  ingest.py         PDFs → data/chunks.json
  mizan/
    agent.py        the agent loop (bounded, abstaining, traced)
    tools.py        vat_calculator · search_regulations · invoice extraction
    chunker.py      article-aware legal chunking
    retrieval.py    BM25 retriever
    prompts.py      system prompt (grounding/abstention rules) + invoice prompt
    llm.py          OpenAI-compatible client wrapper
  tests/            pytest suite (runs without any API key)
frontend/           React chat UI: citation chips, abstention badge, audit trail, invoice upload
TEAM_PLAN.md        who does what, 3 days
DEPLOY.md           Render + Vercel runbook
```

## Quickstart

See **DEPLOY.md** (local run + both deploys). Tests: `cd backend && python -m pytest -v` — they also run automatically in CI on every push.

## Evaluation

`backend/evals/` holds our human-verified QA set and the runner (`python evals/run_qa.py`) that executes it against a live deployment and produces `qa_results.md` for human judgment. Refusal behaviour is scored automatically; answer correctness is always judged by a human against the cited law — the script never grades itself.

## Push to GitHub (first time)

```bash
cd mizan-mvp
git remote add origin https://github.com/Iroh02/mizan.git   # create empty repo named `mizan` on GitHub first
git push -u origin main
```

## Roadmap (post-MVP)

Hybrid retrieval (dense + RRF) → reranking → golden-set evals in CI (RAGAS) → Arabic support → e-invoicing (UAE mandate, pilots from Jul 2026) → accountant-channel workflows.

## Team

Built by Team Mizan — SP Jain MAIB 2026. Nandita Menon (AI & integration), _B_ (frontend & deploy), _C_ (data, QA & business plan).
