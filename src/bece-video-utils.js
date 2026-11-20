export const VIDEO_COLUMNS='id,collection,exam_year,set_number,question_number,paper_section,title,topic,description,youtube_id,start_seconds,is_published,updated_at'
export function youtubeId(input){
 const value=String(input||'').trim()
 if(/^[\w-]{11}$/.test(value))return value
 let u;try{u=new URL(value)}catch{return null}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null
 const host=u.hostname.toLowerCase().replace(/^www\./,'')
 let id
 if(host==='youtu.be')id=u.pathname.split('/')[1]
 else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):/^\/(shorts|embed|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null
 return /^[\w-]{11}$/.test(id||'')?id:null
}
export const videoLabel=v=>v.collection==='sunday'?`Sunday Special · Set ${v.set_number}`:`BECE ${v.exam_year}`
export function videoPayload(values){
 const id=youtubeId(values.youtube_url),collection=values.collection
 if(!id)throw Error('Paste a valid YouTube video link, Shorts link or video ID.')
 if(!['past','sunday'].includes(collection))throw Error('Choose a video collection.')
 const title=String(values.title||'').trim(),topic=String(values.topic||'').trim(),description=String(values.description||'').trim()
 const number=(value,label,min,max)=>{if(!/^\d+$/.test(String(value))||Number(value)<min||Number(value)>max)throw Error(`Enter a valid ${label} (${min}–${max}).`);return Number(value)}
 if(!title||title.length>160||topic.length>100||description.length>3000)throw Error('Enter a title (up to 160 characters), topic (100) and description (3,000).')
 if(!['Objective','Theory'].includes(values.paper_section))throw Error('Choose Objective or Theory.')
 return {collection,exam_year:collection==='past'?number(values.exam_year,'exam year',1980,2100):null,set_number:collection==='sunday'?number(values.set_number,'set number',1,999):null,question_number:number(values.question_number,'question number',1,200),paper_section:values.paper_section,title,topic,description,youtube_id:id,start_seconds:number(values.start_seconds||0,'start time in seconds',0,86400),is_published:values.is_published===true||values.is_published==='on',updated_at:new Date().toISOString()}
}
export function filterVideos(videos,{collection='past',group='',topic='',search='',savedOnly=false,saved={}}={}){const term=search.trim().toLowerCase();return videos.filter(v=>v.collection===collection&&(!group||String(v.collection==='past'?v.exam_year:v.set_number)===String(group))&&(!topic||v.topic===topic)&&(!savedOnly||saved[v.id])&&(!term||[v.title,v.topic,v.description,videoLabel(v),'question '+v.question_number,'q'+v.question_number].join(' ').toLowerCase().includes(term))).sort((a,b)=>(b.exam_year||b.set_number)-(a.exam_year||a.set_number)||a.question_number-b.question_number||a.title.localeCompare(b.title))}
export function embedUrl(video,origin){const u=new URL('https://www.youtube-nocookie.com/embed/'+video.youtube_id);u.search=new URLSearchParams({enablejsapi:'1',origin,playsinline:'1',rel:'0',start:String(video.start_seconds||0)}).toString();return u.href}
