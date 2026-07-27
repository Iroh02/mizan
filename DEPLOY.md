# Deploy runbook

> **PROVIDER UPDATE (Jul 27):** we use **Groq** (free, console.groq.com), NOT Gemini — Google's new "AQ."-prefix keys are currently broken on their OpenAI-compatible endpoint. Wherever this doc says OPENAI_API_KEY, set ALL FOUR variables:
>
> ```
> OPENAI_API_KEY   = gsk_...   (Groq key — get from Nandita privately)
> OPENAI_BASE_URL  = https://api.groq.com/openai/v1
> MIZAN_CHAT_MODEL = openai/gpt-oss-120b
> MIZAN_VISION_MODEL = meta-llama/llama-4-scout-17b-16e-instruct
> ```

## 0. Prereqs (10 min)
- GitHub repo pushed (see README §Push).
- Groq API key (see box above).
- `backend/data/chunks.json` committed (done — 678 chunks, 6 FTA documents).

## Local run (do this before any deploy)
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements.txt
set OPENAI_API_KEY=YOUR_GEMINI_KEY                 # PowerShell: $env:OPENAI_API_KEY="..."
python ingest.py                                   # after PDFs are in data/regulations/
uvicorn app:app --reload --port 8000
# new terminal:
cd frontend && npm install && npm run dev          # opens on localhost:5173, talks to localhost:8000
```

## 1. Backend → Render (15 min)
1. render.com → New → Web Service → connect the GitHub repo.
2. Render reads `render.yaml` automatically (root dir `backend`, uvicorn start). If it doesn't: Root Directory `backend`, Build `pip install -r requirements.txt`, Start `uvicorn app:app --host 0.0.0.0 --port $PORT`.
3. Environment → add `OPENAI_API_KEY` = your Gemini key.
4. Deploy. Test: open `https://<your-service>.onrender.com/health` → should say `{"ok": true}`.
   - `ok: false` mentioning chunks.json → you forgot to commit it.
   - `ok: false` mentioning OPENAI_API_KEY → env var missing.
5. ⚠️ Free tier sleeps after 15 min idle; first request takes ~50s to wake. **Before the demo: hit /health 2 minutes early.**

## 2. Frontend → Vercel (10 min)
1. vercel.com → Add New → Project → import the repo.
2. Root Directory: `frontend` (Framework auto-detects Vite).
3. Environment Variables → `VITE_API_URL` = `https://<your-service>.onrender.com` (no trailing slash).
4. Deploy → you get `https://mizan-<something>.vercel.app`.
5. Test the full loop from the Vercel URL: ask a question, upload an invoice.

## 3. Model swap (if Gemini free-tier rate limits bite during QA)
Set in Render env: `MIZAN_CHAT_MODEL=gemini-2.5-flash-lite` (higher free quota) — or, with an OpenAI key: `OPENAI_BASE_URL=https://api.openai.com/v1`, `MIZAN_CHAT_MODEL=gpt-4o-mini`.

## Troubleshooting
- CORS error in browser console → check `VITE_API_URL` has no trailing slash and redeploy frontend (env vars bake in at build time — redeploy after changing).
- 502 "LLM call failed" → usually rate limit (free tier: wait a minute) or wrong key.
- Empty/odd answers → look at the audit trail in the UI: did `search_regulations` return relevant articles? If not, the fix is in chunking/corpus, not the prompt.
