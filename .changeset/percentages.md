---
"@frontit/core": minor
---

Percentages take the property they resolve against: `toPx({ value: 50, unit: '%', property: 'width', context: panel })`. A percentage is not a unit — `fontSize` is a share of the parent's font, `height` of the containing block's height, `paddingBlock` of its **width** — so the property is required and no call quietly picks a basis. `toPx()` reports them under `percent`, one value per property. Previously `calc(100% - 2rem)` passed `CSS.supports` and then resolved against the viewport rather than any element the caller had in mind.
