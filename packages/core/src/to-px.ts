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

// A length computes the same wherever it is put: `1cqb` is the container's block size
// whichever property holds it. So everything is measured through one neutral property,
// and the unit alone decides what it resolves against.
const MEASURE_PROPERTY = 'width'

const UNITS = [
  'px', 'cm', 'mm', 'q', 'in', 'pt', 'pc',
  'em', 'ex', 'cap', 'ch', 'ic', 'lh',
  'rem', 'rex', 'rcap', 'rch', 'ric', 'rlh',
  'vw', 'vh', 'vi', 'vb', 'vmin', 'vmax',
  'svw', 'svh', 'svi', 'svb', 'svmin', 'svmax',
  'lvw', 'lvh', 'lvi', 'lvb', 'lvmin', 'lvmax',
  'dvw', 'dvh', 'dvi', 'dvb', 'dvmin', 'dvmax',
  'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
] as const satisfies readonly Unit[]

const KNOWN = new Set<string>(UNITS)

/**
 * CSS properties whose percentage the snapshot reports. Any other property can still be
 * asked for by name; these are the ones worth listing.
 */
export const PERCENT_PROPERTIES = [
  'width',
  'height',
  'fontSize',
  'lineHeight',
  'paddingBlock',
] as const

export type PercentProperty = (typeof PERCENT_PROPERTIES)[number] | (string & {})

export type PercentSnapshot = Partial<Record<(typeof PERCENT_PROPERTIES)[number], number>>

/**
 * One pixel value per unit the browser resolved. A unit it rejects has no key.
 *
 * `percent` is nested because a percentage is not a unit: every property resolves it
 * against its own basis, so there is one value per property rather than one value.
 */
export type PxSnapshot = Partial<Record<Unit, number>> & {
  percent?: PercentSnapshot
}

export interface BaseOptions {
  /**
   * Element to measure inside. A unit is resolved against whatever the browser finds
   * from there — an ancestor font for `em` and `ch`, a query container for `cq*` — so
   * this is how you ask about a place other than `document.body`.
   */
  context?: Element | undefined
}

/** Measures every unit at once. Takes no amount: scale the result yourself. */
export interface SnapshotOptions extends BaseOptions {
  unit?: never
}

export interface PercentOptions extends BaseOptions {
  /** How many percent. Defaults to `1`. */
  value?: number | undefined
  unit: '%'
  /**
   * CSS property the percentage resolves against, camelCased. A percentage has no
   * meaning without one: `fontSize` is a share of the parent's font, `height` of the
   * containing block's height, and `paddingBlock` of its **width**.
   */
  property: PercentProperty
  /** Returned when the value cannot be measured. Providing it narrows the return type to `number`. */
  fallback?: number | undefined
}

