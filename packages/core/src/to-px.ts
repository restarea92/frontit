export type ToPxPrecision = 'computed' | 'rendered'

export interface ToPxOptions {
  /**
   * Element to measure within, for units that resolve against an ancestor: `ch` and `em`
   * against its font, container query units against its box. The measurement element is
   * appended to it for the duration of the call. Defaults to `document.body`.
   */
  context?: Element | undefined
  /** `computed` resolves the subpixel CSS value. `rendered` rounds to an integer, closer to what the browser paints. */
  precision?: ToPxPrecision | undefined
  /** Returned when the value cannot be measured. Providing it narrows the return type to `number`. */
  fallback?: number | undefined
}

const MEASURE_ATTRIBUTE = 'data-frontit-measure'

let cachedElements = new WeakMap<Element, HTMLElement>()

const createMeasureElement = (context: Element): HTMLElement => {
  const element = context.ownerDocument.createElement('div')

  element.setAttribute(MEASURE_ATTRIBUTE, '')
  // `content-visibility:hidden` skips rendering the contents while keeping the box
  // measurable. `display:none` would remove the box and break measurement entirely.
  element.style.cssText =
    'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;content-visibility:hidden'
  context.appendChild(element)

  return element
}

const measure = (
  element: HTMLElement,
  value: string,
  options: ToPxOptions,
): number | undefined => {
  const view = element.ownerDocument.defaultView

  if (!view || !view.CSS.supports('height', value)) {
    return options.fallback
  }

  element.style.height = value

  if (options.precision === 'rendered') {
    return element.offsetHeight
  }

  const measured = Number.parseFloat(view.getComputedStyle(element).height)

  return Number.isNaN(measured) ? options.fallback : measured
}

/**
 * Converts a CSS length to pixels by measuring it on a hidden element.
 *
 * Resolves values the platform offers no way to query directly, such as `1lvh`,
 * `10ch` or `calc(100vh - 2rem)`. Returns `undefined` when there is no DOM, or
 * when the browser rejects the value as invalid or unsupported, so a caller can
 * spell a fallback chain as `toPx('100lvh') ?? toPx('100vh')`.
 *
 * `rendered` precision is rounded, which tracks the painted size closely but is
 * not guaranteed to match it at every position.
 */
export function toPx(
  value: string,
  options: ToPxOptions & { fallback: number },
): number
export function toPx(value: string, options?: ToPxOptions): number | undefined
export function toPx(value: string, options: ToPxOptions = {}): number | undefined {
  const defaultContext =
    typeof document === 'undefined' ? undefined : (document.body ?? undefined)
  const context = options.context ?? defaultContext

  if (!context) {
    return options.fallback
  }

  if (context !== defaultContext) {
    // Measurement elements are not left inside a caller's element: a lingering child
    // changes `:empty`, sibling selectors and nth-child counts on a subtree we do not own.
    const element = createMeasureElement(context)

    try {
      return measure(element, value, options)
    } finally {
      element.remove()
    }
  }

  let element = cachedElements.get(context)

  if (!element) {
    // Reused because appending and removing one per call forces two reflows, and the
    // default context is measured repeatedly — on every scroll or resize.
    element = createMeasureElement(context)
    cachedElements.set(context, element)
  }

  return measure(element, value, options)
}

/** Removes every measurement element created by {@link toPx}. Intended for test teardown. */
export function disposeToPx(): void {
  if (typeof document === 'undefined') {
    return
  }

  document
    .querySelectorAll(`[${MEASURE_ATTRIBUTE}]`)
    .forEach((element) => element.remove())

  cachedElements = new WeakMap()
}
