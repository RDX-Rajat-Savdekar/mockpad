const http = require('http')
const { WebSocketServer } = require('ws')
const { setupWSConnection, setPersistence, docs } = require('y-websocket/bin/utils')
const { LeveldbPersistence } = require('y-leveldb')
const Y = require('yjs')

// ── Tunables (small droplet: ~1GB RAM) ──────────────────────────────────────
const INACTIVITY_TTL = 5 * 60 * 1000       // empty room → delete after 5 min
const HARD_TTL = 90 * 60 * 1000            // absolute max room lifetime (90 min)
const COMPACT_INTERVAL = 20 * 1000         // coalesce LevelDB history while active
const MAX_ROOMS = 40                       // concurrent rooms in memory
const MAX_CONN_PER_ROOM = 8
const MAX_TOTAL_CONN = 80
const HEAP_WARN_MB = 250
const HEAP_CHECK_MS = 30 * 1000
const SWEEP_MS = 60 * 1000

const ldb = new LeveldbPersistence('./storage')

const roomConnections = new Map() // roomName -> Set of ws
const inactivityTimers = new Map()
const hardTimers = new Map()
const compactTimers = new Map()
const roomCreatedAt = new Map()

function totalConnections() {
  let n = 0
  for (const set of roomConnections.values()) n += set.size
  return n
}

function scheduleCompact(docName) {
  clearTimeout(compactTimers.get(docName))
  const timer = setTimeout(() => {
    compactTimers.delete(docName)
    ldb.flushDocument(docName).catch((err) => {
      console.error(`[persist] flush failed for ${docName}:`, err.message)
    })
  }, COMPACT_INTERVAL)
  compactTimers.set(docName, timer)
}

async function deleteRoom(roomName, reason) {
  clearTimeout(inactivityTimers.get(roomName))
  clearTimeout(hardTimers.get(roomName))
  clearTimeout(compactTimers.get(roomName))
  inactivityTimers.delete(roomName)
  hardTimers.delete(roomName)
  compactTimers.delete(roomName)
  roomCreatedAt.delete(roomName)

  // Remove from tracking first so ws 'close' handlers don't re-arm inactivity timers
  const conns = roomConnections.get(roomName)
  roomConnections.delete(roomName)

  if (conns) {
    for (const ws of [...conns]) {
      try { ws.close(1000, 'room deleted') } catch { /* ignore */ }
    }
  }

  const doc = docs.get(roomName)
  if (doc) {
    try { doc.destroy() } catch { /* ignore */ }
    docs.delete(roomName)
  }

  try {
    await ldb.flushDocument(roomName)
  } catch { /* may not exist */ }
  try {
    await ldb.clearDocument(roomName)
  } catch (err) {
    console.error(`[cleanup] clearDocument failed for ${roomName}:`, err.message)
  }
  console.log(`[cleanup] Room deleted (${reason}): ${roomName} | rooms=${docs.size} conns=${totalConnections()}`)
}

function startHardTimer(roomName) {
  if (hardTimers.has(roomName)) return
  if (!roomCreatedAt.has(roomName)) roomCreatedAt.set(roomName, Date.now())
  const timer = setTimeout(() => deleteRoom(roomName, 'hard TTL'), HARD_TTL)
  hardTimers.set(roomName, timer)
}

function onRoomEmpty(roomName) {
  clearTimeout(inactivityTimers.get(roomName))
  const timer = setTimeout(() => {
    const conns = roomConnections.get(roomName)
    if (!conns || conns.size === 0) deleteRoom(roomName, 'inactivity')
  }, INACTIVITY_TTL)
  inactivityTimers.set(roomName, timer)
}

