<div align="center">

# 🧰 Frontit
**Browser primitives for the states and values the platform keeps to itself.**

<br>
<div align="center">
  <a href="https://www.npmjs.com/package/frontit">
    <img src="https://img.shields.io/npm/v/frontit?style=for-the-badge&logo=npm&color=CB3837&logoColor=f6f9ff&labelColor=424656" alt="NPM Version">
  </a>
  <a href="https://github.com/restarea92/frontit/pulse">
    <img src="https://img.shields.io/github/last-commit/restarea92/frontit?style=for-the-badge&logo=github&color=71facb&logoColor=f6f9ff&labelColor=424656">
  </a>
  <a href="https://github.com/restarea92/frontit/actions/workflows/deploy-demo.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/restarea92/frontit/deploy-demo.yml?branch=main&style=for-the-badge&label=build&logo=github&color=c6dbff&logoColor=f6f9ff&labelColor=424656" alt="Build Status">
  </a>
  <a href="https://bundlephobia.com/package/frontit">
    <img src="https://img.shields.io/bundlephobia/minzip/frontit?style=for-the-badge&logo=esbuild&color=c6dbff&logoColor=f6f9ff&labelColor=424656" alt="Bundle Size">
  </a>
</div>
<br>
<div align="center">
  <a href="https://restarea92.github.io/frontit/">
    <img src="https://img.shields.io/badge/Live_Inspector-Open_on_your_phone-c6dbff?style=for-the-badge&logo=refinedgithub&logoColor=f6f9ff&labelColor=424656" alt="Live Inspector">
  </a>
  <br>
  <b>👉 <a href="https://restarea92.github.io/frontit/">Open the Inspector</a> on a real device — that's where these states actually live! 📱</b>
</div>
<br>
<div align="center">
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/license-MIT-50aaff?style=for-the-badge&logo=open-source-initiative&logoColor=f6f9ff&labelColor=424656" alt="License: MIT">
  </a>
</div>
<br>

</div>
<br>

The browser knows. It just won't say.

| What the browser tells you | What you actually wanted to know |
| :--- | :--- |
| `scroll` fired. Again. And again. | Is the user *still* scrolling, or did it stop? |
| A finger went down. A finger went up. | Is this flick still coasting after they let go? |
| `height: 1lvh` | ...which is how many pixels, exactly? |

Frontit fills in those gaps and stays out of everything else.

---

## ⚡ Quick start

### 📦 Installation
```bash
npm install frontit
```

### 📝 Usage
```javascript
import { createScrollState, toPx } from 'frontit';

const scroll = createScrollState();

scroll.subscribe((state) => {
  if (state.isTouchScrolling) {
    // The gesture is still open, momentum included. Hold off on expensive work.
  }
});

const viewport = toPx('100dvh'); // 834.31 while the address bar animates
```

<br>

## 🤔 Why Frontit?

### The itch

You won't need these often. But when you do, you end up writing them yourself — and they
are fiddlier than they look, in ways that only surface on a real phone.

Frontit is that code, written once.

### The rule for what goes in

**A tool belongs here when the platform offers no way to ask.**

That single line does a lot of work. A `debounce` helper doesn't qualify — that's a
userland utility, and there are a thousand of them. "Is this scroll still coasting after
the finger lifted" does qualify, because there is no event, no property, and no query that
will tell you.

It keeps the toolkit from turning into a junk drawer.

### ✨ What that buys you

