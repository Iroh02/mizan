# Mizan demo script — "A day at Al Noor Trading LLC"

**The demo company:** Al Noor Trading LLC — mainland Dubai electronics trader, ~AED 2.1M revenue, 8 employees, VAT-registered since 2019, Corporate Tax registered 2024, imports from China, exports to Saudi Arabia. (Synthetic — no real entity.)
**Demo assets:** `demo/invoices/` — invoice 1 (clean supplier invoice), invoice 2 (**deliberate subtotal+VAT≠total error**), invoice 3 (zero-rated export to KSA).
**Before going on stage:** open the live app, tick "🏢 Answer as Al Noor Trading LLC", hit /health 2 minutes early to wake the server, have the backup video one tab away.

## The arc (≈5 minutes): one company's real week of tax questions

**1. The story (30s).** "Meet Al Noor Trading — 2.1M revenue, 8 people, no tax specialist. 651,000 UAE companies now carry corporate-tax obligations; 91,000 needed a penalty waiver just for registration. This is their week, with Mizan."

**2. The simple question (45s).** Ask: *"Do I need to pay corporate tax this year?"*
Watch out loud: "notice it's searching the actual law — live" (⚖ status lines) → answer arrives entity-aware (2.1M revenue → below the 3M Small Business Relief threshold — election may apply) with citation chips. Point at the chips: "every claim traces to an article of Federal Decree-Law 47."

**3. The compound question (60s) — the agentic showcase.** Ask: *"I just invoiced a customer in Riyadh for AED 85,000 — do I charge VAT on that, and does it change my corporate tax position?"*
Multiple searches cascade on screen (export zero-rating + revenue/threshold reasoning). Then open the **audit trail**: "every step it took, recorded — this is what AI governance looks like in a product."

**4. The refusal (45s) — the trust moment.** Ask: *"What will the corporate tax rate be in 2030?"*
It declines. Pause. Then: "Stanford found purpose-built legal AI from LexisNexis and Thomson Reuters hallucinate 17–33% of the time. Our answer to that isn't marketing — it's architecture: a verifier model checks every draft against the retrieved law, and when the law doesn't answer, Mizan refuses. A tax tool that guesses is a liability. Ours declines to guess."

**5. The invoice (45s).** Upload **invoice 2** (the broken one). Extraction card appears — and flags the mismatch: "subtotal + VAT ≠ total, held for human review. It reads invoices, does the math deterministically, and doesn't silently trust itself. On 1 July 2027, e-invoicing becomes mandatory for every UAE SME — this workflow is standing exactly where that data will land."

**6. Close (30s).** "Cited answers or honest refusals, an audit trail on every response, measured on a human-verified QA set — at AED 149 a month, between software that can't read the law and accountants who cost ten times more." → QR code slide → questions.

## Arabic moment (optional, if rehearsed): ask ما هي نسبة ضريبة الشركات؟ — same engine, same citations, in Arabic. One line: "the Gulf's language is not an afterthought."

## If the live demo breaks
Play the backup video and keep narrating over it, exactly per this script. Do not debug on stage. The line if needed: "free-tier hosting is waking up — here's the same flow recorded an hour ago."
