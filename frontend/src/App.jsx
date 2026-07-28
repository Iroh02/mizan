import { useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function mdToHtml(s) {
  // minimal, safe rendering of the model's markdown: escape HTML first, then format
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^#{1,4}\s*(.*)$/gm, '<b>$1</b>')
    .replace(/^\s*[-*•]\s+(.*)$/gm, '&nbsp;&nbsp;• $1')
    // citation tokens stay LTR islands inside RTL (Arabic) text
    .replace(/\[([^\][]+?\|[^\][]+?)\]/g, '<bdi dir="ltr">[$1]</bdi>')
    .replace(/\n/g, '<br/>')
}

const DEMO_COMPANY =
  'Al Noor Trading LLC — mainland Dubai trading company (electronics), ~AED 2.1M annual revenue, ' +
  'VAT-registered since 2019, Corporate Tax registered 2024, 8 employees, imports from China, exports to Saudi Arabia.'

// A3: the model must answer consistently with the deterministic card, so the
// card's computed facts travel with the company context as authoritative.
function companyContext() {
  const vat = nextVatDue()
  const now = new Date()
  const fy = now > new Date(now.getFullYear(), 8, 30) ? now.getFullYear() : now.getFullYear() - 1
  const ctDue = new Date(fy + 1, 8, 30)
  return DEMO_COMPANY +
    ' AUTHORITATIVE COMPLIANCE PROFILE (deterministic, from company records — answers MUST be consistent with these facts): ' +
    `VAT registration required and in place (revenue AED 2,100,000 exceeds the AED 375,000 mandatory threshold). ` +
    `Next VAT return due ${fmtDate(vat.due)} (quarterly periods). Corporate Tax return for FY${fy} due ${fmtDate(ctDue)}. ` +
    `ELIGIBLE TO ELECT Small Business Relief: revenue AED 2,100,000 is below the AED 3,000,000 threshold — surface this whenever corporate tax liability is discussed. ` +
    `IMPORTANT: AED 2,100,000 is REVENUE, not taxable income; taxable income is not known.`
}

const SUGGESTIONS = [
  'What is the corporate tax rate for income above AED 375,000?',
  'My revenue is AED 300,000 — do I need to register for corporate tax?',
  'How much VAT is due on a 12,500 AED invoice?',
  'I just invoiced a customer in Riyadh for AED 85,000 — do I charge VAT on that?',
  'What will the corporate tax rate be in 2030?',
  'ما هي نسبة ضريبة القيمة المضافة في الإمارات؟',
]

const SAMPLES = [
  { label: '✓ Clean invoice', file: 'clean.png' },
  { label: '✗ Broken total', file: 'broken-total.png' },
  { label: '✗ No TRN + 4.8% VAT', file: 'bad-vat.png' },
  { label: '◦ Zero-rated export', file: 'export-ksa.png' },
]

function escalateHref(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---------------------------------------------------------------- law lookup
// retrieved law arrives as blocks of chunks separated by \n---\n; each chunk's
// first line is its label: [doc | Article N]
function lawChunks(retrieved) {
  return (retrieved || []).flatMap((r) => r.split('\n---\n')).map((c) => c.trim()).filter(Boolean)
}
function findLaw(retrieved, cite) {
  const [doc, art] = cite.split('|').map((s) => s.trim())
  return lawChunks(retrieved).filter((c) => {
    const first = c.split('\n')[0]
    return first.includes(doc) && (first.includes(`| ${art}]`) || first.includes(`| ${art} ]`))
  })
}

function Citations({ text, retrieved, unverified, onOpen }) {
  // renders [doc | Article N] citation tags found in the answer as chips
  const cites = [...new Set(text.match(/\[[^\]]+\|[^\]]+\]/g) || [])]
  if (!cites.length) return null
  const isUnverified = (inner) =>
    (unverified || []).some((u) => u.toLowerCase() === inner.toLowerCase())
  return (
    <div className="cites" dir="ltr">
      {cites.map((c) => {
        const inner = c.replace(/[[\]]/g, '').trim()
        const law = findLaw(retrieved, inner)
        if (law.length) {
          return (
            <button key={c} className="cite clickable" title="Read the law text this cites"
                    onClick={() => onOpen({ cite: inner, texts: law, answer: text })}>
              {inner} <span className="cite-eye">§</span>
            </button>
          )
        }
        return (
          <span key={c} className={`cite ${isUnverified(inner) ? 'unverified' : ''}`}
                title={isUnverified(inner)
                  ? 'Cited by the model but NOT verified against the corpus this turn — treat with caution'
                  : 'Retrieved law text not available in this view'}>
            {inner}{isUnverified(inner) && ' ⚠'}
          </span>
        )
      })}
    </div>
  )
}

