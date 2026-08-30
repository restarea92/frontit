# Frontit

Frontit is a frontend toolkit for reusable browser primitives and utilities.

```ts
import { createScrollState } from '@frontit/core/scroll'

const scroll = createScrollState()

scroll.subscribe((state) => {
  console.log(state.isTouchScrolling)
})
```
