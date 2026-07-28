# Handover — items for Nandita and Jillian

**From:** Anushree · **Written:** 28 July 2026 · **Freeze:** 09:00, 29 July 2026

Everything below was found by testing the **live deployment**
(`https://mizan-jcdy.onrender.com` / `https://frontend-nine-opal-91.vercel.app`)
and by reading the corpus and the official FTA PDFs. Each item says what the
evidence is, so nothing here needs re-discovering.

Ordered by *what breaks the demo or the report first*, not by effort.

---

## NANDITA — backend, corpus, agent

### 0. 🚨 READ FIRST — the Groq daily token quota is exhausted

**As of 18:30 on 28 July the live app cannot answer any question.** Every `/ask`
returns `502`. `/health` still returns `{"ok":true}` because it only checks that the
client and retriever load — it never calls the model, so **it cannot detect this.**

The real error, read from the 502 body:

```
LLM call failed: Error code: 429 —
Rate limit reached for model `openai/gpt-oss-120b` … service tier `on_demand`
on tokens per day (TPD): Limit 200000, Used 199784, Requested 529.
```

**We have ~216 tokens left of a 200,000/day allowance.**

My fault in part: running the 25-question QA set against the live app used a large
share of the day's budget — roughly 8–10k tokens per question, because each answer
retrieves five chunks of legal text and often makes 2–3 tool calls. Worth knowing the
real cost per question regardless, since it's a genuine unit-economics input for
Section 15.

**Why this is urgent, not just annoying:**
- **the demo is tomorrow.** On this tier, ~20–25 questions per day is the ceiling.
  Two dress rehearsals plus a live demo will spend it again.
- **tonight's user test cannot run.** Three participants × 5 tasks would hit 502s.
  It is blocked until the quota resets or the tier changes.
- six QA questions (19, 20, 22, 23, 24, 25) are still uncaptured, including **four of
  the five refusal questions** — so Section 7's `Y/5` cannot be reported yet.

**Options, in order of preference:**
1. **Upgrade to Groq Dev tier** (`console.groq.com/settings/billing`). Pay-as-you-go
   and cheap at our volume; removes the cliff before the demo. **Recommended.**
2. **Wait for the daily reset** (on-demand TPD resets on a 24h cycle) and then ration
   strictly: no exploratory questions, rehearse with the same 5 demo questions only.
3. Have the **backup demo video** ready regardless — `TEAM_PLAN.md` already calls for
   it, and this is exactly the failure it exists for.

**Also worth fixing (small):** `/health` reports healthy while the product is fully
down. A health check that never touches the model can't tell us the one thing we most
need to know before walking on stage.

### 1. 🔴 BLOCKER — the abstention flag is wrong, so the badge never shows

**This is the demo's single best moment and it is currently invisible.**

`POST /ask` with *"What will the UAE corporate tax rate be in 2030?"* returns the
correct refusal text — but `"abstained": false`.

Cause — `backend/mizan/agent.py:44`:

```python
return AgentResult(answer=answer, abstained=answer == ABSTAIN, ...)
```

The flag is an **exact string equality** check, and it fails for **two independent
reasons** — both confirmed against live responses:

1. **The apostrophe differs.** `ABSTAIN` in `agent.py` uses a straight quote
   (`can't`); the model returns a **typographic apostrophe** (`can’t`). One codepoint
   apart, so equality fails even when the refusal is otherwise word-for-word perfect.
   Live proof — question 21 returned exactly:
   `I can’t answer this reliably — this needs a tax professional.`
   …and still came back `"abstained": false`.
2. **Trailing text.** On other runs the model appends a `Sources: None (…)` line, which
   breaks equality regardless of the apostrophe.

The frontend only renders *"Declined to guess"* when `abstained` is true.

**Suggested fix** — match on a fragment containing no punctuation at all, so neither
smart quotes nor em dashes nor appended text can break it:

```python
abstained = "answer this reliably" in (answer or "").lower()
```

⚠️ A substring check against the `ABSTAIN` constant itself (`ABSTAIN.lower() in
answer.lower()`) **does not work** — it still carries the straight apostrophe.

**What it blocks:**
- demo script step 3 — the refusal lands as plain text with no badge
- **Figure 5 in the report** — "*Declined to guess* state — abstention badge" cannot
  be screenshotted until this is fixed
- Section 10 user testing — testers are asked to react to a refusal state
- the `Y/5` refusal count in Section 7 has to be scored by reading text, not the flag

### 2. 🔴 The AED 375,000 corporate-tax threshold has no primary source in the corpus

