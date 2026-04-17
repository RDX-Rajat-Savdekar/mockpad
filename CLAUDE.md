# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Client (React + Vite)
```bash
cd client
npm run dev        # dev server on http://localhost:5173
npm run build      # production build
npm run lint       # ESLint
npm run preview    # preview production build
```

### Server (Node.js Yjs WebSocket)
```bash
cd server
npm start          # starts WebSocket server on port 1234
```

Both must run simultaneously for full functionality. The client connects to the server at `ws://localhost:1234` by default (configurable via `VITE_WS_SERVER` env var).

## Architecture

MockPad is a CoderPad clone for technical interviews. It has two parts:

**`server/`** — a minimal Node.js WebSocket server using `y-websocket` that persists each room's Yjs document to disk via LevelDB (`./storage/`). No REST API — all state is Yjs.

**`client/`** — a React SPA with two routes: `/` (Home) and `/room/:roomId` (Room).

### Real-time Sync (Yjs)
Everything collaborative goes through a single `Y.Doc` per room, connected via `useYjs.js`:
- `doc.getText('monaco')` — the shared code editor text, bound to Monaco via `y-monaco`
- `doc.getMap('shared')` — all other shared room state: language, output, roles, timer, notes, interview type, paste events, countdown trigger
- `doc.getMap('whiteboard')` — Excalidraw elements as JSON string

The `sharedMap` in `Room.jsx` is the central coordination primitive. All UI state changes that should be visible to other users go through `sharedMap.set(...)`.

### User Identity
Users are identified by a UUID stored in `sessionStorage` (`mockpad-user-id`). Username is auto-generated (e.g. "Swift Panda") and color is deterministically derived from the userId hash. All stored in `sessionStorage` — not persistent across browser sessions.

### Roles
Three roles per room: `interviewer`, `interviewee`, `viewer`. Roles are assigned automatically on Yjs sync (first person gets interviewer, second gets interviewee). Stored in `sharedMap.get('roles')` as a `{ userId → role }` map.

### Code Execution
`useCodeRunner.js` submits code to the public Judge0 CE instance (`https://ce.judge0.com`) — no API key required. Supports Python, JavaScript, Java, C++. Output is synced to all peers via `sharedMap.set('output', result)`.

### Whiteboard
`Whiteboard.jsx` wraps Excalidraw with bidirectional Yjs sync. Key gotcha: `isLocalRef` / `isRemoteRef` flags prevent echo loops between Excalidraw's `onChange` and Yjs's `wbMap.observe`. Freedraw `pressures` must be restored as `Float32Array` after JSON round-trips or strokes collapse to dots.

### Panel Layout
`Room.jsx` uses `react-resizable-panels` for the horizontal split (code/whiteboard left, output+notes right). The vertical split between Output and Notes is a custom `useVerticalResize` hook using raw mouse events (not the library).
