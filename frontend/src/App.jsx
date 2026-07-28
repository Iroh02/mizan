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
  'What is Small Business Relief and do I qualify?',
]

function Citations({ text }) {
  // renders [doc | Article N] citation tags found in the answer as chips
  const cites = [...new Set(text.match(/\[[^\]]+\|[^\]]+\]/g) || [])]
  if (!cites.length) return null
  return (
    <div className="cites">
      {cites.map((c) => <span key={c} className="cite">{c.replace(/[[\]]/g, '')}</span>)}
    </div>
  )
}

function Trace({ trace }) {
  const [open, setOpen] = useState(false)
  if (!trace?.length) return null
  return (
    <div className="trace">
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

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [statuses, setStatuses] = useState([])
  const [invoice, setInvoice] = useState(null)
  const [demoCompany, setDemoCompany] = useState(false)
  const fileRef = useRef()

  function statusLabel(ev) {
    if (ev.tool === 'search_regulations') return `⚖ Searching the law: “${ev.args?.query || ''}”`
    if (ev.tool === 'vat_calculator') return '🧮 Calculating VAT (deterministic)…'
    if (ev.tool === 'verify_citations') return '✓ Verifying citations against the retrieved law…'
    return `→ ${ev.tool}…`
  }

  function typeOut(final) {
    return new Promise((resolve) => {
      setMessages((m) => [...m, { role: 'bot', ...final, answer: '' }])
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
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Mizan Compliance Session Report</title><style>
      body{font-family:Georgia,serif;color:#1f2621;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.55}
      .head{border-bottom:3px solid #0f6b5c;padding-bottom:16px;margin-bottom:28px}
      h1{font-size:26px;margin:0;color:#0a4a40} .sub{color:#5c6660;font-size:13px;margin-top:6px}
      .qa{margin-bottom:26px;page-break-inside:avoid} .q{font-weight:bold;font-size:15px;color:#0a4a40;margin-bottom:6px}
      .a{font-size:14px} .meta{font-size:11.5px;color:#5c6660;margin-top:8px}
      .cite{display:inline-block;background:#e3f0ed;color:#0a4a40;border-radius:4px;padding:1px 7px;font-size:11px;margin:2px 4px 0 0;font-family:Arial}
      .abstained{color:#b05010;font-weight:bold;font-size:12px}
      .verified{color:#0f6b5c;font-weight:bold;font-size:12px}
      table{border-collapse:collapse;font-size:13px} td{padding:3px 18px 3px 0}
      .foot{margin-top:36px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#5c6660;font-style:italic}
      @media print {.noprint{display:none}}
    </style></head><body>
    <div class="head"><h1>&#1605;&#1610;&#1586;&#1575;&#1606; Mizan — Compliance Session Report</h1>
    <div class="sub">${demoCompany ? 'Company: Al Noor Trading LLC (demo profile) · ' : ''}Generated ${esc(when)} · ${qa.length} question${qa.length === 1 ? '' : 's'}${invoice?.invoice ? ' · 1 invoice check' : ''}</div></div>`
    qa.forEach(({ q, a }, i) => {
      const c = cites(a.answer)
      const searches = (a.tool_trace || []).filter((t) => t.tool === 'search_regulations').length
      html += `<div class="qa"><div class="q">Q${i + 1}. ${esc(q)}</div><div class="a">${md(a.answer)}</div><div class="meta">`
      if (a.abstained) html += `<span class="abstained">DECLINED TO ANSWER — referred to a professional</span>`
      else {
        html += c.map((x) => `<span class="cite">${esc(x.replace(/[[\]]/g, ''))}</span>`).join('')
        html += `<br/>Searched the law ${searches}&times; before answering` + (a.verified === true ? ` · <span class="verified">&#10003; independently verified against retrieved law text</span>` : '')
      }
      html += `</div></div>`
    })
    if (invoice?.invoice) {
      const inv = invoice.invoice
      html += `<div class="qa"><div class="q">Invoice check — ${esc(inv.supplier)}</div>
      <table><tr><td>TRN</td><td>${esc(inv.trn || '—')}</td></tr><tr><td>Date</td><td>${esc(inv.date || '—')}</td></tr>
      <tr><td>Subtotal</td><td>${inv.subtotal} ${esc(inv.currency)}</td></tr><tr><td>VAT</td><td>${inv.vat} ${esc(inv.currency)}</td></tr>
      <tr><td><b>Total</b></td><td><b>${inv.total} ${esc(inv.currency)}</b></td></tr></table>
      <div class="meta">${invoice.consistent === false ? '<span class="abstained">&#9888; ARITHMETIC MISMATCH — held for human review</span>' : '<span class="verified">&#10003; arithmetic consistent (subtotal + VAT = total)</span>'}</div></div>`
    }
    html += `<div class="foot">Every answer above is either cited to specific articles of UAE law or explicitly declined. Mizan provides compliance assistance, not tax advice; material decisions should be confirmed with a licensed tax professional. Full tool-level audit trails are retained in the application.</div>
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

  return (
    <div className="wrap">
      <header>
        <h1>ميزان Mizan</h1>
        <p>UAE tax-compliance copilot for SMEs — answers cite the actual FTA law, and it refuses when unsure.</p>
        <p className="disclaimer">Compliance assistance, not tax advice.</p>
        <label className="company-toggle">
          <input type="checkbox" checked={demoCompany} onChange={(e) => setDemoCompany(e.target.checked)} />
          🏢 Answer as <b>Al Noor Trading LLC</b> (demo company profile)
        </label>
      </header>

      {messages.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <main>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg user">{m.text}</div>
          ) : (
            <div key={i} className={`msg bot ${m.error ? 'error' : ''} ${m.abstained ? 'abstained' : ''}`}>
              {m.abstained && <div className="badge">Declined to guess</div>}
              <div className="answer" dangerouslySetInnerHTML={{ __html: mdToHtml(m.answer) }} />
              {!m.error && m.tool_trace?.some((t) => t.tool === 'search_regulations') && (
                <div className="grounding">
                  ⚖ Searched the law {m.tool_trace.filter((t) => t.tool === 'search_regulations').length}× before answering
                </div>
              )}
              {!m.error && <Citations text={m.answer} />}
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask about UAE Corporate Tax or VAT…"
          disabled={busy}
        />
        <button onClick={() => ask()} disabled={busy || !input.trim()}>Ask</button>
        <button className="ghost" onClick={() => fileRef.current.click()} disabled={busy}>
          Upload invoice
        </button>
        <button className="ghost" onClick={exportReport}
          disabled={busy || (messages.filter((m) => m.role === 'bot').length === 0 && !invoice?.invoice)}
          title="Export this session as an audit-ready compliance report">
          📄 Report
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden
               onChange={(e) => uploadInvoice(e.target.files[0])} />
      </div>

      {invoice && !invoice.loading && (
        <section className="invoice">
          <h3>Invoice extraction {invoice.consistent === false && <span className="warn">⚠ needs review</span>}</h3>
          {invoice.warning && <p className="warn">{invoice.warning}</p>}
          {invoice.invoice && (
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
          )}
        </section>
      )}

      <footer>Built by Team Mizan · SP Jain MAIB 2026 · answers cite FTA sources or abstain</footer>
    </div>
  )
}
