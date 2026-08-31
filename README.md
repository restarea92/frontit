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

---

## ⚡ Quick start

```bash
npm install frontit
```

```javascript
import { createScrollState, toPx } from 'frontit';

const scroll = createScrollState();

scroll.subscribe((state) => {
  if (state.isTouchScrolling) {
    // The gesture is still open, momentum included. Hold off on expensive work.
  }
});

toPx(100, 'dvh'); // 834.31
toPx();           // { rem: 16, ch: 8.4, lvh: 9.26, dvh: 8.34, … } every unit at once
```

Zero dependencies. ESM only. Node 20+. Nothing throws where there is no DOM.

<br>

## 🤔 Why Frontit?

You won't need these often. But when you do, you end up writing them yourself — and they
are fiddlier than they look, in ways that only surface on a real phone.

**A tool belongs here when the platform offers no way to ask.** A `debounce` helper doesn't
qualify. "Is this scroll still coasting after the finger lifted" does, because there is no
event, property or query that will tell you. That rule is what keeps the toolkit from
turning into a junk drawer.

<br>

## 📦 Packages

| Package | Description |
| :--- | :--- |
| [`frontit`](packages/frontit) | Everything, re-exported. Start here. |
| [`@frontit/core`](packages/core) | The primitives, and **the full API reference**. |

<br>

## 🔍 The Inspector

<div align="center">
  <a href="https://restarea92.github.io/frontit/"><b>restarea92.github.io/frontit</b></a>
</div>
<br>

Open it on a phone. One page per tool: the scroll states as they flip, alongside the raw
touch and scroll events the device emitted; and every CSS unit the browser resolves, in
pixels.

Node has no DOM and jsdom computes no layout, so momentum, `scrollend` ordering and the gap
between a computed `834.31` and a painted `834` are invisible to any test runner. Every
awkward case this library handles was confirmed here first.

<br>

## 👨‍💻 Author
- **GitHub**: [@restarea92](https://github.com/restarea92)
- **Email**: [restarea@me.com](mailto:restarea@me.com)

## 📌 Status

`0.x`. The shape can still change between minor versions. Once it settles, `1.0.0` — which
is a promise not to break things, not a claim of being finished.

## 🤝 License

MIT
