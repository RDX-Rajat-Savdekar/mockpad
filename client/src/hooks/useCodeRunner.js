import { useState } from 'react'

// Judge0 CE public instance — free, no API key required
const LANGUAGE_IDS = {
  javascript: 63,
  python:     71,
  java:       62,
  cpp:        54,
}

const BASE_URL = 'https://ce.judge0.com'

export function useCodeRunner() {
  const [isRunning, setIsRunning] = useState(false)

  // Returns the output string instead of setting state internally
  // so the caller (App.jsx) can sync it via Y.Map
  async function runCode(code, language) {
    setIsRunning(true)

    const res = await fetch(`${BASE_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: LANGUAGE_IDS[language],
      }),
    })

    setIsRunning(false)

    if (!res.ok) return `API error: ${res.status}`

    const data = await res.json()
    return data.stdout || data.stderr || data.compile_output || 'No output'
  }

  return { runCode, isRunning }
}
