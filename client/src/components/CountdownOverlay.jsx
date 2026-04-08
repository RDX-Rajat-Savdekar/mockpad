import { useState, useEffect } from 'react'

const MESSAGES = [
  'All the best.',
  "You've got this.",
  'Do your best.',
  'Time to shine.',
  'Show what you know.',
  'Give it your all.',
]

export default function CountdownOverlay({ onDone }) {
  const [count, setCount] = useState(3)
  const [phase, setPhase] = useState('countdown') // 'countdown' | 'message' | 'exit'
  const [message]         = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

  useEffect(() => {
    const t1 = setTimeout(() => setCount(2),         1000)
    const t2 = setTimeout(() => setCount(1),         2000)
    const t3 = setTimeout(() => setPhase('message'), 3000)
    const t4 = setTimeout(() => setPhase('exit'),    3600)
    const t5 = setTimeout(() => onDone(),            3850)
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, [onDone])

  return (
    <div style={styles.overlay} className={phase === 'exit' ? 'shutter-exit' : 'shutter-enter'}>
      {phase === 'countdown' ? (
        <span key={count} style={styles.number} className="num-pop">{count}</span>
      ) : (
        <div style={styles.messageWrap} className="msg-reveal">
          <div style={styles.message}>{message}</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(8, 8, 14, 0.96)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 8000,
    willChange: 'opacity',
  },
  number: {
    fontSize: '120px',
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'monospace',
    lineHeight: 1,
    userSelect: 'none',
    willChange: 'opacity',
  },
  messageWrap: {
    textAlign: 'center',
    willChange: 'opacity',
  },
  message: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
}
