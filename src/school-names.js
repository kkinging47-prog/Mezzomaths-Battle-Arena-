// The same rule is used by registration suggestions and school reports.
export const SCHOOL_SIMILARITY_THRESHOLD = 0.70
export const normalizeSchoolName = name => String(name || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
export const validSchoolName = name => normalizeSchoolName(name).length >= 3 && /\p{L}/u.test(String(name || '')) && !['schoolnotprovided','unknown','na','none'].includes(normalizeSchoolName(name))
const genericWords=['the','school','complex','academy','international','montessori','preparatory','educational','centre','center','college']
const distinctiveName = name => normalizeSchoolName((String(name||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(token=>!genericWords.some(word=>token===word || (word.length>=5&&similarity(token,word)>=0.85))).join(' '))
function similarity(a,b) {
 if(!a || !b)return 0
 if(a===b)return 1
 let previous=Array.from({length:b.length+1},(_,i)=>i)
 for(let i=1;i<=a.length;i++) {
  const current=[i]
  for(let j=1;j<=b.length;j++)current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1))
  previous=current
 }
 return 1-previous[b.length]/Math.max(a.length,b.length)
}
export function schoolNameSimilarity(left, right) {
 const a=normalizeSchoolName(left),b=normalizeSchoolName(right)
 if(!a || !b)return 0
 if(a===b)return 1
 const coreA=distinctiveName(left),coreB=distinctiveName(right)
 // Shared generic suffixes alone must not join different institutions.
 // An identical distinctive name also recognises an abbreviated school label.
 if(coreA.length>=3&&coreB.length>=3) {
  const core=similarity(coreA,coreB)
  return core===1?1:Math.min(similarity(a,b),core)
 }
 return similarity(a,b)
}
export function matchingSchool(name, schools) {
 if(!validSchoolName(name))return null
 let best=null,score=SCHOOL_SIMILARITY_THRESHOLD
 for(const school of schools) {
  const similarity=schoolNameSimilarity(name,school)
  if(similarity+Number.EPSILON>=score && (!best || similarity>score)) {best=school;score=similarity}
 }
 return best
}
export function schoolNameIndex(names) {
 const counts=new Map()
 for(const name of names){const value=String(name||'').trim().replace(/\s+/g,' ');if(validSchoolName(value))counts.set(value,(counts.get(value)||0)+1)}
 const ordered=[...counts].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length||a[0].localeCompare(b[0]))
 const schools=[],aliases=new Map()
 for(const [name] of ordered) {
  // Compare to canonical names only: do not merge unrelated names through a chain.
  const canonical=matchingSchool(name,schools)||name
  if(canonical===name)schools.push(name)
  aliases.set(normalizeSchoolName(name),canonical)
 }
 return {schools:schools.sort((a,b)=>a.localeCompare(b)),canonical:name=>aliases.get(normalizeSchoolName(name))||String(name||'School not provided').trim()}
}
