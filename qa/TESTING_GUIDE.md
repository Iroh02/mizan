# Testing guide — what to test, how, and what each test proves

You have **three separate tests** to run. They prove different things, feed different
sections of the report, and must happen in a specific order. Conflating them is the
main way this goes wrong.

| | Test | What it proves | Feeds | Needs |
|---|---|---|---|---|
| **1** | **Verification** — you vs. the law PDFs | That our *expected* answers are right | The credibility of everything below | Nothing. Do it now. |
| **2** | **Accuracy QA** — Mizan vs. the 25 questions | How often the product is right | Section 7 — `X/20`, `Y/5` | Working app + test 1 done |
| **3** | **User test** — 3 outsiders vs. the app | Whether people can use and trust it | Section 10 | Working app + 3 people |

**Order matters.** Test 2 is meaningless without test 1 — without human-verified
expected answers you are just asking an AI whether it agrees with itself. Test 3 is
independent of 1 and 2 and can run in parallel once the app works.

---

# TEST 1 — Verification (you vs. the PDFs)

**Purpose:** establish ground truth. **Time:** 45–60 min. **Blocked by:** nothing.

Full instructions: **`VERIFICATION_WORKSHEET.md`** — grouped by PDF, pages ascending,
with the exact phrase to confirm for each question.

**The rule that matters:** you are confirming against the *law*, not against my draft.
If the PDF says something different from the sheet, the PDF wins and you correct the
sheet. A correction found here is worth more than a tick — it is direct evidence that
verification was real.

Mark `VERIFIED? = y` in `QA_Set_25_Questions.csv` as you go.

---

# TEST 2 — Accuracy QA (Mizan vs. the 25 questions)

**Purpose:** produce the accuracy numbers Section 7 commits to.
**Blocked by:** LLM capacity (Nandita) and test 1.

19 of 25 answers are already captured in `QA_Scored.csv`. Six are missing — Q19, Q20,
Q22–25 — and I'll capture those the moment capacity returns.

## How to score — two verdicts per question, never one

Section 7 promises **faithfulness**: *"the share of answers whose statements are
supported by the cited articles."* You cannot report that from a single verdict column,
because an answer can be right while its citation is wrong. Score both.

### Column A — Answer verdict

| Verdict | Use when |
|---|---|
| **Correct** | States the key fact, and adds nothing false |
| **Partial** | Key fact right, but incomplete or with a minor error |
| **Wrong** | Key fact missing or contradicted |
| **Should have refused** | It answered a question the law doesn't resolve |
| **Correctly refused** | It declined, and declining was right |

### Column B — Citation verdict

| Verdict | Use when |
|---|---|
| **Correct** | Cited article genuinely contains the claim |
| **Wrong article** | Cited something real, but not the right provision |
| **Fabricated** | Cited an article that does not exist |
| **None** | Factual claim with no citation at all |

> ⚠️ **Judge law citations and guide citations differently.**
> - **Laws** (CT Law, VAT Law, Exec Reg) chunk cleanly — the article number is
>   reliable, so check the number.
> - **Guides** (CT General, Taxable Income, SBR) do not. 138 chunks of the CT General
>   Guide are all labelled "Article 40". A guide citation's *number* is close to
>   meaningless — **judge it on whether the content supports the claim.**

## Five questions with special rules

| Q | Rule |
|---|---|
| **9, 10** | Correct number is not enough — **`vat_calculator` must appear in the tool trace**. If the model did the arithmetic itself that is a **fail**, per the product's own rule 2. The `Notes` column shows `calc=True/False`. |
| **16** | Wrong-premise trap ("since VAT is 10%…"). Passes **only if it explicitly corrects you to 5%**. Answering "AED 250" without correcting the premise is **Partial**. |
| **17** | Must get **both** halves: VAT registration yes (over 375,000) **and** CT registration still required regardless of revenue. One right, one wrong = **Partial**. |
| **19** | A **clarifying question is the correct answer**, not a failure. Free-zone rate depends on facts we didn't give. A confident "0% because free zone" is **Wrong**. |
| **21–25** | **Score from the answer text, not the `abstained` flag.** The flag is buggy — it returned `false` on a word-perfect refusal. Look for "can't answer this reliably". |

## The three numbers you report

```
X / 20   answerable questions answered Correct        → Section 7
Y / 5    refusal questions Correctly refused          → Section 7
F %      answers whose citations are Correct          → faithfulness
```

**Report them honestly, including the failures.** A perfect 20/20 with one fabricated
citation is a more credible result than a clean sweep, because it shows the QA was real.
We already know of one invented citation and one uncited answer — those belong in the
report.

## The team run-through

The group wants to score together. Do it like this:

1. Send the group `QA_Scored.csv` **after** your verification, so the expected answers
   are settled before anyone sees Mizan's.
2. Go question by question. **You hold the pen** — you're the one who read the law.
3. Disagreement is resolved by opening the PDF, not by discussion.
4. Log every failure with the question number so Nandita can act before freeze.
5. **Do not re-run failed questions until they've been scored.** Re-rolling until you
   like the answer is not evaluation, and capacity is limited anyway.

---

# TEST 3 — User test (3 outsiders vs. the app)

**Purpose:** evidence for Section 10. **Time:** ~10 min per person.
**Blocked by:** LLM capacity, and three people.

Full script: **`user_test/USER_TEST_SCRIPT.md`**. Recording sheets:
`user_test/USER_TEST_RECORDING.csv` and `USER_TEST_SUMMARY.csv`.

## What you are actually testing

Not "do they like it". Four specific claims the report makes:

| Task | The claim being tested |
|---|---|
| 1 — find the tax rate unaided | The core loop works for a non-expert |
| 2 — explain the citations | **Visible citations create trust** — the central product thesis |
| 3 — react to the refusal | Abstention reads as *honesty*, not as *broken* |
| 4 — interpret the invoice flag | Users act on the warning rather than ignore it |
| 5 — two 1–5 ratings | Comparable numbers across participants |

**Task 2 and task 3 are the ones that matter.** If people don't notice the citations,
or read the refusal as failure, that is a genuine finding and it goes in the report.
Do not coach them toward the answer you want.

## Rules that keep the data usable

- **Warm the server first.** Ask one question yourself ~2 min before. Never let a
  participant's first impression be a 50-second cold start.
- **Same script, same order, all three people.** Otherwise the results aren't comparable.
- **Write up within 2 minutes of each session**, while it's fresh.
- **Record exact words**, not your summary of them. Section 10 wants verbatim.
- **Note which build each person saw.** If Nandita's abstention fix ships mid-evening,
  P1 and P3 saw different products — say so rather than pooling them silently.
- Nobody from the team counts as a participant.

## What you'll have afterwards

Completion rate, mean time per task, two mean ratings, and three verbatim lines each
for liked / confusing / would-change. That closes **5 placeholders** in Section 10 and
one in Section 19.

---

# If the app still isn't working tonight

Test 1 is unaffected — do it regardless.

For tests 2 and 3, the honest fallback is to report what actually happened: a partial
QA run of 19/25 with the capacity limit stated, and a user test with however many
participants you managed. **A smaller sample honestly reported costs far less than
invented data**, and it is consistent with the way the rest of this report already
handles its evidence gaps.

Do not describe a test you did not run.
