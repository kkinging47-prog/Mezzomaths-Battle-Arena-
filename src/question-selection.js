// Keep a mix of question forms, difficulty levels and authored sources.
export function selectVariedQuestions(pool,count,random=Math.random){
 const groups=new Map(),seen=new Set()
 for(const q of pool){const text=String(q.question_text||'').trim();if(seen.has(text))continue;seen.add(text);const form=text.toLowerCase().replace(/\d+(?:\.\d+)?/g,'#');const key=[q.difficulty,q.source_name||'',form].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(q)}
 const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
 const buckets=shuffle([...groups.values()]).map(shuffle),chosen=[]
 while(chosen.length<count&&buckets.length){for(let i=buckets.length-1;i>=0&&chosen.length<count;i--){chosen.push(buckets[i].pop());if(!buckets[i].length)buckets.splice(i,1)}}
 return shuffle(chosen)
}
