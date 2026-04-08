import { useState, useEffect } from 'react'
import { getUserId, getUsername } from '../utils/roomId'

const MY_ID = getUserId()

function loadPrivateNotes() {
  return localStorage.getItem(`mockpad-notes-${MY_ID}`) || ''
}
function savePrivateNotes(text) {
  localStorage.setItem(`mockpad-notes-${MY_ID}`, text)
}

// Single tabbed panel — "You" tab is editable, one tab per other user who has shared.
// Each tab label shows name + role.
export function NotesPanel({ sharedMap, myRole, peers }) {
  const [myNotes, setMyNotes] = useState(loadPrivateNotes)
  const [isShared, setIsShared] = useState(false)
  const [othersNotes, setOthersNotes] = useState({}) // { [userId]: { name, role, text } }
  const [activeTab, setActiveTab] = useState(MY_ID)

  // Sync isShared on mount (in case user refreshed while shared)
  useEffect(() => {
    setIsShared(sharedMap.has(`sharedNotes-${MY_ID}`))
  }, [sharedMap])

  // Observe other users' shared notes
  useEffect(() => {
    function scan() {
      const next = {}
      sharedMap.forEach((value, key) => {
        if (!key.startsWith('sharedNotes-') || key === `sharedNotes-${MY_ID}`) return
        const uid = key.replace('sharedNotes-', '')
        next[uid] = value
      })
      setOthersNotes(next)
    }

    function onMapChange(event) {
      event.changes.keys.forEach((change, key) => {
        if (!key.startsWith('sharedNotes-') || key === `sharedNotes-${MY_ID}`) return
        const uid = key.replace('sharedNotes-', '')
        if (change.action === 'delete') {
          setOthersNotes(prev => {
            const next = { ...prev }
            delete next[uid]
            return next
          })
          setActiveTab(prev => prev === uid ? MY_ID : prev)
        } else {
          setOthersNotes(prev => ({ ...prev, [uid]: sharedMap.get(key) }))
        }
      })
    }

    sharedMap.observe(onMapChange)
    scan()
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  function handleChange(e) {
    const text = e.target.value
    setMyNotes(text)
    savePrivateNotes(text)
    if (isShared) {
      sharedMap.set(`sharedNotes-${MY_ID}`, { name: getUsername(), role: myRole, text })
    }
  }

  function handleShare() {
    sharedMap.set(`sharedNotes-${MY_ID}`, { name: getUsername(), role: myRole, text: myNotes })
    setIsShared(true)
  }

  function handleUnshare() {
    sharedMap.delete(`sharedNotes-${MY_ID}`)
    setIsShared(false)
  }

  // Look up role color from peers list for tab styling
  function roleColor(role) {
    if (role === 'interviewer') return '#7ab3f5'
    if (role === 'interviewee') return '#f57a7a'
    return '#666'
  }

  const otherTabs = Object.entries(othersNotes)

  return (
    <div style={styles.panel}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {/* My tab */}
        <button
          onClick={() => setActiveTab(MY_ID)}
          style={styles.tab(activeTab === MY_ID)}
        >
          <span style={styles.tabName}>You</span>
          <span style={{ ...styles.tabRole, color: roleColor(myRole) }}>{myRole}</span>
          {isShared && <span style={styles.sharedDot} title="shared" />}
        </button>

        {/* Other users' tabs */}
        {otherTabs.map(([uid, note]) => (
          <button
            key={uid}
            onClick={() => setActiveTab(uid)}
            style={styles.tab(activeTab === uid)}
          >
            <span style={styles.tabName}>{note.name}</span>
            <span style={{ ...styles.tabRole, color: roleColor(note.role) }}>{note.role}</span>
          </button>
        ))}

        {/* Share toggle pushed to the right */}
        <div style={styles.tabSpacer} />
        <button
          onClick={isShared ? handleUnshare : handleShare}
          style={styles.shareBtn(isShared)}
        >
          {isShared ? 'Unshare' : 'Share'}
        </button>
      </div>

      {/* Content */}
      {activeTab === MY_ID ? (
        <textarea
          value={myNotes}
          onChange={handleChange}
          placeholder={isShared ? 'Visible to everyone in the room…' : 'Private — hit Share to let others see this…'}
          style={styles.textarea}
          spellCheck={false}
        />
      ) : (
        <pre style={styles.readonlyText}>
          {othersNotes[activeTab]?.text || '(empty)'}
        </pre>
      )}
    </div>
  )
}

const styles = {
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
    flexShrink: 0,
    overflowX: 'auto',
    gap: '1px',
    padding: '0 6px',
  },
  tab: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 10px',
    background: active ? '#1e1e1e' : 'none',
    border: 'none',
    borderBottom: active ? '2px solid #569cd6' : '2px solid transparent',
    cursor: 'pointer',
    flexShrink: 0,
    marginBottom: '-1px',
  }),
  tabName: {
    fontSize: '12px',
    color: '#ccc',
    fontFamily: 'monospace',
  },
  tabRole: {
    fontSize: '10px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  sharedDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#5a9a5a',
    display: 'inline-block',
    flexShrink: 0,
  },
  tabSpacer: { flex: 1 },
  shareBtn: (isShared) => ({
    background: 'none',
    border: `1px solid ${isShared ? '#555' : '#3a6a3a'}`,
    borderRadius: '4px',
    color: isShared ? '#666' : '#5a9a5a',
    fontSize: '11px',
    padding: '2px 8px',
    cursor: 'pointer',
    flexShrink: 0,
    fontFamily: 'monospace',
  }),
  textarea: {
    flex: 1,
    background: '#1e1e1e',
    color: '#d4d4d4',
    border: 'none',
    resize: 'none',
    padding: '10px 12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    outline: 'none',
    lineHeight: '1.5',
  },
  readonlyText: {
    flex: 1,
    padding: '10px 12px',
    margin: 0,
    fontSize: '12px',
    color: '#aaa',
    background: '#181818',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    lineHeight: '1.5',
  },
}
