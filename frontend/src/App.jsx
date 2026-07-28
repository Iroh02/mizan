import { useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function mdToHtml(s) {
  // minimal, safe rendering of the model's markdown: escape HTML first, then format
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^#{1,4}\s*(.*)$/gm, '<b>$1</b>')
    .replace(/^\s*[-*•]\s+(.*)$/gm, '&nbsp;&nbsp;• $1')
    .replace(/\n/g, '<br/>')
}

const DEMO_COMPANY =
  'Al Noor Trading LLC — mainland Dubai trading company (electronics), ~AED 2.1M annual revenue, ' +
  'VAT-registered since 2019, Corporate Tax registered 2024, 8 employees, imports from China, exports to Saudi Arabia.'

const SUGGESTIONS = [
  'What is the corporate tax rate for income above AED 375,000?',
  'My revenue is AED 300,000 — do I need to register for corporate tax?',
  'How much VAT is due on a 12,500 AED invoice?',
  'ما هي نسبة ضريبة القيمة المضافة في الإمارات؟',
]

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

function Citations({ text, retrieved, onOpen }) {
  // renders [doc | Article N] citation tags found in the answer as chips
  const cites = [...new Set(text.match(/\[[^\]]+\|[^\]]+\]/g) || [])]
  if (!cites.length) return null
  return (
    <div className="cites" dir="ltr">
      {cites.map((c) => {
        const inner = c.replace(/[[\]]/g, '')
        const law = findLaw(retrieved, inner)
        return law.length ? (
          <button key={c} className="cite clickable" title="Read the law text this cites"
                  onClick={() => onOpen({ cite: inner, texts: law })}>
            {inner} <span className="cite-eye">§</span>
          </button>
        ) : (
          <span key={c} className="cite">{inner}</span>
        )
      })}
    </div>
  )
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
        <div className="modal-sub">Verbatim text retrieved from the corpus — exactly what the model was shown before answering.</div>
        {view.texts.map((t, i) => (
          <pre key={i} className="law-text">{t}</pre>
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
    {
      label: 'VAT charged at the standard 5% rate',
      ok: vatPct === null ? null : Math.abs(vatPct - 5) < 0.11,
      cite: 'VAT-Law-8-2017 | Article 3',
      fail: vatPct === null ? 'Could not compute the applied rate.'
        : `VAT applied at ${vatPct.toFixed(2)}% of the subtotal — the standard rate is 5%.`,
    },
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
  return (
    <div className="checklist">
      <div className="checklist-title">Article 59 tax-invoice checklist</div>
      {rows.map((r, i) => (
        <div key={r.label} className={`check-row ${r.ok === false ? 'bad' : r.ok === null ? 'meh' : 'good'}`}
             style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
          <span className="check-mark">{r.ok === true ? '✓' : r.ok === false ? '✗' : '·'}</span>
          <span className="check-body">
            {r.label}
            {r.ok === false && (
              <span className="check-fail"> — {r.fail} <span className="cite">{r.cite}</span></span>
            )}
            {r.ok === null && <span className="check-unknown"> — could not verify from the image</span>}
          </span>
        </div>
      ))}
      <div className={`check-verdict ${fails ? 'bad' : 'good'}`}
           style={{ animationDelay: `${0.35 + rows.length * 0.35}s` }}>
        {fails
          ? `✗ ${fails} breach${fails > 1 ? 'es' : ''} of Article 59 — hold this invoice for review`
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
    { icon: '⏱', text: <>Next VAT return (quarterly period ending {fmtDate(vat.end)}): <Days d={vat.due} /></>, cite: 'VAT-Executive-Regulation-52-2017 | Article 64' },
    { icon: '⏱', text: <>Corporate Tax return FY{fy}: <Days d={ctDue} /> (9 months after financial-year end)</>, cite: 'Corporate-Tax-Law-47-2022 | Article 53' },
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
          <span>{r.text} <span className="cite">{r.cite}</span></span>
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
      body: JSON.stringify({ question, history, company: demoCompany ? DEMO_COMPANY : null }),
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
          body: JSON.stringify({ question, history, company: demoCompany ? DEMO_COMPANY : null }),
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
    if (!qa.length && !invoice?.invoice) return
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
      @media print {.noprint{display:none}}
    </style></head><body>
    <div class="head"><h1>&#1605;&#1610;&#1586;&#1575;&#1606; Mizan — Compliance Working Paper (Audit Defence File)</h1>
    <div class="sub">${demoCompany ? 'Company: Al Noor Trading LLC (demo profile) · ' : ''}Generated ${esc(when)} · ${qa.length} position${qa.length === 1 ? '' : 's'}${invoice?.invoice ? ' · 1 invoice check' : ''}</div>
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
    if (invoice?.invoice) {
      const inv = invoice.invoice
      const rows = buildChecklist(invoice)
      html += `<div class="qa"><div class="q">Invoice check — ${esc(inv.supplier)}</div>
      <table><tr><td>TRN</td><td>${esc(inv.trn || '—')}</td></tr><tr><td>Date</td><td>${esc(inv.date || '—')}</td></tr>
      <tr><td>Subtotal</td><td>${inv.subtotal} ${esc(inv.currency)}</td></tr><tr><td>VAT</td><td>${inv.vat} ${esc(inv.currency)}</td></tr>
      <tr><td><b>Total</b></td><td><b>${inv.total} ${esc(inv.currency)}</b></td></tr></table>
      <div class="law-h">ARTICLE 59 CHECKLIST</div><div class="meta">`
      rows.forEach((r) => {
        html += `${r.ok === true ? '&#10003;' : r.ok === false ? '&#10007;' : '·'} ${esc(r.label)}` +
          (r.ok === false ? ` — ${esc(r.fail)} <span class="cite">${esc(r.cite)}</span>` : '') + `<br/>`
      })
      html += `</div><div class="meta">${invoice.consistent === false ? '<span class="abstained">&#9888; HELD FOR HUMAN REVIEW</span>' : ''}</div></div>`
    }
    html += `<div class="prov"><b>Provenance.</b> Generated by Mizan v${esc(meta?.app_version || '0.1.0')} ·
      model: ${esc(meta?.model || 'n/a')} · corpus: ${meta?.corpus_chunks || '678'} article-aware chunks of UAE tax law and FTA guides ·
      arithmetic by deterministic calculator, never the model · every answer cited or declined.</div>
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
      setInvoice(await res.json())
    } catch (e) {
      setInvoice({ warning: `Error: ${e.message}` })
    } finally {
      setBusy(false)
    }
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
              {!m.error && m.tool_trace?.some((t) => t.tool === 'search_regulations') && (
                <div className="grounding" dir="ltr">
                  ⚖ Searched the law {m.tool_trace.filter((t) => t.tool === 'search_regulations').length}× before answering
                </div>
              )}
              {!m.error && <Citations text={m.answer} retrieved={m.retrieved} onOpen={setLawView} />}
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
          disabled={busy || (messages.filter((m) => m.role === 'bot').length === 0 && !invoice?.invoice)}
          title="Export this session as an audit defence working paper">
          📄 Audit file
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden
               onChange={(e) => uploadInvoice(e.target.files[0])} />
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
        </section>
      )}

      <LawModal view={lawView} onClose={() => setLawView(null)} />

      <footer>Built by Team Mizan · SP Jain MAIB 2026 · answers cite FTA sources or abstain</footer>
    </div>
  )
}
