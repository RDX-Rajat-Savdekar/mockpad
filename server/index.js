const http = require('http')
const { WebSocketServer } = require('ws')
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils')
const { LeveldbPersistence } = require('y-leveldb')
const Y = require('yjs')

const ROOM_TTL = 2 * 60 * 60 * 1000 // 2 hours

const ldb = new LeveldbPersistence('./storage')

const roomTimers = new Map() // roomName -> timeout handle

function startRoomTimer(roomName) {
  if (roomTimers.has(roomName)) return // already scheduled
  const timer = setTimeout(async () => {
    await ldb.clearDocument(roomName)
    roomTimers.delete(roomName)
    console.log(`[cleanup] Room expired and deleted: ${roomName}`)
  }, ROOM_TTL)
  roomTimers.set(roomName, timer)
  console.log(`[room] Created: ${roomName} — expires in 2 hours`)
}

setPersistence({
  provider: ldb,
  bindState: async (docName, ydoc) => {
    const persisted = await ldb.getYDoc(docName)
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted))
    ydoc.on('update', (update) => ldb.storeUpdate(docName, update))
    startRoomTimer(docName)
  },
  writeState: () => {},
})

const server = http.createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req)
})

const PORT = process.env.PORT || 1234
server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on port ${PORT}`)
})
