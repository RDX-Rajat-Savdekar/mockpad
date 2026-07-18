const { test, before, after } = require('node:test')
const assert = require('node:assert')
const { fork } = require('child_process')
const path = require('path')
const WebSocket = require('ws')

const TEST_PORT = 12345
let serverProcess

before(() => {
  return new Promise((resolve) => {
    // Start the server process
    serverProcess = fork(path.join(__dirname, '../index.js'), {
      env: { ...process.env, PORT: TEST_PORT, ADMIN_PASSKEY: 'asdf' },
      silent: true // suppress normal logs during test run
    })

    // Give it 1 second to start up
    setTimeout(resolve, 1000)
  })
})

after(() => {
  if (serverProcess) {
    serverProcess.kill()
  }
})

test('GET /health endpoint returns server stats', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/health`)
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.strictEqual(body.ok, true)
  assert.ok('heapUsedMb' in body)
  assert.ok('connections' in body)
})

test('GET /api/admin/status unauthorized without valid passkey', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/admin/status`)
  assert.strictEqual(res.status, 401)
  const body = await res.json()
  assert.strictEqual(body.ok, false)
  assert.strictEqual(body.error, 'Unauthorized')
})

test('GET /api/admin/status endpoint returns admin metrics when authorized', async () => {
  const res = await fetch(`http://localhost:${TEST_PORT}/api/admin/status`, {
    headers: { 'x-passkey': 'asdf' }
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.strictEqual(body.ok, true)
  assert.ok(Array.isArray(body.rooms))
  assert.ok('system' in body)
})

test('WebSocket connection can be established', async () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}/test-room-123`)

    ws.on('open', () => {
      ws.close()
    })

    ws.on('close', () => {
      // Wait for server-side socket tracking cleanups
      setTimeout(resolve, 100)
    })

    ws.on('error', (err) => {
      reject(err)
    })
  })
})

test('WebSocket connects and adds to connection count', async () => {
  // 1. Check initial connections
  const res1 = await fetch(`http://localhost:${TEST_PORT}/api/admin/status`, {
    headers: { 'x-passkey': 'asdf' }
  })
  const initial = await res1.json()
  const initialConns = initial.system.totalConnections

  // 2. Open connection
  const ws = new WebSocket(`ws://localhost:${TEST_PORT}/test-room-count`)
  
  await new Promise((resolve) => ws.on('open', resolve))
  // Wait a small bit for server to register connection setup
  await new Promise((resolve) => setTimeout(resolve, 50))

  // 3. Check connections went up
  const res2 = await fetch(`http://localhost:${TEST_PORT}/api/admin/status`, {
    headers: { 'x-passkey': 'asdf' }
  })
  const mid = await res2.json()
  assert.strictEqual(mid.system.totalConnections, initialConns + 1)

  // 4. Close connection
  ws.close()
  await new Promise((resolve) => ws.on('close', resolve))
  // Wait for server to clean up connection
  await new Promise((resolve) => setTimeout(resolve, 100))

  // 5. Check connections went back down
  const res3 = await fetch(`http://localhost:${TEST_PORT}/api/admin/status`, {
    headers: { 'x-passkey': 'asdf' }
  })
  const final = await res3.json()
  assert.strictEqual(final.system.totalConnections, initialConns)
})
