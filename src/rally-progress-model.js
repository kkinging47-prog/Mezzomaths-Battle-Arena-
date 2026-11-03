import {RALLY_TRACKS} from './maths-rally-tracks.js'
import {garagePrefs} from './maths-rally-adventure.js'
const tracks=new Set(RALLY_TRACKS.map(t=>t.id))
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{}
export function mergeRallyProgress(base={},patch={}){
 base=object(base);patch=object(patch)
 const cup={};for(const id of tracks){const n=Math.max(0,...[base.cup?.[id],patch.cup?.[id]].map(v=>Math.min(3,Math.max(0,Math.floor(Number(v)||0)))));if(n)cup[id]=n}
 const progress={}
 for(const [key,ids] of [...Object.entries(object(base.progress)),...Object.entries(object(patch.progress))]){
  let tuple;try{tuple=JSON.parse(key)}catch{continue}
  if(!Array.isArray(tuple)||tuple.length!==3||tuple.some(v=>typeof v!=='string'||!v||v.length>200)||!Array.isArray(ids))continue
  progress[key]=[...new Set([...(progress[key]||[]),...ids.filter(id=>tracks.has(id))])]
 }
 const history=new Map()
 for(const r of [...(Array.isArray(base.history)?base.history:[]),...(Array.isArray(patch.history)?patch.history:[])]){
  if(!r||typeof r.id!=='string'||!r.id||!Number.isFinite(Date.parse(r.completedAt)))continue
  const record={};for(const key of ['id','completedAt','date','mode','trackId','world','car','topic','classLevel','curriculum'])record[key]=String(r[key]??'').slice(0,key==='id'?100:200)
  for(const key of ['position','correct','answered','total','accuracy','bestStreak','seconds','stars'])record[key]=Math.max(0,Math.min(100000,Number(r[key])||0))
  record.finished=Boolean(r.finished);record.demo=Boolean(r.demo);history.set(record.id,record)
 }
 return {cup,progress,garage:garagePrefs(Object.hasOwn(patch,'garage')?patch.garage:base.garage,cup),history:[...history.values()].sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)||b.id.localeCompare(a.id)).slice(0,10)}
}
export function mergeRallyPatch(base={},patch={}){
 const merged=mergeRallyProgress(base,patch)
 // Preferences are sent only after a deliberate selection, not with stale race data.
 delete merged.garage
 if(Object.hasOwn(base,'garage')||Object.hasOwn(patch,'garage'))merged.garage=Object.hasOwn(patch,'garage')?patch.garage:base.garage
 return merged
}
