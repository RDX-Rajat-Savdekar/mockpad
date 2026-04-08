import { useState, useEffect, useRef, useCallback } from 'react'

// sharedMap keys: timerRunning, timerStartedAt, timerElapsed, timerDuration
// timerDuration = null  → stopwatch (count up)
// timerDuration = ms    → countdown

const PRESETS = [
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '45m', ms: 45 * 60 * 1000 },
  { label: '1h',  ms: 60 * 60 * 1000 },
]

const HOUR_MS = 60 * 60 * 1000
const RING_R = 10
const RING_CIRC = 2 * Math.PI * RING_R  // ≈ 62.83

function ringColor(ratio, isCountdown) {
  if (!isCountdown) return '#569cd6'       // SW → blue
  if (ratio > 0.5)  return '#5a9a5a'       // >50% left → green
  if (ratio > 0.25) return '#d4a44a'       // 25–50% → amber
  return '#cc4444'                          // <25% → red
}

export default function Timer({ sharedMap }) {
  const [display, setDisplay] = useState('00:00')
  const [running, setRunning] = useState(false)
  const [duration, setDuration] = useState(null)
  const [ratio, setRatio] = useState(0)
  const [expired, setExpired] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const inputRef = useRef(null)
  // key bumped when expired so the CSS animation re-triggers on each expiry
  const expiredKeyRef = useRef(0)

  function getElapsed() {
    const isRunning = sharedMap.get('timerRunning')
    const startedAt = sharedMap.get('timerStartedAt')
    const elapsed   = sharedMap.get('timerElapsed') ?? 0
    if (isRunning && startedAt) return elapsed + (Date.now() - startedAt)
    return elapsed
  }

  function formatMs(ms) {
    const totalSec = Math.floor(Math.max(0, ms) / 1000)
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
    const s = (totalSec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function computeDisplay(elapsed, dur) {
    if (dur != null) return formatMs(Math.max(0, dur - elapsed))
    return formatMs(elapsed)
  }

  function computeRatio(elapsed, dur) {
    if (dur != null) return Math.max(0, Math.min(1, (dur - elapsed) / dur))
    return (elapsed % HOUR_MS) / HOUR_MS
  }

  // Local tick every 500ms
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = getElapsed()
      const dur = sharedMap.get('timerDuration') ?? null
      setDisplay(computeDisplay(elapsed, dur))
      setRatio(computeRatio(elapsed, dur))

      // Auto-stop countdown at zero
      if (dur != null && elapsed >= dur && sharedMap.get('timerRunning')) {
        sharedMap.set('timerRunning', false)
        sharedMap.set('timerElapsed', dur)
        sharedMap.set('timerStartedAt', null)
        expiredKeyRef.current += 1
        setExpired(true)
        setTimeout(() => setExpired(false), 2000)
      }
    }, 500)
    return () => clearInterval(id)
  }, [sharedMap])

  // Observe remote changes
  useEffect(() => {
    function onMapChange() {
      const isRunning = sharedMap.get('timerRunning') ?? false
      const dur       = sharedMap.get('timerDuration') ?? null
      const elapsed   = getElapsed()
      setRunning(isRunning)
      setDuration(dur)
      setDisplay(computeDisplay(elapsed, dur))
      setRatio(computeRatio(elapsed, dur))
    }
    sharedMap.observe(onMapChange)
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  function handleStart() {
    sharedMap.set('timerRunning', true)
    sharedMap.set('timerStartedAt', Date.now())
  }
  function handleStop() {
    const elapsed = getElapsed()
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerElapsed', elapsed)
    sharedMap.set('timerStartedAt', null)
  }
  function handleReset() {
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
    setExpired(false)
  }
  function handlePreset(ms) {
    sharedMap.set('timerDuration', ms)
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
    setExpired(false)
  }
  function handleDigitClick() {
    if (running) return  // don't edit while ticking
    setEditVal('')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Parse "13" → 13 min, "1:30" → 1m30s, "90" → 90 min
  function parseInput(raw) {
    const s = raw.trim()
    if (!s) return null
    if (s.includes(':')) {
      const [mPart, sPart] = s.split(':')
      const m = parseInt(mPart, 10) || 0
      const sec = parseInt(sPart, 10) || 0
      return (m * 60 + sec) * 1000
    }
    const n = parseInt(s, 10)
    if (isNaN(n) || n <= 0) return null
    return n * 60 * 1000
  }

  function commitEdit() {
    setEditing(false)
    const ms = parseInput(editVal)
    if (ms == null) return  // invalid — just close, keep current state
    sharedMap.set('timerDuration', ms)
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
    setExpired(false)
  }

  function handleEditKey(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleStopwatch() {
    sharedMap.set('timerDuration', null)
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
    setExpired(false)
  }

  const isCountdown = duration != null
  const color = ringColor(ratio, isCountdown)
  const ringOffset = RING_CIRC * (1 - ratio)

  // Split '00:00' into individual chars for per-digit animation
  const chars = display.split('')  // ['0','0',':','0','0']

  return (
    <div style={styles.wrapper}>

      {/* Mode presets */}
      <div style={styles.presets}>
        <button onClick={handleStopwatch} style={styles.preset(duration === null)}>SW</button>
        {PRESETS.map(({ label, ms }) => (
          <button key={label} onClick={() => handlePreset(ms)} style={styles.preset(duration === ms)}>
            {label}
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      {/* Ring + digits + controls */}
      <div style={styles.display}>

        {/* Progress ring */}
        <svg
          width="26" height="26"
          style={{ flexShrink: 0, overflow: 'visible' }}
          key={expired ? expiredKeyRef.current : 'ring'}
        >
          {/* Track */}
          <circle cx="13" cy="13" r={RING_R} fill="none" stroke="#2a2a2a" strokeWidth="2" />
          {/* Progress arc */}
          <circle
            cx="13" cy="13" r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            transform="rotate(-90 13 13)"
            className={expired ? 'ring-expired' : running ? 'ring-running' : ''}
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.4s ease' }}
          />
        </svg>

        {/* Animated digits — click to edit (when not running) */}
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKey}
            placeholder="mm or mm:ss"
            style={styles.editInput}
          />
        ) : (
          <span
            style={{ ...styles.digits, cursor: running ? 'default' : 'text' }}
            onClick={handleDigitClick}
            title={running ? '' : 'Click to set custom time'}
          >
            {chars.map((ch, i) =>
              ch === ':' ? (
                <span key="colon" style={styles.colon}>:</span>
              ) : (
                <span key={i + ch} className="digit-flip" style={{ ...styles.digit, color }}>
                  {ch}
                </span>
              )
            )}
          </span>
        )}

        {/* Play / Pause */}
        <button
          onClick={running ? handleStop : handleStart}
          style={styles.btn}
          title={running ? 'Pause' : 'Start'}
        >
          {running ? '⏸' : '▶'}
        </button>

        {/* Reset */}
        <button onClick={handleReset} style={{ ...styles.btn, color: '#666' }} title="Reset">
          ↺
        </button>
      </div>

    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  presets: {
    display: 'flex',
    gap: '3px',
  },
  preset: (active) => ({
    background: active ? '#2a3d2a' : 'none',
    border: `1px solid ${active ? '#5a9a5a' : '#444'}`,
    borderRadius: '4px',
    color: active ? '#8fd88f' : '#777',
    fontSize: '11px',
    padding: '2px 6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  divider: {
    width: '1px',
    height: '16px',
    background: '#3a3a3a',
    flexShrink: 0,
  },
  display: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: '8px',
    padding: '3px 8px 3px 6px',
  },
  digits: {
    display: 'flex',
    alignItems: 'baseline',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    lineHeight: 1,
  },
  digit: {
    display: 'inline-block',
    minWidth: '9px',
    textAlign: 'center',
    transition: 'color 0.4s',
  },
  editInput: {
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #569cd6',
    color: '#d4d4d4',
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    width: '58px',
    outline: 'none',
    textAlign: 'center',
    padding: '0 2px',
  },
  colon: {
    color: '#555',
    margin: '0 1px',
    fontSize: '14px',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  btn: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '1px 3px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
}
