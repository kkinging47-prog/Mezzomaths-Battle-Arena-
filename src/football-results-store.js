import {careerUnlocked} from './football-career.js'
const MODE='maths_football'
export function createFootballResultsStore({client,storage,onChange=()=>{}}){
 let owner=null,epoch=0,records=[],pending=new Map(),flight=null,status='signed-out',cacheFailed=false,unlockedLevel=1
 const key=id=>`mezzo_football_account_v1:${id}`
 const valid=row=>row?.user_id===owner&&row.mode===MODE&&typeof row.id==='string'&&row.metadata?.version===1
 function persist(){if(!owner)return;try{storage.setItem(key(owner),JSON.stringify({unlockedLevel,records,pending:[...pending.values()]}));cacheFailed=false}catch{cacheFailed=true}}
 function emit(){onChange()}
 function setOwner(id){
  if(owner===id)return
  epoch++;unlockedLevel=1;owner=id||null;records=[];pending=new Map();flight=null;cacheFailed=false;status=owner?'loading':'signed-out'
  if(owner){try{const saved=JSON.parse(storage.getItem(key(owner))||'{}');records=(saved.records||[]).filter(valid).slice(0,10);pending=new Map((saved.pending||[]).filter(valid).map(row=>[row.id,row]));unlockedLevel=Math.max(careerUnlocked(records),Number.isInteger(saved.unlockedLevel)?Math.min(5,Math.max(1,saved.unlockedLevel)):1)}catch{}}
  emit()
 }
 async function sync(){
  if(!owner||!client)return;if(flight)return flight
  const id=owner,generation=epoch,current=()=>owner===id&&epoch===generation
  const task=(async()=>{status='saving';emit();try{
   while(current()&&pending.size){
    const [recordId,row]=pending.entries().next().value
    const result=await client.from('game_score_records').insert(row)
    if(!current())return
    if(result.error){
     if(result.error.code!=='23505')throw result.error
     const previous=await client.from('game_score_records').select('id').eq('id',recordId).eq('user_id',id).maybeSingle()
     if(!current())return;if(previous.error||previous.data?.id!==recordId)throw result.error
    }
    pending.delete(recordId);persist()
   }
   const result=await client.from('game_score_records').select('id,user_id,mode,class_level,curriculum,topic,score,total,percent,metadata,created_at').eq('user_id',id).eq('mode',MODE).order('created_at',{ascending:false}).limit(10)
   if(!current())return;if(result.error)throw result.error
   records=[...new Map([...(result.data||[]),...records,...pending.values()].filter(valid).map(row=>[row.id,row])).values()].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,10)
   const career=await client.from('game_score_records').select('metadata').eq('user_id',id).eq('mode',MODE).order('metadata->unlockedLevel',{ascending:false,nullsFirst:false}).limit(1)
   if(!current())return;if(career.error)throw career.error
   unlockedLevel=Math.max(unlockedLevel,careerUnlocked(records),careerUnlocked(career.data||[]));status=pending.size?'saving':'saved';persist();emit()
  }catch{if(current()){status='offline';persist();emit()}}})()
  flight=task;try{await task}finally{if(current()){flight=null;if(pending.size&&status==='saving')void sync()}}
 }
 function save(summary,config,recordId,createdAt=new Date().toISOString()){
  if(!owner)return false
  if(records.some(r=>r.id===recordId)||pending.has(recordId))return true
  unlockedLevel=Math.max(unlockedLevel,careerUnlocked([{metadata:summary}]));const row={id:recordId,user_id:owner,mode:MODE,class_level:config.class_level,curriculum:config.curriculum,topic:config.topic,score:summary.correct,total:summary.total,percent:Math.round(10000*summary.correct/summary.total)/100,created_at:createdAt,metadata:{version:1,...summary,unlockedLevel,kit:config.kit,pace:config.pace,questionMode:config.question_mode}}
  pending.set(row.id,row);records=[row,...records].slice(0,10);status='saving';persist();emit();void sync();return true
 }
 return {setOwner,sync,save,getUnlockedLevel:()=>unlockedLevel,getOwner:()=>owner,getRecords:()=>records,getStatus:()=>status,cacheFailed:()=>cacheFailed}
}
