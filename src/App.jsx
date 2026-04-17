import { useState, useEffect, useCallback } from 'react'

const WEBHOOK_URL = 'https://n8n.srv1287058.hstgr.cloud/webhook/dashboard'

function today() {
  return fmt(new Date())
}

function fmt(d) {
  return d.toISOString().slice(0, 10)
}

function getPresetRange(preset) {
  const t = new Date()
  if (preset === 'Today') {
    const d = today()
    return { start: d, end: d }
  }
  if (preset === 'This Week') {
    const mon = new Date(t)
    const day = t.getDay() === 0 ? 6 : t.getDay() - 1
    mon.setDate(t.getDate() - day)
    return { start: fmt(mon), end: today() }
  }
  if (preset === 'This Month') {
    return {
      start: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`,
      end: today()
    }
  }
  if (preset === 'Last Month') {
    const first = new Date(t.getFullYear(), t.getMonth() - 1, 1)
    const last = new Date(t.getFullYear(), t.getMonth(), 0)
    return { start: fmt(first), end: fmt(last) }
  }
  return null
}

function rateColor(val) {
  const n = parseInt(val)
  if (isNaN(n)) return { bg: '#f3f4f6', text: '#6b7280' }
  if (n >= 70) return { bg: '#dcfce7', text: '#16a34a' }
  if (n >= 40) return { bg: '#fef9c3', text: '#ca8a04' }
  return { bg: '#fee2e2', text: '#dc2626' }
}

function StatCard({ label, value, subtitle }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{subtitle}</div>
      )}
    </div>
  )
}

function RateBadge({ value }) {
  const { bg, text } = rateColor(value)
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 20,
      background: bg,
      color: text,
      fontSize: '0.875rem',
      fontWeight: 600,
    }}>{value}</span>
  )
}

export default function App() {
  const [preset, setPreset] = useState('This Month')
  const [startDate, setStartDate] = useState(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(today)
  const [allData, setAllData] = useState(null)
  const [selectedUser, setSelectedUser] = useState('all')
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
      setAllData(payload)
      setLastUpdated(new Date())
    } catch (e) {
      setError('Could not load data. Make sure your n8n workflow is active.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const range = getPresetRange('This Month')
    fetchData(range.start, range.end)
  }, [])

  useEffect(() => {
    const id = setInterval(() => fetchData(startDate, endDate), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [startDate, endDate, fetchData])

  function handlePreset(p) {
    setPreset(p)
    if (p !== 'Custom') {
      const range = getPresetRange(p)
      setStartDate(range.start)
      setEndDate(range.end)
      fetchData(range.start, range.end)
    }
  }

  const results = allData?.results || []
  const userOptions = [{ userId: 'all', name: 'All Closers' }, ...results]
  const filtered = selectedUser === 'all' ? results : results.filter(r => r.userId === selectedUser)

  const totals = filtered.reduce((acc, r) => ({
    demosSet: acc.demosSet + r.demosSet,
    demosConducted: acc.demosConducted + r.demosConducted,
    onboardingsBooked: acc.onboardingsBooked + r.onboardingsBooked,
    trialsClosed: acc.trialsClosed + r.trialsClosed,
  }), { demosSet: 0, demosConducted: 0, onboardingsBooked: 0, trialsClosed: 0 })

  const showRate = totals.demosSet > 0 ? Math.round((totals.demosConducted / totals.demosSet) * 100) + '%' : '0%'
  const closeRate = totals.demosConducted > 0 ? Math.round((totals.onboardingsBooked / totals.demosConducted) * 100) + '%' : '0%'
  const obTrialRate = totals.onboardingsBooked > 0 ? Math.round((totals.trialsClosed / totals.onboardingsBooked) * 100) + '%' : '0%'

  const presets = ['Today', 'This Week', 'This Month', 'Last Month', 'Custom']

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 56,
        gap: 12,
      }}>
        {lastUpdated && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={() => fetchData(startDate, endDate)}
          disabled={loading}
          style={{
            background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
            padding: '8px 16px', fontSize: '0.875rem', color: '#374151',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
          }}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={{
              border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 14px',
              fontSize: '0.875rem', color: '#374151', background: '#fff',
              cursor: 'pointer', outline: 'none', minWidth: 160,
            }}
          >
            {userOptions.map(u => (
              <option key={u.userId} value={u.userId}>{u.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {presets.map((p, i) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                style={{
                  padding: '9px 16px', border: 'none',
                  borderRight: i < presets.length - 1 ? '1px solid #d1d5db' : 'none',
                  background: preset === p ? '#111827' : '#fff',
                  color: preset === p ? '#fff' : '#374151',
                  fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {preset === 'Custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', color: '#374151', background: '#fff', outline: 'none' }}
              />
              <span style={{ color: '#9ca3af' }}>→</span>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: '0.875rem', color: '#374151', background: '#fff', outline: 'none' }}
              />
              <button
                onClick={() => fetchData(startDate, endDate)}
                style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', color: '#dc2626', marginBottom: 24, fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Demo's Booked" value={loading ? '...' : totals.demosSet} />
          <StatCard label="Demo's Conducted" value={loading ? '...' : totals.demosConducted} />
          <StatCard label="Onboarding's Booked" value={loading ? '...' : totals.onboardingsBooked} />
          <StatCard label="Trials Closed" value={loading ? '...' : totals.trialsClosed} />
          <StatCard label="Show Rate" value={loading ? '...' : showRate} subtitle="Conducted / Booked" />
          <StatCard label="Close Rate" value={loading ? '...' : closeRate} subtitle="Onboardings / Conducted" />
          <StatCard label="OB → Trial Rate" value={loading ? '...' : obTrialRate} subtitle="Trials / Onboardings" />
        </div>

        {selectedUser === 'all' && results.length > 1 && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Leaderboard</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Closer', 'Demos Set', 'Demos Done', 'Onboardings', 'Trials', 'Show Rate', 'Close Rate', 'OB→Trial'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: i === 0 ? 'left' : 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...results].sort((a, b) => b.trialsClosed - a.trialsClosed).map((row, i) => (
                  <tr key={row.userId} style={{ borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 85%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 30%)`, flexShrink: 0 }}>
                          {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{row.name}</span>
                        {i === 0 && <span style={{ fontSize: '0.7rem', background: '#fef9c3', color: '#ca8a04', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Top</span>}
                      </div>
                    </td>
                    {[row.demosSet, row.demosConducted, row.onboardingsBooked, row.trialsClosed].map((v, j) => (
                      <td key={j} style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>{v}</td>
                    ))}
                    {[row.showRate, row.closeRate, row.obToTrialRate].map((v, j) => (
                      <td key={j} style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <RateBadge value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
            No data found for this period.
          </div>
        )}

      </div>
    </div>
  )
}
