import { useState } from 'react'

// Judge0 CE public instance — free, no API key required
// Language IDs: https://ce.judge0.com/languages/
const LANGUAGE_IDS = {
  javascript: 63,
  python:     71,
  java:       62,
  cpp:        54,
}

const BASE_URL = 'https://ce.judge0.com'

export function useCodeRunner() {
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  async function runCode(code, language) {
    setIsRunning(true)
    setOutput('Running...')

    // wait=true tells Judge0 to block until execution is done — no polling needed
    const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: LANGUAGE_IDS[language],
      }),
    })

    if (!res.ok) {
      setOutput(`API error: ${res.status}`)
      setIsRunning(false)
      return
    }

    const data = await res.json()
    const out = data.stdout || data.stderr || data.compile_output || 'No output'
    setOutput(out)
    setIsRunning(false)
  }

  return { runCode, output, isRunning }
}
