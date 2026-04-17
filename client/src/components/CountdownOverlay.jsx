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
  const [visible, setVisible] = useState(true)
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 900)
    const t2 = setTimeout(() => onDone(), 1100)
    return () => [t1, t2].forEach(clearTimeout)
  }, [onDone])

  return (
    <div style={{ ...styles.overlay, opacity: visible ? 1 : 0 }}>
      <div style={styles.message}>{message}</div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(8, 8, 14, 0.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 8000,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
  },
  message: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
}
