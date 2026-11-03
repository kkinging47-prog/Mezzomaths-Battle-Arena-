export const BANK_LEVELS=['KG1','KG2',...Array.from({length:9},(_,i)=>`Grade ${i+1}`),'SHS 1','SHS 2','SHS 3']
export const BANK_CURRICULA=['GES','Cambridge','Pearson Edexcel']

export function uploadMetadata(row,defaults){
 const class_level=String(row.class_level||row.class||row.grade||defaults.class_level||'').trim()
 const curriculum=String(row.curriculum||defaults.curriculum||'').trim()
 if(!BANK_LEVELS.includes(class_level))throw Error(`Invalid class "${class_level}". Use Grade 1–9, KG1, KG2 or SHS 1–3.`)
 if(!BANK_CURRICULA.includes(curriculum))throw Error(`Invalid curriculum "${curriculum}". Use GES, Cambridge or Pearson Edexcel.`)
 const active=String(row.is_active??'').trim().toLowerCase()
 if(!['','true','false','1','0','yes','no'].includes(active))throw Error('is_active must be true or false.')
 return {class_level,curriculum,is_active:!['false','0','no'].includes(active)}
}

export function coverageRows(rows,curriculum){
 return BANK_LEVELS.map(class_level=>{
  const groups=rows.filter(r=>r.curriculum===curriculum&&r.class_level===class_level)
  return {class_level,questions:groups.reduce((n,r)=>n+Number(r.question_count||0),0),topics:groups.filter(r=>String(r.topic??'').trim()).length,smallTopics:groups.filter(r=>String(r.topic??'').trim()&&Number(r.question_count)<55).length}
 })
}
