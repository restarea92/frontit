// Checks every README against the package it documents: the javascript examples are
// type-checked against the build, and CDN links are checked against the current version,
// so neither can go stale without failing the build.
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

const docs = await Promise.all(
  READMES.map(async (file) => ({ file, markdown: await readFile(file, 'utf8') })),
)

const blocks = docs.flatMap(({ file, markdown }) => blocksOf(markdown, file))

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

const versions = new Map(
  await Promise.all(
    ['core', 'frontit'].map(async (directory) => {
      const manifest = JSON.parse(
        await readFile(`packages/${directory}/package.json`, 'utf8'),
      )
      return [manifest.name, manifest.version]
    }),
  ),
)

// A pin like `@0.2` has to still name the version being shipped, or the link teaches an
// older API than the README around it.
const stale = docs.flatMap(({ file, markdown }) =>
  [...markdown.matchAll(/cdn\.jsdelivr\.net\/npm\/(@?[\w.-]+(?:\/[\w.-]+)?)@([\d.]+)/g)]
    .map(([, name, pin]) => ({ file, name, pin, version: versions.get(name) }))
    .filter(
      ({ pin, version }) =>
        version === undefined ||
        !(version === pin || version.startsWith(`${pin}.`)),
    ),
)

if (stale.length > 0) {
  for (const { file, name, pin, version } of stale) {
    console.error(`${file}: ${name}@${pin} does not match ${version ?? 'any workspace package'}`)
  }
  process.exit(1)
}

console.log('CDN links point at the version being shipped')
