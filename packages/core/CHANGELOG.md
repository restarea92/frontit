# @frontit/core

## 0.2.0

### Minor Changes

- Added `toPx()`, which measures every unit at once and returns one pixel value each. A unit the browser rejects has no key, so the result also answers `'lvh' in toPx()`. Computed only, and a survey rather than a basis for arithmetic: browsers quantise computed lengths, so scaling one unit up drifts from measuring that size directly.

- Added the `context` option: `toPx({ unit: 'cqw', context: panel })` places the probe inside that element, so the browser resolves the unit from there. This is the only way to reach a query container or a font other than the body's — `cq*` measured from the body has no container above it and falls back to the viewport. `toPx({ context })` takes the whole snapshot from that element.

- Percentages take the property they resolve against: `toPx({ value: 50, unit: '%', property: 'width', context: panel })`. A percentage is not a unit — `fontSize` is a share of the parent's font, `height` of the containing block's height, `paddingBlock` of its **width** — so the property is required and no call quietly picks a basis. `toPx()` reports them under `percent`, one value per property. Previously `calc(100% - 2rem)` passed `CSS.supports` and then resolved against the viewport rather than any element the caller had in mind.

- `toPx` now takes an amount and a unit rather than a CSS string: `toPx(100, 'dvh')`, `toPx('lvh')`, or `toPx({ value, unit, precision, fallback })`. Nothing has to be parsed, so `calc()` and `var()` are no longer accepted — units are linear, so the arithmetic is the caller's.

### Patch Changes

- A unit outside the known list is refused before measuring. TypeScript already rejected them, but `CSS.supports` accepts `1%`, so plain JavaScript could measure a percentage against the initial containing block and get a number back.

- The cached measurement element is reset after each call, so a measured value cannot follow the next measurement into a different unit.

- Measurement no longer returns a number for a value the browser declined to resolve. Properties that hand a percentage back unchanged were being read as the bare number.

## 0.1.0

### Minor Changes

- Added `toPx`, which converts a CSS length to pixels by measuring it on a hidden element. It resolves values the platform offers no way to query directly, such as `1lvh` or `10ch`, and returns `undefined` rather than `0` when the browser rejects the value or there is no DOM, so a failure stays distinguishable from a valid zero and a fallback chain reads as `toPx('100lvh') ?? toPx('100vh')`.

- Added `isTouchMomentum` to the scroll state. The value was derivable from the two states around it, but a caller had to work the combination out for themselves.

- Added `getSnapshot()`, which returns the same object reference until a value changes, as `useSyncExternalStore` requires.

- `createScrollState` now ends a touch scroll on `scrollend` where the target reports it, falling back to the idle timeout elsewhere. `isScrolling` measures movement and `isTouchScrolling` tracks whether the gesture is still open, so a finger resting mid-scroll leaves the first false and the second true.

- Removed the `./scroll` subpath export. Everything is reachable from the package root, which leaves the file layout free to change.

### Patch Changes

- A `scrollend` arriving while a finger is still down no longer ends the touch scroll. iOS emits one when a touch lands on a coasting scroll, hundreds of milliseconds before `touchend`, and the drag that followed was being reported as an ordinary scroll.

- Listeners are notified from a settled copy of the subscriber set, so one that subscribes from inside a notification no longer receives the notification it is already in.
