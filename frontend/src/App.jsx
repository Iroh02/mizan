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
  const fileRef = useRef()

  function statusLabel(ev) {
    if (ev.tool === 'search_regulations') return `⚖ Searching the law: “${ev.args?.query || ''}”`
    if (ev.tool === 'vat_calculator') return '🧮 Calculating VAT (deterministic)…'
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
      body: JSON.stringify({ question, history }),
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
          body: JSON.stringify({ question, history }),
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
