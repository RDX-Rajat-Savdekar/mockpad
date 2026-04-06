import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import Editor from '../components/Editor'
import Timer from '../components/Timer'
import { MyNotes, TheirNotes } from '../components/Notes'
// import AudioControls from '../components/AudioControls' // TODO: fix WebRTC state
import { useCodeRunner } from '../hooks/useCodeRunner'
import { useYjs } from '../hooks/useYjs'
// import { useWebRTC } from '../hooks/useWebRTC' // TODO: fix WebRTC state
import { getUserId, getUsername, getUserColor } from '../utils/roomId'

// Simple vertical drag-resize for N stacked panels.
// Returns heights as percentages and a mousedown handler for each divider.
function useVerticalResize(initial) {
  const [pcts, setPcts] = useState(initial) // e.g. [33, 34, 33]
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
  const [connStatus, setConnStatus] = useState('connected')
  const { pcts, containerRef, onDividerMouseDown } = useVerticalResize([35, 35, 30])

  const { runCode, isRunning } = useCodeRunner()
  const { doc, provider, yText } = useYjs(roomId, editor, MY_NAME, MY_COLOR)
  const sharedMap = doc.getMap('shared')
  // const { callState, isMuted, isRecording, startCall, endCall, toggleMute, startRecording, stopRecording } = useWebRTC(provider)

  // Reconnection status
  useEffect(() => {
    function onStatus({ status }) { setConnStatus(status) }
    provider.on('status', onStatus)
    return () => provider.off('status', onStatus)
  }, [provider])

  // Observe shared state changes
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

  // Assign role + seed defaults after Yjs syncs
  useEffect(() => {
    function onSynced() {
      const roles = sharedMap.get('roles') ?? {}
      if (!roles[MY_ID]) {
        const taken = Object.values(roles)
        const role = taken.includes('interviewer') ? 'interviewee' : 'interviewer'
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
    }
    provider.on('synced', onSynced)
    return () => provider.off('synced', onSynced)
  }, [sharedMap, provider])

  function handleMount(editorInstance) { setEditor(editorInstance) }

  function handleLanguageChange(lang) {
    setLanguage(lang)
    sharedMap.set('language', lang)
  }

  function handleTypeChange(type) {
    setInterviewType(type)
    sharedMap.set('interviewType', type)
  }

  function handleRoleSwap() {
    const roles = sharedMap.get('roles') ?? {}
    const swapped = Object.fromEntries(
      Object.entries(roles).map(([id, role]) => [id, role === 'interviewer' ? 'interviewee' : 'interviewer'])
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

  return (
    <div style={styles.container}>

      {/* Reconnection banner */}
      {connStatus !== 'connected' && (
        <div style={styles.banner(connStatus)}>
          {connStatus === 'connecting' ? '⏳ Reconnecting…' : '⚠ Disconnected — edits will sync when reconnected'}
        </div>
      )}

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <span style={styles.logo}>MockPad</span>

        <select value={interviewType} onChange={(e) => handleTypeChange(e.target.value)} style={styles.select}>
          {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={styles.select}>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <Timer sharedMap={sharedMap} />

        <div style={styles.roleRow}>
          <span style={{ ...styles.dot, background: MY_COLOR }} />
          <span style={styles.roleBadge(myRole)}>{MY_NAME} · {myRole}</span>
          <button onClick={handleRoleSwap} style={styles.swapBtn}>⇄</button>
        </div>

        {/* <AudioControls ... /> TODO: fix WebRTC state */}

        <button onClick={handleCopyLink} style={styles.ghostBtn}>Copy link</button>
        <button onClick={handleReset} style={styles.ghostBtn}>Reset</button>
        <button onClick={handleRun} disabled={isRunning} style={styles.runButton}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Resizable main area */}
      <PanelGroup direction="horizontal" style={styles.main}>

        {/* Editor — fills its panel fully */}
        <Panel defaultSize={60} minSize={25}>
          <div style={styles.fill}>
            <Editor language={language} onMount={handleMount} />
          </div>
        </Panel>

        <PanelResizeHandle style={styles.resizeHandleV} />

        {/* Right panel — three sections stacked VERTICALLY with drag handles */}
        <Panel defaultSize={40} minSize={20}>
          <div style={styles.rightPanel} ref={containerRef}>

            {/* 1. Output */}
            <div style={{ ...styles.section, height: `${pcts[0]}%` }}>
              <div style={styles.panelLabel}>Output</div>
              <pre style={styles.outputText}>{output || 'Hit Run to see output here'}</pre>
            </div>

            {/* Drag handle between output and my notes */}
            <div style={styles.dragHandle} onMouseDown={(e) => onDividerMouseDown(0, e)} />

            {/* 2. My Notes */}
            <div style={{ ...styles.section, height: `${pcts[1]}%` }}>
              <MyNotes sharedMap={sharedMap} />
            </div>

            {/* Drag handle between my notes and their notes */}
            <div style={styles.dragHandle} onMouseDown={(e) => onDividerMouseDown(1, e)} />

            {/* 3. Their Notes */}
            <div style={{ ...styles.section, height: `${pcts[2]}%` }}>
              <TheirNotes sharedMap={sharedMap} />
            </div>

          </div>
        </Panel>

      </PanelGroup>
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  logo: { fontWeight: 'bold', fontSize: '16px', marginRight: 'auto' },
  select: {
    background: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '13px',
  },
  roleRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  roleBadge: (role) => ({
    fontSize: '12px',
    padding: '3px 8px',
    borderRadius: '4px',
    background: role === 'interviewer' ? '#1a4a8a' : '#4a1a1a',
    color: role === 'interviewer' ? '#7ab3f5' : '#f57a7a',
    fontWeight: 'bold',
  }),
  swapBtn: {
    background: 'none', border: '1px solid #555', borderRadius: '4px',
    color: '#aaa', fontSize: '13px', padding: '2px 7px', cursor: 'pointer',
  },
  ghostBtn: {
    background: 'none', border: '1px solid #555', borderRadius: '4px',
    color: '#aaa', fontSize: '13px', padding: '5px 10px', cursor: 'pointer',
  },
  runButton: {
    background: '#0e7a0e', color: '#fff', border: 'none',
    borderRadius: '4px', padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
  },
  main: { flex: 1, overflow: 'hidden' },
  // fill: makes children of Panel take full height — required by react-resizable-panels
  fill: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  resizeHandleV: {
    width: '4px',
    background: '#2a2a2a',
    cursor: 'col-resize',
    flexShrink: 0,
    borderLeft: '1px solid #444',
    borderRight: '1px solid #444',
  },
  resizeHandleH: {
    height: '4px',
    background: '#2a2a2a',
    cursor: 'row-resize',
    flexShrink: 0,
    borderTop: '1px solid #444',
    borderBottom: '1px solid #444',
  },
  rightPanel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #444',
    overflow: 'hidden',
  },
  // Each stacked section in the right panel
  section: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flexShrink: 0,
  },
  // Gray visible drag handle between sections
  dragHandle: {
    height: '6px',
    background: '#3a3a3a',
    cursor: 'row-resize',
    flexShrink: 0,
    borderTop: '1px solid #555',
    borderBottom: '1px solid #555',
  },
  panelLabel: {
    padding: '8px 12px',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  outputText: {
    flex: 1, padding: '12px', margin: 0,
    fontSize: '13px', color: '#d4d4d4',
    overflow: 'auto', whiteSpace: 'pre-wrap',
  },
}
