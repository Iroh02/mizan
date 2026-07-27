# Jillian — Frontend & Deployment Lead · Mizan · due Jul 29

*(Jillian: paste this ENTIRE file into your Claude chat and say "help me execute this step by step." It has all the context Claude needs.)*

## Project context (for Claude)

Mizan is a 3-person SP Jain MAIB group project (graded: 30 marks business plan, 5 presentation, 5 app): an agentic AI tax-compliance copilot for UAE SMEs. It answers UAE Corporate Tax/VAT questions with citations to the actual FTA law, extracts invoices with vision AI, computes VAT deterministically, and abstains rather than guesses. Stack: **FastAPI backend** (Python — agent loop, BM25 retrieval over 678 pre-built law chunks in `backend/data/chunks.json`) + **React/Vite frontend**. LLM: **Groq** free tier via OpenAI-compatible API. Repo: **github.com/Iroh02/mizan**. The code is complete and tested locally — Jillian's job is deployment + frontend polish, NOT backend changes.

## Ground rules

- Work on the **`dev` branch only** (`git checkout dev`). Nandita merges dev→main after testing; main must always stay demo-ready.
- The API key comes from Nandita **privately**. It goes ONLY into the Render dashboard (and optionally a local terminal env var). Never into any file, commit, or chat.
- Do not modify anything under `backend/` — if something there seems broken, message Nandita instead.
- If blocked >30 minutes on anything, message Nandita. Don't burn hours.

## Task 1 — Deploy backend to Render (~15 min)

1. Accept the GitHub collaborator invite, then: render.com → sign up (GitHub login) → New → Web Service → connect `Iroh02/mizan`.
2. Render should auto-read `render.yaml` (root dir `backend`, start command uvicorn). If not, set manually: Root Directory `backend`, Build `pip install -r requirements.txt`, Start `uvicorn app:app --host 0.0.0.0 --port $PORT`.
3. Environment tab → add ALL FOUR variables (values below; key from Nandita):
   - `OPENAI_API_KEY` = gsk_... (from Nandita)
   - `OPENAI_BASE_URL` = `https://api.groq.com/openai/v1`
   - `MIZAN_CHAT_MODEL` = `openai/gpt-oss-120b`
   - `MIZAN_VISION_MODEL` = `meta-llama/llama-4-scout-17b-16e-instruct`
4. Deploy, then open `https://<your-service>.onrender.com/health` → must show `{"ok": true}`.
   - `ok:false` mentioning OPENAI_API_KEY → env var missing/typo. Mentioning chunks.json → wrong root directory.
5. Real test: `curl -X POST <render-url>/ask -H "Content-Type: application/json" -d '{"question": "What is the corporate tax rate above AED 375,000?"}'` → expect an answer citing articles.

## Task 2 — Deploy frontend to Vercel (~10 min)

1. vercel.com → Add New → Project → import `Iroh02/mizan`.
2. **Root Directory: `frontend`** (framework auto-detects Vite).
3. Environment variable: `VITE_API_URL` = the Render URL, **no trailing slash**.
4. Deploy → test the full loop from the Vercel URL: ask a question (citations should appear as green chips), expand the audit trail, upload an invoice image.
5. Post both URLs in the group chat.

Gotchas: env-var changes on Vercel require a **redeploy** (they bake in at build time). CORS errors in the browser console → almost always a trailing-slash or http/https mismatch in VITE_API_URL. Render free tier **sleeps after 15 min idle** — first request takes ~50s; before any demo, hit /health 2 minutes early.

## Task 3 — Polish (Jul 28)

- Mobile check (the demo may be shown on a phone).
- Graceful error states (backend asleep → friendly "waking up, ~1 min" message would be a nice touch).
- **Record a 2-minute backup demo video** (screen recording: ask the 375k question → show citations + audit trail → ask "what will the rate be in 2030?" → show the refusal → upload invoice). This video saves the presentation if the live demo fails.
- Screenshots of every screen → to Anushree for the report (Figures 1–7).

## Deadlines

- Jul 27 evening: both deploys live, URLs in group chat.
- Jul 28 midday: QA session with the whole team on the live URL.
- Jul 28 evening: polish + video done. Code freeze 9am Jul 29.
