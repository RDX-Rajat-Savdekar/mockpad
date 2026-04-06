const ADJECTIVES = ['Swift', 'Clever', 'Calm', 'Bold', 'Bright', 'Sharp', 'Quiet', 'Brave', 'Quick', 'Wise']
const NOUNS = ['Panda', 'Falcon', 'Otter', 'Lynx', 'Raven', 'Wolf', 'Fox', 'Bear', 'Hawk', 'Crane']

export function generateRoomId() {
  return crypto.randomUUID()
}

export function getUserId() {
  let id = sessionStorage.getItem('mockpad-user-id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('mockpad-user-id', id)
  }
  return id
}

export function getUsername() {
  let name = sessionStorage.getItem('mockpad-username')
  if (!name) {
    // Auto-generate a Google Docs-style name for the session
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
    name = `${adj} ${noun}`
    sessionStorage.setItem('mockpad-username', name)
  }
  return name
}

export function setUsername(name) {
  sessionStorage.setItem('mockpad-username', name.trim() || getUsername())
}

// Deterministic hex color from userId — stable across renders
export function getUserColor() {
  const id = getUserId()
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  // Return hex — Monaco CSS needs a concrete color value
  return hslToHex(hue, 70, 60)
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
