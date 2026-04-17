const http = require('http')
const { WebSocketServer } = require('ws')
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils')
const { LeveldbPersistence } = require('y-leveldb')
const Y = require('yjs')

const INACTIVITY_TTL = 30 * 60 * 1000  // 30 min after last user leaves
const HARD_TTL       = 2 * 60 * 60 * 1000 // 2 hour hard deadline from creation

const ldb = new LeveldbPersistence('./storage')

const roomConnections = new Map() // roomName -> Set of ws
const inactivityTimers = new Map() // roomName -> timeout handle
const hardTimers = new Map()       // roomName -> timeout handle

async function deleteRoom(roomName, reason) {
  clearTimeout(inactivityTimers.get(roomName))
  clearTimeout(hardTimers.get(roomName))
  inactivityTimers.delete(roomName)
  hardTimers.delete(roomName)
  roomConnections.delete(roomName)
  await ldb.clearDocument(roomName)
  console.log(`[cleanup] Room deleted (${reason}): ${roomName}`)
}

function startHardTimer(roomName) {
  if (hardTimers.has(roomName)) return
  const timer = setTimeout(() => deleteRoom(roomName, 'hard 2h deadline'), HARD_TTL)
  hardTimers.set(roomName, timer)
}

function onRoomEmpty(roomName) {
  clearTimeout(inactivityTimers.get(roomName))
  const timer = setTimeout(() => {
    const conns = roomConnections.get(roomName)
    if (!conns || conns.size === 0) deleteRoom(roomName, '30min inactivity')
  }, INACTIVITY_TTL)
  inactivityTimers.set(roomName, timer)
}

setPersistence({
  provider: ldb,
  bindState: async (docName, ydoc) => {
    const persisted = await ldb.getYDoc(docName)
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted))
    ydoc.on('update', (update) => ldb.storeUpdate(docName, update))
    startHardTimer(docName)
  },
  writeState: () => {},
})

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const roomName = req.url?.slice(1).split('?')[0] ?? 'default'

  if (!roomConnections.has(roomName)) roomConnections.set(roomName, new Set())
  roomConnections.get(roomName).add(ws)
  clearTimeout(inactivityTimers.get(roomName)) // cancel inactivity timer if someone joins

  setupWSConnection(ws, req)

  ws.on('close', () => {
    const conns = roomConnections.get(roomName)
    if (conns) {
      conns.delete(ws)
      if (conns.size === 0) onRoomEmpty(roomName)
    }
  })
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on port ${PORT}`)
})
