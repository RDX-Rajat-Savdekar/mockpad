# MockPad 📝

> A real-time collaborative coding environment for technical interviews — shared editor, whiteboard, voice, and code execution in a single room, with no sign-up.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Yjs-CRDT-1a1a1a?style=flat-square" alt="Yjs" />
  <img src="https://img.shields.io/badge/Node.js-WebSocket-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Monaco-editor-0078D4?style=flat-square" alt="Monaco" />
</p>

---

## Overview   

MockPad is a CoderPad-style interview room. One person creates a room, shares the link, and both sides land in a shared workspace: a Monaco editor with live multiplayer cursors, an Excalidraw whiteboard, peer-to-peer voice, and one-click code execution across four languages.

There is no database, no user accounts, and no REST API for room state. Every collaborative surface in the app is backed by a single Yjs CRDT document per room, synced over WebSocket and persisted to LevelDB. Rooms are ephemeral by design — they expire automatically and delete themselves, which keeps a 256 MB server able to host meaningful concurrency.

--- 
   
## Features
  
### For the interview
- **Collaborative code editor** — Monaco with live cursors and per-user colours, bound to Yjs via `y-monaco`
- **Run code in-room** — Python, JavaScript, Java, and C++ executed through Judge0, with output synced to every participant
- **Shared whiteboard** — full Excalidraw canvas with bidirectional CRDT sync, for system design and diagramming    
- **Voice chat** — peer-to-peer WebRTC audio with mute and local recording; signalling rides on Yjs awareness, so no separate signalling server
- **Interview timer** — shared start/pause/elapsed state, synchronised across the room
- **Shared notes** — per-participant note panels, visible to the room and rolled into the final summary

### For the interviewer
- **Automatic role assignment** — first joiner becomes interviewer, second becomes interviewee, subsequent joiners are viewers
- **Paste detection** — paste events in the editor are surfaced to the room
- **Pattern reference drawer** — built-in LeetCode pattern crib sheet (two pointers, sliding window, and others) with example implementations
- **Countdown overlay** — synchronised start countdown so both sides begin together
- **Markdown summary export** — one click produces a full write-up: participants, duration, final code, all shared notes, and the whiteboard exported as SVG
- **Admin dashboard** — passkey-protected live view of active rooms, connection counts, room age, and server memory

### Deliberately absent
- **No sign-up.** Identity is a `sessionStorage` UUID with an auto-generated name (`Swift Panda`) and a colour derived deterministically from the ID hash. Close the tab and you're a new person.

---

## Architecture

```
┌──────────────────────────────┐         ┌────────────────────────────┐
│  client/  React 19 + Vite    │         │  server/  Node + ws        │
│                              │         │                            │
│  Monaco ──┐                  │  WSS    │  y-websocket               │
│  Excalidraw ├─ Y.Doc ────────┼────────►│    └─ LeveldbPersistence   │
│  Notes ───┘   (per room)     │         │         └─ ./storage/      │
│                              │         │                            │
│  WebRTC ◄── awareness ───────┼────────►│  Room lifecycle governor   │
│    │                         │         │  /health  /api/admin/status│
│    └─ P2P audio (STUN only) ─┼─────────┼────────────────────────────┤
│                              │         │
│  Judge0 CE ◄─ HTTPS ─────────┼─── external
└──────────────────────────────┘
```

### State model

All shared state lives in one `Y.Doc` per room:

| Yjs structure | Contents |
|---|---|
| `doc.getText('monaco')` | The code editor buffer, bound to Monaco |
| `doc.getMap('shared')` | Everything else — language, output, roles, timer, notes, interview type, paste events, countdown |
| `doc.getMap('whiteboard')` | Excalidraw elements, serialised as JSON |

`sharedMap` is the coordination primitive: any UI change that other participants should see is written through `sharedMap.set(...)` rather than local React state.

### Room lifecycle

The server actively governs resources rather than letting rooms accumulate:

| Control | Value | Purpose |
|---|---|---|
| Inactivity TTL | 5 minutes | Empty rooms are deleted |
| Hard TTL | 90 minutes | Absolute ceiling on room lifetime |
| Max rooms | 40 | Concurrent rooms held in memory |
| Max connections / room | 8 | Per-room participant cap |
| Max total connections | 80 | Server-wide cap |
| LevelDB compaction | every 20s | Bounds update-log replay cost |
| Heap watchdog | 120 MB | Triggers eager cleanup of empty rooms |
| WebSocket max payload | 2 MB | Rejects oversized whiteboard/code frames |

A periodic sweep catches rooms that missed a close event, and the heap monitor force-deletes empty rooms under memory pressure. These values are tuned for a single 256 MB shared-CPU VM.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Editor | Monaco (`@monaco-editor/react`) + `y-monaco` |
| Whiteboard | Excalidraw |
| Layout | `react-resizable-panels` |
| Real-time sync | Yjs, `y-websocket` |
| Voice | Native WebRTC over Yjs awareness signalling |
| Backend | Node.js, `ws`, `y-websocket` |
| Persistence | LevelDB via `y-leveldb` |
| Code execution | Judge0 CE (public instance) |
| Process management | PM2 |

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- A modern browser (WebRTC voice requires HTTPS in production; `localhost` is exempt)

### Installation

