import { useState, useEffect } from 'react'
import { RESOURCES } from '../data/resources'

export default function ResourceDrawer({ open, onClose, interviewType, onInsertCode }) {
  const [activeType, setActiveType] = useState(interviewType)
  const [expandedPattern, setExpandedPattern] = useState(null)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [checkedItems, setCheckedItems] = useState({})

  // Sync active type when the room's interview type changes
  useEffect(() => { setActiveType(interviewType) }, [interviewType])

  const types = Object.keys(RESOURCES)
  const data = RESOURCES[activeType]

  function toggleCheck(key) {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      {/* Backdrop */}
      {open && <div style={styles.backdrop} onClick={onClose} />}

      {/* Drawer */}
      <div style={{ ...styles.drawer, transform: open ? 'translateX(0)' : 'translateX(100%)' }}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Resources</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Type tabs */}
        <div style={styles.typeTabs}>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              style={styles.typeTab(activeType === t)}
            >
              {RESOURCES[t].label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={styles.content}>

          {/* ── LeetCode ── */}
          {activeType === 'leetcode' && (
            <>
              <Section title="Patterns">
                {data.patterns.map((p, i) => (
                  <div key={i} style={styles.patternCard}>
                    <button
                      style={styles.patternHeader}
                      onClick={() => setExpandedPattern(expandedPattern === i ? null : i)}
                    >
                      <div>
                        <div style={styles.patternName}>{p.name}</div>
                        <div style={styles.patternWhen}>{p.when}</div>
                      </div>
                      <span style={styles.chevron}>{expandedPattern === i ? '▲' : '▼'}</span>
                    </button>
                    {expandedPattern === i && (
                      <div style={styles.codeBlock}>
                        <div style={styles.codeActions}>
                          <button
                            style={styles.insertBtn}
                            onClick={() => onInsertCode(p.code)}
                          >
                            Insert into editor
                          </button>
                        </div>
                        <pre style={styles.code}>{p.code}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </Section>
              <Section title="Tips">
                {data.tips.map((tip, i) => (
                  <div key={i} style={styles.tipRow}>
                    <span style={styles.bullet}>›</span>
                    <span style={styles.tipText}>{tip}</span>
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ── Behavioral ── */}
          {activeType === 'behavioral' && (
            <>
              <Section title="STAR Format">
                <div style={styles.starGrid}>
                  {data.star.map((s, i) => (
                    <div key={i} style={styles.starCard}>
                      <div style={styles.starLabel}>{s.label}</div>
                      <div style={styles.starDesc}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </Section>
              {data.categories.map((cat, ci) => (
                <Section key={ci} title={cat.name}>
                  {cat.questions.map((q, qi) => (
                    <div key={qi} style={styles.questionRow}>
                      <span style={styles.qNum}>{qi + 1}.</span>
                      <span style={styles.qText}>{q}</span>
                    </div>
                  ))}
                </Section>
              ))}
            </>
          )}

          {/* ── System Design ── */}
          {activeType === 'system-design' && (
            <>
              <Section title="Design Checklist">
                {data.checklist.map((section, si) => (
                  <div key={si} style={styles.checkSection}>
                    <div style={styles.checkStep}>{section.step}</div>
                    {section.items.map((item, ii) => {
                      const key = `${si}-${ii}`
                      return (
                        <label key={ii} style={styles.checkRow}>
                          <input
                            type="checkbox"
                            checked={!!checkedItems[key]}
                            onChange={() => toggleCheck(key)}
                            style={styles.checkbox}
                          />
                          <span style={{ ...styles.checkText, textDecoration: checkedItems[key] ? 'line-through' : 'none', color: checkedItems[key] ? '#555' : '#bbb' }}>
                            {item}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                ))}
              </Section>
              <Section title="Key Concepts">
                {data.concepts.map((c, i) => (
                  <div key={i} style={styles.conceptRow}>
                    <span style={styles.bullet}>›</span>
                    <span style={styles.conceptText}>{c}</span>
                  </div>
                ))}
              </Section>
              <Section title="Common Systems to Know">
                <div style={styles.tagCloud}>
                  {data.common.map((s, i) => (
                    <span key={i} style={styles.systemTag}>{s}</span>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ── General Tips ── */}
          {activeType === 'general' && (
            <Section title="Interview Tips">
              {data.tips.map((tip, i) => (
                <div key={i} style={styles.tipCard}>
                  <div style={styles.tipTitle}>{tip.title}</div>
                  <div style={styles.tipBody}>{tip.body}</div>
                </div>
              ))}
            </Section>
          )}

        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={sectionStyles.wrapper}>
      <div style={sectionStyles.title}>{title}</div>
      {children}
    </div>
  )
}

const sectionStyles = {
  wrapper: { marginBottom: '20px' },
  title: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '10px',
    paddingBottom: '6px',
    borderBottom: '1px solid #333',
  },
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
  },
  drawer: {
    position: 'fixed',
    top: 0, right: 0, bottom: 0,
    width: '360px',
    background: '#1e1e1e',
    borderLeft: '1px solid #3a3a3a',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1001,
    transition: 'transform 0.25s ease',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#666', fontSize: '16px',
    cursor: 'pointer', padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s',
  },
  typeTabs: {
    display: 'flex',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  typeTab: (active) => ({
    flex: 1,
    padding: '8px 4px',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #569cd6' : '2px solid transparent',
    color: active ? '#d4d4d4' : '#666',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: '-1px',
  }),
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  // LeetCode
  patternCard: {
    background: '#252525',
    border: '1px solid #333',
    borderRadius: '6px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  patternHeader: {
    width: '100%', background: 'none', border: 'none',
    padding: '10px 12px', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    textAlign: 'left',
  },
  patternName: { fontSize: '13px', color: '#d4d4d4', fontFamily: 'monospace', fontWeight: 'bold' },
  patternWhen: { fontSize: '11px', color: '#666', marginTop: '2px' },
  chevron: { color: '#555', fontSize: '10px', flexShrink: 0 },
  codeBlock: {
    borderTop: '1px solid #333',
    background: '#181818',
  },
  codeActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '6px 10px',
    borderBottom: '1px solid #2a2a2a',
  },
  insertBtn: {
    background: '#1a4a1a', border: '1px solid #3a6a3a',
    color: '#8fd88f', borderRadius: '4px',
    fontSize: '11px', padding: '3px 10px', cursor: 'pointer',
    fontFamily: 'monospace',
  },
  code: {
    margin: 0, padding: '12px',
    fontSize: '11px', color: '#d4d4d4',
    fontFamily: 'monospace', lineHeight: '1.6',
    overflowX: 'auto', whiteSpace: 'pre',
  },
  tipRow: {
    display: 'flex', gap: '8px',
    marginBottom: '6px', alignItems: 'flex-start',
  },
  bullet: { color: '#569cd6', fontSize: '13px', flexShrink: 0, marginTop: '1px' },
  tipText: { fontSize: '12px', color: '#aaa', lineHeight: '1.5' },
  // Behavioral
  starGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '8px', marginBottom: '4px',
  },
  starCard: {
    background: '#252525', border: '1px solid #333',
    borderRadius: '6px', padding: '10px',
  },
  starLabel: { fontSize: '11px', fontWeight: 'bold', color: '#569cd6', marginBottom: '4px', fontFamily: 'monospace' },
  starDesc: { fontSize: '11px', color: '#888', lineHeight: '1.4' },
  questionRow: {
    display: 'flex', gap: '8px',
    marginBottom: '8px', alignItems: 'flex-start',
  },
  qNum: { color: '#555', fontSize: '11px', flexShrink: 0, marginTop: '2px', minWidth: '14px' },
  qText: { fontSize: '12px', color: '#bbb', lineHeight: '1.5' },
  // System Design
  checkSection: { marginBottom: '14px' },
  checkStep: {
    fontSize: '12px', fontWeight: 'bold',
    color: '#d4a44a', marginBottom: '6px',
    fontFamily: 'monospace',
  },
  checkRow: {
    display: 'flex', gap: '8px', alignItems: 'flex-start',
    marginBottom: '5px', cursor: 'pointer',
  },
  checkbox: { marginTop: '3px', flexShrink: 0, accentColor: '#569cd6' },
  checkText: { fontSize: '12px', lineHeight: '1.4', transition: 'color 0.2s' },
  conceptRow: {
    display: 'flex', gap: '8px',
    marginBottom: '7px', alignItems: 'flex-start',
  },
  conceptText: { fontSize: '12px', color: '#aaa', lineHeight: '1.5' },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  systemTag: {
    background: '#252525', border: '1px solid #3a3a3a',
    borderRadius: '20px', padding: '3px 10px',
    fontSize: '11px', color: '#888',
  },
  // General
  tipCard: {
    background: '#252525', border: '1px solid #333',
    borderRadius: '6px', padding: '12px',
    marginBottom: '8px',
  },
  tipTitle: { fontSize: '13px', fontWeight: 'bold', color: '#d4d4d4', marginBottom: '4px', fontFamily: 'monospace' },
  tipBody: { fontSize: '12px', color: '#888', lineHeight: '1.5' },
}
