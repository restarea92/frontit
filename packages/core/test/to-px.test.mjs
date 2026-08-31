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

test('returns an empty snapshot outside a browser', () => {
  assert.deepEqual(toPx(), {})
  assert.deepEqual(toPx({}), {})
})

test('accepts every option outside a browser without throwing', () => {
  assert.equal(toPx({ value: 50, unit: 'vw', precision: 'rendered' }), undefined)
  assert.equal(toPx({ value: 10, unit: 'ch', precision: 'computed', fallback: 16 }), 16)
})

test('disposing is safe outside a browser', () => {
  assert.doesNotThrow(() => disposeToPx())
})
