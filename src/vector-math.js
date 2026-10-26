// Column templates: retain source text, render aligned cells and stretchy fences.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function columnVector(top, bottom) {
  const clean = value => String(value ?? '').trim().replace(/[{}\r\n]/g, '')
  return `\\binom{${clean(top)}}{${clean(bottom)}}`
}
// Legacy Excel files place all top entries on one line, all bottom entries below.
// Pair by column order only when both complete rows contain the same vector count.
export function normalizeVectorRows(value = '') {
  const lines=String(value).split(/\r?\n/)
  for(let i=0;i<lines.length-1;i++) {
    const tops=[...lines[i].matchAll(/⎛([^⎞\r\n]+)⎞/g)]
    const bottoms=[...lines[i+1].matchAll(/⎝([^⎠\r\n]+)⎠/g)]
    if(!tops.length || tops.length!==bottoms.length || lines[i+1].replace(/⎝[^⎠\r\n]+⎠/g,'').trim()) continue
    let n=0
    lines[i]=lines[i].replace(/⎛([^⎞\r\n]+)⎞/g,(_,top)=>columnVector(top,bottoms[n++][1]))
    lines.splice(i+1,1)
  }
  return lines.join('\n')
}
export function renderVectorText(value = '') {
  const text=normalizeVectorRows(value)
  const pattern=/\\binom\{([^{}]+)\}\{([^{}]+)\}/g
  let html='',previous=0
  for(const match of text.matchAll(pattern)) {
    html+=escape(text.slice(previous,match.index)).replace(/\n/g,'<br>')
    const top=match[1].trim(),bottom=match[2].trim()
    html+=`<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline" aria-label="Column vector: ${escape(top)}, ${escape(bottom)}" style="display:inline math;vertical-align:middle;margin:0 .18em;font-size:1.12em;color:inherit"><mrow><mo stretchy="true" fence="true">(</mo><mtable rowspacing="0.2em" columnalign="center"><mtr><mtd><mtext>${escape(top)}</mtext></mtd></mtr><mtr><mtd><mtext>${escape(bottom)}</mtext></mtd></mtr></mtable><mo stretchy="true" fence="true">)</mo></mrow></math>`
    previous=match.index+match[0].length
  }
  return html+escape(text.slice(previous)).replace(/\n/g,'<br>')
}
