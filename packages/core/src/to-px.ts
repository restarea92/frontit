export type ToPxPrecision = 'computed' | 'rendered'

export type Unit =
  | 'px' | 'cm' | 'mm' | 'q' | 'in' | 'pt' | 'pc'
  | 'em' | 'ex' | 'cap' | 'ch' | 'ic' | 'lh'
  | 'rem' | 'rex' | 'rcap' | 'rch' | 'ric' | 'rlh'
  | 'vw' | 'vh' | 'vi' | 'vb' | 'vmin' | 'vmax'
  | 'svw' | 'svh' | 'svi' | 'svb' | 'svmin' | 'svmax'
  | 'lvw' | 'lvh' | 'lvi' | 'lvb' | 'lvmin' | 'lvmax'
  | 'dvw' | 'dvh' | 'dvi' | 'dvb' | 'dvmin' | 'dvmax'
  | 'cqw' | 'cqh' | 'cqi' | 'cqb' | 'cqmin' | 'cqmax'

type Axis = 'width' | 'height'

/**
 * The axis each unit is measured on, so a caller never has to name one. Units that
 * describe a horizontal measure go in `width` and are read back from `offsetWidth`;
 * everything else, including the units where the axis is irrelevant, goes in `height`.
 */
const UNITS: Readonly<Record<Unit, Axis>> = {
  px: 'height', cm: 'height', mm: 'height', q: 'height',
  in: 'height', pt: 'height', pc: 'height',

  em: 'height', ex: 'height', cap: 'height', lh: 'height',
  ch: 'width', ic: 'width',

  rem: 'height', rex: 'height', rcap: 'height', rlh: 'height',
  rch: 'width', ric: 'width',

  vh: 'height', vb: 'height', vmin: 'height', vmax: 'height',
  vw: 'width', vi: 'width',

  svh: 'height', svb: 'height', svmin: 'height', svmax: 'height',
  svw: 'width', svi: 'width',

  lvh: 'height', lvb: 'height', lvmin: 'height', lvmax: 'height',
  lvw: 'width', lvi: 'width',

  dvh: 'height', dvb: 'height', dvmin: 'height', dvmax: 'height',
  dvw: 'width', dvi: 'width',

  cqh: 'height', cqb: 'height', cqmin: 'height', cqmax: 'height',
  cqw: 'width', cqi: 'width',
}

const UNIT_NAMES = Object.keys(UNITS) as readonly Unit[]

/** One pixel value per unit the browser resolved. A unit it rejects has no key. */
export type PxSnapshot = Partial<Record<Unit, number>>

/** Measures every unit at once. Takes no amount: multiply the result yourself. */
export interface SnapshotOptions {
  unit?: never
}

export interface LengthOptions {
  /** How many of `unit`. Defaults to `1`. */
  value?: number | undefined
  unit: Unit
  /** `computed` resolves the subpixel CSS value. `rendered` rounds to an integer, closer to what the browser paints. */
  precision?: ToPxPrecision | undefined
  /** Returned when the value cannot be measured. Providing it narrows the return type to `number`. */
  fallback?: number | undefined
}

const MEASURE_ATTRIBUTE = 'data-frontit-measure'

// `content-visibility:hidden` skips rendering the contents while keeping the box
// measurable. `display:none` would remove the box and break measurement entirely.
const BASE_STYLE =
  'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;content-visibility:hidden'

let cached: HTMLElement | undefined

const createMeasureElement = (document: Document): HTMLElement => {
  const element = document.createElement('div')

  element.setAttribute(MEASURE_ATTRIBUTE, '')
  element.style.cssText = BASE_STYLE

  return element
}

const readPx = (
  element: HTMLElement,
  view: Window & typeof globalThis,
  axis: Axis,
): number | undefined => {
  const resolved = view.getComputedStyle(element).getPropertyValue(axis)

  // A property that declines to resolve hands the value back unchanged, which
  // `parseFloat` would read as a bare number.
  if (!resolved.endsWith('px')) {
    return undefined
  }

  const px = Number.parseFloat(resolved)

  return Number.isNaN(px) ? undefined : px
}

