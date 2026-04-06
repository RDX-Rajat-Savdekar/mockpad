import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'

const WS_SERVER = import.meta.env.VITE_WS_SERVER ?? 'ws://localhost:1234'

// y-monaco creates decoration elements with class names like yRemoteSelection-{clientID}
// but never injects the actual CSS — we have to do it ourselves.
function injectCursorStyles(awareness, doc) {
  function update() {
    const rules = []
    awareness.getStates().forEach((state, clientID) => {
      if (clientID === doc.clientID) return
      const color = state.user?.color ?? '#888'
      const name = state.user?.name ?? 'Anonymous'
      rules.push(`.yRemoteSelection-${clientID} { background-color: ${color}40; }`)
      rules.push(`.yRemoteSelectionHead-${clientID} { position: absolute; border-left: 2px solid ${color}; height: 100%; box-sizing: border-box; }`)
      // Use only first name — color already identifies the user
      const shortName = name.split(' ')[0]
      rules.push(`.yRemoteSelectionHead-${clientID}::after { content: '${shortName}'; position: absolute; top: -18px; left: -1px; background: ${color}; color: #000; font-size: 11px; font-family: monospace; padding: 1px 5px; border-radius: 3px; white-space: nowrap; pointer-events: none; }`)
    })
    let el = document.getElementById('yjs-cursor-styles')
    if (!el) {
      el = document.createElement('style')
      el.id = 'yjs-cursor-styles'
      document.head.appendChild(el)
    }
    el.textContent = rules.join('\n')
  }

  awareness.on('change', update)
  update()
  return () => awareness.off('change', update)
}

export function useYjs(roomId, editor, username, color) {
  const docRef = useRef(null)
  if (!docRef.current) {
    docRef.current = new Y.Doc()
  }

  const providerRef = useRef(null)
  if (!providerRef.current) {
    providerRef.current = new WebsocketProvider(WS_SERVER, roomId, docRef.current)
  }

  // Set local user info on awareness whenever name/color changes
  useEffect(() => {
    providerRef.current.awareness.setLocalStateField('user', { name: username, color })
  }, [username, color])

  useEffect(() => {
    if (!editor) return
    const doc = docRef.current
    const provider = providerRef.current
    const yText = doc.getText('monaco')
    const model = editor.getModel()
    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness)

    // Start injecting CSS for remote cursors
    const cleanup = injectCursorStyles(provider.awareness, doc)

    return () => {
      binding.destroy()
      cleanup()
    }
  }, [editor])

  const doc = docRef.current
  const provider = providerRef.current

  return {
    doc,
    provider,
    yText: doc.getText('monaco'),
  }
}
