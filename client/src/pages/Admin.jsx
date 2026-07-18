import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const WS_SERVER = import.meta.env.VITE_WS_SERVER ?? 'ws://localhost:1234'
const API_BASE = WS_SERVER.replace('wss://', 'https://').replace('ws://', 'http://')

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [terminating, setTerminating] = useState(null)
  const [passkey, setPasskey] = useState(() => sessionStorage.getItem('mockpad-admin-passkey') || '')

  const fetchStats = async () => {
    if (!passkey) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/status`, {
        headers: { 'x-passkey': passkey }
      })
      if (res.status === 401) {
        sessionStorage.removeItem('mockpad-admin-passkey')
        setPasskey('')
        throw new Error('Unauthorized')
      }
      if (!res.ok) throw new Error('Failed to fetch status')
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Poll stats every 3 seconds
  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, 3000)
    return () => clearInterval(timer)
  }, [passkey])

  const handleEndRoom = async (roomId) => {
    if (!window.confirm(`Force close room "${roomId}"? All connections will be dropped.`)) return
    setTerminating(roomId)
    try {
      const res = await fetch(`${API_BASE}/end-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      })
      if (!res.ok) throw new Error('Failed to close room')
      fetchStats()
    } catch (err) {
      alert(err.message)
    } finally {
      setTerminating(null)
    }
  }

  const formatUptime = (sec) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const secs = sec % 60
    return `${hrs}h ${mins}m ${secs}s`
  }

  if (!passkey) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h2 style={styles.loginTitle}>MockPad Admin Authentication</h2>
          <p style={styles.loginSub}>Enter your administrative passkey to unlock the control node.</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const val = e.target.passkey.value
            sessionStorage.setItem('mockpad-admin-passkey', val)
            setPasskey(val)
          }} style={styles.loginForm}>
            <input
              type="password"
              name="passkey"
              placeholder="Enter admin passkey..."
              style={styles.loginInput}
              autoFocus
              required
            />
            <button type="submit" style={styles.loginBtn}>Unlock Node</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading && !stats) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Fetching Agentic Controls Dashboard...</div>
      </div>
    )
  }

  const system = stats?.system ?? { heapUsedMb: 0, rssMb: 0, uptimeSec: 0, totalConnections: 0 }
  const rooms = stats?.rooms ?? []

  // Heap usage percentage relative to 120MB threshold
  const heapPct = Math.min(100, Math.round((system.heapUsedMb / 120) * 100))

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerTitleRow}>
          <h1 style={styles.h1}>MockPad Control Center</h1>
          <div style={styles.liveBadge}>
            <span style={styles.pulseDot} /> LIVE
          </div>
        </div>
        <p style={styles.subtitle}>Agentic administrative control and server monitoring node.</p>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          ⚠ Connection Offline: {error}. Retrying connection...
        </div>
      )}

      {/* Metric Grid */}
      <div style={styles.grid}>
        {/* Metric 1 */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Server Memory (Heap)</div>
          <div style={styles.cardVal}>{system.heapUsedMb} <span style={styles.unit}>MB</span></div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar(heapPct)} />
          </div>
          <div style={styles.cardSub}>
            Limit: 120MB | RSS: {system.rssMb}MB ({heapPct}% warn threshold)
          </div>
        </div>

        {/* Metric 2 */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Active Rooms</div>
          <div style={styles.cardVal}>{rooms.length} <span style={styles.unit}>Rooms</span></div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar(Math.min(100, (rooms.length / 40) * 100))} />
          </div>
          <div style={styles.cardSub}>Max Allocated Capacity: 40 Rooms</div>
        </div>

        {/* Metric 3 */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>WebSocket Connections</div>
          <div style={styles.cardVal}>{system.totalConnections} <span style={styles.unit}>Users</span></div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar(Math.min(100, (system.totalConnections / 80) * 100))} />
          </div>
          <div style={styles.cardSub}>Max Socket Capacity: 80 Connections</div>
        </div>

        {/* Metric 4 */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>System Uptime</div>
          <div style={styles.cardVal}>{formatUptime(system.uptimeSec)}</div>
          <div style={styles.uptimeBar} />
          <div style={styles.cardSub}>MockPad WebSocket Daemon</div>
        </div>
      </div>

      {/* Rooms Table Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.h2}>Active Collaborations ({rooms.length})</h2>
          <button onClick={fetchStats} style={styles.refreshBtn}>↻ Refresh Now</button>
        </div>

        {rooms.length === 0 ? (
          <div style={styles.emptyState}>
            No rooms are currently allocated in the memory pool.
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>Room UUID / Name</th>
                  <th style={styles.th}>Active Peers</th>
                  <th style={styles.th}>Session Age</th>
                  <th style={styles.th}>Idle Status</th>
                  <th style={styles.thAction}>Control Operations</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.roomId} style={styles.trBody}>
                    <td style={styles.td}>
                      <Link to={`/room/${room.roomId}`} target="_blank" style={styles.roomLink}>
                        {room.roomId} ↗
                      </Link>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.connCount(room.connections)}>
                        {room.connections} {room.connections === 1 ? 'user' : 'users'}
                      </span>
                    </td>
                    <td style={styles.td}>{room.ageMinutes} minutes</td>
                    <td style={styles.td}>
                      {room.isInactive ? (
                        <span style={styles.inactiveTag}>Inactivity Timer Active</span>
                      ) : (
                        <span style={styles.activeTag}>Actively Engaged</span>
                      )}
                    </td>
                    <td style={styles.tdAction}>
                      <button
                        onClick={() => handleEndRoom(room.roomId)}
                        disabled={terminating === room.roomId}
                        style={styles.terminateBtn}
                      >
                        {terminating === room.roomId ? 'Closing...' : 'Force Terminate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  page: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    background: '#141416',
    color: '#E6E8EA',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  loadingPage: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#141416',
    color: '#8E9AA8',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  header: {
    marginBottom: '32px',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  h1: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: '-0.5px',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(16,185,129,0.1)',
    color: '#10B981',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid rgba(16,185,129,0.2)',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#10B981',
    animation: 'pulse 1.5s infinite',
  },
  subtitle: {
    margin: '6px 0 0 0',
    color: '#8E9AA8',
    fontSize: '14px',
  },
  errorBanner: {
    padding: '12px 20px',
    background: 'rgba(239,68,68,0.1)',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    background: '#1D1E22',
    border: '1px solid #282A30',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#8E9AA8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  cardVal: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#FFF',
    marginBottom: '14px',
  },
  unit: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#636E7B',
  },
  progressContainer: {
    height: '4px',
    background: '#282A30',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressBar: (pct) => ({
    height: '100%',
    width: `${pct}%`,
    background: pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#3B82F6',
    borderRadius: '2px',
    transition: 'width 0.5s ease-in-out',
  }),
  uptimeBar: {
    height: '4px',
    background: 'linear-gradient(to right, #3B82F6, #10B981)',
    borderRadius: '2px',
    marginBottom: '10px',
  },
  cardSub: {
    fontSize: '12px',
    color: '#636E7B',
  },
  section: {
    background: '#1D1E22',
    border: '1px solid #282A30',
    borderRadius: '12px',
    padding: '28px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  h2: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFF',
  },
  refreshBtn: {
    background: '#282A30',
    border: '1px solid #363942',
    borderRadius: '6px',
    color: '#E6E8EA',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  emptyState: {
    padding: '40px 0',
    textAlign: 'center',
    color: '#636E7B',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  trHead: {
    borderBottom: '1px solid #282A30',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#8E9AA8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  thAction: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#8E9AA8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'right',
  },
  trBody: {
    borderBottom: '1px solid #222327',
    ':hover': {
      background: '#232429',
    },
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#D1D5DB',
  },
  tdAction: {
    padding: '16px',
    textAlign: 'right',
  },
  roomLink: {
    color: '#3B82F6',
    textDecoration: 'none',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  connCount: (count) => ({
    background: count > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
    color: count > 0 ? '#3B82F6' : '#636E7B',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  }),
  inactiveTag: {
    background: 'rgba(245,158,11,0.1)',
    color: '#F59E0B',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  activeTag: {
    background: 'rgba(16,185,129,0.1)',
    color: '#10B981',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  terminateBtn: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '6px',
    color: '#EF4444',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      background: '#EF4444',
      color: '#FFF',
    },
  },
  loginPage: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#141416',
    color: '#8E9AA8',
    padding: '20px',
  },
  loginCard: {
    background: '#1D1E22',
    border: '1px solid #282A30',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  },
  loginTitle: {
    margin: '0 0 10px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFF',
  },
  loginSub: {
    margin: '0 0 24px 0',
    fontSize: '13px',
    color: '#636E7B',
    lineHeight: '1.5',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loginInput: {
    background: '#141416',
    border: '1px solid #282A30',
    borderRadius: '6px',
    color: '#FFF',
    padding: '12px',
    fontSize: '14px',
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.2s',
  },
  loginBtn: {
    background: '#3B82F6',
    border: 'none',
    borderRadius: '6px',
    color: '#FFF',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
}
