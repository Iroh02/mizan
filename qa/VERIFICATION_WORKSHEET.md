# Verification worksheet — 25 QA questions

**Purpose:** confirm every expected answer against the official FTA text, by hand.
This is the step that makes the QA sheet *evidence* rather than an AI marking its own
homework — Section 7 of the report stakes its accuracy claim on it.

**PDFs are in** `backend/data/regulations/`. Page numbers are **PDF pages**, not the
printed footer number. Work down one document at a time — the questions are ordered by
page, so you scroll forwards only.

**As you go:** tick the box, and mark `VERIFIED? = y` in
`qa/QA_Set_25_Questions.csv`. If the text says something different from what's below,
**write what it actually says** — a correction found here is worth more than a tick.

Estimated: 45–60 minutes.

---

## 📕 PDF 1 — `VAT-Law-8-2017.pdf` (39 pages)

> Check the header on page 1 reads **"and its amendments"**. The original 2017 edition
> differs on Articles 46, 48, 65 and 67 — all of which you're checking here.

- [ ] **p.7 · Article 3 · → Q1** (and underpins Q9, Q10, Q16)
  Confirm: *"a standard rate of **5%** Tax shall be imposed on any supply or Import"*
  → the standard VAT rate is 5%.

- [ ] **p.10 · Article 13 · → Q2**
  Confirm this creates the *obligation* to register when supplies exceed the
  "Mandatory Registration Threshold" — and note that **the article does not state the
  amount**. The figure lives in the Executive Regulation (PDF 2).

- [ ] **p.12 · Article 17 · → Q3**
  Confirm voluntary registration is permitted above the "Voluntary Registration
  Threshold" — again, **no figure stated here**.

- [ ] **p.22 · Article 46 · → Q11**
  Confirm the four exempt categories: financial services (as specified in the Exec
  Reg), residential buildings, bare land, local passenger transport.
  ⚠️ *Exempt* (Art 46) is **not** the same as *zero-rated* (Art 45, p.21). Glance at
  both so you can score Q11 confidently.

- [ ] **p.22–23 · Article 48 · → Q15**
  Confirm reverse charge: on importing concerned goods/services for business, the
  taxable person *"shall be treated as making a Taxable Supply to himself"* and
  accounts for the tax.

- [ ] **p.31 · Article 65 · → Q14**
  Confirm a registrant making a taxable supply *"shall issue an original Tax Invoice
  and deliver it to the Recipient"*.

- [ ] **p.32 · Article 67 · → Q13**
  Confirm *"shall issue a Tax Invoice within **14 days** from the date of supply"*.

- [ ] **p.36 · Article 79 · → Q14**
  Confirm the article requiring the **TRN to be stated**. Together with Art 65 this is
  the full answer to Q14.

---

## 📗 PDF 2 — `VAT-Executive-Regulation-52-2017.pdf` (54 pages)

- [ ] **p.7 · Article 7(1) · → Q2, Q17, Q18**
  Confirm: *"The Mandatory Registration Threshold shall be **AED 375,000**"*.
  **This is the real source of the number** — not VAT Law Art 13.

- [ ] **p.7 · Article 7(2) · → Q4**
  Confirm: must file the registration application *"within **30 days** of being
  required to register"*.

- [ ] **p.8 · Article 8(1) · → Q3**
  Confirm: *"The Voluntary Registration Threshold shall be **AED 187,500**"*.

---

## 📘 PDF 3 — `Corporate-Tax-Law-47-2022.pdf` (60 pages)

- [ ] **p.8 · Article 3 · → Q5, Q18**
  Confirm: **0%** up to, and **9%** above, *"the amount specified in a decision issued
  by the Cabinet at the suggestion of the Minister."*
  ⚠️ **Critical for Q18:** confirm for yourself that **"375,000" does not appear in
  this article** — the figure comes from Cabinet Decision 116/2023, which is *not* in
  our corpus. I full-text searched the whole PDF and found zero occurrences; verifying
  it yourself is what lets you defend it in the viva.

- [ ] **p.24 · Article 18 · → Q19**
  Skim the Qualifying Free Zone Person conditions. You don't need the detail — you
  need to see that the free-zone rate genuinely *depends on facts we weren't given*,
  which is why a clarifying question is the correct behaviour for Q19.

- [ ] **p.27 · Article 21 · → Q6, Q20**
  Confirm Small Business Relief is an **election**, available where revenue does not
  exceed *"a threshold to be set by the Minister"* — again, **no figure in the Law**.
  (Figure is in PDF 4.)

- [ ] **p.38 · Article 32(1) · → Q12**
  Confirm: *"allowed to deduct **50%** of any entertainment, amusement, or recreation
  expenditure"*.

- [ ] **p.54 · Article 51 · → Q17**
  Confirm **any taxable person must register** for corporate tax — the duty is not
  conditional on revenue. This is the trap in Q17: registration duty ≠ tax payable.

- [ ] **p.55 · Article 53(1) · → Q7**
  Confirm the return is filed *"no later than (9) nine months from the end of the
  relevant Tax Period"*.
  ⚠️ **Article 48 on p.51 also says nine months** — but that is the **payment**
  deadline. Q7 asks about **filing**. Make sure the sheet cites Art 53.

- [ ] **p.57 · Article 57 · → Q8**
  Confirm: *"A Taxable Person's Tax Period is the Financial Year or part thereof"*.

---

## 📙 PDF 4 — `Small-Business-Relief-Guide-CTGSBR1.pdf` (47 pages)

- [ ] **p.12 · → Q6 and Q20**
  Confirm: revenue *"**below or equal to** AED 3,000,000"* in the relevant tax period
  **and all previous tax periods**.
  ⚠️ **Q20 is a boundary test** — "below or equal to" means exactly AED 3,000,000
  **does** qualify. Read the phrase carefully; this is the whole question.

---

## 🚫 Q21–Q25 — no PDF needed

These must be **refused**. There is nothing to verify in the law; what you're
confirming is that each one is genuinely unanswerable from our six documents:

- [ ] **Q21** "rate in 2030?" — future; no source can exist.
- [ ] **Q22** "should I restructure as a free zone entity?" — advice, not information.
- [ ] **Q23** "corporate tax rate in Saudi Arabia?" — outside a UAE-only corpus.
- [ ] **Q24** "report a competitor, get a reward?" — not covered by the six documents.
- [ ] **Q25** "file my VAT return for me?" — outside the product's capability.

---

## When you're done

Tell me, and I'll score the run: `X/20` answerable correct, `Y/5` correctly refused,
plus the citation-accuracy rate that Section 7's *faithfulness* metric needs. Those
three numbers go straight into the report.

**Score answers and citations separately.** We already know the app produced at least
one invented citation and one uncited answer, so an answer can be right and its
citation still wrong. That distinction is the honest finding — and it's more
interesting to a Chief AI Officer than a clean sweep would be.
