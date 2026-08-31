---
"@frontit/core": minor
---

Added `toPx()`, which measures every unit at once and returns one pixel value each. A unit the browser rejects has no key, so the result also answers `'lvh' in toPx()`. Computed only, and a survey rather than a basis for arithmetic: browsers quantise computed lengths, so scaling one unit up drifts from measuring that size directly.
