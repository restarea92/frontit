<div align="center">

# 🧰 frontit
**Browser primitives for the states and values the platform keeps to itself.**

<br>
<div align="center">
  <a href="https://www.npmjs.com/package/frontit">
    <img src="https://img.shields.io/npm/v/frontit?style=for-the-badge&logo=npm&color=CB3837&logoColor=f6f9ff&labelColor=424656" alt="NPM Version">
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

You won't need these often. But when you do, you end up writing them yourself — and they
are fiddlier than they look. Frontit is that code, written once.

```bash
npm install frontit
```

```javascript
import { createScrollState, toPx } from 'frontit';

const scroll = createScrollState();

scroll.subscribe((state) => {
  if (state.isTouchScrolling) {
    // Still mid-gesture, momentum and all. Hold off on expensive work.
  }
});

toPx('100dvh'); // 834.31 while the address bar animates
```

Zero dependencies. ESM only. Node 20+. Nothing throws where there is no DOM.

---

## 📦 What this package is

The umbrella. It re-exports everything from
[`@frontit/core`](https://www.npmjs.com/package/@frontit/core), so installing `frontit`
gets you the lot and you never have to think about which package a tool lives in.

Reach for `@frontit/core` directly only if you have a reason to pin it yourself.

| Export | What it does |
| :--- | :--- |
| `createScrollState` | Tracks touching, scrolling, touch-scrolling and momentum as four separate states — because they genuinely differ. |
| `toPx` | Resolves a CSS length to pixels, including `lvh` / `svh` / `dvh` / `ch`, which nothing else will tell you. |
| `disposeToPx` | Clears the measurement elements. Test teardown. |

## 📚 Documentation

Everything — the state table, the options, the `computed` vs `rendered` distinction, and
the iOS behaviour worth knowing about — lives in the
**[core README](https://www.npmjs.com/package/@frontit/core)**.

The **[Inspector](https://restarea92.github.io/frontit/)** is the fastest way to see what
any of it does. Open it on a phone.

## 🤝 License

MIT © [restarea92](https://github.com/restarea92)