setPersistence({
  provider: ldb,
  bindState: async (docName, ydoc) => {
    const persisted = await ldb.getYDoc(docName)
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted))
    // Compact on load so replay cost stays bounded
    try { await ldb.flushDocument(docName) } catch { /* ignore */ }

    ydoc.on('update', (update) => {
      ldb.storeUpdate(docName, update).catch((err) => {
        console.error(`[persist] storeUpdate failed for ${docName}:`, err.message)
      })
      scheduleCompact(docName)
    })
    startHardTimer(docName)
  },
  // Must return a Promise — y-websocket always calls .then()
  writeState: async (docName) => {
    clearTimeout(compactTimers.get(docName))
    compactTimers.delete(docName)
    try { await ldb.flushDocument(docName) } catch { /* ignore */ }
  },
})

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    const mem = process.memoryUsage()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      rooms: docs.size,
      connections: totalConnections(),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      uptimeSec: Math.round(process.uptime()),
    }))
    return
  }

  if (req.method === 'POST' && req.url === '/end-room') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const { roomId } = JSON.parse(body)
        if (!roomId) { res.writeHead(400); res.end('Missing roomId'); return }
        await deleteRoom(roomId, 'manual end-room')
        res.writeHead(200); res.end('ok')
      } catch (e) {
        res.writeHead(500); res.end('error')
      }
    })
    return
  }

  res.writeHead(404); res.end()
})

const wss = new WebSocketServer({
  server,
  // Drop giant whiteboard/code payloads that can OOM the process
  maxPayload: 2 * 1024 * 1024,
})

wss.on('connection', (ws, req) => {
  const roomName = decodeURIComponent((req.url || '/').slice(1).split('?')[0] || 'default')

  if (totalConnections() >= MAX_TOTAL_CONN) {
    ws.close(1013, 'server at capacity')
    return
  }

  const existing = roomConnections.get(roomName)
  if (existing && existing.size >= MAX_CONN_PER_ROOM) {
    ws.close(1013, 'room at capacity')
    return
  }

  // New room while at room cap → reject (existing rooms can still accept peers)
  if (!existing && !docs.has(roomName) && docs.size >= MAX_ROOMS) {
    ws.close(1013, 'too many rooms')
    return
  }

  if (!roomConnections.has(roomName)) roomConnections.set(roomName, new Set())
  roomConnections.get(roomName).add(ws)
  clearTimeout(inactivityTimers.get(roomName))

  try {
    setupWSConnection(ws, req, { docName: roomName })
  } catch (err) {
    console.error(`[ws] setup failed for ${roomName}:`, err.message)
    roomConnections.get(roomName)?.delete(ws)
    try { ws.close() } catch { /* ignore */ }
    return
  }

  ws.on('close', () => {
    const conns = roomConnections.get(roomName)
    if (conns) {
      conns.delete(ws)
      if (conns.size === 0) onRoomEmpty(roomName)
    }
  })

  ws.on('error', (err) => {
    console.error(`[ws] error in ${roomName}:`, err.message)
  })
})

// Sweep: catch empty docs / expired rooms that missed a close event
setInterval(() => {
  const now = Date.now()
  for (const [name, doc] of docs.entries()) {
    const conns = roomConnections.get(name)
    const live = conns ? conns.size : 0
    const created = roomCreatedAt.get(name) || now
    if (live === 0 && doc.conns && doc.conns.size === 0) {
      // Ensure inactivity timer is running
      if (!inactivityTimers.has(name)) onRoomEmpty(name)
    }
    if (now - created >= HARD_TTL) {
      deleteRoom(name, 'sweep hard TTL')
    }
  }
}, SWEEP_MS)

setInterval(() => {
  const mem = process.memoryUsage()
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024)
  const rssMb = Math.round(mem.rss / 1024 / 1024)
  if (heapMb >= HEAP_WARN_MB) {
    console.warn(`[mem] high heap=${heapMb}MB rss=${rssMb}MB rooms=${docs.size} conns=${totalConnections()}`)
    // Under pressure: delete empty rooms immediately
    for (const [name, set] of roomConnections.entries()) {
      if (set.size === 0) deleteRoom(name, 'heap pressure')
    }
    for (const name of docs.keys()) {
      const doc = docs.get(name)
      if (doc && doc.conns && doc.conns.size === 0 && !roomConnections.get(name)?.size) {
        deleteRoom(name, 'heap pressure orphan')
      }
    }
    if (global.gc) {
      try { global.gc() } catch { /* ignore */ }
    }
  }
}, HEAP_CHECK_MS)

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('[fatal] unhandledRejection:', err)
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server on :${PORT} | inactivity=${INACTIVITY_TTL / 60000}m hard=${HARD_TTL / 60000}m maxRooms=${MAX_ROOMS}`)
})
