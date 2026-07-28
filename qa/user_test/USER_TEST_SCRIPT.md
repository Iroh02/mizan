# Mizan — user test facilitator script

**Read this to each participant more or less word for word.** Consistency across the
three sessions is what makes the results reportable in Section 10.

- **App:** https://frontend-nine-opal-91.vercel.app
- **Time needed:** ~10 minutes per person
- **You need:** this script, the recording sheet, `invoice_3_desertrose_ERROR.png`
  sent to the participant (or shared screen), a timer
- **Participants:** 3+, none of them Nandita, Jillian or you

> ⚠️ **Before the first session:** open the app yourself and ask one question. The free
> tier sleeps after 15 minutes and the first request takes up to a minute. Do not let a
> participant's first impression be a cold start.

---

## 0. Framing and consent (say this)

> "Thanks for helping. This is a student project — an AI tool that answers UAE tax
> questions for small businesses. I'm testing the *tool*, not you, so there are no wrong
> answers, and if something is confusing that's exactly what I need to hear.
>
> I'll ask you to do five short things and I'll take notes on what you say and how long
> things take. I'm not recording audio or collecting anything personal, and I'll only
> report anonymised notes. Is that OK?
>
> Please think out loud as you go — tell me what you're looking at and what you expect."

Record: consent given (y/n), their role, and roughly their business/finance background.
**No names in the sheet — use P1, P2, P3.**

---

## Task 1 — Find a tax rate unaided

> "Imagine you run a small UAE company. You want to know what corporate tax rate applies
> to profits above AED 375,000. Use the tool to find out. Tell me when you think you have
> your answer."

**Start the timer when they begin, stop when they say they have an answer.**

Record: completed y/n · time · did they use a suggested question or type their own ·
anything they struggled with.

Correct answer: **9%** on the portion above the threshold (0% below it).

---

## Task 2 — Do the citations communicate?

> "Look at the answer it gave you. How would you check whether that's actually true?"

Then, if they don't mention them unprompted, point at the citation chips:

> "What do you think these labels mean?"

Record: did they notice the citations unprompted (y/n) · could they explain what they're
for · exact words they used.

**This is the question that matters most for the report** — the whole product thesis is
that visible citations create trust. If they don't notice or don't understand them, that
is a real finding and we report it.

---

## Task 3 — The refusal

> "Now ask it this: *What will the UAE corporate tax rate be in 2030?*"

Wait for the answer, then:

> "What just happened? What do you make of that?"

Record: **their exact words** — this is the quote most likely to end up in the report
and the pitch.

Probe if the response is flat: *"Would you rather it had given you a number?"*

> ⚠️ **Known issue:** the "Declined to guess" badge does not currently render on this
> answer (a backend flag bug). The participant will see the refusal **as plain text
> only**. Do not point at a badge that isn't there. If Nandita has pushed the fix before
> your session, the badge appears and you should note which version the participant saw.

---

## Task 4 — The invoice flag

Send them `invoice_3_desertrose_ERROR.png`, then:

> "Upload this invoice using the Upload invoice button, and tell me what the tool says
> about it."

Wait for extraction (it can take ~20–30 seconds), then:

> "What would you do next if this were your invoice?"

Record: did they notice the mismatch warning unprompted (y/n) · time to extraction ·
did they understand *what* was wrong · what they said they'd do.

The invoice states subtotal 13,290.00 + VAT 664.50 but a total of 14,254.50 — an
overstatement of AED 300. The tool should flag it for manual review.

---

## Task 5 — Two ratings and a closing question

> "Two quick ratings, 1 to 5.
> First — how easy was this to use? 1 is very hard, 5 is very easy.
> Second — how much would you trust the answers? 1 is not at all, 5 completely."

Then:

> "Last one: if this were a real product, what's the one thing you'd change?"

Record: both scores, and their answer verbatim.

---

## Immediately after each session (2 minutes, do not skip)

Write up while it's fresh:

- one thing they **liked**
- one thing they found **confusing**
- one thing you would **change** as a result

Section 10 has three placeholders that map exactly onto those three lines, and a fourth
for changes actually made. Where we discussed a change but could not implement it before
the deadline, the report says so rather than claiming it — so note the difference.
