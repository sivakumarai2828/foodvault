// Tactile feedback for primary interactions (REQ-002).
// No-ops on web/PWA; every call is fire-and-forget and swallows errors so a
// missing/failed plugin can never break a user action.
import { isNativeApp } from './platform'

let plugin = null
let loadFailed = false

async function get() {
  if (loadFailed) return null
  if (plugin) return plugin
  try {
    plugin = await import('@capacitor/haptics')
    return plugin
  } catch {
    loadFailed = true
    return null
  }
}

function impact(styleName) {
  if (!isNativeApp()) return
  get().then(m => {
    if (!m) return
    m.Haptics.impact({ style: m.ImpactStyle[styleName] }).catch(() => {})
  }).catch(() => {})
}

function notify(typeName) {
  if (!isNativeApp()) return
  get().then(m => {
    if (!m) return
    m.Haptics.notification({ type: m.NotificationType[typeName] }).catch(() => {})
  }).catch(() => {})
}

export const haptic = {
  light:   () => impact('Light'),
  medium:  () => impact('Medium'),
  heavy:   () => impact('Heavy'),
  success: () => notify('Success'),
  error:   () => notify('Error'),
}
