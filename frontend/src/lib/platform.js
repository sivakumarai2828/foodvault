// Detects whether we're running inside the Capacitor native shell (iOS/Android)
// vs a regular browser. Uses the global so web builds work before/without
// Capacitor being installed.
export const isNativeApp = () =>
  typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() ?? false)