Full-text searched the official PDF: **"375,000" appears nowhere in
Federal Decree-Law 47/2022.** Article 3 says only *"the amount specified in a
decision issued by the Cabinet at the suggestion of the Minister."*

That Cabinet Decision (**116/2023**) is **not among the six ingested documents**.

So Mizan's flagship demo answer can only ever cite a *guide* — never the instrument
that actually sets the number. Live test confirms it: it cited
`CT-Taxable-Income-Guide | Article 3` and `CT-General-Guide-CTGGCT1 | Article 40`.

**Ask:** can Cabinet Decision 116/2023 be added and `ingest.py` re-run before freeze?
It is a short document. If not, we should say so in the viva rather than be caught.

### 3. 🔴 Guide citations are structurally meaningless

`chunker.py` splits on `^Article N` headings. Laws have them throughout; **guides do
not**, so one stray heading swallows the rest of the document:

| Document | Chunks | Distinct article labels |
|---|---:|---:|
| Corporate-Tax-Law-47-2022 | 108 | **70** ✅ |
| VAT-Law-8-2017 | 103 | **86** ✅ |
| VAT-Executive-Regulation-52-2017 | 121 | good |
| CT-General-Guide-CTGGCT1 | 157 | **7** — 138 chunks all labelled "Article 40" |
| CT-Taxable-Income-Guide | 134 | **8** |
| Small-Business-Relief-Guide | 55 | **2** — 47 chunks labelled "Article 18" |

A citation reading `[CT-General-Guide-CTGGCT1 | Article 40]` could point at any of
138 different passages, and "Article 40" is almost certainly not where the text came
from. This undercuts the core product claim that every answer is traceable.

**Not a freeze-night fix** — re-chunking is risky this close. Suggested handling: for
guides, label chunks by section heading or page instead of a false article number,
as a v1.1 item; and in the viva, own it as a known limitation of guide ingestion.

### 4. 🟠 Confirmed hallucinated citation

Live, on the 375,000 question, Mizan cited **`[CT-Taxable-Income-Guide | Article 3]`**.
That label **does not exist** — that document contains only Articles 2, 7, 9, 13, 18,
20, 36. The answer was right; the citation was invented. Intermittent — an Arabic run
of the same question cited two labels that do exist.

### 4b. 🟠 Citation *format* is inconsistent — so chips silently don't render

Question 4 (30-day VAT registration deadline) produced a well-sourced answer that
cites *"VAT Executive Regulation No. 52-2017, **Article 7(2-3)**"* and *"VAT Law No.
8-2017, **Article 13(1-b)**"* — correct, and genuinely traceable.

But it wrote them as **markdown prose under a "Sources" heading**, not in the
`[doc | Article N]` bracket form. `Citations` in `App.jsx` only matches
`/[\[【][^\]】]+\|[^\]】]+[\]】]/`, so **that answer displays no citation chips at all**,
even though it is properly sourced.

So the same product shows chips on some answers and not others, for reasons invisible
to the user — on a product whose core promise is visible traceability. Either tighten
the format rule in `prompts.py` (rule 1 already specifies the bracket form) or widen
the frontend matcher. **Tightening the prompt is the safer freeze-night change.**

Full results in `qa/QA_Results_run1.csv`.

### 5. 🟠 Decision needed — merge `advanced` or not?

Branch `origin/advanced` (commit `5bd54b2`) adds streaming status, multi-turn memory,
an Arabic/language prompt rule, and an eval harness (`backend/evals/run_qa.py`).
**It is not merged and not deployed** — confirmed: the live API exposes only
`/health`, `/ask`, `/extract-invoice`, with no `/ask/stream`.

Two things follow:
- Section 10 of the report says users can ask **"in English or Arabic"**. I tested
  Arabic on the live (main) build and it *does* answer in Arabic — but that is
  emergent model behaviour, not the prompt rule on `advanced`. Defensible, worth knowing.
- If `advanced` is merged tonight, **the QA results and user-test results stop being
  comparable** to what we ran. My recommendation: **do not merge before the demo.**
  Boring and working beats elegant and risky, per CLAUDE.md rule 4.

### 5b. 🔴 The report says the product runs on Google Gemini. It runs on Groq.

**Five places in the business plan name the wrong LLM provider**, including Section 9
(AI and Technology Plan) and the risk register:

| Where | Current text |
|---|---|
| §5 Porter's — suppliers | "We depend on one LLM API provider **(Google Gemini)**" |
| §8 Key partners | "AI provider **(Google Gemini API** — with a tested fallback path)" |
| §9 AI model or service | "an external commercial LLM API — **Google's Gemini family** —" |
| §12 Suppliers table | "LLM API provider **(Google Gemini)**" |
| §17 Risk 5 | "LLM API dependency: **Gemini** pricing/terms/behaviour change" |

