export interface ScrollStateSnapshot {
  /**
   * A finger is on the screen, as far as the touch events say.
   *
   * iOS delivers none of them while momentum is running: a finger that grabs a coasting
   * scroll only adds to the scroll events, so this reads false until that scroll ends.
   */
  readonly isTouching: boolean
  /** The target is moving, by any input. A finger resting mid-scroll makes this false. */
  readonly isScrolling: boolean
  /**
   * A touch-driven scroll gesture is open. It covers the whole gesture, including a
   * finger held still and the momentum after it lifts, so it stays true across pauses
   * that {@link ScrollStateSnapshot.isScrolling} reports as stopped.
   */
  readonly isTouchScrolling: boolean
  /**
   * A touch scroll is coasting: the finger is up and the scroll has not settled.
   *
   * Inferred from the two states above, since browsers do not report momentum, so it
   * inherits what {@link ScrollStateSnapshot.isTouching} cannot see: on iOS a finger
   * that grabs the coasting scroll still reads as momentum. A programmatic scroll
   * starting in the same window reads as momentum too. Momentum from a trackpad is not
   * covered, which is what the name is narrow about.
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

    // Iterate a copy so a listener subscribing from within one does not receive the
    // notification it is already inside of, and re-check membership so one that
    // unsubscribes during the same pass is not called after it asked to stop.
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) {
        listener(snapshot)
      }
    }
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
    // Movement has stopped, which does not mean the gesture is over: a finger resting
    // on the screen still holds the scroll open. Without `scrollend` to say when the
    // gesture ends, a lifted finger is the only signal available.
    const endsTouchScroll = !supportsScrollEnd && !isTouching

    if (endsTouchScroll) {
      touchSequenceActive = false
    }

    update({
      isScrolling: false,
      isTouchScrolling: endsTouchScroll ? false : isTouchScrolling,
    })
  }

  const handleScrollEnd = () => {
    clearScrollTimeout()

    // A finger landing on a coasting scroll ends it, so `scrollend` can arrive while that
    // finger is still down. It closes the scroll the touch interrupted, not the gesture
    // now holding the screen, which goes on to drive a scroll of its own.
    if (isTouching) {
      update({ isScrolling: false })
      return
    }

    touchSequenceActive = false
    update({ isScrolling: false, isTouchScrolling: false })
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

    scrollTimeout = globalThis.setTimeout(endScroll, idleDelay)
  }

  target?.addEventListener('touchstart', handleTouchStart, { passive: true })
  target?.addEventListener('touchend', handleTouchEnd, { passive: true })
  target?.addEventListener('touchcancel', handleTouchEnd, { passive: true })
  target?.addEventListener('scroll', handleScroll, { passive: true })

  if (supportsScrollEnd) {
    target?.addEventListener('scrollend', handleScrollEnd, { passive: true })
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
      target?.removeEventListener('scrollend', handleScrollEnd)
    },
  }
}
