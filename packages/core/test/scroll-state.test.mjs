import assert from 'node:assert/strict'
import test from 'node:test'

import { createScrollState } from '../dist/index.js'

const wait = (duration) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, duration))

const createTouchEvent = (type, touchCount) => {
  const event = new Event(type)
  Object.defineProperty(event, 'touches', {
    value: { length: touchCount },
  })
  return event
}

test('tracks touch scrolling in real time', async () => {
  const target = new EventTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.equal(state.isTouching, true)
  assert.equal(state.isTouchScrolling, false)

  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isScrolling, true)
  assert.equal(state.isTouchScrolling, true)

  target.dispatchEvent(createTouchEvent('touchend', 0))

  assert.equal(state.isTouching, false)
  assert.equal(state.isTouchScrolling, true)

  await wait(15)

  assert.equal(state.isScrolling, false)
  assert.equal(state.isTouchScrolling, false)
})

test('keeps touch active while another touch remains', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })

  target.dispatchEvent(createTouchEvent('touchstart', 2))
  target.dispatchEvent(createTouchEvent('touchend', 1))

  assert.equal(state.isTouching, true)

  state.destroy()
})

test('tracks non-touch scrolling separately', async () => {
  const target = new EventTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isScrolling, true)
  assert.equal(state.isTouchScrolling, false)

  await wait(15)

  assert.equal(state.isScrolling, false)
})

const createScrollEndTarget = () => {
  const target = new EventTarget()
  target.onscrollend = null
  return target
}

test('ends the scroll on scrollend when the target supports it', () => {
  const target = createScrollEndTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isScrolling, true)

  target.dispatchEvent(new Event('scrollend'))

  assert.equal(state.isScrolling, false)

  state.destroy()
})

test('stops scrolling while a resting finger holds the touch scroll open', async () => {
  const target = createScrollEndTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isScrolling, true)
  assert.equal(state.isTouchScrolling, true)

  await wait(25)

  assert.equal(state.isScrolling, false)
  assert.equal(state.isTouchScrolling, true)
  assert.equal(state.isTouchMomentum, false)

  state.destroy()
})

test('keeps the touch scroll open past the idle delay without scrollend', async () => {
  const target = new EventTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(new Event('scroll'))
  await wait(25)

  assert.equal(state.isScrolling, false)
  assert.equal(state.isTouchScrolling, true)

  state.destroy()
})

test('ends touch scrolling on scrollend once the finger is up', () => {
  const target = createScrollEndTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(new Event('scroll'))
  target.dispatchEvent(createTouchEvent('touchend', 0))

  assert.equal(state.isTouchScrolling, true)

  target.dispatchEvent(new Event('scrollend'))

  assert.equal(state.isTouchScrolling, false)

  state.destroy()
})

test('does not deliver the current state to a new subscriber', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const changes = []

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  state.subscribe((snapshot) => changes.push(snapshot))

  assert.equal(state.isTouching, true)
  assert.deepEqual(changes, [])

  target.dispatchEvent(createTouchEvent('touchend', 0))

  assert.equal(changes.length, 1)

  state.destroy()
})

test('notifies subscribers only when public state changes', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const changes = []

  state.subscribe((snapshot) => changes.push(snapshot))
  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.deepEqual(changes, [
    {
      isTouching: true,
      isScrolling: false,
      isTouchScrolling: false,
      isTouchMomentum: false,
    },
  ])

  state.destroy()
})

test('reports touch momentum once the finger is up', () => {
  const target = createScrollEndTarget()
  const state = createScrollState({ target })

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isTouchScrolling, true)
  assert.equal(state.isTouchMomentum, false)

  target.dispatchEvent(createTouchEvent('touchend', 0))

  assert.equal(state.isTouchMomentum, true)

  target.dispatchEvent(new Event('scrollend'))

  assert.equal(state.isTouchMomentum, false)

  state.destroy()
})

test('does not report momentum for a scroll that never involved touch', () => {
  const target = createScrollEndTarget()
  const state = createScrollState({ target })

  target.dispatchEvent(new Event('scroll'))

  assert.equal(state.isScrolling, true)
  assert.equal(state.isTouchMomentum, false)

  state.destroy()
})

test('keeps the snapshot reference stable until a value changes', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const initial = state.getSnapshot()

  assert.equal(state.getSnapshot(), initial)

  target.dispatchEvent(createTouchEvent('touchstart', 1))

  const afterTouch = state.getSnapshot()

  assert.notEqual(afterTouch, initial)
  assert.equal(state.getSnapshot(), afterTouch)

  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.equal(state.getSnapshot(), afterTouch)

  state.destroy()
})

test('delivers the same object to subscribers that getSnapshot returns', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const changes = []

  state.subscribe((snapshot) => changes.push(snapshot))
  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.equal(changes.length, 1)
  assert.equal(changes[0], state.getSnapshot())

  state.destroy()
})

test('skips a listener that unsubscribes earlier in the same notification', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const called = []

  let unsubscribeSecond

  state.subscribe(() => {
    called.push('first')
    unsubscribeSecond()
  })

  unsubscribeSecond = state.subscribe(() => called.push('second'))
  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.deepEqual(called, ['first'])

  state.destroy()
})

test('does not notify a listener that subscribes during a notification', () => {
  const target = new EventTarget()
  const state = createScrollState({ target })
  const called = []

  state.subscribe(() => {
    called.push('first')
    state.subscribe(() => called.push('late'))
  })

  target.dispatchEvent(createTouchEvent('touchstart', 1))

  assert.deepEqual(called, ['first'])

  target.dispatchEvent(createTouchEvent('touchend', 0))

  assert.deepEqual(called, ['first', 'first', 'late'])

  state.destroy()
})

test('removes listeners and timers when destroyed', async () => {
  const target = new EventTarget()
  const state = createScrollState({ target, idleDelay: 10 })

  target.dispatchEvent(createTouchEvent('touchstart', 1))
  target.dispatchEvent(new Event('scroll'))
  state.destroy()
  target.dispatchEvent(new Event('scroll'))
  await wait(15)

  assert.equal(state.isTouching, false)
  assert.equal(state.isScrolling, false)
  assert.equal(state.isTouchScrolling, false)
})

test('is safe outside a browser', () => {
  const state = createScrollState()

  assert.equal(state.isTouching, false)
  assert.equal(state.isScrolling, false)
  assert.equal(state.isTouchScrolling, false)
  state.destroy()
})
