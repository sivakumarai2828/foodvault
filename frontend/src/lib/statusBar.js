// Native status bar theming (REQ-004).
// Without this the Android status bar keeps the system default colour, which
// clashes with the cream header. No-ops on web.
import { isNativeApp } from './platform'

// App surfaces we theme against.
export const STATUS_BAR = {
  app:     { color: '#FAF8F3', darkText: true  },  // cream header
  login:   { color: '#FFF6F0', darkText: true  },  // warm login gradient
  cooking: { color: '#1C1610', darkText: false },  // CookingMode fullscreen dark
}

export async function setStatusBar({ color, darkText = true }) {
  if (!isNativeApp()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // setBackgroundColor is Android-only; it throws a no-op error on iOS.
    await StatusBar.setBackgroundColor({ color }).catch(() => {})
    await StatusBar.setStyle({ style: darkText ? Style.Light : Style.Dark }).catch(() => {})
  } catch {
    /* plugin unavailable — leave the system default */
  }
}
