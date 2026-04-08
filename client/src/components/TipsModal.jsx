import { RESOURCES } from '../data/resources'

// Pick the most useful quick tips per interview type for the pre-interview modal.
function getTips(interviewType) {
  switch (interviewType) {
    case 'leetcode':
      return {
        heading: 'Before you start coding',
        items: RESOURCES.leetcode.tips.slice(0, 5),
      }
    case 'behavioral':
      return {
        heading: 'Behavioral interview tips',
        items: [
          'Use the STAR format: Situation → Task → Action → Result.',
          'Speak in "I" not "we" — the interviewer wants to know what YOU did.',
          'Quantify your results whenever possible.',
          'Prepare 6–8 strong stories that can flex across different questions.',
          'It\'s fine to take 10–15 seconds to think before answering.',
        ],
      }
    case 'system-design':
      return {
        heading: 'System design tips',
        items: [
          'Clarify requirements first — functional AND non-functional.',
          'State your assumptions explicitly before diving in.',
          'Draw as you talk — use the whiteboard from the start.',
          'Estimate scale early: DAU, QPS, storage. Numbers anchor your design.',
          'Discuss trade-offs for every major decision you make.',
        ],
      }
    default:
      return {
        heading: 'Interview tips',
        items: RESOURCES.general.tips.slice(0, 5).map(t => `${t.title}: ${t.body}`),
      }
  }
}

export default function TipsModal({ interviewType, onDismiss }) {
  const { heading, items } = getTips(interviewType)

  return (
    <div style={styles.backdrop} onClick={onDismiss}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>{heading}</span>
        </div>

        <ul style={styles.list}>
          {items.map((tip, i) => (
            <li key={i} style={styles.item}>
              <span style={styles.bullet}>›</span>
              <span style={styles.text}>{tip}</span>
            </li>
          ))}
        </ul>

        <button onClick={onDismiss} style={styles.btn}>
          Got it — let's go
        </button>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 7000,
    animation: 'fadeInUp 0.2s ease both',
  },
  modal: {
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '12px',
    padding: '28px 32px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  list: {
    listStyle: 'none',
    margin: '0 0 24px 0',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  item: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#569cd6',
    fontSize: '14px',
    flexShrink: 0,
    marginTop: '2px',
  },
  text: {
    fontSize: '13px',
    color: '#bbb',
    lineHeight: '1.55',
    fontFamily: 'monospace',
  },
  btn: {
    width: '100%',
    background: '#0e7a0e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '11px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'background 0.15s',
  },
}
