import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Returns true if the current viewport is below the mobile breakpoint.
 * Initializes synchronously from window.innerWidth on the client so the
 * first render reflects the real viewport (no false→true flash that would
 * cause mobile users to briefly see desktop UI). Falls back to false in
 * non-browser environments.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Re-sync in case viewport changed between initial render and effect.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
