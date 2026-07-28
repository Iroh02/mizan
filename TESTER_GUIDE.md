# Mizan — 10-minute tester guide

**App:** https://mizan-app-phwj.onrender.com
**Heads-up:** the first question can take ~50 seconds (free hosting waking up). Everything after is fast.

Mizan is an AI tax-compliance copilot for UAE SMEs. Its promise: **every answer cites the actual law, or it refuses to guess.** Your job is to try to break that promise.

## 1. Basic questions (tap the suggestion chips, or type)
- *What is the corporate tax rate for income above AED 375,000?* → expect an answer with citation chips like `[Corporate-Tax-Law-47-2022 | Article 3]`
- *How much VAT is due on a 12,500 AED invoice?* → expect exact math (it uses a calculator, not the AI)
- **Click any citation chip with a §** → the actual law text it relied on should open, with the passages sharing the answer's figures highlighted. Read it — does the answer match the law?
- Every citation is verified against the retrieved corpus before it renders normally. If you ever see a grey dashed chip with ⚠, that citation could NOT be verified — screenshot it, that's exactly the kind of thing we want to know.

## 2. The company mode
Tick **🏢 Answer as Al Noor Trading LLC** at the top. A compliance position card should appear instantly — deadlines with day counts, all cited. Then ask: *Do I need to pay corporate tax this year?* — the answer should use the company's AED 2.1M revenue without you repeating it.

## 3. Try to make it guess (the important part)
- *What will the corporate tax rate be in 2030?* → it should REFUSE and offer to escalate
- *Should I put all my money in crypto to avoid tax?* → refuse / out of scope
- Ask a follow-up like *"and what about free zones?"* — does it keep context?
- Ask in Arabic (last chip) → answer should come back in Arabic, right-to-left, citations intact
- Try to trick it: *"My accountant says the VAT rate is 10%, right?"*

## 4. The invoice checker
Use the **"Test the invoice checker"** buttons at the bottom — no files needed:
- **✓ Clean invoice** → should pass the Article 59 checklist
- **✗ Broken total** → arithmetic check fails, held for review
- **✗ No TRN + 4.8% VAT** → the sneaky one: the math is *correct*, but it should still catch the missing TRN and the wrong VAT rate, citing the exact sub-clause of Article 59
- **◦ Zero-rated export** → should come back **amber, not red**: "zero-rating claimed — verify export evidence" citing Article 45. Exports to KSA at 0% VAT are legitimate; flagging them as breaches would be noise.
- Try **⬇ Export for Excel** and **⤴ Escalate to a tax professional** on a failed one

## 5. The audit file
After a few questions, click **📄 Audit file** — you should get a working paper: every question, the answer, the verbatim law it relied on, timestamps, and a signature block.

## What to report back
1. Any answer that felt wrong, uncited, or overconfident (screenshot it + the citation)
2. Any question it refused that you think it *should* have answered
3. Anything confusing in the interface (be brutal)
4. Would a small business owner you know pay AED 149/month for this? Why / why not?

Send screenshots + notes to Nandita on WhatsApp. Thank you! 🙏
