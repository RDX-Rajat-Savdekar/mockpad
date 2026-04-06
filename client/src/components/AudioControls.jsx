export default function AudioControls({ callState, isMuted, isRecording, onCall, onHangup, onMute, onRecord, onStopRecord }) {
  return (
    <div style={styles.container}>
      {/* Call / Hangup */}
      {callState === 'idle' && (
        <button onClick={onCall} style={styles.btn('#1a5c1a')} title="Start audio call">
          🎙 Call
        </button>
      )}
      {callState === 'calling' && (
        <button style={{ ...styles.btn('#6a4a00'), cursor: 'default' }}>
          ⏳ Calling…
        </button>
      )}
      {callState === 'connected' && (
        <>
          <button onClick={onHangup} style={styles.btn('#6a1a1a')} title="End call">
            📵 End
          </button>
          <button onClick={onMute} style={styles.btn(isMuted ? '#555' : '#1a3a6a')} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? '🔇' : '🎤'}
          </button>
          {!isRecording
            ? <button onClick={onRecord} style={styles.btn('#6a1a1a')} title="Record session">⏺ Rec</button>
            : <button onClick={onStopRecord} style={{ ...styles.btn('#8a0000'), animation: 'pulse 1s infinite' }} title="Stop recording">⏹ Stop</button>
          }
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  btn: (bg) => ({
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }),
}