export interface LengthOptions extends BaseOptions {
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

interface Placement {
  context: Element
  view: Window & typeof globalThis
  /** Whether the probe may be left in place between calls. */
  reusable: boolean
}

const place = (context: Element | undefined): Placement | undefined => {
  const body = typeof document === 'undefined' ? undefined : (document.body ?? undefined)
  const target = context ?? body
  const view = target?.ownerDocument?.defaultView

  if (!target || !view) {
    return undefined
  }

  return { context: target, view, reusable: target === body }
}

const createProbe = (document: Document): HTMLElement => {
  const element = document.createElement('div')

  element.setAttribute(MEASURE_ATTRIBUTE, '')
  element.style.cssText = BASE_STYLE

  return element
}

const readPx = (
  element: HTMLElement,
  view: Window & typeof globalThis,
): number | undefined => {
  const resolved = view.getComputedStyle(element).getPropertyValue(MEASURE_PROPERTY)

  // A property that declines to resolve hands the value back unchanged, which
  // `parseFloat` would read as a bare number.
  if (!resolved.endsWith('px')) {
    return undefined
  }

  const px = Number.parseFloat(resolved)

  return Number.isNaN(px) ? undefined : px
}

const resolveLength = (options: LengthOptions): number | undefined => {
  const placement = place(options.context)

  if (!placement) {
    return options.fallback
  }

  const { context, view, reusable } = placement
  const value = `${options.value ?? 1}${options.unit}`

  // `CSS.supports` would accept `1%`, and an absolutely positioned probe resolves a
  // percentage against the initial containing block rather than the context — a number,
  // measured from the wrong box. Only units this function knows how to place get through.
  if (!KNOWN.has(options.unit) || !view.CSS.supports(MEASURE_PROPERTY, value)) {
    return options.fallback
  }

  let probe = reusable ? cached : undefined

  if (!probe?.isConnected) {
    // The default probe is reused because appending and removing one per call forces two
    // reflows, and it is measured repeatedly. A caller's own element never keeps one:
    // a lingering child changes `:empty`, sibling selectors and nth-child counts on a
    // subtree we do not own.
    probe = createProbe(context.ownerDocument)
    context.append(probe)

    if (reusable) {
      cached = probe
    }
  }

  probe.style.setProperty(MEASURE_PROPERTY, value)

  try {
    return options.precision === 'rendered'
      ? probe.offsetWidth
      : (readPx(probe, view) ?? options.fallback)
  } finally {
    if (reusable) {
      // The probe outlives the call, so anything left here would reach the next one.
      probe.style.cssText = BASE_STYLE
    } else {
      probe.remove()
    }
  }
}

const kebab = (property: string): string =>
  property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

const inlineStyleOf = (element: Element): CSSStyleDeclaration | undefined => {
  const { style } = element as Element & Partial<ElementCSSInlineStyle>

  return typeof style?.setProperty === 'function' ? style : undefined
}

/**
 * Runs `measure` with `context` as the containing block for absolutely positioned
 * children, which is what makes a percentage resolve against it.
 *
 * The probe is absolutely positioned, so it would otherwise resolve percentages against
 * the nearest positioned ancestor — rarely the element that was named. Positioning the
 * context makes it that ancestor. It is restored before returning, and `relative` with
 * no offsets moves nothing, so nothing is ever painted from it.
 */
const withContainingBlock = <T>(
  context: Element,
  view: Window & typeof globalThis,
  fallback: T,
  measure: () => T,
): T => {
  if (view.getComputedStyle(context).position !== 'static') {
    return measure()
  }

  const style = inlineStyleOf(context)

  if (!style) {
    return fallback
  }

  const previous = style.getPropertyValue('position')

  style.setProperty('position', 'relative')

  try {
    return measure()
  } finally {
    if (previous === '') {
      style.removeProperty('position')
    } else {
      style.setProperty('position', previous)
    }
  }
}

const measurePercent = (
  context: Element,
  view: Window & typeof globalThis,
  value: string,
  property: string,
): number | undefined => {
  if (!view.CSS.supports(property, value)) {
    return undefined
  }

  const probe = createProbe(context.ownerDocument)

  probe.style.setProperty(property, value)
  context.append(probe)

  try {
    const resolved = view.getComputedStyle(probe).getPropertyValue(property)

    if (!resolved.endsWith('px')) {
      return undefined
    }

    const px = Number.parseFloat(resolved)

    return Number.isNaN(px) ? undefined : px
  } finally {
    probe.remove()
  }
}

const resolvePercent = (options: PercentOptions): number | undefined => {
  const placement = place(options.context)

  if (!placement) {
    return options.fallback
  }

  // A percentage has no basis without a property. TypeScript requires one; plain
  // JavaScript does not.
  if (typeof options.property !== 'string') {
    return options.fallback
  }

  const { context, view } = placement
  const value = `${options.value ?? 1}%`
  const property = kebab(options.property)

  return withContainingBlock(context, view, options.fallback, () =>
    measurePercent(context, view, value, property) ?? options.fallback,
  )
}

const resolvePercentSnapshot = (
  context: Element,
  view: Window & typeof globalThis,
): PercentSnapshot | undefined =>
  withContainingBlock(context, view, undefined, () => {
    const percent: PercentSnapshot = {}

    for (const property of PERCENT_PROPERTIES) {
      const px = measurePercent(context, view, '1%', kebab(property))

      if (px !== undefined) {
        percent[property] = px
      }
    }

    return percent
  })

const resolveSnapshot = (options: SnapshotOptions): PxSnapshot => {
  const placement = place(options.context)

  if (!placement) {
    return {}
  }

  const { context, view } = placement
  const fragment = context.ownerDocument.createDocumentFragment()
  const pending: [Unit, HTMLElement][] = []

  for (const unit of UNITS) {
    const value = `1${unit}`

    if (!view.CSS.supports(MEASURE_PROPERTY, value)) {
      continue
    }

    const probe = createProbe(context.ownerDocument)

    probe.style.setProperty(MEASURE_PROPERTY, value)
    fragment.append(probe)
    pending.push([unit, probe])
  }

  // One insertion then one read pass. Writing and reading per unit would force a
  // reflow for every one of them.
  context.append(fragment)

  const snapshot: PxSnapshot = {}

  for (const [unit, probe] of pending) {
    const px = readPx(probe, view)

    if (px !== undefined) {
      snapshot[unit] = px
    }
  }

  for (const [, probe] of pending) {
    probe.remove()
  }

  const percent = resolvePercentSnapshot(context, view)

  if (percent) {
    snapshot.percent = percent
  }

  return snapshot
}

/**
 * Resolves a CSS length unit to pixels by measuring it on a hidden element.
 *
 * Answers what the platform offers no way to query directly — `1lvh`, `10ch`,
 * `1cqw` — and returns `undefined` where there is no DOM or the browser declines
 * the unit, so a fallback chain reads as `toPx('lvh') ?? toPx('vh')`.
 *
 * `context` decides where the question is asked. The probe is placed inside it, so
 * the browser resolves the unit against whatever it finds from there.
 *
 * A percentage is not a unit, so `'%'` also needs the property it resolves against:
 * `toPx({ value: 50, unit: '%', property: 'width', context })`.
 *
 * Called with no unit it measures everything at once. That snapshot is a survey,
 * not a basis for arithmetic: computed lengths are quantised, so scaling one up
 * drifts from measuring that size directly.
 */
export function toPx(): PxSnapshot
export function toPx(options: SnapshotOptions): PxSnapshot
export function toPx(unit: Unit): number | undefined
export function toPx(value: number, unit: Unit): number | undefined
export function toPx(options: PercentOptions & { fallback: number }): number
export function toPx(options: PercentOptions): number | undefined
export function toPx(options: LengthOptions & { fallback: number }): number
export function toPx(options: LengthOptions): number | undefined
export function toPx(
  first?: Unit | number | SnapshotOptions | LengthOptions | PercentOptions,
  second?: Unit,
): number | undefined | PxSnapshot {
  if (first === undefined) {
    return resolveSnapshot({})
  }

  if (typeof first === 'string') {
    return resolveLength({ unit: first })
  }

  if (typeof first === 'number') {
    return second === undefined
      ? undefined
      : resolveLength({ value: first, unit: second })
  }

  if (first.unit === undefined) {
    return resolveSnapshot(first)
  }

  return first.unit === '%' ? resolvePercent(first) : resolveLength(first)
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