```bash
git clone https://github.com/RDX-Rajat-Savdekar/mockpad.git
cd mockpad

# install both workspaces
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### Running locally

Both processes must run simultaneously.

**Terminal 1 — sync server**
```bash
cd server
npm start          # WebSocket server on :1234
```

**Terminal 2 — client**
```bash
cd client
npm run dev        # http://localhost:5173
```

Open `http://localhost:5173`, create a room, and open the room URL in a second browser window (or an incognito window — identity is per-session) to act as the other participant.

### Configuration

**`client/.env`**
```bash
VITE_WS_SERVER=ws://localhost:1234    # your deployed wss:// URL in production
```

**Server environment**
```bash
PORT=1234                              # defaults to 1234
ADMIN_PASSKEY=<your-secret>            # ⚠️ required in production — see Security
```

### Other commands

```bash
cd client && npm run lint      # ESLint
cd client && npm run build     # production build
cd client && npm run preview   # preview the build
cd server && npm test          # node:test suite
```

---

## Project Structure

```text
mockpad/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.jsx            # Monaco + Yjs binding
│   │   │   ├── Whiteboard.jsx        # Excalidraw + Yjs binding
│   │   │   ├── AudioControls.jsx     # voice call UI
│   │   │   ├── Timer.jsx             # shared interview timer
│   │   │   ├── Notes.jsx             # shared note panels
│   │   │   ├── ResourceDrawer.jsx    # LeetCode pattern reference
│   │   │   ├── SummaryModal.jsx      # Markdown export
│   │   │   ├── CountdownOverlay.jsx
│   │   │   ├── FeaturesModal.jsx
│   │   │   └── TipsModal.jsx
│   │   ├── hooks/
│   │   │   ├── useYjs.js             # doc + provider lifecycle
│   │   │   ├── useWebRTC.js          # peer connection + signalling
│   │   │   └── useCodeRunner.js      # Judge0 submission
│   │   ├── pages/
│   │   │   ├── Home.jsx              # landing / room creation
│   │   │   ├── Room.jsx              # main interview surface
│   │   │   └── Admin.jsx             # server dashboard
│   │   ├── data/resources.js         # pattern crib sheet content
│   │   └── utils/roomId.js           # identity, naming, colour hashing
│   ├── vercel.json                   # SPA rewrite
│   └── vite.config.js
│
├── server/
│   ├── index.js                      # WS server, persistence, lifecycle governor
│   ├── ecosystem.config.cjs          # PM2 config
│   ├── Dockerfile
│   ├── fly.toml
│   └── test/server.test.js
│
├── .github/workflows/deploy.yml      # backend CD
└── CLAUDE.md                         # contributor notes
```

---

## API

The server exposes a minimal HTTP surface alongside the WebSocket endpoint.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` · `/health` | — | Health check: room count, connections, heap, RSS, uptime |
| `GET` | `/api/admin/status` | `x-passkey` header or `?passkey=` | Per-room stats and system memory |
| `POST` | `/end-room` | — | Terminates a room by `{ roomId }` |
| `WS` | `/:roomId` | — | Yjs sync channel |

---

## Deployment

**Client → Vercel.** `vercel.json` supplies the SPA rewrite. Set `VITE_WS_SERVER` to your `wss://` backend URL in the project's environment variables.

**Server.** Pushes to `main` that touch `server/**` trigger `.github/workflows/deploy.yml`, which SSHes into the host, pulls, runs `npm ci`, and restarts under PM2 using `ecosystem.config.cjs`. Required repository secrets: `SSH_HOST`, `SSH_KEY`, `SSH_PASSPHRASE`.

A `Dockerfile` and `fly.toml` are also present if you'd rather deploy to Fly.io.

> ⚠️ **Persistence caveat:** LevelDB writes to a local `./storage` directory. On ephemeral or multi-instance hosting this does not survive restarts and will not be shared between instances. Given that rooms expire after 90 minutes anyway this is mostly harmless, but attach a volume if you need durability.

---

## Security Notes

- **`ADMIN_PASSKEY` defaults to a placeholder value.** Set it explicitly in production or the admin dashboard is effectively open.
- **`/end-room` is unauthenticated.** Anyone who knows a room ID can terminate that room.
- **CORS is fully permissive** (`Access-Control-Allow-Origin: *`) across all HTTP endpoints.
- **Room IDs are UUIDv4** — unguessable in practice, and the only thing gating room access. Treat the room link as the credential.
- **Code execution runs on the public Judge0 CE instance**, which is rate-limited and offers no availability guarantee. Self-host Judge0 for anything serious.

---

## Roadmap

- [ ] Authenticate `/end-room` and lock down CORS
- [ ] Self-hosted Judge0 with per-room rate limiting
- [ ] Video alongside voice, plus TURN fallback for restrictive NATs
- [ ] Persistent accounts and interview history
- [ ] Question bank with interviewer-only prompts
- [ ] Multi-instance sync so the backend can scale horizontally

---

## License

ISC. 

---

## Authors

**Rajat Savdekar**
GitHub: [@RDX-Rajat-Savdekar](https://github.com/RDX-Rajat-Savdekar) 

**Krishna Karthik Kotamraju**
GitHub: [@karthik05k9](https://github.com/karthik05k9) 


---

<p align="center">
  ⭐ If you found this project useful, consider giving it a star.
</p>
