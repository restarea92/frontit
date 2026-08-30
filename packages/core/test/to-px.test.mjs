import assert from 'node:assert/strict'
import test from 'node:test'

import { disposeToPx, toPx } from '../dist/index.js'

test('returns undefined outside a browser', () => {
  assert.equal(toPx('1lvh'), undefined)
})

test('returns the fallback when measurement is impossible', () => {
  assert.equal(toPx('1lvh', { fallback: 0 }), 0)
  assert.equal(toPx('1lvh', { fallback: -1 }), -1)
})

test('accepts every option outside a browser without throwing', () => {
  assert.equal(toPx('50vw', { precision: 'rendered' }), undefined)
  assert.equal(toPx('10ch', { precision: 'computed', fallback: 16 }), 16)
})

test('disposing is safe outside a browser', () => {
  assert.doesNotThrow(() => disposeToPx())
})
