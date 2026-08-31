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

## 📏 `toPx(...)`

Resolves a CSS unit to pixels by measuring it on a hidden element.

```javascript
import { toPx } from '@frontit/core';

toPx('lvh');                      // 9.26   — one unit
toPx(100, 'dvh');                 // 834.31
toPx({ value: 10, unit: 'ch', context: el }); // in that element's font
toPx();                           // every unit at once, see below
```

There is no `CSS.px('1lvh')`, and `getComputedStyle` needs an element that already
exists. So `toPx` creates a hidden one, asks it, and reuses it.

### Calls

The object form is the real signature; the two short forms exist because they are what
you write most.

| Call | Returns |
| :--- | :--- |
| `toPx()` | Every unit, one of each. |
| `toPx('vh')` | One `vh`, in pixels. |
| `toPx(100, 'vh')` | A hundred of them. |
| `toPx({ value, unit, context, precision, fallback })` | The same, spelled out. |
| `toPx({ context })` | Every unit, measured inside that element. |

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `value` | `number` | `1` | How many of `unit`. |
| `unit` | `Unit` | — | Any CSS length unit, spelled as in CSS. Omit it and you get the snapshot. |
| `context` | `Element` | `document.body` | Where to ask. See below. |
| `precision` | `'computed' \| 'rendered'` | `'computed'` | `computed` gives the subpixel CSS value. `rendered` rounds to an integer, closer to what the browser paints. |
| `fallback` | `number` | — | Returned when measurement is impossible. Supplying it **narrows the return type to `number`**. |

You pass a unit rather than a string of CSS, so nothing has to be parsed. A length also
computes the same wherever it is put — `1cqb` is the container's block size whichever
property holds it — so every unit is measured through one property, and the unit alone
decides what it resolves against.

### `context` — where the question is asked

`toPx` puts a hidden probe inside `context` and lets the browser resolve the unit from
there. It does not decide which units care:

```javascript
toPx('cqw');                            // 19.19 — nothing above body is a query
                                        //         container, so CSS uses the viewport
toPx({ unit: 'cqw', context: panel });  //  2.40 — panel is one
toPx({ unit: 'ch', context: panel });   // panel's font
toPx({ unit: 'vh', context: panel });   // the same as anywhere: vh is the viewport

toPx({ context: panel });               // the whole snapshot, from there
```

`document.body` is the default and its probe is kept between calls. A probe is never left
inside an element you passed — a lingering child would change `:empty`, sibling selectors
and `nth-child` counts on a subtree that isn't ours.

### `toPx()` — the whole table

```javascript
toPx();
// { px: 1, rem: 16, ch: 8.4, vh: 9.26, lvh: 9.26, dvh: 8.34, cqw: 4.14, … }
```

**A unit the browser rejects has no key**, so the result doubles as a support map:

```javascript
'lvh' in toPx();  // feature detection, with the value already measured
```

No amount: the snapshot is a survey, and scaling one of its values is yours to do.

Two things to know before you scale one. It is `computed` only, because rounding happens
once at the final size — `1vh` rendered as `8` times fifty is `400`, while `50vh` rendered
is `417`. And browsers quantise computed lengths, typically to 1/64px, so a single unit
carries rounding that grows with the multiplier:

```javascript
// on a 911px viewport, where 1vh is exactly 9.11
toPx().vh;         // 9.109375  — the nearest 1/64
toPx().vh * 50;    // 455.46875
toPx(50, 'vh');    // 455.5     — measured at that size, so it lands exactly
```

Scale the snapshot for a survey. Pass the amount when the number goes into a layout.

### Why `undefined` and not `0`

`0` is a perfectly valid measurement, which makes it a terrible way to signal failure. The
original of this function returned `0` when it couldn't measure, and an unsupported `lvh`
would quietly become `0px` — collapsing a layout with no error anywhere.

`toPx` validates with `CSS.supports` before measuring and checks that what comes back is
in pixels, so anything it could not resolve returns `undefined`. That is what lets `??`
express the same fallback chain you'd write in CSS:

```javascript
toPx('lvh') ?? toPx('vh') ?? 0;
```

### `computed` vs `rendered`

Not a performance switch — the two genuinely differ. The browser snaps boxes to device
pixels, so a computed `834.31` is painted as `834`. Write the fractional value into a CSS
variable that other elements consume and you get seams; write the integer and you don't.

Any computed length that is not a whole device pixel diverges, which viewport units
reach easily — a viewport is rarely a multiple of a hundred.

### `disposeToPx()`

Removes every measurement element. Intended for test teardown; you won't need it in an app.

### Not yet: `%`

A percentage is not a unit — it is a token every property resolves against its own basis.
`font-size: 50%` is half the parent's font size, `height: 50%` is half the containing
block, and `padding-top: 50%` is half its **width**. So a percentage needs a property as
well as a context, and it will take one as `toPx({ value, unit: '%', property, context })`.

That is the only thing `context` alone cannot answer, and it is why `%` is the one CSS
value this function does not accept.


## ⚛️ Framework integration

**React** — `getSnapshot` returns a stable reference, so `useSyncExternalStore` is happy:

```jsx
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createScrollState } from '@frontit/core';

function useScrollState() {
  const scroll = useMemo(() => createScrollState(), []);

  useEffect(() => () => scroll.destroy(), [scroll]);

  return useSyncExternalStore(scroll.subscribe, scroll.getSnapshot, scroll.getSnapshot);
}
```

> 💡 Both are passed **detached**, with no `.bind()`. Nothing here uses `this`, which is
> why these are closures rather than classes.

**Vue 3:**

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { createScrollState } from '@frontit/core';

const state = ref(null);
let scroll;

onMounted(() => {
  scroll = createScrollState();
  state.value = scroll.getSnapshot();
  scroll.subscribe((next) => (state.value = next));
});

onBeforeUnmount(() => scroll?.destroy());
</script>
```

**SSR:** `createScrollState()` outside a browser attaches nothing and reports everything as
`false`. `toPx()` returns `undefined`. Neither throws, so there is no `typeof window` dance
to write.

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
