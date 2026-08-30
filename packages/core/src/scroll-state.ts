export interface ScrollStateSnapshot {
  /** A finger is on the screen. */
  readonly isTouching: boolean
  /** The target is scrolling, by any input. */
  readonly isScrolling: boolean
  /** The scroll was started by touch, and stays true through the momentum that follows. */
  readonly isTouchScrolling: boolean
  /**
   * A touch scroll is coasting: the finger is up and the scroll has not settled.
   *
   * Inferred from the two states above, since browsers do not report momentum. A
   * programmatic scroll starting in the same window reads as momentum too. Momentum
   * from a trackpad is not covered, which is what the name is narrow about.
   */
  readonly isTouchMomentum: boolean
}

export type ScrollStateListener = (state: ScrollStateSnapshot) => void

export interface ScrollStateOptions {
  target?: EventTarget | undefined
  idleDelay?: number | undefined
}

export interface ScrollState extends ScrollStateSnapshot {
  /**
   * Registers a listener for subsequent changes. It is not called with the state as it
   * stands, which is readable from the instance itself, and it runs only when one of the
   * snapshot values actually changes. Returns a function that removes the listener.
   */
  subscribe(listener: ScrollStateListener): () => void
  /**
   * Returns the current values as one object. The same reference is returned until a
   * value changes, which is what `useSyncExternalStore` requires of a snapshot.
   */
  getSnapshot(): ScrollStateSnapshot
  /** Removes the event listeners and pending timers. Subscribing afterwards is a no-op. */
  destroy(): void
}

const getTouchCount = (event: Event): number | undefined => {
  if (!('touches' in event)) {
    return undefined
  }

  const touches = event.touches

  if (
    typeof touches !== 'object' ||
    touches === null ||
    !('length' in touches) ||
    typeof touches.length !== 'number'
  ) {
    return undefined
  }

  return touches.length
}

export const createScrollState = (
  options: ScrollStateOptions = {},
): ScrollState => {
  const target =
    options.target ?? (typeof window === 'undefined' ? undefined : window)
  const idleDelay = options.idleDelay ?? 200
  const supportsScrollEnd = target !== undefined && 'onscrollend' in target
  const listeners = new Set<ScrollStateListener>()
  let isTouching = false
  let isScrolling = false
  let isTouchScrolling = false
  let touchSequenceActive = false
  let scrollTimeout: number | undefined
  let touchTimeout: number | undefined
  let destroyed = false

  const buildSnapshot = (): ScrollStateSnapshot => ({
    isTouching,
    isScrolling,
    isTouchScrolling,
    isTouchMomentum: isTouchScrolling && !isTouching,
  })

  let snapshot = buildSnapshot()

  const update = (
    nextState: Partial<
      Pick<
        ScrollStateSnapshot,
        'isTouching' | 'isScrolling' | 'isTouchScrolling'
      >
    >,
  ) => {
    if (destroyed) {
      return
    }

    const nextIsTouching = nextState.isTouching ?? isTouching
    const nextIsScrolling = nextState.isScrolling ?? isScrolling
    const nextIsTouchScrolling =
      nextState.isTouchScrolling ?? isTouchScrolling

    if (
      nextIsTouching === isTouching &&
      nextIsScrolling === isScrolling &&
      nextIsTouchScrolling === isTouchScrolling
    ) {
      return
    }

    isTouching = nextIsTouching
    isScrolling = nextIsScrolling
    isTouchScrolling = nextIsTouchScrolling
    snapshot = buildSnapshot()
    listeners.forEach((listener) => listener(snapshot))
  }

  const clearScrollTimeout = () => {
    if (scrollTimeout !== undefined) {
      clearTimeout(scrollTimeout)
      scrollTimeout = undefined
    }
  }

  const clearTouchTimeout = () => {
    if (touchTimeout !== undefined) {
      clearTimeout(touchTimeout)
      touchTimeout = undefined
    }
  }

  const handleTouchStart = () => {
    clearTouchTimeout()
    touchSequenceActive = true
    update({ isTouching: true })
  }

  const handleTouchEnd = (event: Event) => {
    const nextIsTouching = (getTouchCount(event) ?? 0) > 0

    update({ isTouching: nextIsTouching })

    if (nextIsTouching) {
      return
    }

    clearTouchTimeout()
    touchTimeout = globalThis.setTimeout(() => {
      touchTimeout = undefined

      if (!isScrolling) {
        touchSequenceActive = false
        update({ isTouchScrolling: false })
      }
    }, idleDelay)
  }

  const endScroll = () => {
    scrollTimeout = undefined
    const shouldEndTouchScroll = !isTouching

    if (shouldEndTouchScroll) {
      touchSequenceActive = false
    }

    update({
      isScrolling: false,
      isTouchScrolling: shouldEndTouchScroll ? false : isTouchScrolling,
    })
  }

  const handleScroll = () => {
    clearScrollTimeout()

    if (touchSequenceActive) {
      clearTouchTimeout()
    }

    update({
      isScrolling: true,
      isTouchScrolling: touchSequenceActive || isTouchScrolling,
    })

    // Falling idle is only a guess at the scroll being over, and momentum decelerates
    // until its events are further apart than the delay. `scrollend` reports the end.
    if (!supportsScrollEnd) {
      scrollTimeout = globalThis.setTimeout(endScroll, idleDelay)
    }
  }

  target?.addEventListener('touchstart', handleTouchStart, { passive: true })
  target?.addEventListener('touchend', handleTouchEnd, { passive: true })
  target?.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  target?.addEventListener('scroll', handleScroll, { passive: true })

  if (supportsScrollEnd) {
    target?.addEventListener('scrollend', endScroll, { passive: true })
  }

  return {
    get isTouching() {
      return isTouching
    },
    get isScrolling() {
      return isScrolling
    },
    get isTouchScrolling() {
      return isTouchScrolling
    },
    get isTouchMomentum() {
      return snapshot.isTouchMomentum
    },
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      if (destroyed) {
        return () => undefined
      }

      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      if (destroyed) {
        return
      }

      destroyed = true
      clearScrollTimeout()
      clearTouchTimeout()
      listeners.clear()
      isTouching = false
      isScrolling = false
      isTouchScrolling = false
      touchSequenceActive = false
      snapshot = buildSnapshot()
      target?.removeEventListener('touchstart', handleTouchStart)
      target?.removeEventListener('touchend', handleTouchEnd)
      target?.removeEventListener('touchcancel', handleTouchEnd)
      target?.removeEventListener('scroll', handleScroll)
      target?.removeEventListener('scrollend', endScroll)
    },
  }
}
