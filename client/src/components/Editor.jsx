import MonacoEditor from '@monaco-editor/react'

const STARTER_CODE = `Happy Coding :-)
`

export default function Editor({ language, onChange }) {
  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme="vs-dark"
      defaultValue={STARTER_CODE}
      onChange={onChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
      }}
    />
  )
}
