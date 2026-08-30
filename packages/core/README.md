<div align="center">

# 🧰 @frontit/core
**Browser primitives for the states and values the platform keeps to itself.**

<br>
<div align="center">
  <a href="https://www.npmjs.com/package/@frontit/core">
    <img src="https://img.shields.io/npm/v/@frontit/core?style=for-the-badge&logo=npm&color=CB3837&logoColor=f6f9ff&labelColor=424656" alt="NPM Version">
  </a>
  <a href="https://restarea92.github.io/frontit/">
    <img src="https://img.shields.io/badge/Live_Inspector-Open_on_your_phone-c6dbff?style=for-the-badge&logo=refinedgithub&logoColor=f6f9ff&labelColor=424656" alt="Live Inspector">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/license-MIT-50aaff?style=for-the-badge&logo=open-source-initiative&logoColor=f6f9ff&labelColor=424656" alt="License: MIT">
  </a>
</div>
<br>

</div>
<br>

The low-level half of [Frontit](https://github.com/restarea92/frontit). If you just want
everything, install [`frontit`](https://www.npmjs.com/package/frontit) instead — it
re-exports all of this.

```bash
npm install @frontit/core
```

Zero dependencies. ESM only. Node 20+. Nothing throws where there is no DOM.

---

## 🌀 `createScrollState(options?)`

Tracks whether the user is scrolling, touching, or riding out a flick — none of which the
browser will tell you directly.

```javascript
import { createScrollState } from '@frontit/core';

const scroll = createScrollState();

const unsubscribe = scroll.subscribe((state) => {
  console.log(state.isTouchScrolling);
});

scroll.isScrolling;    // read directly, any time
scroll.getSnapshot();  // or take all four at once

unsubscribe();
scroll.destroy();
```

### The states

| State | True when |
| :--- | :--- |
| `isTouching` | A finger is on the screen, as far as the touch events admit. |
| `isScrolling` | The scroll position is **actually changing right now**. |
| `isTouchScrolling` | A touch gesture has **started and not yet finished**. |
| `isTouchMomentum` | The finger is up and the scroll is still coasting. |

`isScrolling` and `isTouchScrolling` answer different questions, so they disagree in the
cases that matter:

| | `isTouching` | `isScrolling` | `isTouchScrolling` | `isTouchMomentum` |
| :--- | :---: | :---: | :---: | :---: |
| Finger down, dragging | ✅ | ✅ | ✅ | |
| **Finger down, holding still** | ✅ | | ✅ | |
| **Finger lifted, still coasting** | | ✅ | ✅ | ✅ |
| Settled | | | | |

Gate expensive work on `isTouchScrolling` — it stays true across the pauses and the
momentum, which is almost always what you meant.

### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `target` | `EventTarget` | `window` | What to listen on. |
| `idleDelay` | `number` | `200` | Milliseconds of no `scroll` before movement counts as stopped. |

### Returned

| Member | Description |
| :--- | :--- |
| `isTouching` / `isScrolling` / `isTouchScrolling` / `isTouchMomentum` | Live getters. |
| `subscribe(listener)` | Called on **subsequent changes only** — never with the current state, which you can already read. Returns an unsubscribe function. |
| `getSnapshot()` | All four as one object. The **same reference** until a value changes, as `useSyncExternalStore` requires. |
| `destroy()` | Removes listeners and timers. Subscribing afterwards is a no-op. |

> 💡 `subscribe` and `getSnapshot` never touch `this`, so you can pass them detached
> straight into `useSyncExternalStore(scroll.subscribe, scroll.getSnapshot)`.

### How it decides the gesture is over

Where the target supports **`scrollend`** — Baseline since Safari 26.2, alongside
Chrome/Edge 114 and Firefox 109 — that event ends the touch scroll, because that is
precisely what it means. Everywhere else, a lifted finger plus an idle timer stands in.

`isScrolling` never uses `scrollend`. It measures movement, and `scrollend` deliberately
waits for the finger to leave.

<br>

## 📏 `toPx(value, options?)`

Converts a CSS length to pixels by measuring it on a hidden element.

```javascript
import { toPx } from '@frontit/core';

toPx('100lvh');                            // 926
toPx('100dvh');                            // 834.31 while the address bar animates
toPx('10ch', { context: headingElement }); // resolved in that element's font
toPx('1lvh') ?? toPx('1vh') ?? 0;          // the CSS fallback pattern, in JavaScript
```

There is no `CSS.px('1lvh')`, and `getComputedStyle` needs an element that already exists.
So `toPx` creates a hidden one, asks it, and reuses it — building and removing an element
per call would cost two reflows, and this gets called on every scroll.

### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `context` | `Element` | `document.body` | Measure inside this element. Needed for units that resolve against an ancestor — `ch` and `em` against its font, container query units against its box. The measurement element is appended for the duration of the call and never left behind. |
| `precision` | `'computed' \| 'rendered'` | `'computed'` | `computed` gives the subpixel CSS value. `rendered` rounds to an integer, closer to what the browser paints. |
| `fallback` | `number` | — | Returned when measurement is impossible. Supplying it **narrows the return type to `number`**. |

### Why `undefined` and not `0`

`0` is a perfectly valid measurement, which makes it a terrible way to signal failure. The
original of this function returned `0` when it couldn't measure, and an unsupported `lvh`
would quietly become `0px` — collapsing a layout with no error anywhere.

`toPx` validates with `CSS.supports` before measuring, so an invalid value or a unit the
browser doesn't know returns `undefined`. That is what lets `??` express the same fallback
chain you'd write in CSS.

### `computed` vs `rendered`

Not a performance switch — the two genuinely differ. The browser snaps boxes to device
pixels, so a computed `834.31` is painted as `834`. Write the fractional value into a CSS
variable that other elements consume and you get seams; write the integer and you don't.

The gap shows up exactly where you'd least like it: while the mobile address bar is
animating, `dvh` lands between pixels.

### Not supported: `%`

The measurement element is absolutely positioned, so percentages resolve against the
nearest *positioned* ancestor rather than the `context` you passed. Making it work would
mean putting the element into normal flow, where it would interfere with the caller's own
layout. Not worth it — so it's simply out of scope.

### `disposeToPx()`

Removes every measurement element. Intended for test teardown; you won't need it in an app.

<br>

## 📱 Notes from the field

Confirmed on iOS 18.7 / Safari 26.6 with the
[Inspector](https://restarea92.github.io/frontit/):

- **iOS delivers no touch events during momentum.** Grab a coasting scroll and there is no `touchstart` — the scroll events simply keep arriving. `isTouching` reads `false` with a finger on the glass. Nothing in JavaScript can observe otherwise, so this is documented rather than worked around.
- **`scrollend` can arrive with a finger still down.** A touch that stops a coasting scroll ends *that* scroll, hundreds of milliseconds before `touchend`. The gesture holding the screen hasn't finished, and `isTouchScrolling` stays true through it.
- **Scroll events continue after `scrollend`.** Releasing mid-transition lets the address bar snap open or closed, which moves the scroll position on its own. That is real movement by no one's finger, so it reads as `isScrolling` without `isTouchScrolling`.

<br>

## 🤝 License

MIT © [restarea92](https://github.com/restarea92)
