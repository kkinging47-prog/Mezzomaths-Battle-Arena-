// Render column vectors without changing stored question text or allowing HTML.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function columnVector(top, bottom) {
  const clean = value => String(value ?? '').trim().replace(/[\r\n⎛⎞⎝⎠]/g, '')
  return `⎛${clean(top)}⎞\n⎝${clean(bottom)}⎠`
}
export function renderVectorText(value = '') {
  const text = String(value)
  // Existing uploaded papers use Unicode top/bottom brackets on separate lines.
  const pattern = /⎛([^⎞\r\n]+)⎞[ \t]*\r?\n[ \t]*⎝([^⎠\r\n]+)⎠|\\binom\{([^{}]+)\}\{([^{}]+)\}/g
  let html = '', previous = 0
  for (const match of text.matchAll(pattern)) {
    html += escape(text.slice(previous, match.index)).replace(/\r?\n/g, '<br>')
    const top = (match[1] ?? match[3]).trim(), bottom = (match[2] ?? match[4]).trim()
    html += `<span role="math" aria-label="Column vector: ${escape(top)}, ${escape(bottom)}" style="display:inline-flex;vertical-align:middle;align-items:stretch;white-space:nowrap;margin:0 .2em;color:inherit;line-height:1.25;font-family:Cambria,Georgia,serif"><span aria-hidden="true" style="display:block;width:.35em;border-left:2px solid currentColor;border-radius:100% 0 0 100%"></span><span style="display:inline-grid;grid-template-rows:auto auto;text-align:center;gap:.1em;padding:.12em .25em"><span>${escape(top)}</span><span>${escape(bottom)}</span></span><span aria-hidden="true" style="display:block;width:.35em;border-right:2px solid currentColor;border-radius:0 100% 100% 0"></span></span>`
    previous = match.index + match[0].length
  }
  return html + escape(text.slice(previous)).replace(/\r?\n/g, '<br>')
}