- 🎯 **Defined semantics.** Every state documents exactly when it turns on and off, including the awkward middles — a finger resting mid-scroll, a flick still coasting.
- 📱 **Verified on real hardware.** iOS does things no headless browser reproduces. The [Inspector](https://restarea92.github.io/frontit/) exists because that's the only way to check, and it has already caught bugs that every test suite passed.
- 🪶 **Zero dependencies.** ESM, tree-shakeable, `sideEffects: false`.
- 🌐 **SSR-safe by rule.** Nothing throws when there is no DOM — not on import, not on call.
- 🔒 **Strict types.** `isolatedDeclarations`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and no `any` anywhere.
- ⚛️ **Framework-agnostic.** Plain factories with a `subscribe`/`getSnapshot` pair, so `useSyncExternalStore` just works.

<br>

## 📦 Packages

| Package | Description |
| :--- | :--- |
| [`frontit`](packages/frontit) | Everything, re-exported. Start here. |
| [`@frontit/core`](packages/core) | The primitives themselves. |

Requires Node 20 or newer.

<br>

---

<br>

## 🛠️ What's inside

### `createScrollState()` — the four states

```javascript
const scroll = createScrollState();

scroll.isTouchScrolling;              // read whenever
scroll.subscribe((state) => { ... }); // or listen for changes
scroll.destroy();                     // and clean up
```

The two questions it answers are genuinely different, and that difference is the point:

- **`isScrolling`** — is the scroll position *actually changing right now?*
- **`isTouchScrolling`** — has a touch gesture *started and not yet finished?*

Which is why they disagree, on purpose:

| | `isTouching` | `isScrolling` | `isTouchScrolling` | `isTouchMomentum` |
| :--- | :---: | :---: | :---: | :---: |
| Finger down, dragging | ✅ | ✅ | ✅ | |
| **Finger down, holding still** | ✅ | | ✅ | |
| **Finger lifted, still coasting** | | ✅ | ✅ | ✅ |
| Settled | | | | |

Those two middle rows are the ones people reinvent badly. Frontit gets them from
`scrollend` where the browser reports it, and falls back to a timer where it doesn't.

### `toPx()` — what is that value, in pixels?

```javascript
toPx('100lvh');                              // 926
toPx('10ch', { context: someElement });      // measured in that element's font
toPx('100dvh', { precision: 'rendered' });   // 834, the integer the browser paints
toPx('1lvh') ?? toPx('1vh') ?? 0;            // CSS-style fallback, in JavaScript
```

There is no `CSS.px('1lvh')`, and `getComputedStyle` needs an element that already exists.
So `toPx` creates a hidden element, measures, and reuses it — creating and removing one per
call would cost two reflows.

It returns `undefined` rather than `0` when the browser rejects the value or there is no
DOM, which is what makes that `??` chain above work: `0` is a perfectly valid measurement
and a terrible error signal.

<br>

## ⚛️ Framework integration

**React** — `getSnapshot` returns a stable reference, so `useSyncExternalStore` is happy:

```jsx
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createScrollState } from 'frontit';

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
import { createScrollState } from 'frontit';

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

**Vanilla / SSR:** `createScrollState()` outside a browser attaches nothing and reports
everything as `false`. `toPx()` returns `undefined`. Neither throws, so there is no
`typeof window` dance to write.

<br>

## 🔍 The Inspector

<div align="center">
  <a href="https://restarea92.github.io/frontit/"><b>restarea92.github.io/frontit</b></a>
</div>
<br>

Open it on a phone. It shows every state as it flips, measures viewport units in **both
precisions** while the browser chrome slides around, and logs the **raw touch and scroll
events** the device actually emitted, with a copy button so the log is not stuck on the
phone.

This isn't decoration. Node has no DOM and jsdom computes no layout, so momentum,
`scrollend` ordering, and the gap between a computed `834.31` and a painted `834` are
invisible to any test runner. Every awkward row in that table above was confirmed here
first.

<br>

## 📈 Notes from the field

- **`scrollend` is Baseline** as of Safari 26.2, joining Chrome/Edge 114 and Firefox 109. Frontit uses it where present and keeps the timer fallback where it isn't.
- **iOS hides touches during momentum.** Grab a coasting scroll and iOS delivers no `touchstart` at all — the scroll events just keep coming. `isTouching` reads `false` with a finger on the glass, and no amount of JavaScript can see otherwise. Documented, not fixed, because it isn't fixable.
- **`scrollend` can fire with a finger still down.** When a touch stops a coasting scroll, that scroll ends — hundreds of milliseconds before `touchend`. A gesture still holding the screen hasn't finished, so Frontit doesn't pretend it has.

<br>

## 👨‍💻 Author
- **GitHub**: [@restarea92](https://github.com/restarea92)
- **Email**: [restarea@me.com](mailto:restarea@me.com)

<br>

## 📌 Status

`0.x`. The shape can still change between minor versions. Once it settles, `1.0.0` — which
is a promise not to break things, not a claim of being finished.

<br>

## 🤝 License

This project is licensed under the **MIT License**.
