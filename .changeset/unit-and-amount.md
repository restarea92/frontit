---
"@frontit/core": minor
---

`toPx` now takes an amount and a unit rather than a CSS string: `toPx(100, 'dvh')`, `toPx('lvh')`, or `toPx({ value, unit, precision, fallback })`. Nothing has to be parsed, so `calc()` and `var()` are no longer accepted — units are linear, so the arithmetic is the caller's.
