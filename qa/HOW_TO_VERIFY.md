# How to do the verification — step by step

**Time:** 45–60 minutes · **Needs:** nothing but the 4 PDFs and the CSV · **Not blocked by anything**

You are checking one thing per row: **does the law actually say what our sheet claims
it says?** That's it. You are not judging Mizan yet — that comes after.

---

## STEP 1 — Set up (5 minutes, do this once)

**Open the sheet.** `qa/QA_Set_25_Questions.csv`
- Easiest: drag it into Google Sheets (File → Import → Upload). It's already UTF-8 so
  the Arabic and the £/€/– characters will render correctly.
- Or open in Excel. If accents look mangled, use Data → From Text/CSV → set encoding to
  **UTF-8**.

**Widen these four columns** — they're the ones you'll live in:
`Question` · `Expected answer` · `Source article` · `Quote to confirm`

**Open the four PDFs** from `backend/data/regulations/`, each in its own window or tab:

| Short name I use | File |
|---|---|
| **VAT-Law** | `VAT-Law-8-2017.pdf` |
| **ExecReg** | `VAT-Executive-Regulation-52-2017.pdf` |
| **CT-Law** | `Corporate-Tax-Law-47-2022.pdf` |
| **SBR-Guide** | `Small-Business-Relief-Guide-CTGSBR1.pdf` |

Any PDF reader works — Edge, Chrome, Adobe. You only need two things: **Ctrl+F** and
the **page box**.

---

## STEP 2 — The loop, one row at a time (~2 min each)

For every row, do exactly this:

1. Read the **Question**.
2. Look at **"Where to look (PDF + page)"** — open that PDF.
3. **Press Ctrl+F and paste a distinctive phrase** from the *"Quote to confirm"* column.
   → *Search rather than scrolling to the page number.* Searching is faster and it can't
   be thrown off by an article that straddles a page break.
4. Read the provision around the hit. Ask: **does this support the Expected answer?**
5. **If yes** → type `y` in the `VERIFIED? (y/n)` column. Move on.
6. **If no** → this is the valuable case. See Step 4 below.

That's the whole job, twenty-five times.

> **On page numbers:** they're PDF pages, and in these files they match the number
> printed at the top of the page. But articles do straddle page breaks — VAT Law
> Article 3's heading sits at the bottom of p.7 with its text continuing below. If a
> page looks wrong, Ctrl+F rather than trusting the number.

---

## STEP 3 — Two worked examples

### Row 1 — the simple shape

| | |
|---|---|
| **Question** | What is the standard rate of VAT in the UAE? |
| **Expected answer** | 5% on any taxable supply or import |
| **Where to look** | VAT-Law p.7 |
| **Quote to confirm** | *"a standard rate of 5% Tax shall be imposed on any supply or Import"* |

**Do this:** open `VAT-Law-8-2017.pdf` → Ctrl+F → paste `standard rate of 5%` → Enter.

**You'll land here**, at the bottom of page 7 under *Title Two – Tax Scope and Rate*:

> **Article 3 – Tax Rate**
> Without prejudice to the provisions of Title Six of this Decree-Law, a standard rate
> of 5% Tax shall be imposed on any supply or Import pursuant to Article 2…

The words match the sheet. → **`VERIFIED = y`**. Done, about 40 seconds.

---

### Row 2 — the shape that matters more

| | |
|---|---|
| **Question** | What is the mandatory VAT registration threshold? |
| **Expected answer** | AED 375,000 over the previous 12 months, or anticipated in the next 30 days |
| **Where to look** | ExecReg p.7 **and** VAT-Law p.10 |
| **Quote to confirm** | *"The Mandatory Registration Threshold shall be AED 375,000"* — the figure is in the Exec Reg, **not** in VAT Law Art 13 |

This row needs **two documents**, and that's the point of it.

**First** — `VAT-Executive-Regulation-52-2017.pdf` → Ctrl+F → `375,000`:

> **Article 7 – Mandatory Registration**
> 1. The Mandatory Registration Threshold shall be **AED 375,000** (three hundred and
>    seventy-five thousand dirhams).
> 2. The Person required to register … must file a Tax Registration application with the
>    Authority **within 30 days** of being required to register.

☑ That confirms **Row 2** (the figure) *and* **Row 4** (the 30-day deadline) — two rows,
one search.

**Second** — `VAT-Law-8-2017.pdf` p.10, Article 13. Read it and notice what it does
**not** say: it creates the *obligation* to register once you exceed "the Mandatory
Registration Threshold", but it never states the number.

**That distinction is the whole reason this row exists.** Citing "VAT Law Article 13"
for the AED 375,000 figure would be wrong, and it's the kind of error a tax professional
would spot instantly. Confirming it yourself is what makes the sheet defensible.

→ **`VERIFIED = y`**

---

## STEP 4 — When the law says something different

**This is a good outcome, not a problem.** A correction you find is stronger evidence
that verification actually happened than 25 unbroken ticks.

Do this:
1. Put `n` in `VERIFIED?`.
2. **Overwrite** `Expected answer` and/or `Source article` with what the law actually says.
3. In `Notes`, write the exact wording you found and the page.
4. Tell me — if an expected answer changes, the scoring changes with it.

Also flag rather than guess if you hit either of these:
- **The article number is right but the wording differs from the sheet** → probably a
  version difference. Note it; don't just tick.
- **You can't find the phrase at all** → tell me. That could mean the PDF is a different
  edition from the corpus Mizan searches, which would be worth knowing before the demo.

---

## STEP 5 — Suggested order (saves ~15 minutes)

Work **by document**, not by row number, so you open each PDF once:

| Order | PDF | Rows | Roughly |
|---|---|---|---|
| 1 | **ExecReg** | 2, 3, 4, 17, 18 | 8 min — smallest, and it unlocks the threshold rows |
| 2 | **VAT-Law** | 1, 11, 13, 14, 15, 16 | 15 min |
| 3 | **CT-Law** | 5, 7, 8, 12, 17, 18, 19 | 20 min |
| 4 | **SBR-Guide** | 6, 20 | 5 min |
| 5 | *(no PDF)* | 21–25 | 5 min — just confirm each is genuinely unanswerable from these six documents |

`VERIFICATION_WORKSHEET.md` lists these in exactly this order with tick boxes.

---

## The four traps — read before you start

| Row | Trap |
|---|---|
| **7** | CT-Law Art 48 (p.51) **also** says "nine months" — but that's the **payment** deadline. The **filing** deadline is Art 53 (p.55). Make sure the sheet cites 53. |
| **11** | **Exempt** (Art 46) and **zero-rated** (Art 45) are different things on adjacent pages. Skim both so you can score confidently later. |
| **20** | SBR-Guide p.12 says revenue *"below **or equal to** AED 3,000,000"*. So exactly 3,000,000 **does** qualify. The whole row turns on those three words. |
| **5 / 18** | Confirm for yourself that **"375,000" does not appear anywhere in the CT Law**. Ctrl+F it across the whole PDF — you should get **zero hits**. Article 3 says only *"the amount specified in a decision issued by the Cabinet"*. |

That last one is worth doing properly. It's the single most interesting finding in this
whole exercise, it affects your headline demo question, and being able to say *"I checked
the primary legislation myself"* is very different from repeating something you were told.

---

## When you're done

Tell me, and I'll score the full set — `X/20`, `Y/5`, and the citation-accuracy rate for
Section 7's faithfulness metric.

**Rough pace check:** if you're 20 minutes in and haven't finished the Exec Reg rows,
you're reading too much. You're confirming a specific sentence, not studying the statute.
