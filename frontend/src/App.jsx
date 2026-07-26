import { useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  const [invoice, setInvoice] = useState(null)
  const fileRef = useRef()

  async function ask(q) {
    const question = (q ?? input).trim()
    if (!question || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    try {
      const res = await fetch(`${API}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText)
      const data = await res.json()
      setMessages((m) => [...m, { role: 'bot', ...data }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', answer: `Error: ${e.message}`, error: true }])
    } finally {
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
              <div className="answer">{m.answer}</div>
              {!m.error && <Citations text={m.answer} />}
              {!m.error && <Trace trace={m.tool_trace} />}
            </div>
          )
        )}
        {busy && <div className="msg bot thinking">thinking…</div>}
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
