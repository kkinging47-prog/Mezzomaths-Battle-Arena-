const EXPANDED_CURRICULUM = {
  primary: {
    'Numbers and Investigation with Numbers': ['Pre-number Activities', 'Counting and Numeration', 'Reading and Writing Numerals', 'Place Value', 'Number Patterns', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions', 'Decimals', 'Percentages', 'Factors and Multiples', 'Prime and Composite Numbers', 'Sets of Numbers', 'Problem Solving with Numbers'],
    'Shape and Space': ['Lines and Curves', 'Plane Shapes', 'Solid Shapes', 'Angles', 'Symmetry', 'Position and Direction', 'Number Plane / Coordinates', 'Transformations', 'Drawing and Construction'],
    'Measurement': ['Length', 'Mass / Weight', 'Capacity and Volume', 'Time', 'Money', 'Perimeter', 'Area', 'Volume', 'Temperature', 'Practical Measurement Problems'],
    'Collecting and Handling Data': ['Collecting Data', 'Tally Tables', 'Pictographs', 'Bar Graphs', 'Tables and Charts', 'Interpreting Data', 'Simple Averages', 'Chance / Likelihood'],
    'Problem Solving': ['Word Problems', 'Real-life Applications', 'Mathematical Investigations', 'Reasoning Strategies', 'Mixed Operations', 'Communication in Mathematics']
  },
  basic: {
    'Number': ['Numeration Systems', 'Number Operations', 'Mental Mathematics Strategies', 'Fractions', 'Decimals', 'Percentages', 'Ratios and Proportion', 'Rates', 'Powers and Roots', 'Sets and Number Properties', 'Financial Arithmetic'],
    'Algebra': ['Patterns and Relations', 'Algebraic Expressions', 'Variables and Equations', 'Linear Equations and Inequalities', 'Functions and Graphs', 'Sequences and Rules', 'Word Problems in Algebra'],
    'Geometry and Measurement': ['Shapes and Space', 'Lines and Angles', 'Properties of Triangles and Quadrilaterals', 'Measurement', 'Perimeter and Area', 'Surface Area and Volume', 'Pythagoras and Right Triangles', 'Coordinate Geometry', 'Transformation', 'Construction and Loci'],
    'Data': ['Data Collection', 'Data Representation', 'Tables and Charts', 'Bar Charts and Pie Charts', 'Measures of Central Tendency', 'Interpretation of Data', 'Chance / Probability', 'Simple Experiments']
  },
  shs: {
    'Number and Numeration': ['Real Number System', 'Sets and Logic', 'Surds', 'Number Bases', 'Indices and Logarithms', 'Approximation and Significant Figures', 'Ratio, Rates and Proportion'],
    'Algebra': ['Algebraic Expressions', 'Linear Equations and Inequalities', 'Quadratic Equations', 'Simultaneous Equations', 'Relations and Functions', 'Graphs of Functions', 'Sequences and Series', 'Variation', 'Word Problems'],
    'Geometry and Measurement': ['Plane Geometry', 'Mensuration', 'Circle Theorems', 'Coordinate Geometry', 'Vectors', 'Transformations', 'Bearings'],
    'Trigonometry': ['Trigonometric Ratios', 'Angles of Elevation and Depression', 'Sine Rule', 'Cosine Rule', 'Trigonometric Graphs', 'Applications of Trigonometry'],
    'Statistics and Probability': ['Data Collection and Presentation', 'Frequency Tables', 'Measures of Central Tendency', 'Measures of Dispersion', 'Cumulative Frequency', 'Probability', 'Permutations and Combinations'],
    'Financial Mathematics': ['Percentages', 'Profit and Loss', 'Discount', 'Simple Interest', 'Compound Interest', 'Hire Purchase', 'Tax and Commission']
  }
}

let queued = false

function optionHtml(items, selected = '') {
  return items.map(item => `<option value="${item.replace(/"/g, '&quot;')}" ${item === selected ? 'selected' : ''}>${item}</option>`).join('')
}
function band(level = '') {
  if (/^SHS/i.test(level)) return 'shs'
  if (/^Basic/i.test(level)) return 'basic'
  return 'primary'
}
function curriculumFor(level = '') { return EXPANDED_CURRICULUM[band(level)] }
function updateTeacherStrands(force = false) {
  const classSelect = document.getElementById('teacherClass')
  const strandSelect = document.getElementById('teacherStrand')
  const subSelect = document.getElementById('teacherSubStrand')
  const form = document.getElementById('teacherToolsForm')
  if (!classSelect || !strandSelect || !subSelect || !form) return
  const curriculum = curriculumFor(classSelect.value)
  const strands = Object.keys(curriculum)
  const currentStrand = strands.includes(strandSelect.value) ? strandSelect.value : strands[0]
  const wanted = optionHtml(strands, currentStrand)
  if (force || strandSelect.innerHTML !== wanted) strandSelect.innerHTML = wanted
  const subStrands = curriculum[currentStrand] || []
  const currentSub = subStrands.includes(subSelect.value) ? subSelect.value : subStrands[0]
  const subWanted = optionHtml(subStrands, currentSub)
  if (force || subSelect.innerHTML !== subWanted) subSelect.innerHTML = subWanted
  if (!form.querySelector('[data-expanded-strands-note]')) {
    strandSelect.closest('label')?.insertAdjacentHTML('afterend', `<div class="teacher-strands-note" data-expanded-strands-note="true">Expanded curriculum strands loaded for Primary, Basic 7–9 and SHS. Sub-strands change automatically based on the selected class and strand.</div>`)
  }
}
function sync() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; updateTeacherStrands(false) })
}

document.addEventListener('change', event => {
  if (event.target?.id === 'teacherClass') setTimeout(() => updateTeacherStrands(true), 40)
  if (event.target?.id === 'teacherStrand') setTimeout(() => updateTeacherStrands(true), 40)
}, true)

document.addEventListener('click', event => {
  if (event.target.closest('[data-teacher-tools-page]')) setTimeout(() => updateTeacherStrands(true), 120)
}, true)

const observer = new MutationObserver(sync)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', sync)
setTimeout(sync, 350)
