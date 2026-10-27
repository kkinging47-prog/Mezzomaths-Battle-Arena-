const classes=Array.from({length:9},(_,i)=>'Grade '+(i+1)).concat(['SHS 1','SHS 2','SHS 3'])
const curricula=['GES','Cambridge','Pearson Edexcel']
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
 const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
 const key=String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'')
 if(!url||!key)return res.status(503).json({error:'Question bank is temporarily unavailable. Please retry.'})
 try{
  const {class_level,curriculum,topic}=req.query||{}
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}
  let response
  if(!class_level&&!curriculum&&!topic){response=await fetch(url+'/rest/v1/rpc/question_topic_coverage',{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(20000)})}
  else{
   if(!classes.includes(class_level)||!curricula.includes(curriculum)||typeof topic!=='string'||!topic.trim()||topic.length>200)return res.status(400).json({error:'Select a valid class, curriculum and topic.'})
   const params=new URLSearchParams({select:'id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,topic,difficulty,source_name,question_image_url,option_a_image_url,option_b_image_url,option_c_image_url,option_d_image_url',is_active:'eq.true',class_level:'eq.'+class_level,curriculum:'eq.'+curriculum,topic:'eq.'+topic,order:'created_at.desc,id.asc',limit:'1000'})
   response=await fetch(url+'/rest/v1/question_bank?'+params,{headers,signal:AbortSignal.timeout(20000)})
  }
  if(!response.ok)return res.status(502).json({error:'The question bank could not be loaded. Please retry.'})
  const data=await response.json();res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=120');return res.status(200).json({data})
 }catch{return res.status(503).json({error:'The question bank connection is unavailable. Please retry.'})}
}
