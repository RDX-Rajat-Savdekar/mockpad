import { useEffect, useState, useRef } from 'react'
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

export function useYjs(roomId, editor, username, color, userId) {
  const [conn, setConn] = useState(null) // { doc, provider }
  const [synced, setSynced] = useState(false)
  const [status, setStatus] = useState('connecting')
  const editorRef = useRef(editor)
  editorRef.current = editor

  // Create / recreate the Yjs connection whenever the room changes
  useEffect(() => {
    if (!roomId) return undefined

    const doc = new Y.Doc()
    const provider = new WebsocketProvider(WS_SERVER, roomId, doc)
    setConn({ doc, provider })
    setSynced(false)
    setStatus('connecting')

    const onStatus = ({ status: next }) => setStatus(next)
    const onSync = (isSynced) => setSynced(!!isSynced)

    provider.on('status', onStatus)
    provider.on('sync', onSync)
    // If the provider already synced before we attached (fast reconnect), catch it
    if (provider.synced) setSynced(true)

    // If the handshake hangs (common when the WS proxy/server is wedged),
    // surface a disconnected state so the UI doesn't look like a private room.
    const stuckTimer = setTimeout(() => {
      if (!provider.synced) setStatus('disconnected')
    }, 8000)

    return () => {
      clearTimeout(stuckTimer)
      provider.off('status', onStatus)
      provider.off('sync', onSync)
      provider.destroy()
      doc.destroy()
      setConn(null)
      setSynced(false)
      setStatus('connecting')
    }
  }, [roomId])

  // Keep awareness user info up to date
  useEffect(() => {
    if (!conn) return
    conn.provider.awareness.setLocalStateField('user', { name: username, color, userId })
  }, [conn, username, color, userId])

  // Bind Monaco once both the editor and the room connection exist
  useEffect(() => {
    if (!conn || !editor) return undefined
    const { doc, provider } = conn
    const yText = doc.getText('monaco')
    const model = editor.getModel()
    if (!model) return undefined

    const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness)
    const cleanup = injectCursorStyles(provider.awareness, doc)

    return () => {
      binding.destroy()
      cleanup()
    }
  }, [conn, editor])

  return {
    doc: conn?.doc ?? null,
    provider: conn?.provider ?? null,
    awareness: conn?.provider.awareness ?? null,
    yText: conn ? conn.doc.getText('monaco') : null,
    synced,
    status,
    wsServer: WS_SERVER,
  }
}
