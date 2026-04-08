import MonacoEditor from '@monaco-editor/react'

export default function Editor({ language, onChange, onMount, readOnly = false }) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme="vs-dark"
      onChange={onChange}
      onMount={onMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly,
      }}
    />
  )
}
