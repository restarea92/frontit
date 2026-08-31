---
"@frontit/core": minor
---

`toPx().percent` is always present, with `undefined` for a property it could not measure, so reaching for `toPx().percent.width` no longer needs a guard. Unit keys still appear only when the browser resolved them: whether a unit exists is the browser's answer and absence is how it says no, while the percent properties are ours and always have a place.
