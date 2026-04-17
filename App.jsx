import { useState, useEffect, useCallback } from 'react'

const WEBHOOK_URL = 'https://n8n.srv1287058.hstgr.cloud/webhook/dashboard'

const PRESETS = [
  { label: 'Today', getValue: () => { const t = today(); return { start: t, end: t } } },
  { label: 'This Week', getValue: () => { const t = new Date(); const mon = new Date(t); mon.setDate(t.getDate() - t.getDay() + 1); return { start: fmt(mon), end: today() } } },
  { label: 'This Month', getValue: () => { const t = new Date(); return { start: `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`, end: today() } } },
  { label: 'Custom', getValue: null },
]

function today() {
  return fmt(new Date())
}

function fmt(d) {
  return d.toISOString().slice(0, 10)
}

function rateColor(val) {
  const n = parseInt(val)
  if (n >= 70) return '#00e5a0'
  if (n >= 40) return '#f5c842'
  return '#ff5e5e'
}

function RateCell({ value }) {
  const color = rateColor(value)
  return (
    <td style={{ textAlign: 'center' }}>
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        background: color + '18',
        color: color,
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.85rem',
        fontWeight: 500,
        border: `1px solid ${color}40`,
        minWidth: 54,
      }}>{value}</span>
    </td>
  )
}

function NumCell({ value }) {
  return (
    <td style={{
      textAlign: 'center',
      fontFamily: "'DM Mono', monospace",
      fontSize: '1rem',
      fontWeight: 500,
      color: '#e8e4dc',
    }}>{value}</td>
  )
}