The deployed system uses **Groq**: `openai/gpt-oss-120b` for chat and
`meta-llama/llama-4-scout-17b-16e-instruct` for vision. Evidence: `CLAUDE.md`
environment block; `DEPLOY.md`'s note that the Groq box "supersedes older Gemini
text"; and today's live error naming `openai/gpt-oss-120b` directly.

`CLAUDE.md` even records *why*: Gemini's "AQ."-prefix keys are broken on their
OpenAI-compatible endpoint, which is why the project moved to Groq.

**Why this matters more than a name:** the judge is a Chief AI Officer, and "which
model are you using and why?" is the most predictable question in the room. A report
that names the wrong provider — in the section explaining the technology — undoes the
credibility the rest of the document works hard to build. Risk 5 also mitigates a
dependency on the wrong vendor.

**Anushree has the exact replacement text ready and can apply all five in under a
minute — just say go.** Section 9 is your section, so it is your call.

### 6. 🟡 Sign off on the report's honesty rewrites

Nine placeholders asked for customer-interview data. As far as I know no interviews
were conducted, so rather than invent quotes I replaced them with plain statements of
what we do and don't have — e.g. Section 2 now reads *"Primary research: none conducted
to date… no demand claim in this plan rests on primary research."*

**If interviews were in fact done, tell me and I will swap the real numbers in.**
Otherwise please read those seven passages and confirm you're happy with the framing.

---

## JILLIAN — frontend, deploy, screenshots

### 1. 🔴 Six screenshots for the report — nobody has produced these yet

Section 10 references Figures 2–7. They do not exist:

| Figure | What it must show | Blocked? |
|---|---|---|
| 2 | Start screen — framing, scope notice, suggested questions | ready now |
| 3 | Q&A screen — cited answer with `[doc \| Article N]` chips | ready now |
| 4 | Audit trail expanded — each tool call with its query | ready now |
| 5 | **"Declined to guess" abstention badge** | ⛔ **blocked on Nandita's item 1** |
| 6 | Invoice upload — extraction card with the mismatch flagged | ready now — use `qa/invoices/invoice_3_desertrose_ERROR.png` |
| 7 | Mobile view — same workflow on a phone | ready now |

Figure 6 is confirmed working end to end; I tested that invoice against the live
endpoint and it extracts perfectly and flags the mismatch.

**Figure 5 cannot be captured until the flag bug ships.** If it can't be fixed,
Section 10's figure list must be edited rather than the figure faked.

### 2. 🟠 Redeploy after Nandita's backend fix

Render free tier + Vercel. Two reminders from `CLAUDE.md`:
- Render sleeps after ~15 min; **hit `/health` two minutes before the demo**
- Vercel bakes env vars at build time — changing `VITE_API_URL` needs a redeploy

### 3. 🟡 Response times are slower than the UI implies

Measured on the live app during a 25-question run: **7s to 98s**, median ~25s.
The "server is waking up" hint appears after 6 seconds, which is good — but several
*warm* answers still took 50–100 seconds, and one question timed out twice at 100s.
Worth knowing before a live demo: **pick fast questions for the stage.** From my run,
questions 1–3 and 11–15 all returned in under 21 seconds.

### 4. 🟠 Your bio — 2 or 3 lines, needed tonight

Your full name is now in the report (Jillian Priscilla, in all seven places), but
Section 13 still has `[PLACEHOLDER: Teammate B's specific experience, projects and
qualifications.]`.

Send **degree + institution, any work or internship experience, and any relevant
projects**. Rough notes are fine — Anushree will write it into the report's register.

Format to match, from Nandita's entry:

> *Evidence of capability: built a production computer-vision grading pipeline as an AI
> intern at NorthLadder (Dubai); built agentic RAG systems (FinSight); B.Tech in
> Computer Science, NIT Calicut; currently completing the MAIB at SP Jain, Dubai.*

Yours is the **last founder bio still empty**. Two of three are done, so this one is
visible by its absence.

---

## SHARED — decisions for the group

| # | Decision | Owner | Why it matters |
|---|---|---|---|
| 1 | Fix the abstention flag, yes/no | Nandita | Unblocks the demo moment, Figure 5, and the user test |
| 2 | Add Cabinet Decision 116/2023 to the corpus | Nandita | Otherwise the headline number has no primary citation |
| 3 | Merge `advanced` before the demo? (**recommend: no**) | Nandita | Merging invalidates our QA and user-test evidence |
| 4 | Were customer interviews ever conducted? | All | Decides whether 7 report passages stay as honest gaps or get real data |
| 5 | Confirm the Section 13 contribution table allocation | All | I drafted it from role ownership; it must match what actually happened |

