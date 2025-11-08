import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export type DeviceOrientation = "portrait" | "landscape"

export interface MobileDeviceInfo {
  isMobile: boolean
  isTouch: boolean
  orientation: DeviceOrientation
  viewportWidth: number
  viewportHeight: number
}

export function useMobileDevice(): MobileDeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<MobileDeviceInfo>(() => ({
    isMobile: false,
    isTouch: false,
    orientation: "portrait",
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
  }))

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isMobile = width < MOBILE_BREAKPOINT
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const orientation: DeviceOrientation = height > width ? "portrait" : "landscape"

      setDeviceInfo({
        isMobile,
        isTouch,
        orientation,
        viewportWidth: width,
        viewportHeight: height,
      })
    }

    updateDeviceInfo()

    window.addEventListener("resize", updateDeviceInfo)
    window.addEventListener("orientationchange", updateDeviceInfo)

    return () => {
      window.removeEventListener("resize", updateDeviceInfo)
      window.removeEventListener("orientationchange", updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}