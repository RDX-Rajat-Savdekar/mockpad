import { useState, useEffect } from 'react'

// Shared map keys: timerRunning, timerStartedAt, timerElapsed, timerDuration
// timerDuration = null → stopwatch (count up)
// timerDuration = ms   → countdown (count down from duration)

const PRESETS = [
  { label: '30m', ms: 30 * 60 * 1000 },
  { label: '45m', ms: 45 * 60 * 1000 },
  { label: '1h',  ms: 60 * 60 * 1000 },
]

export default function Timer({ sharedMap }) {
  const [display, setDisplay] = useState('00:00')
  const [running, setRunning] = useState(false)
  const [duration, setDuration] = useState(null)

  function getElapsed() {
    const isRunning = sharedMap.get('timerRunning')
    const startedAt = sharedMap.get('timerStartedAt')
    const elapsed = sharedMap.get('timerElapsed') ?? 0
    if (isRunning && startedAt) return elapsed + (Date.now() - startedAt)
    return elapsed
  }

  function formatMs(ms) {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
    const s = (totalSeconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function computeDisplay(elapsed, dur) {
    if (dur != null) {
      const remaining = Math.max(0, dur - elapsed)
      return formatMs(remaining)
    }
    return formatMs(elapsed)
  }

  // Tick locally every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsed()
      const dur = sharedMap.get('timerDuration') ?? null
      setDisplay(computeDisplay(elapsed, dur))

      // Auto-stop countdown when it hits zero
      if (dur != null && elapsed >= dur && sharedMap.get('timerRunning')) {
        sharedMap.set('timerRunning', false)
        sharedMap.set('timerElapsed', dur)
        sharedMap.set('timerStartedAt', null)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [sharedMap])

  // Observe remote changes
  useEffect(() => {
    function onMapChange() {
      const isRunning = sharedMap.get('timerRunning') ?? false
      const dur = sharedMap.get('timerDuration') ?? null
      const elapsed = getElapsed()
      setRunning(isRunning)
      setDuration(dur)
      setDisplay(computeDisplay(elapsed, dur))
    }
    sharedMap.observe(onMapChange)
    return () => sharedMap.unobserve(onMapChange)
  }, [sharedMap])

  function handleStart() {
    sharedMap.set('timerRunning', true)
    sharedMap.set('timerStartedAt', Date.now())
  }

  function handleStop() {
    const elapsed = getElapsed()  // capture BEFORE setting timerRunning=false
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerElapsed', elapsed)
    sharedMap.set('timerStartedAt', null)
  }

  function handleReset() {
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
    // keep the duration — so you can restart the same countdown
  }

  function handlePreset(ms) {
    // Set duration and reset elapsed — switches to countdown mode
    sharedMap.set('timerDuration', ms)
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
  }

  function handleStopwatch() {
    // Clear duration — switches back to stopwatch mode
    sharedMap.set('timerDuration', null)
    sharedMap.set('timerRunning', false)
    sharedMap.set('timerStartedAt', null)
    sharedMap.set('timerElapsed', 0)
  }

  return (
    <div style={styles.wrapper}>
      {/* Preset buttons */}
      <div style={styles.presets}>
        <button
          onClick={handleStopwatch}
          style={styles.preset(duration === null)}
        >
          SW
        </button>
        {PRESETS.map(({ label, ms }) => (
          <button
            key={label}
            onClick={() => handlePreset(ms)}
            style={styles.preset(duration === ms)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timer display + controls */}
      <div style={styles.container}>
        <span style={styles.display}>{display}</span>
        {!running
          ? <button onClick={handleStart} style={styles.btn}>▶</button>
          : <button onClick={handleStop} style={styles.btn}>⏸</button>
        }
        <button onClick={handleReset} style={{ ...styles.btn, color: '#888' }}>↺</button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  presets: {
    display: 'flex',
    gap: '3px',
  },
  preset: (active) => ({
    background: active ? '#3a5a3a' : '#3c3c3c',
    border: `1px solid ${active ? '#5a9a5a' : '#555'}`,
    borderRadius: '4px',
    color: active ? '#8fd88f' : '#aaa',
    fontSize: '11px',
    padding: '3px 6px',
    cursor: 'pointer',
  }),
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '6px',
    padding: '4px 8px',
  },
  display: {
    fontFamily: 'monospace',
    fontSize: '15px',
    color: '#d4d4d4',
    minWidth: '42px',
  },
  btn: {
    background: 'none',
    border: 'none',
    color: '#d4d4d4',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px',
  },
}
