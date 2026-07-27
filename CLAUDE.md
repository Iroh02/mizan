# CLAUDE.md — project context for AI assistants working in this repo

## What this is

Mizan (ميزان) — an agentic AI tax-compliance copilot for UAE SMEs. Answers UAE Corporate Tax/VAT questions with citations to the actual FTA law, extracts invoices via vision AI, computes VAT deterministically, and **abstains rather than guesses**. 3-person SP Jain MAIB group project, due **Jul 29, 2026**. Grading: business-plan report 30/40, presentation 5, app 5 — the demo must be *reliable*, not fancy. Judge is a Chief AI Officer: precision over hype.

## Team & ownership

- **Nandita (AI lead)** — backend (`backend/`), prompts, corpus, merges to main. Only she changes backend logic.
- **Jillian (frontend & deploy)** — `frontend/`, Render + Vercel. Task list: `JILLIAN_BRIEF.md`.
- **Anushree (QA & business plan)** — QA sheet, invoice test data, report. Task list: `ANUSHREE_BRIEF.md`.
- Git workflow: personal branches, main is always demo-ready — see `TEAM_SETUP.md`. Deploy runbook: `DEPLOY.md` (read the Groq box at the top; it supersedes older Gemini text).

## Architecture (30-second map)

```
frontend/ (React+Vite chat UI)  →  POST /ask  →  backend/app.py (FastAPI)
                                                    └─ mizan/agent.py  — hand-rolled agent loop (bounded iters, abstention, audit trail)
                                                        ├─ tools.py    — search_regulations (BM25) · vat_calculator (pure python) · extract_invoice (VLM)
                                                        ├─ retrieval.py — BM25 over backend/data/chunks.json (678 article-aware chunks of FTA law)
                                                        ├─ chunker.py  — splits legal text on "Article N" headers, labels chunks
                                                        ├─ prompts.py  — grounding/abstention/language rules (edit with care: this is product behavior)
                                                        └─ llm.py      — OpenAI-compatible client (Groq by default)
```

Deliberate MVP choices (don't "fix" these): BM25-only retrieval (no embeddings — keyless, light, strong on legal text); no LangChain/LangGraph (40-line transparent loop; framework enters with the HITL-approval roadmap feature); numpy-free, vector-DB-free.

## Commands

```bash
# backend (from backend/): 
pip install -r requirements.txt
python -m pytest -v            # 9 tests, no API key needed — run before ANY backend-adjacent commit
python ingest.py               # rebuild corpus from data/regulations/*.pdf (only Nandita)
uvicorn app:app --reload --port 8000

# frontend (from frontend/):
npm install && npm run dev     # local, expects backend on :8000
npm run build                  # must pass before pushing frontend changes
```

## Environment (never in files, never committed)

`OPENAI_API_KEY` (Groq `gsk_...`, from Nandita privately) · `OPENAI_BASE_URL=https://api.groq.com/openai/v1` · `MIZAN_CHAT_MODEL=openai/gpt-oss-120b` · `MIZAN_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct` · frontend: `VITE_API_URL` = backend URL, no trailing slash.

## Hard rules for AI assistants

1. Never write an API key or secret into any file. If a task seems to need it, stop and tell the human to check with Nandita.
2. Work only on the current user's branch and only in their area of the repo (see Team & ownership). Backend logic changes are out of scope for Jillian's and Anushree's sessions.
3. Before suggesting a push: backend changes → `python -m pytest` green; frontend changes → `npm run build` green.
4. Don't add dependencies, frameworks, or refactors — freeze is 9am Jul 29; boring and working beats elegant and risky.
5. Product claims must match reality: Mizan cites or abstains; it is compliance assistance, **not tax advice** — keep that framing in any UI text or docs you touch.

## Known gotchas

- Render free tier sleeps after ~15 min; first request takes ~50s (hit `/health` 2 min before demos).
- Vercel env vars bake in at build — changing `VITE_API_URL` requires redeploy.
- Groq llama-3.3 fumbles tool-calls; that's why the chat model is `openai/gpt-oss-120b`. Don't downgrade.
- Google Gemini "AQ."-prefix keys are currently broken on their OpenAI-compat endpoint — that's why we're on Groq.
