import {mergeRallyProgress,mergeRallyPatch} from './rally-progress-model.js'
export function createRallyProgressStore({client,storage,onChange=()=>{}}){
 let owner=null,generation=0,state=mergeRallyProgress(),pending={},revision=0,flight=null,status='signed-out'
 const key=(kind,id=owner)=>`mezzo_rally_account_v1:${id}:${kind}`
 const read=(kind,fallback)=>{try{return JSON.parse(storage.getItem(key(kind))||'null')||fallback}catch{return fallback}}
 const persist=()=>{if(!owner)return;try{storage.setItem(key('state'),JSON.stringify(state));storage.setItem(key('pending'),JSON.stringify(pending))}catch{}}
 const emit=()=>onChange({owner,state,status})
 function setOwner(id){if(id===owner)return;generation++;owner=id||null;revision=0;flight=null;state=owner?mergeRallyProgress(read('state',{})):mergeRallyProgress();pending=owner?read('pending',{}):{};state=mergeRallyProgress(state,pending);status=owner?'loading':'signed-out';emit()}
 async function sync(){
  if(!owner||!client)return
  if(flight)return flight
  const id=owner,epoch=generation
  const task=(async()=>{
   do{
    const sentRevision=revision,patch=JSON.parse(JSON.stringify(pending));status='saving';emit()
    try{
     const result=await client.rpc('sync_rally_progress',{p_patch:patch})
     if(owner!==id||generation!==epoch)return
     if(result.error)throw result.error
     if(revision===sentRevision)pending={}
     state=mergeRallyProgress(result.data||{},pending);status=Object.keys(pending).length?'saving':'saved';persist();emit()
     if(revision===sentRevision)break
    }catch{
     if(owner!==id||generation!==epoch)return
     status='offline';persist();emit();break
    }
   }while(owner===id&&generation===epoch)
  })()
  flight=task
  try{await task}finally{if(owner===id&&generation===epoch)flight=null}
 }
 function update(patch){if(!owner)return false;pending=mergeRallyPatch(pending,patch);state=mergeRallyProgress(state,patch);revision++;status='saving';persist();emit();void sync();return true}
 return {setOwner,sync,update,getState:()=>state,getOwner:()=>owner,getStatus:()=>status}
}
