import {supabaseRows} from '../api/_bece-sunday-security.js'
import {schoolNameIndex} from '../src/school-names.js'
let cached=null,expires=0,pending=null
export async function sundaySchoolDirectory() {
 if(cached&&Date.now()<expires)return cached
 if(pending)return pending
 pending=(async()=>{
  const names=[]
  for(const table of ['bece_sunday_trial_registrations','bece_sunday_schools']) {
   let complete=false
   for(let offset=0;offset<100000;offset+=1000) {
    const rows=await supabaseRows(table+'?select=school_name&order=id.asc&limit=1000&offset='+offset)
    if(!Array.isArray(rows))throw new Error('Invalid school directory')
    names.push(...rows.map(r=>r.school_name))
    if(rows.length<1000){complete=true;break}
   }
   if(!complete)throw new Error('School directory is too large')
  }
  cached=schoolNameIndex(names).schools;expires=Date.now()+60000
  return cached
 })()
 try{return await pending}finally{pending=null}
}