**Proposed contribution allocation** — already written into Section 13, so correct it
now if it is wrong:

| Member | Report sections |
|---|---|
| Nandita Menon | 1, 2, 3, 8, 9, 14, 17, 20 |
| Jillian Priscilla | 10, 12 |
| Anushree Ashok | 4, 5, 6, 7, 11, 13, 15, 16, 18, 19 |

---

## ✅ THE REMAINING WORK — who owns what

Every open item, assigned. **Freeze is 09:00 tomorrow.** Ordered within each owner by
what blocks the most other work.

### 🔴 Critical path — nothing else finishes until these do

| # | Task | Owner | Blocks |
|---|---|---|---|
| **C1** | **Restore LLM capacity** — upgrade Groq tier or wait out the daily reset | **Nandita** | The demo, the user test, 6 QA answers, 2 invoice checks, 7 report placeholders |
| **C2** | **Fix the abstention flag** (`agent.py:44`, one line) | **Nandita** | Demo moment, Figure 5, user-test task 3, the `Y/5` metric |
| **C3** | **Book 3 user testers** (10 min each, not us) — schedule for *after* C1 | **Anushree** | 6 report placeholders and Section 10 |

### Nandita

| # | Task | Priority | Notes |
|---|---|---|---|
| N1 | Restore LLM capacity (**C1**) | 🔴 now | See item 0 |
| N2 | Abstention flag fix (**C2**) | 🔴 now | See item 1 — one line, `"answer this reliably" in answer.lower()` |
| N3 | Decide: apply the Gemini→Groq correction in the report | 🔴 tonight | 5 places; Anushree has the edits ready, needs only your go |
| N4 | Decide: add Cabinet Decision 116/2023 to the corpus | 🟠 tonight | Else the headline demo number has no primary citation |
| N5 | Decide: merge `advanced`? (**recommendation: no**) | 🟠 tonight | Merging invalidates the QA and user-test evidence |
| N6 | Tighten the citation format rule in `prompts.py` | 🟠 tonight | Item 4b — prose citations render no chips |
| N7 | Sign off the 7 interview-gap rewrites | 🟡 tonight | Item 6 — read and confirm the framing |
| N8 | Prepare the viva answer on guide-citation labelling | 🟡 before demo | Item 3 — own it as a known limitation |

### Jillian Priscilla

| # | Task | Priority | Notes |
|---|---|---|---|
| J1 | **Send your bio** — 2–3 lines | 🔴 tonight | Last empty founder bio; Anushree inserts it |
| J2 | Capture **Figures 2, 3, 4, 6, 7** | 🔴 tonight | Figure 6 can use `qa/invoices/invoice_3_desertrose_ERROR.png` |
| J3 | Capture **Figure 5** (abstention badge) | 🔴 after N2 | ⛔ Impossible until Nandita's flag fix ships |
| J4 | Redeploy after any backend fix | 🟠 after N2 | Vercel bakes env vars at build — redeploy needed |
| J5 | Record the **backup demo video** | 🟠 tonight | `TEAM_PLAN.md` calls for it; today's outage is exactly why |
| J6 | Warm the server before every rehearsal and the demo | 🟡 ongoing | Hit `/health` 2 min ahead |

### Anushree

| # | Task | Priority | Notes |
|---|---|---|---|
| ~~A2~~ | ~~Verify the 25 expected answers against the PDFs~~ | ✅ **DONE** | All 25 verified against the official PDFs; no corrections needed |
| ~~A6~~ | ~~Verify the invoices through `/extract-invoice`~~ | ✅ **DONE** | All 3 pass — every field exact, mismatch correctly flagged |
| A1 | Book the 3 user testers (**C3**) | 🔴 now | Schedule after C1 lands |
| A3 | Get the **course code** from the syllabus | 🔴 tonight | Last title-page placeholder |
| A4 | Set the §19 willingness-to-pay target % | 🟡 tonight | A planning target, not evidence — just choose |
| A5 | Capture the 6 missing QA answers | 🟠 **after C1** | Q19, 20, 22–25 — **includes 4 of the 5 refusals**, so `Y/5` is unreportable until this runs |
| A7 | Score the QA set → `X/20`, `Y/5`, citation accuracy | 🟠 after A5 | Ground truth is locked; only the missing answers are outstanding |
| A8 | Run the user test, write up Section 10 | 🟠 after C1 + C3 | Script and sheets ready in `qa/user_test/` |
| A9 | Insert Jillian Priscilla's bio when it arrives | 🟡 after J1 | |
| A10 | Reduce the page count (see below) | 🟠 tonight | Needs the formatting answer first |

