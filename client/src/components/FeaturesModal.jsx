const FEATURES = [
  {
    icon: '⌨',
    name: 'Live code editor',
    desc: 'Monaco editor (same as VS Code) synced in real time. Every keystroke appears on everyone\'s screen instantly.',
  },
  {
    icon: '▶',
    name: 'Code runner',
    desc: 'Run Python, JavaScript, Java, or C++ without leaving the room. Output is shared with everyone.',
  },
  {
    icon: '◻',
    name: 'Collaborative whiteboard',
    desc: 'Full Excalidraw canvas for system diagrams, flowcharts, or sketching. Synced live, exported with your summary.',
  },
  {
    icon: '◷',
    name: 'Shared timer',
    desc: 'Countdown or stopwatch, synced for all participants. Click the digits to set a custom time. Color shifts green → amber → red as time runs out.',
  },
  {
    icon: '⬡',
    name: 'Roles',
    desc: 'First person to join becomes the interviewer, second the interviewee. Additional people are viewers (read-only editor). Roles can be swapped mid-session.',
  },
  {
    icon: '≡',
    name: 'Notes',
    desc: 'Each participant can write and share their own notes. Tabs show name and role. Share or unshare at any point.',
  },
  {
    icon: '◈',
    name: 'Resource drawer',
    desc: 'LeetCode patterns with insertable code templates, behavioral STAR questions, system design checklist, and general tips — all without leaving the room.',
  },
  {
    icon: '↓',
    name: 'Session summary',
    desc: 'Export the full session as a formatted markdown file including code, shared notes, participant list, and a whiteboard snapshot.',
  },
  {
    icon: '3',
    name: '3-2-1 countdown',
    desc: 'When a second person joins, a countdown plays for everyone simultaneously signalling the interview has started.',
  },
  {
    icon: '⎘',
    name: 'Paste detection',
    desc: 'A toast appears for everyone when someone pastes code, showing who pasted and how many lines.',
  },
]

export default function FeaturesModal({ onClose, onDemo }) {
  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        <div style={styles.header}>
          <div>
            <div style={styles.title}>What MockPad does</div>
            <div style={styles.subtitle}>Everything you need for a mock interview, nothing else.</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.grid}>
          {FEATURES.map((f, i) => (
            <div key={i} style={styles.card}>
              <span style={styles.icon}>{f.icon}</span>
              <div>
                <div style={styles.name}>{f.name}</div>
                <div style={styles.desc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeLink}>Maybe later</button>
          <button onClick={onDemo} style={styles.demoBtn}>Try demo room →</button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9000,
    padding: '20px',
  },
  modal: {
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '14px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '88vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '24px 28px 20px',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#666',
    fontFamily: 'monospace',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#555', fontSize: '18px',
    cursor: 'pointer', padding: '0 4px',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1px',
    overflowY: 'auto',
    background: '#2a2a2a',
  },
  card: {
    display: 'flex',
    gap: '14px',
    padding: '18px 20px',
    background: '#1e1e1e',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: '18px',
    flexShrink: 0,
    marginTop: '1px',
    width: '22px',
    textAlign: 'center',
    color: '#569cd6',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  name: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#d4d4d4',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  desc: {
    fontSize: '12px',
    color: '#777',
    lineHeight: '1.55',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #2a2a2a',
    flexShrink: 0,
  },
  closeLink: {
    background: 'none', border: 'none',
    color: '#555', fontSize: '13px',
    cursor: 'pointer', fontFamily: 'monospace',
    padding: '8px 12px',
  },
  demoBtn: {
    background: '#0e7a0e', border: 'none',
    borderRadius: '6px', color: '#fff',
    fontSize: '13px', fontWeight: 'bold',
    padding: '10px 20px', cursor: 'pointer',
    fontFamily: 'monospace',
  },
}
