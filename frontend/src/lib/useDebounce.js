import { useEffect, useState } from 'react'

// Delays a rapidly-changing value (REQ-012). Used for the Library search box,
// where every keystroke otherwise fires its own backend request.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
