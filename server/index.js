const http = require('http')
const { WebSocketServer } = require('ws')
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils')
const { LeveldbPersistence } = require('y-leveldb')
const Y = require('yjs')

// Persist each room's Yjs doc to disk so state survives restarts
const ldb = new LeveldbPersistence('./storage')

setPersistence({
  provider: ldb,
  bindState: async (docName, ydoc) => {
    const persisted = await ldb.getYDoc(docName)
    Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted))
    ydoc.on('update', (update) => ldb.storeUpdate(docName, update))
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





