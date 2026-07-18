import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRoomId, setUsername, getUsername } from '../utils/roomId'

export default function Home() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState('')
  const [name, setName] = useState(getUsername())

  function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Please enter your name to continue.')
      return
    }
    setUsername(trimmedName)
    const id = generateRoomId()
    navigate(`/room/${id}?lang=python&type=leetcode`)
  }

  function handleJoin(e) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert('Please enter your name to continue.')
      return
    }
    let id = joinId.trim()
    if (!id) return
    let extraParams = ''
    try {
      const url = new URL(id)
      const match = url.pathname.match(/\/room\/([^/]+)/)
      if (match) {
        id = decodeURIComponent(match[1])
      } else {
        const parts = url.pathname.split('/').filter(Boolean)
        id = parts[parts.length - 1] ?? ''
      }
      const lang = url.searchParams.get('lang')
      const type = url.searchParams.get('type')
      const qs = [lang && `lang=${lang}`, type && `type=${type}`].filter(Boolean).join('&')
      if (qs) extraParams = `?${qs}`
    } catch {
      id = id.replace(/\/+$/, '')
    }
    if (!id) return
    setUsername(trimmedName)
    navigate(`/room/${id}${extraParams}`)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>MockPad</h1>
          <p style={styles.subtitle}>Collaborative code editor for mock interviews</p>
        </div>

        {/* User Identity */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name..."
          style={styles.input}
          required
        />

        <button onClick={handleCreate} style={styles.createBtn}>
          Create New Room
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or join active</span>
          <span style={styles.dividerLine} />
        </div>

        <form onSubmit={handleJoin} style={styles.form}>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Paste Room Link or ID..."
            style={styles.joinInput}
            required
          />
          <button type="submit" style={styles.joinBtn}>
            Join
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#141416',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: '#1D1E22',
    border: '1px solid #282A30',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  title: {
    color: '#fff',
    fontSize: '32px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#8E9AA8',
    fontSize: '14px',
    margin: '6px 0 0 0',
    lineHeight: '1.4',
  },
  input: {
    background: '#141416',
    border: '1px solid #282A30',
    borderRadius: '6px',
    padding: '12px',
    color: '#FFF',
    fontSize: '14px',
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.2s',
  },
  createBtn: {
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#282A30',
  },
  dividerText: {
    color: '#636E7B',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  form: {
    display: 'flex',
    gap: '8px',
  },
  joinInput: {
    flex: 1,
    background: '#141416',
    border: '1px solid #282A30',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#FFF',
    fontSize: '14px',
    outline: 'none',
  },
  joinBtn: {
    background: '#282A30',
    border: '1px solid #363942',
    color: '#E6E8EA',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
}