### 📋 What is NOT done — the 11 open report placeholders

| Placeholder | Section | Waiting on |
|---|---|---|
| Course code and title | Title page | **Anushree** — syllabus |
| `X`/20 correct | §7 | **C1** → A5 → A7 |
| `Y`/5 refused | §7 | **C1** → A5 → A7 |
| N ≥ 3 participants | §10 | **C1 + C3** — the user test |
| Results table (completion, times, ratings) | §10 | Same |
| What users liked | §10 | Same |
| What users found confusing | §10 | Same |
| Changes made after feedback | §10 | Same |
| Jillian Priscilla's experience and qualifications | §13 | **Jillian** |
| N target-user tests | §19 | The user test |
| Willingness-to-pay target % | §19 | **Anushree** — a number to choose |

**Eight of the eleven are blocked behind C1** (the Groq upgrade). Two need Anushree,
one needs Jillian. None of them can be closed by writing — they need capacity, people,
or a fact.

Also still open, not a placeholder but a decision: **the Gemini→Groq correction (N3)**.
The pitch deck already says Groq; the report still says Gemini in five places. **They
currently contradict each other**, which is worse than either being wrong alone.

### ⚠️ The page-count problem — needs a group decision

The report is **63 pages**. The brief targets ~40. That is a **36% cut**, not the 15%
the brief assumed — the instruction was written when the document was shorter.

A filler scan found **12 words** of hedging in 22,351. There is nothing padded to cut;
a 15% trim would remove facts, sources and analysis.

**Cheaper levers first — these cost zero marks:**

| Lever | Pages saved | Cost |
|---|---:|---|
| `BodyText` spacing 9/9 pt → 3/3 pt | ~5–6 | none |
| Body font 12 pt → 11 pt | ~4 | none |
| Cut the ~1,800 words of genuine slack (cross-refs, rhetorical closers) | ~4 | minimal |
| **Total** | **~13–14** | → lands near **49–50 pages** |

Getting from 50 to 40 means cutting ~3,000 words of real content, mostly from
Sections 3, 5 and 9 — **Nandita's sections**. That is a group call, not Anushree's.

**Someone must check the assignment spec for two things:** is 40 pages a hard limit or
a guideline, and are font/spacing/margins prescribed? If formatting is mandated, the
free levers vanish.

---

## Already done — please don't redo

- **25-question QA set** — `qa/QA_Set_25_Questions.csv`. 20 answerable + 5 must-refuse,
  matching Section 7's `X/20` and `Y/5`. Every expected answer carries the source
  article **and the PDF page number**.
- **Official FTA PDFs downloaded and verified** into `backend/data/regulations/`
  (gitignored). Note: the VAT Law had to be the **amended** edition — the original 2017
  text differs on Articles 46, 48, 65 and 67, which the QA set tests.
- **Baseline QA run** against the live app — `qa/QA_Results_run1.csv` and
  `qa/QA_Scored.csv`, with each answer's citations, tool calls, timing, and both the
  flag and text-derived abstention values. **19 of 25 captured** before the quota died.
  This is a baseline for the group run-through, **not a replacement for it.**
  Early signal, subject to Anushree's PDF verification:
  - answered when answerable: **18/18** — it never wrongly abstained
  - `vat_calculator` used on **all three** arithmetic questions (rule 2 holding)
  - citations render as chips on 17 of 19; 1 prose-only; 1 none
- **3 invoice test images** — `qa/invoices/`. Invoice 3 has a deliberate AED 300
  mismatch and is confirmed working against the live endpoint: TRN, subtotal, VAT,
  total and all three line items extracted exactly, and the mismatch flagged.
- **User-test kit** — `qa/user_test/`: facilitator script plus recording sheets, built
  to the Section 10 task list.
- **Pitch deck** — `Mizan_Pitch_Deck.pptx`, 11 slides with speaker notes. Demo
  questions were chosen by **measured** response time; the notes warn off the two
  questions that took 98s and 293s in testing.
- **Report placeholders 27 → 11.** Filled: all three names throughout, the contribution
  table, the seven interview passages, the professor, Anushree's bio, and the 39
  leftover `TB`/`TC` owner initials (now `JP`/`AA`).
  Remaining 11: course code, Jillian's bio, the §19 target, and the QA and user-test
  numbers that are blocked on capacity.
- **Timestamped backups** of the report sit beside it for every edit made — nothing is
  unrecoverable.
