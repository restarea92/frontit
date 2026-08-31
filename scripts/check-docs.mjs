// Type-checks the javascript examples in every README against the built package, so a
// documented call that no longer exists fails the build instead of shipping.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const READMES = ['README.md', 'packages/core/README.md', 'packages/frontit/README.md']

// Identifiers the examples use as stand-ins for the reader's own elements.
const PRELUDE = `
import { createScrollState, disposeToPx, toPx } from './packages/core/dist/index.js'
declare const panel: Element
declare const el: Element
declare const heading: Element
declare const headingElement: Element
void [createScrollState, disposeToPx, toPx, panel, el, heading, headingElement]
`

const blocksOf = (markdown, file) =>
  [...markdown.matchAll(/```javascript\n([\s\S]*?)```/g)].map((match, index) => ({
    file,
    index,
    // The examples import for the reader; the prelude imports for the checker.
    code: match[1].replace(/^import .*$/gm, ''),
    line: markdown.slice(0, match.index).split('\n').length,
  }))

const blocks = (
  await Promise.all(
    READMES.map(async (file) => blocksOf(await readFile(file, 'utf8'), file)),
  )
).flat()

const source = [
  PRELUDE,
  ...blocks.map(
    ({ file, line, code }) => `// ${file}:${line}\nasync function block_${file.replace(/\W/g, '_')}_${line}() {\n${code}\n}\nvoid block_${file.replace(/\W/g, '_')}_${line}\n`,
  ),
].join('\n')

const directory = mkdtempSync(join(tmpdir(), 'frontit-docs-'))
const entry = join(process.cwd(), '.docs-check.ts')

writeFileSync(entry, source)

try {
  execFileSync(
    'node_modules/.bin/tsc',
    [
      '--noEmit',
      '--strict',
      '--exactOptionalPropertyTypes',
      '--target', 'es2022',
      '--module', 'nodenext',
      '--moduleResolution', 'nodenext',
      '--lib', 'es2022,dom',
      entry,
    ],
    { stdio: 'inherit' },
  )
  console.log(`${blocks.length} documented examples type-check against the built package`)
} finally {
  rmSync(entry, { force: true })
  rmSync(directory, { recursive: true, force: true })
}