export default function App() {
  const [preset, setPreset] = useState(0)
  const [startDate, setStartDate] = useState(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`
  })
  const [endDate, setEndDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async (start, end) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${WEBHOOK_URL}?start_date=${start}&end_date=${end}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      const payload = Array.isArray(json) ? json[0] : json
      setData(payload)
      setLastUpdated(new Date())
    } catch (e) {
      setError('Could not load data. Check your n8n webhook is active.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(startDate, endDate)
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => fetchData(startDate, endDate), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [startDate, endDate, fetchData])

  function handlePreset(i) {
    setPreset(i)
    if (PRESETS[i].getValue) {
      const { start, end } = PRESETS[i].getValue()
      setStartDate(start)
      setEndDate(end)
      fetchData(start, end)
    }
  }

  function handleCustomSearch() {
    fetchData(startDate, endDate)
  }

  const results = data?.results || []

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0d0b',
      color: '#e8e4dc',
      fontFamily: "'Syne', sans-serif",
      padding: '0',
    }}>
      {/* Noise overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.4,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            borderBottom: '1px solid #2a2820', paddingBottom: 24, marginBottom: 8,
          }}>
            <div>
              <div style={{
                fontSize: '0.7rem', letterSpacing: '0.2em', color: '#6b6456',
                textTransform: 'uppercase', marginBottom: 8, fontFamily: "'DM Mono', monospace",
              }}>
                Home Seller Leads
              </div>
              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800,
                margin: 0, lineHeight: 1,
                background: 'linear-gradient(135deg, #e8e4dc 0%, #a09880 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}>
                Closer Dashboard
              </h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              {lastUpdated && (
                <div style={{ fontSize: '0.7rem', color: '#4a4540', fontFamily: "'DM Mono', monospace" }}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <button
                onClick={() => fetchData(startDate, endDate)}
                disabled={loading}
                style={{
                  marginTop: 8, background: 'none', border: '1px solid #2a2820',
                  color: '#6b6456', padding: '6px 14px', borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.75rem',
                  fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#e8e4dc'; e.target.style.color = '#e8e4dc' }}
                onMouseLeave={e => { e.target.style.borderColor = '#2a2820'; e.target.style.color = '#6b6456' }}
              >
                {loading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Date Controls */}
        <div style={{ marginBottom: 40, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => handlePreset(i)}
              style={{
                padding: '8px 18px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Syne', sans-serif",
                fontWeight: 600, letterSpacing: '0.05em', transition: 'all 0.2s',
                background: preset === i ? '#e8e4dc' : '#1a1916',
                color: preset === i ? '#0e0d0b' : '#6b6456',
              }}
            >
              {p.label}
            </button>
          ))}

          {preset === 3 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  background: '#1a1916', border: '1px solid #2a2820', color: '#e8e4dc',
                  padding: '7px 12px', borderRadius: 6, fontSize: '0.8rem',
                  fontFamily: "'DM Mono', monospace", outline: 'none',
                }}
              />
              <span style={{ color: '#4a4540', fontFamily: "'DM Mono', monospace" }}>→</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  background: '#1a1916', border: '1px solid #2a2820', color: '#e8e4dc',
                  padding: '7px 12px', borderRadius: 6, fontSize: '0.8rem',
                  fontFamily: "'DM Mono', monospace", outline: 'none',
                }}
              />
              <button
                onClick={handleCustomSearch}
                style={{
                  background: '#e8e4dc', color: '#0e0d0b', border: 'none',
                  padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: 700, fontFamily: "'Syne', sans-serif",
                }}
              >
                Search
              </button>
            </div>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#4a4540', fontFamily: "'DM Mono', monospace" }}>
            {startDate} → {endDate}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#ff5e5e18', border: '1px solid #ff5e5e40', borderRadius: 8,
            padding: '16px 20px', color: '#ff5e5e', marginBottom: 24,
            fontFamily: "'DM Mono', monospace", fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4a4540', fontFamily: "'DM Mono', monospace" }}>
            Loading...
          </div>
        )}

        {/* Table */}
        {results.length > 0 && (
          <div style={{
            background: '#13120f', border: '1px solid #2a2820', borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2820' }}>
                  {[
                    ['Closer', 'left'],
                    ['Demos Set', 'center'],
                    ['Demos Done', 'center'],
                    ['Onboardings', 'center'],
                    ['Trials', 'center'],
                    ['Show Rate', 'center'],
                    ['Close Rate', 'center'],
                    ['OB → Trial', 'center'],
                  ].map(([label, align]) => (
                    <th key={label} style={{
                      padding: '16px 20px', textAlign: align,
                      fontSize: '0.65rem', letterSpacing: '0.15em',
                      color: '#4a4540', textTransform: 'uppercase',
                      fontWeight: 600, fontFamily: "'DM Mono', monospace",
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results
                  .sort((a, b) => b.trialsClosed - a.trialsClosed)
                  .map((row, i) => (
                  <tr
                    key={row.userId}
                    style={{
                      borderBottom: i < results.length - 1 ? '1px solid #1e1d1a' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1916'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: `hsl(${(row.userId.charCodeAt(0) * 37) % 360}, 35%, 25%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, color: '#e8e4dc', flexShrink: 0,
                        }}>
                          {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{row.name}</div>
                          {i === 0 && results.length > 1 && (
                            <div style={{
                              fontSize: '0.6rem', color: '#f5c842', letterSpacing: '0.1em',
                              textTransform: 'uppercase', fontFamily: "'DM Mono', monospace",
                            }}>
                              ★ Top Performer
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <NumCell value={row.demosSet} />
                    <NumCell value={row.demosConducted} />
                    <NumCell value={row.onboardingsBooked} />
                    <NumCell value={row.trialsClosed} />
                    <RateCell value={row.showRate} />
                    <RateCell value={row.closeRate} />
                    <RateCell value={row.obToTrialRate} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: '80px 0',
            color: '#4a4540', fontFamily: "'DM Mono', monospace", fontSize: '0.85rem',
          }}>
            No data for this period.
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: '1px solid #1e1d1a',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: '0.65rem', color: '#2a2820', fontFamily: "'DM Mono', monospace" }}>
            Auto-refreshes every 5 minutes
          </div>
          <div style={{ fontSize: '0.65rem', color: '#2a2820', fontFamily: "'DM Mono', monospace" }}>
            🟢 ≥70% &nbsp; 🟡 40–69% &nbsp; 🔴 &lt;40%
          </div>
        </div>

      </div>
    </div>
  )
}
