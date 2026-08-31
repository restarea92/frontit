export const environment = () => [
  ['scrollend', 'onscrollend' in window ? 'yes' : 'no'],
  ['dpr', String(devicePixelRatio)],
  ['innerWidth', String(innerWidth)],
  ['innerHeight', String(innerHeight)],
]

export const renderEnvironment = (el, entries) => {
  el.innerHTML = entries
    .map(([label, value]) => `<span>${label} <b>${value}</b></span>`)
    .join('')
}

export const flash = (button, text) => {
  const original = button.textContent

  button.textContent = text
  button.dataset.done = 'true'
  setTimeout(() => {
    button.textContent = original
    button.dataset.done = 'false'
  }, 1200)
}

export const wireCopy = (button, fallback, buildReport, onResize) => {
  button.addEventListener('click', async () => {
    const report = buildReport()

    try {
      await navigator.clipboard.writeText(report)
      flash(button, 'copied')
    } catch {
      // Clipboard access is refused in some in-app browsers, so offer the text to
      // select by hand rather than losing the report.
      fallback.value = report
      fallback.dataset.shown = 'true'
      fallback.select()
      onResize?.()
    }
  })
}

export const header = (entries) =>
  [navigator.userAgent, entries.map(([label, value]) => `${label}: ${value}`).join('  ')].join('\n')
