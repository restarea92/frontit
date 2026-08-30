# @frontit/core

Low-level browser primitives and utilities for frontend development.

```ts
import { createScrollState } from '@frontit/core/scroll'

const scroll = createScrollState()

scroll.subscribe((state) => {
  console.log(state.isTouchScrolling)
})
```
