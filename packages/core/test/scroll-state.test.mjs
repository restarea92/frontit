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
    },
  ])

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
