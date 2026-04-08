import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import Editor from '../components/Editor'
import Whiteboard from '../components/Whiteboard'
import ResourceDrawer from '../components/ResourceDrawer'
import Timer from '../components/Timer'
import { NotesPanel } from '../components/Notes'
import { useCodeRunner } from '../hooks/useCodeRunner'
import { useYjs } from '../hooks/useYjs'
import { getUserId, getUsername, getUserColor } from '../utils/roomId'
import CountdownOverlay from '../components/CountdownOverlay'
import TipsModal from '../components/TipsModal'
import SummaryModal from '../components/SummaryModal'
import FeaturesModal from '../components/FeaturesModal'

function useVerticalResize(initial) {
  const [pcts, setPcts] = useState(initial)
  const containerRef = useRef(null)

  const onDividerMouseDown = useCallback((dividerIndex, e) => {
    e.preventDefault()
    const startY = e.clientY
    const startPcts = [...pcts]
    const totalH = containerRef.current?.getBoundingClientRect().height || 1

    function onMove(e) {
      const deltaPct = ((e.clientY - startY) / totalH) * 100
      setPcts(prev => {
        const next = [...prev]
        next[dividerIndex]     = Math.max(8, startPcts[dividerIndex]     + deltaPct)
        next[dividerIndex + 1] = Math.max(8, startPcts[dividerIndex + 1] - deltaPct)
        return next
      })
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [pcts])

  return { pcts, containerRef, onDividerMouseDown }
}

const LANGUAGES = ['python', 'javascript', 'java', 'cpp']
const INTERVIEW_TYPES = ['leetcode', 'system-design', 'behavioral', 'general']
const MY_ID = getUserId()

export default function Room() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const MY_NAME = getUsername()
  const MY_COLOR = getUserColor()

  const [language, setLanguage] = useState(searchParams.get('lang') ?? 'python')
  const [output, setOutput] = useState('')
  const [interviewType, setInterviewType] = useState(searchParams.get('type') ?? 'leetcode')
  const [myRole, setMyRole] = useState('interviewee')
  const [editor, setEditor] = useState(null)
  const [activePanel, setActivePanel] = useState('code')
  const [showResources, setShowResources] = useState(false)
  const [connStatus, setConnStatus] = useState('connected')
  const [peers, setPeers] = useState([])
  const [toast, setToast] = useState(null) // { msg, key }
  const toastTimer = useRef(null)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const prevPeersLen = useRef(0)
  const wbApiRef = useRef(null)

  const { pcts, containerRef, onDividerMouseDown } = useVerticalResize([45, 55])
  const { runCode, isRunning } = useCodeRunner()
  const { doc, provider, awareness, yText } = useYjs(roomId, editor, MY_NAME, MY_COLOR, MY_ID)
  const sharedMap = doc.getMap('shared')

  // Presence
  useEffect(() => {
    function update() {
      const roles = sharedMap.get('roles') ?? {}
      const seen = new Set()
      const list = []
      awareness.getStates().forEach((state) => {
        const user = state.user
        if (!user) return
        const uid = user.userId
        if (uid && seen.has(uid)) return
        if (uid) seen.add(uid)
        list.push({
          name: user.name ?? 'Anonymous',
          color: user.color ?? '#888',
          role: roles[uid] ?? 'viewer',
          isMe: uid === MY_ID,
        })
      })
      setPeers(list)
    }
    awareness.on('change', update)
    sharedMap.observe(update)
    update()
    return () => {
      awareness.off('change', update)
      sharedMap.unobserve(update)
    }
  }, [awareness, sharedMap])

  // Reconnection status
  useEffect(() => {
    function onStatus({ status }) { setConnStatus(status) }
    provider.on('status', onStatus)
    return () => provider.off('status', onStatus)
  }, [provider])

  // Shared state changes
  useEffect(() => {
    function onMapChange() {
      const lang = sharedMap.get('language')
      const out = sharedMap.get('output')
      const type = sharedMap.get('interviewType')
      const roles = sharedMap.get('roles') ?? {}
      if (lang) setLanguage(lang)
      if (out !== undefined) setOutput(out)
      if (type) setInterviewType(type)
      if (roles[MY_ID]) setMyRole(roles[MY_ID])
    }
    sharedMap.observe(onMapChange)
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  // Role assignment + defaults after Yjs sync
  useEffect(() => {
    function onSynced() {
      const roles = sharedMap.get('roles') ?? {}
      if (!roles[MY_ID]) {
        const taken = Object.values(roles)
        let role
        if (!taken.includes('interviewer')) role = 'interviewer'
        else if (!taken.includes('interviewee')) role = 'interviewee'
        else role = 'viewer'
        sharedMap.set('roles', { ...roles, [MY_ID]: role })
        setMyRole(role)
      } else {
        setMyRole(roles[MY_ID])
      }
      if (!sharedMap.get('language')) {
        const lang = searchParams.get('lang') ?? 'python'
        sharedMap.set('language', lang)
        setLanguage(lang)
      }
      if (!sharedMap.get('interviewType')) {
        const type = searchParams.get('type') ?? 'leetcode'
        sharedMap.set('interviewType', type)
        setInterviewType(type)
      }
      // Seed demo room with sample content on first visit
      if (searchParams.get('demo') === '1' && !sharedMap.get('demoSeeded')) {
        sharedMap.set('demoSeeded', true)
        sharedMap.set('timerDuration', 45 * 60 * 1000)
        const demoCode = `# Two Sum — find indices of two numbers that add to target
# Pattern: Hash map for O(n) lookup

def two_sum(nums, target):
    seen = {}               # value → index
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []

# Test
print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
print(two_sum([3, 2, 4], 6))        # [1, 2]`
        yText.doc.transact(() => {
          yText.delete(0, yText.length)
          yText.insert(0, demoCode)
        })
        sharedMap.set(`sharedNotes-${MY_ID}`, {
          name: MY_NAME,
          role: 'interviewer',
          text: `Clarify:\n- Return indices, not values\n- Each input has exactly one solution\n- Can't use same element twice\n\nBrute force: O(n²) — nested loops\nOptimal: O(n) — hash map\n\nFollow-ups:\n- What if sorted? → Two pointers\n- What if multiple solutions?`,
        })
      }
    }
    provider.on('synced', onSynced)
    return () => provider.off('synced', onSynced)
  }, [sharedMap, provider])

  // Paste event toast
  useEffect(() => {
    function onMapChange(event) {
      if (!event.changes.keys.has('pasteEvent')) return
      const ev = sharedMap.get('pasteEvent')
      if (!ev) return
      showToast(`${ev.name} pasted ${ev.lines} line${ev.lines === 1 ? '' : 's'}`)
    }
    sharedMap.observe(onMapChange)
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  // Trigger countdown when 2nd person joins
  useEffect(() => {
    const prev = prevPeersLen.current
    prevPeersLen.current = peers.length
    // prev > 0 ensures we don't fire on first render
    if (prev > 0 && prev < 2 && peers.length >= 2) {
      if (!sharedMap.get('interviewStarted')) {
        sharedMap.set('interviewStarted', Date.now())
      }
    }
  }, [peers, sharedMap])

  // Observe countdown trigger from sharedMap (synced across all clients)
  useEffect(() => {
    function onMapChange(event) {
      if (!event.changes.keys.has('interviewStarted')) return
      setShowCountdown(true)
    }
    sharedMap.observe(onMapChange)
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  // Show tips modal once per room per browser session
  useEffect(() => {
    const key = `mockpad-tips-${roomId}`
    if (!sessionStorage.getItem(key)) {
      const t = setTimeout(() => setShowTips(true), 800)
      return () => clearTimeout(t)
    }
  }, [roomId])

  function showToast(msg) {
    clearTimeout(toastTimer.current)
    setToast({ msg, key: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3100)
  }

  function handleMount(editorInstance) {
    setEditor(editorInstance)
    editorInstance.onDidPaste((e) => {
      const lines = e.range.endLineNumber - e.range.startLineNumber + 1
      sharedMap.set('pasteEvent', { name: MY_NAME, lines, uid: MY_ID, t: Date.now() })
    })
  }

  function handleLanguageChange(lang) {
    setLanguage(lang)
    sharedMap.set('language', lang)
  }

  function handleTypeChange(type) {
    setInterviewType(type)
    sharedMap.set('interviewType', type)
  }

  function handleMyRoleChange(newRole) {
    const roles = sharedMap.get('roles') ?? {}
    sharedMap.set('roles', { ...roles, [MY_ID]: newRole })
  }

  function handleRoleSwap() {
    const roles = sharedMap.get('roles') ?? {}
    const swapped = Object.fromEntries(
      Object.entries(roles).map(([id, role]) => [
        id,
        role === 'interviewer' ? 'interviewee' : role === 'interviewee' ? 'interviewer' : 'viewer',
      ])
    )
    sharedMap.set('roles', swapped)
  }

  async function handleRun() {
    const code = editor?.getValue() ?? ''
    sharedMap.set('output', 'Running...')
    const result = await runCode(code, language)
    sharedMap.set('output', result)
  }

  function handleReset() {
    yText.doc.transact(() => yText.delete(0, yText.length))
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
  }

  function handleDismissTips() {
    sessionStorage.setItem(`mockpad-tips-${roomId}`, '1')
    setShowTips(false)
  }

  function handleInsertCode(code) {
    if (!yText) return
    yText.doc.transact(() => {
      yText.delete(0, yText.length)
      yText.insert(0, code)
    })
    setActivePanel('code')
    setShowResources(false)
  }

  return (
    <div style={styles.container}>

      {/* Reconnection banner */}
      {connStatus !== 'connected' && (
        <div style={styles.banner(connStatus)} className="conn-banner">
          {connStatus === 'connecting' ? '⏳ Reconnecting…' : '⚠ Disconnected — edits will sync when reconnected'}
        </div>
      )}

      {/* ── Row 1: room info ── */}
      <div style={styles.toolbar1}>
        <span style={styles.logo}>MockPad</span>

        <div style={styles.divider} />

        {/* Presence */}
        <div style={styles.presenceList}>
          {peers.map((p, i) => (
            <div key={p.name + i} className="peer-chip" style={styles.peerChip(p.isMe)}>
              <span style={{ ...styles.dot, background: p.color }} />
              <span style={styles.peerName}>{p.isMe ? 'You' : p.name}</span>
              <span style={styles.peerRole(p.role)}>{p.role}</span>
            </div>
          ))}
        </div>

        <div style={styles.spacer} />

        <select value={interviewType} onChange={(e) => handleTypeChange(e.target.value)} style={styles.select}>
          {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={styles.select}>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <Timer sharedMap={sharedMap} />
      </div>

      {/* ── Row 2: user actions ── */}
      <div style={styles.toolbar2}>
        <div style={styles.roleRow}>
          <span style={{ ...styles.dot, background: MY_COLOR }} />
          <span style={styles.nameLabel}>{MY_NAME}</span>
          <select
            value={myRole}
            onChange={(e) => handleMyRoleChange(e.target.value)}
            style={styles.roleBadge(myRole)}
          >
            <option value="interviewer">interviewer</option>
            <option value="interviewee">interviewee</option>
            <option value="viewer">viewer</option>
          </select>
          <button onClick={handleRoleSwap} title="Swap interviewer ↔ interviewee" style={styles.swapBtn}>⇄</button>
        </div>

        <div style={styles.spacer} />

        <button onClick={() => setShowFeatures(true)} style={styles.iconBtn} title="Feature guide">
          ?
        </button>
        <button onClick={() => setShowResources(v => !v)} style={styles.iconBtn}>
          Resources
        </button>
        <button onClick={() => setShowSummary(true)} style={styles.iconBtn}>
          Summary
        </button>
        <button onClick={handleCopyLink} style={styles.iconBtn} title="Copy room link">
          Copy link
        </button>
        <button onClick={handleReset} style={styles.iconBtn} title="Reset editor">
          Reset
        </button>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={isRunning ? 'run-pulse' : ''}
          style={styles.runButton(isRunning)}
        >
          {isRunning ? 'Running…' : '▶ Run'}
        </button>
      </div>

      {/* Resizable main area */}
      <PanelGroup direction="horizontal" style={styles.main}>

        <Panel defaultSize={60} minSize={25}>
          <div style={styles.fill}>
            {/* Panel tab bar */}
            <div style={styles.panelTabs}>
              <button onClick={() => setActivePanel('code')} style={styles.panelTab(activePanel === 'code')}>Code</button>
              <button onClick={() => setActivePanel('whiteboard')} style={styles.panelTab(activePanel === 'whiteboard')}>Whiteboard</button>
            </div>
            {/* Editor — keep mounted so Monaco doesn't lose state */}
            <div style={{ ...styles.tabContent, display: activePanel === 'code' ? 'flex' : 'none' }}>
              <Editor language={language} onMount={handleMount} readOnly={myRole === 'viewer'} />
            </div>
            {/* Whiteboard */}
            <div style={{ ...styles.tabContent, display: activePanel === 'whiteboard' ? 'flex' : 'none' }}>
              <Whiteboard doc={doc} awareness={awareness} userId={MY_ID} onApi={(api) => { wbApiRef.current = api }} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle style={styles.resizeHandleV} />

        <Panel defaultSize={40} minSize={20}>
          <div style={styles.rightPanel} ref={containerRef}>

            <div style={{ ...styles.section, height: `${pcts[0]}%` }}>
              <div style={styles.panelLabel}>Output</div>
              <pre style={styles.outputText}>{output || 'Hit Run to see output here'}</pre>
            </div>

            <div style={styles.dragHandle} onMouseDown={(e) => onDividerMouseDown(0, e)} />

            <div style={{ ...styles.section, height: `${pcts[1]}%` }}>
              <NotesPanel sharedMap={sharedMap} myRole={myRole} peers={peers} />
            </div>

          </div>
        </Panel>

      </PanelGroup>

      {/* Paste toast */}
      {toast && (
        <div key={toast.key} className="toast" style={styles.toast}>
          📋 {toast.msg}
        </div>
      )}

      <ResourceDrawer
        open={showResources}
        onClose={() => setShowResources(false)}
        interviewType={interviewType}
        onInsertCode={handleInsertCode}
      />

      {showCountdown && (
        <CountdownOverlay onDone={() => setShowCountdown(false)} />
      )}

      {showTips && (
        <TipsModal
          interviewType={interviewType}
          onDismiss={handleDismissTips}
        />
      )}

      {showFeatures && (
        <FeaturesModal
          onClose={() => setShowFeatures(false)}
          onDemo={() => setShowFeatures(false)}
        />
      )}

      {showSummary && (
        <SummaryModal
          onClose={() => setShowSummary(false)}
          roomId={roomId}
          interviewType={interviewType}
          language={language}
          sharedMap={sharedMap}
          editor={editor}
          peers={peers}
          wbApi={wbApiRef.current}
        />
      )}

    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#1e1e1e',
    color: '#d4d4d4',
    fontFamily: 'monospace',
  },
  banner: (status) => ({
    background: status === 'connecting' ? '#4a3a00' : '#4a1a1a',
    color: status === 'connecting' ? '#ffd07a' : '#ff7a7a',
    padding: '6px 16px',
    fontSize: '13px',
    textAlign: 'center',
    flexShrink: 0,
  }),

  // ── Row 1: room info
  toolbar1: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    background: '#2d2d2d',
    borderBottom: '1px solid #3a3a3a',
    flexShrink: 0,
    minHeight: '40px',
  },
  // ── Row 2: user actions
  toolbar2: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 14px',
    background: '#252525',
    borderBottom: '1px solid #444',
    flexShrink: 0,
    minHeight: '38px',
  },

  logo: { fontWeight: 'bold', fontSize: '15px', color: '#e0e0e0', flexShrink: 0, letterSpacing: '0.02em' },
  divider: { width: '1px', height: '18px', background: '#444', flexShrink: 0 },
  spacer: { flex: 1 },

  select: {
    background: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '3px 7px',
    fontSize: '12px',
    flexShrink: 0,
  },

  presenceList: { display: 'flex', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden' },
  peerChip: (isMe) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 7px',
    borderRadius: '20px',
    background: isMe ? '#363636' : '#2a2a2a',
    border: `1px solid ${isMe ? '#555' : '#383838'}`,
    fontSize: '11px',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  }),
  dot: { width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  peerName: { color: '#ccc', fontFamily: 'monospace', fontSize: '11px' },
  peerRole: (role) => ({
    fontSize: '10px',
    color: role === 'interviewer' ? '#7ab3f5' : role === 'interviewee' ? '#f57a7a' : '#666',
    fontWeight: 'bold',
  }),

  roleRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  nameLabel: { fontSize: '12px', color: '#ccc' },
  roleBadge: (role) => ({
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    background: role === 'interviewer' ? '#1a4a8a' : role === 'interviewee' ? '#4a1a1a' : '#2a2a2a',
    color: role === 'interviewer' ? '#7ab3f5' : role === 'interviewee' ? '#f57a7a' : '#888',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    transition: 'background 0.25s, color 0.25s',
  }),
  swapBtn: {
    background: 'none', border: '1px solid #444', borderRadius: '4px',
    color: '#999', fontSize: '12px', padding: '2px 6px', cursor: 'pointer',
  },
  iconBtn: {
    background: 'none', border: '1px solid #444', borderRadius: '4px',
    color: '#999', fontSize: '12px', padding: '4px 10px', cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  runButton: (running) => ({
    background: running ? '#0a5a0a' : '#0e7a0e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 16px',
    fontSize: '13px',
    cursor: running ? 'default' : 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  }),

  main: { flex: 1, overflow: 'hidden' },
  fill: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  resizeHandleV: {
    width: '4px', background: '#2a2a2a', cursor: 'col-resize', flexShrink: 0,
    borderLeft: '1px solid #444', borderRight: '1px solid #444',
  },
  rightPanel: {
    height: '100%', display: 'flex', flexDirection: 'column',
    borderLeft: '1px solid #444', overflow: 'hidden',
  },
  section: { display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 },
  dragHandle: {
    height: '5px', background: '#333', cursor: 'row-resize', flexShrink: 0,
    borderTop: '1px solid #444', borderBottom: '1px solid #444',
  },
  panelLabel: {
    padding: '6px 12px', background: '#2d2d2d', borderBottom: '1px solid #444',
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.05em', flexShrink: 0,
  },
  outputText: {
    flex: 1, padding: '10px 12px', margin: 0,
    fontSize: '12px', color: '#d4d4d4', overflow: 'auto', whiteSpace: 'pre-wrap',
  },

  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#2d2d2d',
    border: '1px solid #555',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '13px',
    color: '#d4d4d4',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  panelTabs: {
    display: 'flex',
    background: '#252525',
    borderBottom: '1px solid #3a3a3a',
    flexShrink: 0,
  },
  panelTab: (active) => ({
    padding: '6px 16px',
    background: active ? '#1e1e1e' : 'none',
    border: 'none',
    borderBottom: active ? '2px solid #569cd6' : '2px solid transparent',
    color: active ? '#d4d4d4' : '#666',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'color 0.15s',
    marginBottom: '-1px',
  }),
  tabContent: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
}
