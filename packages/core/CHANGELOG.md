# @frontit/core

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
