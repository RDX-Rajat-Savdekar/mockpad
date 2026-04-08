import { useEffect, useRef, useCallback } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

// Excalidraw stores freedraw pressures as Float32Array internally.
// JSON.stringify converts it to a plain Array, which Excalidraw can't render
// correctly — the stroke collapses to a dot. This restores the typed array.
function restoreElements(elements) {
  return elements.map(el => {
    if (el.type === 'freedraw' && Array.isArray(el.pressures)) {
      return { ...el, pressures: Float32Array.from(el.pressures) }
    }
    return el
  })
}

const SYSTEM_DESIGN_DEFAULTS = {
  viewBackgroundColor: '#1e1f26',   // dark grey-blue canvas
  gridSize: 20,                     // dot grid for alignment
  currentItemRoughness: 0,          // smooth edges, not hand-drawn
  currentItemStrokeWidth: 2,
  currentItemStrokeStyle: 'solid',
  currentItemStrokeColor: '#e2e2e2',
  currentItemBackgroundColor: 'transparent',
  currentItemFontFamily: 2,         // Helvetica — clean, not sketchy
  currentItemFontSize: 16,
  currentItemTextAlign: 'center',
}

export default function Whiteboard({ doc, awareness, onApi }) {
  const apiRef      = useRef(null)
  // isLocalRef: set true synchronously around wbMap.set() calls we initiate,
  // so the observer can skip them without ever calling updateScene mid-stroke.
  const isLocalRef  = useRef(false)
  // isRemoteRef: set true while updateScene() runs from a remote change,
  // so handleChange doesn't echo it back to Yjs.
  const isRemoteRef = useRef(false)
  const wbMap       = doc.getMap('whiteboard')

  // Called when Excalidraw is ready — apply defaults and hydrate elements
  const onApiReady = useCallback((api) => {
    apiRef.current = api
    onApi?.(api)
    // updateScene appState overrides any localStorage-cached state
    api.updateScene({ appState: SYSTEM_DESIGN_DEFAULTS })
    const raw = wbMap.get('elements')
    if (raw) {
      try { api.updateScene({ elements: restoreElements(JSON.parse(raw)) }) } catch {}
    }
  }, [wbMap])

  // ── Yjs → Excalidraw (remote changes only) ────────────
  useEffect(() => {
    function onMapChange() {
      // isLocalRef is set synchronously around every wbMap.set() we do,
      // so this check reliably skips our own writes without event.transaction.local
      if (isLocalRef.current) return
      const api = apiRef.current
      if (!api) return
      const raw = wbMap.get('elements')
      if (!raw) return
      isRemoteRef.current = true
      try {
        api.updateScene({ elements: restoreElements(JSON.parse(raw)) })
      } catch {}
      // onChange fires synchronously inside updateScene, so reset on next microtask
      Promise.resolve().then(() => { isRemoteRef.current = false })
    }

    wbMap.observe(onMapChange)
    return () => wbMap.unobserve(onMapChange)
  }, [wbMap])

  // ── awareness → Excalidraw collaborator cursors ───────
  useEffect(() => {
    function onAwarenessChange() {
      const api = apiRef.current
      if (!api) return
      const collaborators = new Map()
      awareness.getStates().forEach((state, clientID) => {
        if (clientID === doc.clientID) return
        const user    = state.user
        const pointer = state.wbPointer
        if (!user) return
        collaborators.set(user.userId ?? String(clientID), {
          pointer:  pointer ?? { x: 0, y: 0, tool: 'pointer' },
          username: user.name ?? 'User',
          color:    { background: user.color ?? '#888', stroke: user.color ?? '#888' },
          isCurrentUser: false,
        })
      })
      api.updateScene({ collaborators })
    }
    awareness.on('change', onAwarenessChange)
    return () => awareness.off('change', onAwarenessChange)
  }, [awareness, doc])

  // ── Excalidraw → Yjs ──────────────────────────────────
  const handleChange = useCallback((elements) => {
    if (isRemoteRef.current) return
    // Set flag BEFORE wbMap.set so the observer (which fires synchronously)
    // sees it and skips calling updateScene — this prevents the mid-stroke reset.
    isLocalRef.current = true
    wbMap.set('elements', JSON.stringify(elements))
    isLocalRef.current = false
  }, [wbMap])

  const handlePointerUpdate = useCallback(({ pointer }) => {
    awareness.setLocalStateField('wbPointer', pointer)
  }, [awareness])

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        excalidrawAPI={onApiReady}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        theme="dark"
        initialData={{ appState: SYSTEM_DESIGN_DEFAULTS }}
      />
    </div>
  )
}
