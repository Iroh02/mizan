# Team plan — 3 people, 3 days (due Jul 29)

## Roles

**Nandita — AI lead & integration owner.** Owns: corpus + ingestion, agent behavior/prompts, demo script, and the technical part of the pitch. She must be able to explain the whole architecture in the viva.

**Person B — Frontend & Vercel owner.** Owns: the React app (polish, mobile check, error states), Vercel deploy, demo recording.

**Person C — Data, QA & business-plan owner.** Owns: test questions + answer QA against the actual law, invoice test images, business-plan assembly (market research brief is already written), slide deck support.

## Day 1 (Jul 27)

- [ ] **Nandita:** create GitHub repo `mizan`, push this code, add B & C as collaborators (repo Settings → Collaborators).
- [ ] **Nandita:** get free Gemini API key (aistudio.google.com/apikey — no card needed). Never commit it.
- [ ] **Nandita:** download the 6 FTA/MoF PDFs (backend/data/regulations/README.md), run `python ingest.py`, sanity-check chunks.json (are article labels right?), commit chunks.json.
- [ ] **Nandita:** run backend locally (see DEPLOY.md "Local run"), ask 10 questions, tune wording in `mizan/prompts.py` if answers cite badly or guess.
- [ ] **B:** deploy backend to Render (DEPLOY.md §1) + frontend to Vercel (§2). Get the two URLs. Wire `VITE_API_URL`.
- [ ] **C:** write 25 test questions with expected answers *looked up manually in the law* (this doubles as the eval set and the demo script). Find/make 3 realistic UAE invoice images (must show TRN, VAT line).

## Day 2 (Jul 28)

- [ ] **All:** QA session — run all 25 questions against the live app. Log every wrong/weird answer in a shared sheet.
- [ ] **Nandita:** fix the top issues (usually: prompt wording, chunk size, top_k). Re-run the failing questions. Record before/after — that's your "we evaluate" slide.
- [ ] **B:** frontend polish (loading states, mobile), custom domain if desired, record 2-min demo video as backup for live-demo failure.
- [ ] **C:** business plan assembly (Claude is drafting chapters from the verified research brief — review + integrate), pitch deck v1.
- [ ] **Nandita:** invoice flow QA with C's images.

## Day 3 (Jul 29 morning)

- [ ] Freeze code by 9am. No new features.
- [ ] Full dress rehearsal ×2 with the live URL + backup video.
- [ ] Each person can answer: "what happens when I click Ask?" end-to-end (traced in the audit trail UI).

## Demo script (5 min)

1. The pain: 91,000 UAE businesses needed the FTA's late-registration penalty waiver. SMEs can't afford advisors for every question.
2. Live: ask the 375k threshold question → answer with [law | Article N] chips → open the audit trail ("every answer is traceable").
3. Live: ask something unanswerable ("what will the rate be in 2030?") → **it refuses**. Say the Stanford stat: purpose-built legal AI tools hallucinate 17–33% — ours is designed to abstain instead. This is the moment that lands.
4. Live: upload invoice → extracted fields + VAT check → "and it flags inconsistent invoices for human review, it doesn't silently trust itself."
5. Why now (e-invoicing pilot July 2026, corporate tax at scale) + roadmap (hybrid retrieval, evals, Arabic, e-invoicing integration).

## Rules

- Nobody pushes straight to main after Day 1 evening — quick PRs so two people never edit the same file blind.
- The API key lives ONLY in Render's dashboard and local `.env` files (gitignored).
- If the live demo breaks on stage: play the video, keep talking. Rehearse that pivot once.
