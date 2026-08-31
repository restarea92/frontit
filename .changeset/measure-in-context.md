---
"@frontit/core": minor
---

Added the `context` option: `toPx({ unit: 'cqw', context: panel })` places the probe inside that element, so the browser resolves the unit from there. This is the only way to reach a query container or a font other than the body's — `cq*` measured from the body has no container above it and falls back to the viewport. `toPx({ context })` takes the whole snapshot from that element.
