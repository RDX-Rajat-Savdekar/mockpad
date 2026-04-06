import { useState, useEffect } from 'react'
import { getUserId, getUsername } from '../utils/roomId'

const MY_ID = getUserId()

function loadPrivateNotes() {
  return localStorage.getItem(`mockpad-notes-${MY_ID}`) || ''
}
function savePrivateNotes(text) {
  localStorage.setItem(`mockpad-notes-${MY_ID}`, text)
}

// My private notes + share toggle
export function MyNotes({ sharedMap }) {
  const [myNotes, setMyNotes] = useState(loadPrivateNotes)
  const [isShared, setIsShared] = useState(false)

  function handleChange(e) {
    const text = e.target.value
    setMyNotes(text)
    savePrivateNotes(text)
    if (isShared) {
      sharedMap.set(`sharedNotes-${MY_ID}`, { name: getUsername(), text })
    }
  }

  function handleShare() {
    sharedMap.set(`sharedNotes-${MY_ID}`, { name: getUsername(), text: myNotes })
    setIsShared(true)
  }

  function handleUnshare() {
    sharedMap.delete(`sharedNotes-${MY_ID}`)
    setIsShared(false)
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.label}>
          My Notes {isShared && <span style={styles.sharedTag}>shared</span>}
        </span>
        <button
          onClick={isShared ? handleUnshare : handleShare}
          style={styles.shareBtn(isShared)}
        >
          {isShared ? 'Unshare' : 'Share'}
        </button>
      </div>
      <textarea
        value={myNotes}
        onChange={handleChange}
        placeholder="Private — only visible to you until shared..."
        style={styles.textarea}
        spellCheck={false}
      />
    </div>
  )
}

// Read-only view of the other person's shared notes
export function TheirNotes({ sharedMap }) {
  const [theirNotes, setTheirNotes] = useState(null)

  useEffect(() => {
    function scan() {
      let found = null
      sharedMap.forEach((value, key) => {
        if (key.startsWith('sharedNotes-') && key !== `sharedNotes-${MY_ID}`) {
          found = value
        }
      })
      setTheirNotes(found)
    }

    function onMapChange(event) {
      event.changes.keys.forEach((change, key) => {
        if (!key.startsWith('sharedNotes-') || key === `sharedNotes-${MY_ID}`) return
        if (change.action === 'delete') setTheirNotes(null)
        else setTheirNotes(sharedMap.get(key) ?? null)
      })
    }

    sharedMap.observe(onMapChange)
    scan()
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  if (!theirNotes) return null

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.label}>{theirNotes.name}'s Notes</span>
      </div>
      <pre style={styles.readonlyText}>{theirNotes.text || '(empty)'}</pre>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
    flexShrink: 0,
  },
  label: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sharedTag: {
    background: '#1a4a1a',
    color: '#5a9a5a',
    fontSize: '10px',
    padding: '1px 5px',
    borderRadius: '3px',
    textTransform: 'lowercase',
  },
  shareBtn: (isShared) => ({
    background: 'none',
    border: `1px solid ${isShared ? '#555' : '#3a6a3a'}`,
    borderRadius: '4px',
    color: isShared ? '#666' : '#5a9a5a',
    fontSize: '11px',
    padding: '2px 8px',
    cursor: 'pointer',
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
