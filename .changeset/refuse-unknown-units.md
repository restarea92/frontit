---
"@frontit/core": patch
---

A unit outside the known list is refused before measuring. TypeScript already rejected them, but `CSS.supports` accepts `1%`, so plain JavaScript could measure a percentage against the initial containing block and get a number back.
