import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRoomId, setUsername, getUsername } from '../utils/roomId'

const LANGUAGES = ['python', 'javascript', 'java', 'cpp']
const INTERVIEW_TYPES = ['leetcode', 'system-design', 'behavioral', 'general']

export default function Home() {
  const navigate = useNavigate()
  const [joinId, setJoinId] = useState('')
  const [language, setLanguage] = useState('python')
  const [interviewType, setInterviewType] = useState('leetcode')
  const [name, setName] = useState(getUsername())

  function handleCreate() {
    if (name.trim()) setUsername(name.trim())
    const id = generateRoomId()
    navigate(`/room/${id}?lang=${language}&type=${interviewType}`)
  }

  function handleJoin(e) {
    e.preventDefault()
    let id = joinId.trim()
    if (!id) return
    // Accept full URLs or bare room IDs
    try {
      const url = new URL(id)
      const parts = url.pathname.split('/')
      id = parts[parts.length - 1]
    } catch {
      // not a URL — treat as a bare room ID
    }
    if (!id) return
    if (name.trim()) setUsername(name.trim())
    navigate(`/room/${id}`)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>MockPad</h1>
        <p style={styles.subtitle}>Free real-time collaborative code editor for mock interviews</p>

        {/* Username */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (shown on cursor)"
          style={styles.input}
        />

        {/* Room config selectors */}
        <div style={styles.selectGroup}>
          <div style={styles.selectRow}>
            <label style={styles.label}>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.select}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div style={styles.selectRow}>
            <label style={styles.label}>Interview type</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              style={styles.select}
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleCreate} style={styles.createBtn}>
          Create new room
        </button>

        <div style={styles.divider}>
          <span>or join an existing room</span>
        </div>

        <form onSubmit={handleJoin} style={styles.form}>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Paste room link or ID..."
            style={styles.input}
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
    background: '#1e1e1e',
  },
  card: {
    background: '#2d2d2d',
    border: '1px solid #444',
    borderRadius: '12px',
    padding: '48px',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    color: '#fff',
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    margin: 0,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
    textAlign: 'center',
    margin: 0,
    lineHeight: '1.5',
  },
  selectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '14px',
  },
  selectRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#888',
    fontSize: '13px',
  },
  select: {
    background: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '5px 10px',
    fontSize: '13px',
    minWidth: '140px',
  },
  createBtn: {
    background: '#0e7a0e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    color: '#666',
    fontSize: '13px',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: '#1e1e1e',
    border: '1px solid #555',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#d4d4d4',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  joinBtn: {
    background: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #555',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
}
