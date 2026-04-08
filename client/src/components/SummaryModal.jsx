import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { exportToSvg } from '@excalidraw/excalidraw'

function formatMs(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function buildMarkdown({ roomId, interviewType, language, sharedMap, editor, peers }) {
  const elapsed   = sharedMap.get('timerElapsed') ?? 0
  const isRunning = sharedMap.get('timerRunning')
  const startedAt = sharedMap.get('timerStartedAt')
  const totalMs   = isRunning && startedAt ? elapsed + (Date.now() - startedAt) : elapsed
  const code = editor?.getValue() ?? ''
  const notes = []
  sharedMap.forEach((value, key) => {
    if (key.startsWith('sharedNotes-') && value?.text) notes.push(value)
  })
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const participantLines = peers.map(p => `- **${p.isMe ? `${p.name} (you)` : p.name}** — ${p.role}`).join('\n')
  const notesSection = notes.length
    ? notes.map(n => `### ${n.name} · ${n.role}\n\n${n.text}`).join('\n\n---\n\n')
    : '_No shared notes._'

  return `# MockPad — Interview Summary

**Date:** ${date}
**Room:** \`${roomId}\`
**Type:** ${interviewType}
**Language:** ${language}
**Duration:** ${formatMs(totalMs)}

---

## Participants

${participantLines || '_No participant data._'}

---

## Code

\`\`\`${language}
${code || '(empty)'}
\`\`\`

---

## Notes

${notesSection}`.trim()
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SummaryModal({ onClose, roomId, interviewType, language, sharedMap, editor, peers, wbApi }) {
  const [copied, setCopied]   = useState(false)
  const [svgDataUrl, setSvgDataUrl] = useState(null)  // for preview
  const [svgString, setSvgString]   = useState(null)  // for download
  const markdown = buildMarkdown({ roomId, interviewType, language, sharedMap, editor, peers })
  const slug = `mockpad-${roomId.slice(0, 8)}`

  // Generate SVG from current Excalidraw state
  useEffect(() => {
    if (!wbApi) return
    const elements = wbApi.getSceneElements()
    if (!elements.length) return

    exportToSvg({
      elements,
      appState: {
        ...wbApi.getAppState(),
        exportWithDarkMode: true,
        exportBackground: true,
      },
      files: wbApi.getFiles(),
    }).then(svgEl => {
      // Set a white-ish background so it looks good as a preview
      svgEl.setAttribute('style', 'background:#1e1f26')
      const str = new XMLSerializer().serializeToString(svgEl)
      setSvgString(str)
      const blob = new Blob([str], { type: 'image/svg+xml' })
      setSvgDataUrl(URL.createObjectURL(blob))
    }).catch(() => {})

    return () => {
      if (svgDataUrl) URL.revokeObjectURL(svgDataUrl)
    }
  }, [wbApi])

  function handleCopy() {
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    downloadBlob(markdown, `${slug}.md`, 'text/markdown')
    if (svgString) {
      setTimeout(() => downloadBlob(svgString, `${slug}-whiteboard.svg`, 'image/svg+xml'), 200)
    }
  }

  const hasWhiteboard = !!svgDataUrl

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        <div style={styles.header}>
          <span style={styles.title}>Session Summary</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Tab-like split: markdown on top, whiteboard preview below */}
        <div style={styles.scrollArea}>

          <div style={styles.mdSection}>
            <ReactMarkdown components={mdComponents}>{markdown}</ReactMarkdown>
          </div>

          {hasWhiteboard && (
            <>
              <div style={styles.wbDivider}>
                <span style={styles.wbLabel}>Whiteboard</span>
              </div>
              <div style={styles.wbPreview}>
                <img
                  src={svgDataUrl}
                  alt="Whiteboard snapshot"
                  style={styles.wbImg}
                />
              </div>
            </>
          )}

        </div>

        <div style={styles.actions}>
          <button onClick={handleCopy} style={styles.copyBtn}>
            {copied ? '✓ Copied' : 'Copy markdown'}
          </button>
          <button onClick={handleDownload} style={styles.downloadBtn}>
            {hasWhiteboard ? 'Download .md + .svg' : 'Download .md'}
          </button>
        </div>

      </div>
    </div>
  )
}

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e0e0e0', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '1px solid #333' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '20px 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7ab3f5', margin: '14px 0 6px 0' }}>{children}</h3>,
  p: ({ children }) => <p style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.6', margin: '0 0 10px 0' }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: '#d4d4d4', fontWeight: 'bold' }}>{children}</strong>,
  code: ({ inline, children }) => inline
    ? <code style={{ background: '#2a2a2a', color: '#ce9178', padding: '1px 5px', borderRadius: '3px', fontSize: '12px', fontFamily: 'monospace' }}>{children}</code>
    : <pre style={{ background: '#141414', border: '1px solid #333', borderRadius: '6px', padding: '12px 14px', overflowX: 'auto', margin: '10px 0' }}><code style={{ color: '#d4d4d4', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.6' }}>{children}</code></pre>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '16px 0' }} />,
  ul: ({ children }) => <ul style={{ margin: '6px 0 10px 0', paddingLeft: '18px' }}>{children}</ul>,
  li: ({ children }) => <li style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.6', marginBottom: '4px' }}>{children}</li>,
  em: ({ children }) => <em style={{ color: '#888', fontStyle: 'italic' }}>{children}</em>,
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 7500,
    animation: 'fadeInUp 0.2s ease both',
  },
  modal: {
    background: '#1e1e1e',
    border: '1px solid #3a3a3a',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  title: {
    fontSize: '15px', fontWeight: 'bold',
    color: '#e0e0e0', fontFamily: 'monospace',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#666', fontSize: '16px',
    cursor: 'pointer', padding: '2px 6px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    background: '#181818',
  },
  mdSection: {
    padding: '20px 24px',
  },
  wbDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 24px',
    marginBottom: '0',
  },
  wbLabel: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: 'monospace',
    background: '#181818',
    padding: '0 8px 0 0',
    flexShrink: 0,
  },
  wbPreview: {
    margin: '12px 24px 24px',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#1e1f26',
  },
  wbImg: {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxHeight: '320px',
    objectFit: 'contain',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '1px solid #333',
    flexShrink: 0,
  },
  copyBtn: {
    flex: 1,
    background: '#252525', border: '1px solid #444',
    borderRadius: '6px', color: '#d4d4d4',
    fontSize: '13px', padding: '9px',
    cursor: 'pointer', fontFamily: 'monospace',
    transition: 'background 0.15s',
  },
  downloadBtn: {
    flex: 1,
    background: '#0e7a0e', border: 'none',
    borderRadius: '6px', color: '#fff',
    fontSize: '13px', fontWeight: 'bold', padding: '9px',
    cursor: 'pointer', fontFamily: 'monospace',
    transition: 'background 0.15s',
  },
}