const resolveLength = (options: LengthOptions): number | undefined => {
  const body = typeof document === 'undefined' ? undefined : (document.body ?? undefined)
  const view = body?.ownerDocument.defaultView

  if (!body || !view) {
    return options.fallback
  }

  if (!cached?.isConnected) {
    // Reused because appending and removing one per call forces two reflows, and this
    // is measured repeatedly — on every scroll or resize.
    cached = createMeasureElement(body.ownerDocument)
    body.append(cached)
  }

  const axis = UNITS[options.unit]
  const value = `${options.value ?? 1}${options.unit}`

  if (!view.CSS.supports(axis, value)) {
    return options.fallback
  }

  cached.style.setProperty(axis, value)

  try {
    if (options.precision === 'rendered') {
      return axis === 'width' ? cached.offsetWidth : cached.offsetHeight
    }

    return readPx(cached, view, axis) ?? options.fallback
  } finally {
    // The element outlives the call, so anything left here would reach the next one.
    cached.style.cssText = BASE_STYLE
  }
}

const resolveSnapshot = (): PxSnapshot => {
  const body = typeof document === 'undefined' ? undefined : (document.body ?? undefined)
  const view = body?.ownerDocument.defaultView

  if (!body || !view) {
    return {}
  }

  const fragment = body.ownerDocument.createDocumentFragment()
  const pending: [Unit, HTMLElement, Axis][] = []

  for (const unit of UNIT_NAMES) {
    const axis = UNITS[unit]
    const value = `1${unit}`

    if (!view.CSS.supports(axis, value)) {
      continue
    }

    const element = createMeasureElement(body.ownerDocument)

    element.style.setProperty(axis, value)
    fragment.append(element)
    pending.push([unit, element, axis])
  }

  // One insertion then one read pass. Writing and reading per unit would force a
  // reflow for every one of them.
  body.append(fragment)

  const snapshot: PxSnapshot = {}

  for (const [unit, element, axis] of pending) {
    const px = readPx(element, view, axis)

    if (px !== undefined) {
      snapshot[unit] = px
    }
  }

  for (const [, element] of pending) {
    element.remove()
  }

  return snapshot
}

/**
 * Resolves a CSS unit to pixels by measuring it on a hidden element.
 *
 * Answers what the platform offers no way to query directly — `1lvh`, `10ch`,
 * `1cqw` — and returns `undefined` where there is no DOM or the browser declines
 * the unit, so a fallback chain reads as `toPx('lvh') ?? toPx('vh')`.
 *
 * Called with no unit it measures every unit at once. That snapshot is `computed`
 * only: rounding happens at the final size, so a rounded single unit does not
 * multiply.
 */
export function toPx(): PxSnapshot
export function toPx(options: SnapshotOptions): PxSnapshot
export function toPx(unit: Unit): number | undefined
export function toPx(value: number, unit: Unit): number | undefined
export function toPx(options: LengthOptions & { fallback: number }): number
export function toPx(options: LengthOptions): number | undefined
export function toPx(
  first?: Unit | number | SnapshotOptions | LengthOptions,
  second?: Unit,
): number | undefined | PxSnapshot {
  if (first === undefined) {
    return resolveSnapshot()
  }

  if (typeof first === 'string') {
    return resolveLength({ unit: first })
  }

  if (typeof first === 'number') {
    return second === undefined
      ? undefined
      : resolveLength({ value: first, unit: second })
  }

  return first.unit === undefined ? resolveSnapshot() : resolveLength(first)
}

/** Removes every measurement element created by {@link toPx}. Intended for test teardown. */
export function disposeToPx(): void {
  if (typeof document === 'undefined') {
    return
  }

  document
    .querySelectorAll(`[${MEASURE_ATTRIBUTE}]`)
    .forEach((element) => element.remove())

  cached = undefined
}
