# Mizan demo script — "A day at Al Noor Trading LLC"

**The demo company:** Al Noor Trading LLC — mainland Dubai electronics trader, ~AED 2.1M revenue, 8 employees, VAT-registered since 2019, Corporate Tax registered 2024, imports from China, exports to Saudi Arabia. (Synthetic — no real entity.)
**Demo assets:** `demo/invoices/` — invoice 1 (clean supplier invoice), invoice 2 (**deliberate subtotal+VAT≠total error**), invoice 3 (zero-rated export to KSA), **invoice 4 Gulf Horizon (missing TRN + VAT charged at 4.8% — arithmetic is consistent, so only the Article 59 checklist catches it)**.
**Before going on stage:** open the live app, hit `/health?deep=1` 2 minutes early to wake the server, have the backup video one tab away.

## The arc (≈6 minutes): one company's real week of tax questions

**1. The story + the position card (45s).** "Meet Al Noor Trading — 2.1M revenue, 8 people, no tax specialist. 651,000 UAE companies now carry corporate-tax obligations; 91,000 needed a penalty waiver just for registration."
Tick "🏢 Answer as Al Noor Trading LLC" **on stage**. The **compliance position card** renders instantly: registration status vs the 375k threshold, next VAT return with days remaining, CT return deadline, Small Business Relief eligibility, penalty exposure — every line cited. The line: "before anyone types a question, Mizan already knows where this company is exposed. This is deterministic — computed from the profile and the law, no model involved, so it cannot hallucinate."

**2. The simple question (40s).** Ask: *"Do I need to pay corporate tax this year?"*
Watch out loud: "notice it's searching the actual law — live" (⚖ status lines) → answer arrives entity-aware (2.1M revenue → below the 3M Small Business Relief threshold — election may apply) with citation chips.

**3. The citation drill-down (20s) — the trust builder.** Click a citation chip. The **verbatim law text** opens — exactly what the model was shown. The line: "we don't ask you to trust the AI. Click any citation and read the article yourself. Every answer is one click from the law."

**4. The compound question (60s) — the agentic showcase.** Ask: *"I just invoiced a customer in Riyadh for AED 85,000 — do I charge VAT on that, and does it change my corporate tax position?"*
Multiple searches cascade on screen (export zero-rating + revenue/threshold reasoning). Then open the **audit trail**: "every step it took, recorded — this is what AI governance looks like in a product."

**5. The refusal (40s) — the trust moment.** Ask: *"What will the corporate tax rate be in 2030?"*
It declines. Pause. Then: "Stanford found purpose-built legal AI from LexisNexis and Thomson Reuters hallucinate 17–33% of the time. Our answer to that isn't marketing — it's architecture: a verifier model checks every draft against the retrieved law, and when the law doesn't answer, Mizan refuses. A tax tool that guesses is a liability. Ours declines to guess."

**6. The invoice (60s) — the showstopper.** **Drag and drop invoice 4 (Gulf Horizon)** onto the app. Extraction card appears, then the **Article 59 checklist animates row by row**: "Tax Invoice" wording ✓ … supplier TRN ✗ *no TRN found* … VAT at 5% ✗ *charged at 4.80%* — each failure citing the exact sub-clause of Article 59 breached. The line: "the math on this invoice adds up perfectly — a spreadsheet would pass it. Mizan catches that it's not a legally valid tax invoice, which means Al Noor can't recover the input VAT on it. On 1 July 2027, e-invoicing becomes mandatory for every UAE SME — this checklist is standing exactly where that data will land."

**7. The audit file close (30s).** Click **📄 Audit file**. Scroll once: question, answer, the verbatim law relied upon, timestamps, verifier status, model + corpus version, a signature block for the accountant and tax agent. The line: "if the FTA queries any of these positions in 18 months, this is the working paper your accountant hands them. Accountants don't buy answers — they buy defensibility." → "Cited answers or honest refusals, at AED 149 a month, between software that can't read the law and accountants who cost ten times more." → QR code slide → questions.

## Arabic moment (optional, if rehearsed): tap the Arabic suggestion chip (ما هي نسبة ضريبة القيمة المضافة في الإمارات؟) — question and answer render right-to-left, citations stay anchored to the English law. One line: "the Gulf's language is not an afterthought."

## If the live demo breaks
Play the backup video and keep narrating over it, exactly per this script. Do not debug on stage. The line if needed: "free-tier hosting is waking up — here's the same flow recorded an hour ago."
