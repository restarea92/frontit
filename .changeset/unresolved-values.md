---
"@frontit/core": patch
---

Measurement no longer returns a number for a value the browser declined to resolve. Properties that hand a percentage back unchanged were being read as the bare number.
