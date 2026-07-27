# Anushree — Data, QA & Business-Plan Lead · Mizan · due Jul 29

*(Anushree: paste this ENTIRE file into your Claude chat and say "help me execute this step by step." It has all the context Claude needs.)*

## Project context (for Claude)

Mizan is a 3-person SP Jain MAIB group project: an agentic AI tax-compliance copilot for UAE SMEs — cited answers over actual FTA law (Corporate Tax Law 47/2022, VAT Law 8/2017 + guides), vision invoice extraction, deterministic VAT math, and abstention instead of guessing. **Grading: business plan report = 30 of 40 marks** — Anushree co-owns the highest-value deliverable. Repo: github.com/Iroh02/mizan (accept invite; work on `dev` branch). A complete ~40-page business plan draft (docx) already exists — built on fact-checked market research — Nandita will share it. Anushree's job: quality-assure the AI's answers against the real law, and finish/polish the report.

## Task 1 — The 25-question QA set (Jul 27, ~2 hrs)

Create a shared Google Sheet with columns: **# | Question | Expected answer | Source article (verified by YOU in the actual law) | Mizan's answer (fill Jul 28) | Verdict (correct / wrong / should-have-refused / correctly-refused)**.

Question mix:
- 15 normal SME questions: tax rates, registration thresholds, VAT on specific amounts, Small Business Relief eligibility, filing obligations, what's exempt/zero-rated.
- 5 tricky ones: multi-part questions, questions mixing VAT and Corporate Tax, a question with a WRONG premise ("since VAT is 10%..." — it's 5%; Mizan must correct it).
- 5 that SHOULD be refused: future predictions ("rate in 2030?"), personal advice ("should I restructure my company?"), questions the law doesn't cover.

**Crucial rule:** the "Expected answer / Source article" columns must be verified by you against the actual law PDFs (official download links are in `backend/data/regulations/README.md` in the repo) — not by asking any AI. This human-verified sheet is our accuracy evidence in the report AND what makes the demo bulletproof. Claude may help you phrase questions, but the expected answers must trace to the PDFs.

## Task 2 — Invoice test images (Jul 27, ~30 min)

3 realistic UAE invoice images (photos or clean mockups): must show supplier name, a 15-digit TRN, line items, subtotal, 5% VAT line, total. Make ONE of them deliberately inconsistent (subtotal + VAT ≠ total) — Mizan should flag it, and that flag is a demo moment.

## Task 3 — Business plan finishing (Jul 28, the big one)

Nandita shares `Mizan_Business_Plan_DRAFT.docx` (matches the professor's 20-section structure exactly). Your jobs:
1. Search the doc for **[PLACEHOLDER]** and fill what you can: your bio + skills (Section 13), the group contribution table, course code/professor name on the title page.
2. **Run the user test** exactly as scripted in Section 10: 3+ people (not us), each does the scripted tasks on the live app; record completion, time, quotes, and what we changed as a result. Type the numbers into Section 10.
3. Enter the QA results from Task 1 into the quality/evidence parts (Sections 7/10) — e.g., "23/25 correct, 5/5 unanswerable questions correctly refused."
4. **Trim each section ~15%** for length (target ~40 pages) — cut repetition and hedging, never the numbers.
5. ⚠️ Do NOT alter any market figures — every number in the draft is fact-checked with sources, and some tempting stats (like "SMEs are 94% of UAE companies" or "63% SME growth") were checked and are NOT safe to use. If a number looks wrong, flag to Nandita instead of editing.

## Task 4 — Presentation support (Jul 28 evening)

Slide deck skeleton follows the demo script in TEAM_PLAN.md (in the repo): problem (91k penalty-waiver stat) → live demo → the refusal moment + Stanford 17–33% hallucination stat → business model (AED 149/399 pricing between software and accountants) → why-now (e-invoicing mandate) → roadmap. Keep slides sparse; the live app is the star. Judge is a Chief AI Officer — keep claims precise and sourced.

## Deadlines

- Jul 27 evening: QA sheet + invoices ready.
- Jul 28 midday: team QA session against the live URL — you keep score.
- Jul 28 evening: report final, user test done, deck v1. Freeze 9am Jul 29.
