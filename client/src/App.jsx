import { useState } from 'react'
import Editor from './components/Editor'

const LANGUAGES = ['javascript', 'python', 'java', 'cpp']

export default function App() {
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')

  function handleRun() {
    // Step 2: wire up Judge0 here
    setOutput('Run not implemented yet')
  }

  return (
    <div style={styles.container}>

      {/* Top bar */}
      <div style={styles.toolbar}>
        <span style={styles.logo}>MockPad</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={styles.select}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <button onClick={handleRun} style={styles.runButton}>
          Run
        </button>
      </div>

      {/* Main area */}
      <div style={styles.main}>

        {/* Editor panel */}
        <div style={styles.editorPanel}>
          <Editor language={language} onChange={setCode} />
        </div>

        {/* Output panel */}
        <div style={styles.outputPanel}>
          <div style={styles.outputLabel}>Output</div>
          <pre style={styles.outputText}>
            {output || 'Hit Run to see output here.'}
          </pre>
        </div>

      </div>
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginRight: 'auto',
  },
  select: {
    background: '#3c3c3c',
    color: '#d4d4d4',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '13px',
  },
  runButton: {
    background: '#0e7a0e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  editorPanel: {
    flex: 1,
    overflow: 'hidden',
  },
  outputPanel: {
    width: '380px',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #444',
    background: '#1e1e1e',
  },
  outputLabel: {
    padding: '8px 12px',
    background: '#2d2d2d',
    borderBottom: '1px solid #444',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  outputText: {
    flex: 1,
    padding: '12px',
    margin: 0,
    fontSize: '13px',
    color: '#d4d4d4',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
  },
}
