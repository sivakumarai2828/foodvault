import { useEffect, useState } from 'react'

/**
 * Tracks browser/device connectivity.
 *
 * navigator.onLine only reports whether a network interface exists — it says
 * nothing about whether our backend is reachable. So views also surface their
 * own fetch failures; this hook just catches the obvious "airplane mode" case
 * early so we can show a clearer message.
 */
export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  )

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}

/**
 * Turns an axios/fetch failure into a short, human message.
 * Distinguishes "can't reach the server" from "server said no", because the
 * user's next action differs (retry later vs. something is actually wrong).
 */
export function describeError(err) {
  // No response at all => network/DNS/CORS/timeout
  if (err && !err.response) {
    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
      return "That took too long. The server may be busy — try again."
    }
    return "Can't reach FoodVault right now. Check your connection and try again."
  }
  const status = err?.response?.status
  if (status === 401) return 'Your session expired. Please sign in again.'
  if (status === 503) return 'FoodVault is temporarily unavailable. Please try again in a moment.'
  if (status >= 500) return 'Something went wrong on our end. Please try again.'
  return err?.response?.data?.detail || 'Something went wrong. Please try again.'
}
