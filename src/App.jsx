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

function RateBadge({ value }) {
  const { bg, text } = rateColor(value)
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      background: bg, color: text, fontSize: '0.875rem', fontWeight: 600,
    }}>{value}</span>
  )
}

function StatCard({ label, value, subtitle, highlight }) {
  return (
    <div style={{
      background: '#fff',
      border: highlight ? '1px solid #fca5a5' : '1px solid #e5e7eb',
      borderRadius: 12, padding: '24px 20px', display: 'flex',
      flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '0.875rem', color: highlight ? '#dc2626' : '#6b7280', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: highlight ? '#dc2626' : '#111827', lineHeight: 1.1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{subtitle}</div>}
    </div>
  )
}

const MEDALS = [
  { emoji: '🥇', label: '1st', bg: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)', border: '#f59e0b', accent: '#92400e' },
  { emoji: '🥈', label: '2nd', bg: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', border: '#9ca3af', accent: '#374151' },
  { emoji: '🥉', label: '3rd', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', border: '#f97316', accent: '#7c2d12' },
]

function PodiumCard({ rank, result, preset }) {
  const medal = MEDALS[rank]
  const initials = result.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hue = (result.name.charCodeAt(0) * 47) % 360

  return (
    <div style={{
      background: medal.bg,
      border: `2px solid ${medal.border}`,
      borderRadius: 16,
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      boxShadow: rank === 0 ? '0 8px 24px rgba(245,158,11,0.2)' : '0 4px 12px rgba(0,0,0,0.08)',
      transform: rank === 0 ? 'scale(1.04)' : 'scale(1)',
      transition: 'transform 0.2s',
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ fontSize: '2.5rem' }}>{medal.emoji}</div>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: `hsl(${hue}, 60%, 75%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', fontWeight: 800,
        color: `hsl(${hue}, 60%, 25%)`,
        border: `3px solid ${medal.border}`,
      }}>
        {initials}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: medal.accent }}>{result.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{medal.label} Place</div>
      </div>
      <div style={{ width: '100%', borderTop: `1px solid ${medal.border}40`, paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: 'Trials', value: result.trialsClosed },
          { label: 'Demos', value: result.demosSet },
          { label: 'Close Rate', value: result.closeRate },
          { label: 'Show Rate', value: result.showRate },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: medal.accent }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeaderboardView({ results, preset }) {
  const sorted = [...results].sort((a, b) => b.trialsClosed - a.trialsClosed)
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  if (results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
        No data found for this period.
      </div>
    )
  }

  return (
    <div>
      {/* Podium */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
          Top Performers — Ranked by Trials Closed
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {top3.map((result, i) => (
            <PodiumCard key={result.userId} rank={i} result={result} preset={preset} />
          ))}
        </div>
      </div>

      {/* Rest of the pack */}
      {rest.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Rankings
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Rank', 'Closer', 'Trials', 'Demos', 'Conducted', 'Onboardings', 'Show Rate', 'Close Rate', 'OB→Trial'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: i <= 1 ? 'left' : 'center', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rest.map((row, i) => (
                  <tr key={row.userId}
                    style={{ borderBottom: i < rest.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '14px', fontWeight: 700, color: '#9ca3af', fontSize: '1rem' }}>#{i + 4}</td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 85%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 30%)`, flexShrink: 0 }}>
                          {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#111827', fontSize: '1rem' }}>{row.trialsClosed}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.demosSet}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.demosConducted}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.onboardingsBooked}</td>
                    {[row.showRate, row.closeRate, row.obToTrialRate].map((v, j) => (
                      <td key={j} style={{ padding: '14px', textAlign: 'center' }}>
                        <RateBadge value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatsView({ results, selectedUser, setSelectedUser, loading, preset }) {
  const userOptions = [{ userId: 'all', name: 'All Closers' }, ...results]
  const filtered = selectedUser === 'all' ? results : results.filter(r => r.userId === selectedUser)

  const totals = filtered.reduce((acc, r) => ({
    demosSet: acc.demosSet + r.demosSet,
    netNewDemos: acc.netNewDemos + (r.netNewDemos || 0),
    reschedules: acc.reschedules + (r.reschedules || 0),
    demosConducted: acc.demosConducted + r.demosConducted,
    onboardingsBooked: acc.onboardingsBooked + r.onboardingsBooked,
    trialsClosed: acc.trialsClosed + r.trialsClosed,
  }), { demosSet: 0, netNewDemos: 0, reschedules: 0, demosConducted: 0, onboardingsBooked: 0, trialsClosed: 0 })

  const showRate = totals.demosSet > 0 ? Math.round((totals.demosConducted / totals.demosSet) * 100) + '%' : '0%'
  const closeRate = totals.demosConducted > 0 ? Math.round((totals.onboardingsBooked / totals.demosConducted) * 100) + '%' : '0%'
  const obTrialRate = totals.onboardingsBooked > 0 ? Math.round((totals.trialsClosed / totals.onboardingsBooked) * 100) + '%' : '0%'

  return (
    <div>
      {/* Closer filter */}
      <div style={{ marginBottom: 24 }}>
        <select
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 14px', fontSize: '0.875rem', color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none', minWidth: 160 }}
        >
          {userOptions.map(u => (
            <option key={u.userId} value={u.userId}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Demo Activity */}
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Demo Activity
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Demo's Booked" value={loading ? '...' : totals.demosSet} subtitle="Total including reschedules" />
        <StatCard label="Net New Demos" value={loading ? '...' : totals.netNewDemos} subtitle="Booked minus reschedules" />
        <StatCard label="Reschedules" value={loading ? '...' : totals.reschedules} subtitle="Moved to another date" highlight={totals.reschedules > 0} />
        <StatCard label="Demo's Conducted" value={loading ? '...' : totals.demosConducted} />
        <StatCard label="Show Rate" value={loading ? '...' : showRate} subtitle="Conducted / Booked" />
      </div>

      {/* Conversion */}
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Conversion
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Onboarding's Booked" value={loading ? '...' : totals.onboardingsBooked} />
        <StatCard label="Trials Closed" value={loading ? '...' : totals.trialsClosed} />
        <StatCard label="Close Rate" value={loading ? '...' : closeRate} subtitle="Onboardings / Conducted" />
        <StatCard label="OB → Trial Rate" value={loading ? '...' : obTrialRate} subtitle="Trials / Onboardings" />
      </div>

      {/* Full table when all closers */}
      {selectedUser === 'all' && results.length > 1 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>All Closers</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Closer', 'Demos', 'Net New', 'Reschedules', 'Conducted', 'Onboardings', 'Trials', 'Show Rate', 'Close Rate', 'OB→Trial'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: i === 0 ? 'left' : 'center', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...results].sort((a, b) => b.trialsClosed - a.trialsClosed).map((row, i) => (
                <tr key={row.userId} style={{ borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 85%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: `hsl(${(row.name.charCodeAt(0) * 47) % 360}, 60%, 30%)`, flexShrink: 0 }}>
                        {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{row.name}</span>
                      {i === 0 && <span style={{ fontSize: '0.7rem', background: '#fef9c3', color: '#ca8a04', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>Top</span>}
                    </div>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.demosSet}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.netNewDemos || 0}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: (row.reschedules || 0) > 0 ? '#dc2626' : '#111827' }}>{row.reschedules || 0}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.demosConducted}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.onboardingsBooked}</td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, color: '#111827' }}>{row.trialsClosed}</td>
                  {[row.showRate, row.closeRate, row.obToTrialRate].map((v, j) => (
                    <td key={j} style={{ padding: '14px', textAlign: 'center' }}>
                      <RateBadge value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '0.9rem' }}>
          No data found for this period.
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('leaderboard')
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
  const presets = ['Today', 'This Week', 'This Month', 'Last Month', 'Custom']

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56, gap: 12,
      }}>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { key: 'leaderboard', label: '🏆 Leaderboard' },
            { key: 'stats', label: '📊 Stats' },
          ].map((v, i) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: '7px 16px', border: 'none',
                borderRight: i === 0 ? '1px solid #d1d5db' : 'none',
                background: view === v.key ? '#111827' : '#fff',
                color: view === v.key ? '#fff' : '#374151',
                fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Date controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {presets.map((p, i) => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                style={{
                  padding: '7px 14px', border: 'none',
                  borderRight: i < presets.length - 1 ? '1px solid #d1d5db' : 'none',
                  background: preset === p ? '#111827' : '#fff',
                  color: preset === p ? '#fff' : '#374151',
                  fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {preset === 'Custom' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: '0.8rem', color: '#374151', background: '#fff', outline: 'none' }} />
              <span style={{ color: '#9ca3af' }}>→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: '0.8rem', color: '#374151', background: '#fff', outline: 'none' }} />
              <button onClick={() => fetchData(startDate, endDate)}
                style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                Apply
              </button>
            </div>
          )}

          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData(startDate, endDate)}
            disabled={loading}
            style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 14px', fontSize: '0.8rem', color: '#374151', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
          >
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '14px 18px', color: '#dc2626', marginBottom: 24, fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {view === 'leaderboard'
          ? <LeaderboardView results={results} preset={preset} />
          : <StatsView results={results} selectedUser={selectedUser} setSelectedUser={setSelectedUser} loading={loading} preset={preset} />
        }
      </div>
    </div>
  )
}
