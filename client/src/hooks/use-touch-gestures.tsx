import { useEffect, useRef, useState, useCallback } from "react"

export interface SwipeDirection {
  direction: "left" | "right" | "up" | "down" | null
  distance: number
}

export interface TouchGestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  swipeThreshold?: number
  longPressDelay?: number
}

export function useTouchGestures(handlers: TouchGestureHandlers) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500,
  } = handlers

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimer.current = setTimeout(() => {
          onLongPress()
          touchStart.current = null
        }, longPressDelay)
      }
    },
    [onLongPress, longPressDelay]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current) return

      // Cancel long press if user moves
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y

      // Check if user is swiping
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        setIsSwiping(true)
      }
    },
    []
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      if (!touchStart.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStart.current.x
      const deltaY = touch.clientY - touchStart.current.y
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Determine swipe direction
      if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight()
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft()
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown()
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp()
          }
        }
      }

      touchStart.current = null
      setIsSwiping(false)
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold]
  )

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }

  return { touchHandlers, isSwiping }
}

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number>(0)
  const isRefreshing = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && startY.current > 0 && !isRefreshing.current) {
      const currentY = e.touches[0].clientY
      const distance = currentY - startY.current

      if (distance > 0) {
        setIsPulling(true)
        setPullDistance(Math.min(distance, 100))
        
        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault()
        }
      }
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60 && !isRefreshing.current) {
      isRefreshing.current = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.current = false
      }
    }
    setIsPulling(false)
    setPullDistance(0)
    startY.current = 0
  }, [pullDistance, onRefresh])

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isPulling, pullDistance }
}

