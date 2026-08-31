import assert from 'node:assert/strict'
import test from 'node:test'

import { disposeToPx, toPx } from '../dist/index.js'

// Node has no DOM, so every case here takes the no-document path. These pin the
// SSR contract — nothing throws, nothing pretends to have measured — and prove
// nothing about the measurements themselves. The Inspector does that.

test('returns undefined outside a browser', () => {
  assert.equal(toPx('lvh'), undefined)
  assert.equal(toPx(50, 'vh'), undefined)
  assert.equal(toPx({ value: 50, unit: 'vh' }), undefined)
})

test('returns the fallback when measurement is impossible', () => {
  assert.equal(toPx({ unit: 'lvh', fallback: 0 }), 0)
  assert.equal(toPx({ unit: 'lvh', fallback: -1 }), -1)
})

test('keeps the snapshot shape outside a browser', () => {
  // No unit resolved, so no unit key. `percent` keys are ours rather than the
  // browser's, so they stay and the value is what goes undefined.
  const snapshot = toPx()

  assert.deepEqual(Object.keys(snapshot), ['percent'])
  assert.equal(snapshot.percent.width, undefined)
  assert.deepEqual(Object.keys(snapshot.percent).sort(), [
    'fontSize',
    'height',
    'lineHeight',
    'paddingBlock',
    'width',
  ])
  assert.deepEqual(toPx({}), snapshot)
})

test('accepts every option outside a browser without throwing', () => {
  assert.equal(toPx({ value: 50, unit: 'vw', precision: 'rendered' }), undefined)
  assert.equal(toPx({ value: 10, unit: 'ch', precision: 'computed', fallback: 16 }), 16)
})

// An element from a document with no window — one parsed by DOMParser, say — reaches
// the same path a missing DOM does.
test('accepts a context with no window without throwing', () => {
  const detached = { ownerDocument: { defaultView: null } }

  assert.equal(toPx({ unit: 'cqw', context: detached }), undefined)
  assert.equal(toPx({ unit: 'cqw', context: detached, fallback: 0 }), 0)
  assert.deepEqual(Object.keys(toPx({ context: detached })), ['percent'])
})

// TypeScript rejects these, plain JavaScript does not. `CSS.supports` would accept
// `1%` on the measuring property and resolve it against the initial containing block.
test('refuses a unit it does not know', () => {
  assert.equal(toPx({ unit: 'fr' }), undefined)
  assert.equal(toPx('%'), undefined)
  assert.equal(toPx(50, '%'), undefined)
})

test('a percentage without a property is not a length', () => {
  assert.equal(toPx({ unit: '%' }), undefined)
  assert.equal(toPx({ unit: '%', fallback: 0 }), 0)
  assert.doesNotThrow(() =>
    toPx({ unit: '%', context: { ownerDocument: { defaultView: {} } } }),
  )
})

test('takes a percentage with its property outside a browser', () => {
  assert.equal(toPx({ value: 50, unit: '%', property: 'width' }), undefined)
  assert.equal(toPx({ unit: '%', property: 'paddingBlock', fallback: -1 }), -1)
})

test('disposing is safe outside a browser', () => {
  assert.doesNotThrow(() => disposeToPx())
})