function highlightLaw(chunk, answer) {
  // B2: mark the sentences the answer most plausibly relied on — any sentence
  // sharing a distinctive figure (numbers, percentages, AED amounts) with it.
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const figures = [...new Set((answer || '').match(/\d[\d,.]*\s*%|\bAED\s*[\d,]+|\b\d{1,3}(?:,\d{3})+\b/g) || [])]
    .map((f) => f.replace(/\s+/g, '').toLowerCase())
  if (!figures.length) return esc(chunk)
  return chunk.split(/(?<=[.;:])\s+/).map((sent) => {
    const flat = sent.replace(/\s+/g, '').toLowerCase()
    const hit = figures.some((f) => flat.includes(f))
    return hit ? `<mark>${esc(sent)}</mark>` : esc(sent)
  }).join(' ')
}

function LawModal({ view, onClose }) {
  if (!view) return null
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="cite">{view.cite}</span>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-sub">Verbatim text retrieved from the corpus — exactly what the model was shown before answering.
          Highlighted: the passages sharing figures with the answer.</div>
        {view.texts.map((t, i) => (
          <pre key={i} className="law-text"
               dangerouslySetInnerHTML={{ __html: highlightLaw(t, view.answer) }} />
        ))}
      </div>
    </div>
  )
}

function Trace({ trace }) {
  const [open, setOpen] = useState(false)
  if (!trace?.length) return null
  return (
    <div className="trace" dir="ltr">
      <button className="trace-toggle" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} {trace.length} tool call{trace.length > 1 ? 's' : ''} (audit trail)
      </button>
      {open && trace.map((t, i) => (
        <div key={i} className="trace-row">
          <code>{t.tool}</code> ← {JSON.stringify(t.args)}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Article 59 checklist
function digitsOf(s) { return (s || '').replace(/\D/g, '') }

function buildChecklist(data) {
  const inv = data.invoice
  if (!inv) return []
  const vatPct = inv.subtotal > 0 ? (inv.vat / inv.subtotal) * 100 : null
  const trnDigits = digitsOf(inv.trn)
  return [
    {
      label: '“Tax Invoice” wording displayed',
      ok: inv.tax_invoice_label === true ? true : inv.tax_invoice_label === false ? false : null,
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(a)',
      fail: 'The words “Tax Invoice” must be clearly displayed on the invoice.',
    },
    {
      label: 'Supplier TRN present (15 digits)',
      ok: !!inv.trn && trnDigits.length === 15,
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(b)',
      fail: !inv.trn ? 'No Tax Registration Number found on the invoice.'
        : `TRN has ${trnDigits.length} digits — a UAE TRN has 15.`,
    },
    {
      label: 'Date of issue shown',
      ok: !!inv.date,
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(e)',
      fail: 'No issue date found on the invoice.',
    },
    {
      label: 'Line items with quantity & unit price',
      ok: inv.line_items?.length > 0,
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(g)(h)',
      fail: 'No itemised description of goods/services found.',
    },
    (() => {
      // A2: three-state VAT-rate check. 0% + export indicators = amber
      // (zero-rating claimed, evidence required), never a red breach.
      const looksExport = /export|riyadh|ksa|saudi arabia|\bgcc\b|outside (the )?uae|abroad/i.test(
        [inv.supplier, ...(inv.line_items || []).map((l) => l.description)].join(' '))
      if (vatPct === null) return {
        label: 'VAT charged at the standard 5% rate', ok: null,
        cite: 'VAT-Law-8-2017 | Article 3', fail: 'Could not compute the applied rate.',
      }
      if (Math.abs(vatPct - 5) < 0.11) return {
        label: 'VAT charged at the standard 5% rate', ok: true, cite: 'VAT-Law-8-2017 | Article 3',
      }
      if (vatPct < 0.11 && looksExport) return {
        label: 'VAT at 0% — zero-rating claimed', ok: 'amber',
        cite: 'VAT-Law-8-2017 | Article 45 · VAT-Executive-Regulation-52-2017 | Article 30',
        fail: 'Exports of goods are zero-rated — retain official and commercial evidence of export. Not a breach; verify export documentation.',
      }
      return {
        label: 'VAT charged at the standard 5% rate', ok: false,
        cite: 'VAT-Law-8-2017 | Article 3',
        fail: `VAT applied at ${vatPct.toFixed(2)}% of the subtotal — the standard rate is 5%${vatPct < 0.11 ? ', and no export/zero-rating indicators were found' : ''}.`,
      }
    })(),
    {
      label: 'Arithmetic: subtotal + VAT = total',
      ok: data.consistent === true,
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(j)(k)',
      fail: data.warning || 'The gross amount does not equal subtotal + VAT.',
    },
    {
      label: 'Amounts expressed in AED',
      ok: (inv.currency || '').toUpperCase() === 'AED',
      cite: 'VAT-Executive-Regulation-52-2017 | Article 59(1)(h)(j)(k)',
      fail: `Amounts are in ${inv.currency || 'an unknown currency'} — Article 59 requires AED (or the AED conversion shown).`,
    },
  ]
}

function InvoiceChecklist({ data }) {
  const rows = buildChecklist(data)
  if (!rows.length) return null
  const fails = rows.filter((r) => r.ok === false).length
  const ambers = rows.filter((r) => r.ok === 'amber').length
  const cls = (ok) => ok === false ? 'bad' : ok === 'amber' ? 'amber' : ok === null ? 'meh' : 'good'
  const mark = (ok) => ok === true ? '✓' : ok === false ? '✗' : ok === 'amber' ? '◐' : '·'
  return (
    <div className="checklist">
      <div className="checklist-title">Article 59 tax-invoice checklist</div>
      {rows.map((r, i) => (
        <div key={r.label} className={`check-row ${cls(r.ok)}`}
             style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
          <span className="check-mark">{mark(r.ok)}</span>
          <span className="check-body">
            {r.label}
            {(r.ok === false || r.ok === 'amber') && (
              <span className="check-fail"> — {r.fail} <span className="cite">{r.cite}</span></span>
            )}
            {r.ok === null && <span className="check-unknown"> — could not verify from the image</span>}
          </span>
        </div>
      ))}
      <div className={`check-verdict ${fails ? 'bad' : ambers ? 'amber' : 'good'}`}
           style={{ animationDelay: `${0.35 + rows.length * 0.35}s` }}>
        {fails
          ? `✗ ${fails} breach${fails > 1 ? 'es' : ''} of Article 59 — hold this invoice for review`
          : ambers
            ? '◐ Zero-rating claimed — verify export evidence before filing'
            : '✓ Passes the Article 59 tax-invoice checklist'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- compliance position card
const AED = (n) => `AED ${n.toLocaleString('en-AE')}`
const DAY = 86400000
function fmtDate(d) { return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) }
function daysUntil(d) { return Math.ceil((d - new Date()) / DAY) }
function nextVatDue() {
  // demo profile assumption: quarterly VAT periods; return due 28 days after period end
  const now = new Date()
  for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
    for (const m of [2, 5, 8, 11]) { // Mar, Jun, Sep, Dec (0-indexed)
      const end = new Date(y, m + 1, 0)
      const due = new Date(end.getTime() + 28 * DAY)
      if (due >= now) return { end, due }
    }
  }
}

function PositionCard() {
  const vat = nextVatDue()
  const now = new Date()
  // demo profile assumption: calendar financial year → CT return due 9 months after FY end
  const fy = now > new Date(now.getFullYear(), 8, 30) ? now.getFullYear() : now.getFullYear() - 1
  const ctDue = new Date(fy + 1, 8, 30)
  const Days = ({ d }) => (
    <span className={`due ${daysUntil(d) <= 30 ? 'soon' : ''}`}>
      {fmtDate(d)} · {daysUntil(d)} day{daysUntil(d) === 1 ? '' : 's'} left
    </span>
  )
  const rows = [
    { icon: '✓', text: <>VAT registration <b>required and in place</b> — revenue {AED(2100000)} exceeds the {AED(375000)} mandatory threshold (registered 2019)</>, cite: 'VAT-Executive-Regulation-52-2017 | Article 7' },
    { icon: '⏱', text: <>Next VAT return (quarterly period ending {fmtDate(vat.end)}): <Days d={vat.due} /></>, cite: 'VAT-Executive-Regulation-52-2017 | Article 64',
      penalty: <>if missed: administrative penalties apply (amounts set by Cabinet Decision 40/2017 — not yet in corpus)</>, penCite: 'VAT-Law-8-2017 | Article 76' },
    { icon: '⏱', text: <>Corporate Tax return FY{fy}: <Days d={ctDue} /> (9 months after financial-year end)</>, cite: 'Corporate-Tax-Law-47-2022 | Article 53',
      penalty: <>if missed: AED 500/month (first 12 months), then AED 1,000/month; unpaid tax accrues 14% p.a., charged monthly</>, penCite: 'Cabinet-Decision-75-2023-CT-Penalties | Table item 7 · Table item 8' },
    { icon: '✓', text: <><b>Small Business Relief — eligible to elect</b>: revenue {AED(2100000)} is under the {AED(3000000)} threshold</>, cite: 'Corporate-Tax-Law-47-2022 | Article 21 · CT-General-Guide-CTGGCT1 | Article 40' },
    { icon: '§', text: <>Corporate Tax exposure without relief: 0% band, then 9% on taxable income above it</>, cite: 'Corporate-Tax-Law-47-2022 | Article 3' },
    { icon: '⚠', text: <>Missed filings trigger an administrative penalty assessment</>, cite: 'VAT-Law-8-2017 | Article 76 · Corporate-Tax-Law-47-2022 | Article 60' },
  ]
  return (
    <section className="position">
      <div className="position-head">
        <span className="position-title">Compliance position — Al Noor Trading LLC</span>
        <span className="position-tag">deterministic · no model involved</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="position-row" style={{ animationDelay: `${i * 0.12}s` }}>
          <span className="position-icon">{r.icon}</span>
          <span>
            {r.text} <span className="cite">{r.cite}</span>
            {r.penalty && (
              <span className="position-penalty">{r.penalty} <span className="cite">{r.penCite}</span></span>
            )}
          </span>
        </div>
      ))}
      <div className="position-foot">
        Computed from the company profile and the cited law. Assumes calendar financial year and quarterly
        VAT periods (demo profile). Compliance assistance, not tax advice.
      </div>
    </section>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [statuses, setStatuses] = useState([])
  const [invoice, setInvoice] = useState(null)
  const [invoiceLog, setInvoiceLog] = useState([])   // A4: EVERY check this session
  const [demoCompany, setDemoCompany] = useState(false)
  const [lawView, setLawView] = useState(null)
  const [meta, setMeta] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function statusLabel(ev) {
    if (ev.tool === 'search_regulations') return `⚖ Searching the law: “${ev.args?.query || ''}”`
    if (ev.tool === 'vat_calculator') return '🧮 Calculating VAT (deterministic)…'
    if (ev.tool === 'verify_citations') return '✓ Verifying citations against the retrieved law…'
    return `→ ${ev.tool}…`
  }

  function typeOut(final) {
    return new Promise((resolve) => {
      setMessages((m) => [...m, { role: 'bot', ...final, at: new Date().toISOString(), answer: '' }])
      const text = final.answer || ''
      let i = 0
      const step = Math.max(3, Math.floor(text.length / 120))
      const t = setInterval(() => {
        i = Math.min(text.length, i + step)
        setMessages((m) => {
          const c = [...m]
          c[c.length - 1] = { ...c[c.length - 1], answer: text.slice(0, i) }
          return c
        })
        if (i >= text.length) { clearInterval(t); resolve() }
      }, 24)
    })
  }

  async function askBlocking(question, history) {
    const res = await fetch(`${API}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, company: demoCompany ? companyContext() : null }),
    })
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
    return res.json()
  }

  async function ask(q) {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    const history = messages.map((m) =>
      m.role === 'user'
        ? { role: 'user', content: m.text }
        : { role: 'assistant', content: m.answer || '' }
    )
    setMessages((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    setStatuses([])
    try {
      let final = null
      try {
        // streaming path: watch the agent work in real time
        const res = await fetch(`${API}/ask/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history, company: demoCompany ? companyContext() : null }),
        })
        if (!res.ok || !res.body) throw new Error('stream unavailable')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop()
          for (const p of parts) {
            const line = p.trim()
            if (!line.startsWith('data:')) continue
            const ev = JSON.parse(line.slice(5))
            if (ev.type === 'status') setStatuses((s) => [...s, ev])
            else if (ev.type === 'final') final = ev
            else if (ev.type === 'error') throw new Error(ev.detail)
          }
        }
        if (!final) throw new Error('stream ended unexpectedly')
      } catch {
        final = await askBlocking(question, history) // graceful fallback to non-streaming
      }
      if (final.meta) setMeta(final.meta)
      setStatuses([])
      await typeOut(final)
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', answer: `Error: ${e.message}`, error: true }])
    } finally {
      setStatuses([])
      setBusy(false)
    }
  }

  function exportReport() {
    const qa = []
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user' && messages[i + 1]?.role === 'bot') {
        qa.push({ q: messages[i].text, a: messages[i + 1] })
      }
    }
    if (!qa.length && !invoiceLog.length) return
    const when = new Date().toLocaleString('en-AE', { dateStyle: 'long', timeStyle: 'short' })
    const cites = (t) => [...new Set((t || '').match(/\[[^\]]+\|[^\]]+\]/g) || [])]
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Mizan — Compliance Working Paper</title><style>
      body{font-family:Georgia,serif;color:#1f2621;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.55}
      .head{border-bottom:3px solid #0f6b5c;padding-bottom:16px;margin-bottom:28px}
      h1{font-size:25px;margin:0;color:#0a4a40} .sub{color:#5c6660;font-size:13px;margin-top:6px}
      .qa{margin-bottom:30px;page-break-inside:avoid} .q{font-weight:bold;font-size:15px;color:#0a4a40;margin-bottom:6px}
      .a{font-size:14px} .meta{font-size:11.5px;color:#5c6660;margin-top:8px}
      .cite{display:inline-block;background:#e3f0ed;color:#0a4a40;border-radius:4px;padding:1px 7px;font-size:11px;margin:2px 4px 0 0;font-family:Arial}
      .abstained{color:#b05010;font-weight:bold;font-size:12px}
      .verified{color:#0f6b5c;font-weight:bold;font-size:12px}
      .law{border:1px solid #cfe0db;border-left:4px solid #0f6b5c;background:#f6faf9;padding:10px 14px;margin:8px 0;font-size:12px;white-space:pre-wrap;page-break-inside:avoid}
      .law-h{font-family:Arial;font-size:11px;color:#0a4a40;font-weight:bold;margin:10px 0 4px}
      table{border-collapse:collapse;font-size:13px} td{padding:3px 18px 3px 0}
      .prov{margin-top:34px;border:1px solid #ccc;padding:14px 18px;font-size:12px}
      .prov b{color:#0a4a40}
      .sig{margin-top:26px;page-break-inside:avoid} .sig td{padding:14px 40px 4px 0;border-bottom:1px solid #999;min-width:220px;font-size:12px}
      .sig .lbl{border:none;padding:2px 0 12px;color:#5c6660;font-size:11px}
      .foot{margin-top:36px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#5c6660;font-style:italic}
      .amber{color:#9a6b00;font-weight:bold;font-size:12px}
      @page{size:A4;margin:16mm}
      @media print {.noprint{display:none}}
    </style></head><body>
    <div class="head"><h1>&#1605;&#1610;&#1586;&#1575;&#1606; Mizan — Compliance Working Paper (Audit Defence File)</h1>
    <div class="sub">${demoCompany ? 'Company: Al Noor Trading LLC (demo profile) · ' : ''}Generated ${esc(when)} · ${qa.length} position${qa.length === 1 ? '' : 's'}${invoiceLog.length ? ` · ${invoiceLog.length} invoice check${invoiceLog.length === 1 ? '' : 's'}` : ''}</div>
    <div class="sub">Purpose: if the FTA queries any position below, this file documents the question asked, the answer relied upon, and the verbatim law it was grounded in at the time.</div></div>`
    qa.forEach(({ q, a }, i) => {
      const c = cites(a.answer)
      const searches = (a.tool_trace || []).filter((t) => t.tool === 'search_regulations').length
      const at = a.at ? new Date(a.at).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' }) : when
      html += `<div class="qa"><div class="q">Position ${i + 1}. ${esc(q)}</div><div class="a">${md(a.answer)}</div><div class="meta">`
      if (a.abstained) html += `<span class="abstained">DECLINED TO ANSWER — referred to a professional</span>`
      else {
        html += c.map((x) => `<span class="cite">${esc(x.replace(/[[\]]/g, ''))}</span>`).join('')
        html += `<br/>Retrieved &amp; answered ${esc(at)} · searched the law ${searches}&times;` + (a.verified === true ? ` · <span class="verified">&#10003; independently verified against retrieved law text</span>` : '')
      }
      html += `</div>`
      // verbatim law relied upon — the audit defence core
      const lawBlocks = []
      for (const x of c) {
        for (const t of findLaw(a.retrieved, x.replace(/[[\]]/g, ''))) {
          if (!lawBlocks.includes(t)) lawBlocks.push(t)
        }
      }
      if (lawBlocks.length) {
        html += `<div class="law-h">LAW RELIED UPON (verbatim, as retrieved)</div>`
        for (const t of lawBlocks) html += `<div class="law">${esc(t)}</div>`
      } else if (c.length) {
        html += `<div class="meta">Full retrieved law text retained in the application audit trail.</div>`
      }
      html += `</div>`
    })
    // A4: EVERY invoice check of the session, in order, with three-state results
    invoiceLog.forEach((chk, n) => {
      const inv = chk.invoice
      const rows = buildChecklist(chk)
      const reds = rows.filter((r) => r.ok === false).length
      const ambers = rows.filter((r) => r.ok === 'amber').length
      const at = chk.at ? new Date(chk.at).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' }) : when
      html += `<div class="qa"><div class="q">Invoice check ${n + 1} of ${invoiceLog.length} — ${esc(inv.supplier)}${chk.filename ? ` <span style="font-weight:normal;color:#5c6660">(${esc(chk.filename)})</span>` : ''}</div>
      <div class="meta">Checked ${esc(at)}</div>
      <table><tr><td>TRN</td><td>${esc(inv.trn || '—')}</td></tr><tr><td>Date</td><td>${esc(inv.date || '—')}</td></tr>
      <tr><td>Subtotal</td><td>${inv.subtotal} ${esc(inv.currency)}</td></tr><tr><td>VAT</td><td>${inv.vat} ${esc(inv.currency)}</td></tr>
      <tr><td><b>Total</b></td><td><b>${inv.total} ${esc(inv.currency)}</b></td></tr></table>
      <div class="law-h">ARTICLE 59 CHECKLIST</div><div class="meta">`
      rows.forEach((r) => {
        html += `${r.ok === true ? '&#10003;' : r.ok === false ? '&#10007;' : r.ok === 'amber' ? '&#9681;' : '·'} ${esc(r.label)}` +
          ((r.ok === false || r.ok === 'amber') ? ` — ${esc(r.fail)} <span class="cite">${esc(r.cite)}</span>` : '') + `<br/>`
      })
      html += `</div><div class="meta">${reds ? `<span class="abstained">&#10007; ${reds} BREACH${reds > 1 ? 'ES' : ''} — HELD FOR HUMAN REVIEW</span>`
        : ambers ? '<span class="amber">&#9681; ZERO-RATING CLAIMED — VERIFY EXPORT EVIDENCE</span>'
        : '<span class="verified">&#10003; PASSES THE ARTICLE 59 CHECKLIST</span>'}</div></div>`
    })
    html += `<div class="prov"><b>Provenance.</b> Generated by Mizan v${esc(meta?.app_version || '0.2.0')} ·
      model: ${esc(meta?.model || 'n/a')} · corpus: ${meta?.corpus_chunks || '678'} article-aware chunks (version ${esc(meta?.corpus_version || 'n/a')}) of UAE tax law and FTA guides ·
      arithmetic by deterministic calculator, never the model · every citation retrieval-verified or visibly flagged · every answer cited or declined.</div>
    <table class="sig"><tr><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr class="lbl"><td class="lbl">Prepared by (accountant)</td><td class="lbl">Date</td></tr>
    <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
    <tr class="lbl"><td class="lbl">Reviewed by (licensed tax agent)</td><td class="lbl">Signature</td></tr></table>
    <div class="foot">Mizan provides compliance assistance, not tax advice; material positions should be confirmed with a licensed tax professional before filing. Full tool-level audit trails are retained in the application.</div>
    <div class="noprint" style="margin-top:20px"><button onclick="window.print()" style="padding:10px 22px;font-size:14px;background:#0f6b5c;color:#fff;border:none;border-radius:8px;cursor:pointer">Print / Save as PDF</button></div>
    </body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  async function uploadInvoice(file) {
    if (!file) return
    setBusy(true)
    setInvoice({ loading: true })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/extract-invoice`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      const data = await res.json()
      data.filename = file.name
      data.at = new Date().toISOString()
      setInvoice(data)
      if (data.invoice) setInvoiceLog((l) => [...l, data])
    } catch (e) {
      setInvoice({ warning: `Error: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  async function loadSample(s) {
    if (busy) return
    try {
      const res = await fetch(`/samples/${s.file}`)
      const blob = await res.blob()
      uploadInvoice(new File([blob], s.file, { type: 'image/png' }))
    } catch { /* sample missing — ignore */ }
  }

  function downloadInvoiceCsv() {
    const inv = invoice?.invoice
    if (!inv) return
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Mizan invoice check', new Date().toISOString()],
      ['Supplier', inv.supplier], ['TRN', inv.trn || 'MISSING'], ['Date', inv.date || '—'],
      ['Currency', inv.currency],
      [],
      ['Line item', 'Qty', 'Unit price', 'Amount'],
      ...(inv.line_items || []).map((l) => [l.description, l.qty, l.unit_price, l.amount]),
      [],
      ['Subtotal', inv.subtotal], ['VAT', inv.vat], ['Total', inv.total],
      [],
      ['Article 59 checklist', 'Result', 'Detail', 'Citation'],
      ...buildChecklist(invoice).map((r) => [r.label,
        r.ok === true ? 'PASS' : r.ok === false ? 'FAIL' : 'UNVERIFIED',
        r.ok === false ? r.fail : '', r.cite]),
    ]
    const csv = rows.map((r) => (r || []).map(esc).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = `mizan-invoice-check-${(inv.supplier || 'invoice').replace(/\W+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'))
    if (f && !busy) uploadInvoice(f)
  }

  return (
    <div className={`wrap ${dragging ? 'dragging' : ''}`}
         onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
         onDragLeave={(e) => { if (e.target === e.currentTarget) setDragging(false) }}
         onDrop={onDrop}>
      {dragging && <div className="dropveil">Drop the invoice — I&apos;ll run the Article 59 checklist</div>}
      <header>
        <div className="brand">
          <div className="logo">⚖</div>
          <div>
            <h1>Mizan <span className="brand-ar">ميزان</span></h1>
            <p className="tagline">The UAE tax copilot that cites the law — or refuses to guess.</p>
          </div>
        </div>
        <div className="header-pills">
          <span className="pill">⚖ Grounded in 6 FTA sources</span>
          <span className="pill">✓ Self-verifying</span>
          <span className="pill">📄 Audit-ready</span>
          <span className="pill disclaimer-pill">Compliance assistance, not tax advice</span>
        </div>
        <label className="company-toggle">
          <input type="checkbox" checked={demoCompany} onChange={(e) => setDemoCompany(e.target.checked)} />
          🏢 Answer as <b>Al Noor Trading LLC</b> (demo company profile)
        </label>
      </header>

      {demoCompany && <PositionCard />}

      {messages.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} dir="auto" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <main>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg user" dir="auto">{m.text}</div>
          ) : (
            <div key={i} className={`msg bot ${m.error ? 'error' : ''} ${m.abstained ? 'abstained' : ''}`}>
              {m.abstained && <div className="badge">Declined to guess</div>}
              <div className="answer" dir="auto" dangerouslySetInnerHTML={{ __html: mdToHtml(m.answer) }} />
              {m.abstained && (
                <a className="escalate" href={escalateHref(
                  `Tax question for review (via Mizan): ${messages[i - 1]?.text || 'question'}`,
                  `Question:\n${messages[i - 1]?.text || ''}\n\nMizan declined to answer this from the law it has ` +
                  `(${new Date(m.at || Date.now()).toLocaleString('en-AE')}) and recommends professional review.\n\n` +
                  `Mizan's response:\n${m.answer}\n\n— Sent from Mizan, the UAE tax-compliance copilot. Compliance assistance, not tax advice.`)}>
                  ⤴ Escalate to a tax professional
                </a>
              )}
              {!m.error && m.tool_trace?.some((t) => t.tool === 'search_regulations') && (
                <div className="grounding" dir="ltr">
                  ⚖ Searched the law {m.tool_trace.filter((t) => t.tool === 'search_regulations').length}× before answering
                </div>
              )}
              {!m.error && <Citations text={m.answer} retrieved={m.retrieved} unverified={m.unverified_cites} onOpen={setLawView} />}
              {!m.error && <Trace trace={m.tool_trace} />}
            </div>
          )
        )}
        {busy && (
          <div className="msg bot thinking">
            {statuses.length === 0 && 'thinking…'}
            {statuses.map((s, i) => (
              <div key={i} className="status-line">{statusLabel(s)}</div>
            ))}
          </div>
        )}
      </main>

      <div className="inputrow">
        <input
          dir="auto"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about UAE Corporate Tax or VAT…"
          disabled={busy}
        />
        <button onClick={() => ask()} disabled={busy || !input.trim()}>Ask</button>
        <button className="ghost" onClick={() => fileRef.current.click()} disabled={busy}
                title="Or just drag & drop an invoice image anywhere">
          Check invoice
        </button>
        <button className="ghost" onClick={exportReport}
          disabled={busy || (messages.filter((m) => m.role === 'bot').length === 0 && !invoiceLog.length)}
          title="Export this session as an audit defence working paper">
          📄 Audit file
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden
               onChange={(e) => uploadInvoice(e.target.files[0])} />
      </div>

      <div className="samples" dir="ltr">
        <span className="samples-label">Test the invoice checker:</span>
        {SAMPLES.map((s) => (
          <button key={s.file} onClick={() => loadSample(s)} disabled={busy}>{s.label}</button>
        ))}
      </div>

      {invoice && !invoice.loading && (
        <section className="invoice">
          <h3>Invoice check {invoice.consistent === false && <span className="warn">⚠ needs review</span>}</h3>
          {invoice.warning && !invoice.invoice && <p className="warn">{invoice.warning}</p>}
          {invoice.invoice && (
            <div className="invoice-cols">
              <table>
                <tbody>
                  <tr><td>Supplier</td><td>{invoice.invoice.supplier}</td></tr>
                  <tr><td>TRN</td><td>{invoice.invoice.trn || '—'}</td></tr>
                  <tr><td>Date</td><td>{invoice.invoice.date || '—'}</td></tr>
                  <tr><td>Subtotal</td><td>{invoice.invoice.subtotal} {invoice.invoice.currency}</td></tr>
                  <tr><td>VAT</td><td>{invoice.invoice.vat} {invoice.invoice.currency}</td></tr>
                  <tr><td><b>Total</b></td><td><b>{invoice.invoice.total} {invoice.invoice.currency}</b></td></tr>
                </tbody>
              </table>
              <InvoiceChecklist data={invoice} />
            </div>
          )}
          {invoice.invoice && (() => {
            const rows = buildChecklist(invoice)
            const fails = rows.filter((r) => r.ok === false || r.ok === 'amber')
            return (
              <div className="invoice-actions">
                <button className="csv-btn" onClick={downloadInvoiceCsv}
                        title="Download the extraction + Article 59 checklist as CSV (opens in Excel)">
                  ⬇ Export for Excel
                </button>
                {fails.length > 0 && (
                  <a className="escalate" href={escalateHref(
                    `Invoice held for review (via Mizan): ${invoice.invoice.supplier}`,
                    `Invoice from ${invoice.invoice.supplier} (${invoice.invoice.date || 'no date'}) failed ` +
                    `${fails.length} check${fails.length > 1 ? 's' : ''} on the Article 59 tax-invoice checklist:\n\n` +
                    fails.map((f) => `✗ ${f.label} — ${f.fail} [${f.cite}]`).join('\n') +
                    `\n\nTotals: subtotal ${invoice.invoice.subtotal}, VAT ${invoice.invoice.vat}, total ${invoice.invoice.total} ${invoice.invoice.currency}.` +
                    `\n\n— Sent from Mizan, the UAE tax-compliance copilot. Compliance assistance, not tax advice.`)}>
                    ⤴ Escalate to a tax professional
                  </a>
                )}
              </div>
            )
          })()}
        </section>
      )}

      <LawModal view={lawView} onClose={() => setLawView(null)} />

      <footer>Built by Team Mizan · SP Jain MAIB 2026 · answers cite FTA sources or abstain</footer>
    </div>
  )
}
