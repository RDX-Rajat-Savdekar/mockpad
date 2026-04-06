import { useState, useEffect, useRef } from 'react'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export function useWebRTC(provider) {
  const [callState, setCallState] = useState('idle') // idle | calling | connected
  const [isMuted, setIsMuted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const processedRef = useRef(new Set()) // dedupe signals by ID
  const recorderRef = useRef(null)
  const recordChunksRef = useRef([])
  const audioCtxRef = useRef(null)

  const awareness = provider.awareness
  const myClientID = provider.doc.clientID

  function getOtherClientID() {
    let other = null
    awareness.getStates().forEach((_, id) => { if (id !== myClientID) other = id })
    return other
  }

  function sendSignal(payload) {
    const otherId = getOtherClientID()
    if (otherId == null) return
    // ts makes each signal unique so we can dedupe on the receiver side
    awareness.setLocalStateField('rtcSignal', {
      ...payload,
      for: otherId,
      from: myClientID,
      ts: Date.now(),
    })
  }

  function clearMySignal() {
    awareness.setLocalStateField('rtcSignal', null)
  }

  function createPC() {
    if (pcRef.current) pcRef.current.close()
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal({ type: 'candidate', candidate })
    }

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0]
      let el = document.getElementById('mockpad-remote-audio')
      if (!el) {
        el = document.createElement('audio')
        el.id = 'mockpad-remote-audio'
        el.autoplay = true
        document.body.appendChild(el)
      }
      el.srcObject = e.streams[0]
    }

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (s === 'connected') setCallState('connected')
      if (s === 'disconnected' || s === 'failed' || s === 'closed') {
        setCallState('idle')
        setIsMuted(false)
      }
    }

    pcRef.current = pc
    return pc
  }

  async function getLocalStream() {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStreamRef.current = stream
    return stream
  }

  async function startCall() {
    try {
      const stream = await getLocalStream()
      const pc = createPC()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({ type: 'offer', sdp: offer })
      setCallState('calling')
    } catch (err) {
      console.error('startCall failed:', err)
    }
  }

  async function handleOffer(sdp) {
    try {
      const stream = await getLocalStream()
      const pc = createPC()
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c)
      pendingCandidatesRef.current = []
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal({ type: 'answer', sdp: answer })
      setCallState('connected')
    } catch (err) {
      console.error('handleOffer failed:', err)
    }
  }

  async function handleAnswer(sdp) {
    try {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp))
      clearMySignal()
      setCallState('connected')
    } catch (err) {
      console.error('handleAnswer failed:', err)
    }
  }

  async function handleCandidate(candidate) {
    const pc = pcRef.current
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } else {
      pendingCandidatesRef.current.push(new RTCIceCandidate(candidate))
    }
  }

  useEffect(() => {
    function onAwareness({ added, updated }) {
      ;[...added, ...updated].forEach((clientID) => {
        if (clientID === myClientID) return
        const state = awareness.getStates().get(clientID)
        const sig = state?.rtcSignal
        if (!sig || sig.for !== myClientID) return

        // Dedupe: same signal can fire multiple times via awareness updates
        const sigKey = `${sig.from}-${sig.type}-${sig.ts}`
        if (processedRef.current.has(sigKey)) return
        processedRef.current.add(sigKey)

        if (sig.type === 'offer')     handleOffer(sig.sdp)
        if (sig.type === 'answer')    handleAnswer(sig.sdp)
        if (sig.type === 'candidate') handleCandidate(sig.candidate)
        if (sig.type === 'hangup')    endCall(false)
      })
    }
    awareness.on('change', onAwareness)
    return () => awareness.off('change', onAwareness)
  }, [provider])

  function endCall(notify = true) {
    if (notify) sendSignal({ type: 'hangup' })
    stopRecording()
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null
    pendingCandidatesRef.current = []
    processedRef.current.clear()
    const el = document.getElementById('mockpad-remote-audio')
    if (el) { el.srcObject = null; el.remove() }
    setCallState('idle')
    setIsMuted(false)
    clearMySignal()
  }

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }

  // Records BOTH voices — mixes local mic + remote stream via AudioContext
  // Result: a single .webm file with the full conversation, like a phone recording
  function startRecording() {
    const local = localStreamRef.current
    if (!local) return

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const dest = ctx.createMediaStreamDestination()

    // Your own microphone
    ctx.createMediaStreamSource(local).connect(dest)

    // Other person's audio — from the WebRTC track (not the <audio> element)
    if (remoteStreamRef.current) {
      ctx.createMediaStreamSource(remoteStreamRef.current).connect(dest)
    }

    recordChunksRef.current = []
    const rec = new MediaRecorder(dest.stream)
    rec.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mockpad-${new Date().toISOString().slice(0, 19)}.webm`
      a.click()
      URL.revokeObjectURL(url)
      ctx.close()
      audioCtxRef.current = null
    }
    rec.start(100) // collect data every 100ms for reliability
    recorderRef.current = rec
    setIsRecording(true)
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
    recorderRef.current = null
    setIsRecording(false)
  }

  return { callState, isMuted, isRecording, startCall, endCall, toggleMute, startRecording, stopRecording }
}
