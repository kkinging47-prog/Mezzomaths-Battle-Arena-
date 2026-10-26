const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const BANK_IMAGE_FIELDS=['question_image_url','option_a_image_url','option_b_image_url','option_c_image_url','option_d_image_url']
const label=key=>key==='question_image_url'?'Question diagram':'Option '+key.split('_')[1].toUpperCase()+' image'
export function bankImageFields(question={}) {
  return `<section class="wide" data-bank-images style="grid-column:1/-1;padding:16px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;color:#10233f"><h3>Question and option images</h3><p>Choose PNG, JPG, WebP or GIF (up to 5 MB each), then save the question. Existing images remain unless replaced or removed.</p>${BANK_IMAGE_FIELDS.map(key=>`<div style="margin:12px 0;display:grid;gap:8px"><label>${label(key)} · Choose image<input type="file" data-bank-image-file="${key}" accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"></label><label>Image URL<input type="url" name="${key}" value="${esc(question[key]||'')}" placeholder="https://…"></label><div data-bank-image-preview="${key}">${question[key]?`<img src="${esc(question[key])}" alt="${label(key)}" style="max-width:260px;max-height:180px;object-fit:contain">`:''}</div><button type="button" class="btn btn-ghost btn-small" data-bank-image-remove="${key}">Remove image</button></div>`).join('')}<p role="status" aria-live="polite" data-bank-image-status></p></section>`
}
export function validateBankImage(file) {
  if(file.size>5*1024*1024) throw Error(`${file.name}: choose an image no larger than 5 MB.`)
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) throw Error(`${file.name}: choose a PNG, JPG, WebP or GIF image.`)
}
export async function uploadBankImages(form,supabase) {
  const status=form.querySelector('[data-bank-image-status]')
  const files=BANK_IMAGE_FIELDS.map(key=>({key,input:form.querySelector(`[data-bank-image-file="${key}"]`)}))
  for(const {input} of files) if(input?.files[0])validateBankImage(input.files[0])
  const urls={}
  for(const {key,input} of files) {
    const field=form.elements[key],file=input?.files[0]
    if(file) {
      if(!supabase)throw Error('Sign in and connect to the database before uploading images.')
      if(status)status.textContent='Uploading '+label(key)+'…'
      const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type]
      const path=`question-bank/${crypto.randomUUID()}.${extension}`
      const {error}=await supabase.storage.from('question-media').upload(path,file,{upsert:false,contentType:file.type})
      if(error)throw Error('Image upload failed: '+error.message)
      field.value=supabase.storage.from('question-media').getPublicUrl(path).data.publicUrl
      input.value=''
    }
    const url=String(field?.value||'').trim()
    if(url && new URL(url).protocol!=='https:')throw Error('Image URLs must use HTTPS.')
    urls[key]=url||null
  }
  return urls
}
function preview(form,key,url) {
 const box=form.querySelector(`[data-bank-image-preview="${key}"]`)
 if(box)box.innerHTML=url?`<img src="${esc(url)}" alt="${label(key)}" style="max-width:260px;max-height:180px;object-fit:contain">`:''
}
if(typeof document!=='undefined') {
 document.addEventListener('change',event=>{
  const form=event.target.closest?.('#adminQuestionForm');if(!form)return
  const key=event.target.dataset.bankImageFile
  if(key) {const file=event.target.files[0];if(!file)return;try{validateBankImage(file);const reader=new FileReader();reader.onload=()=>{if(form.isConnected)preview(form,key,reader.result)};reader.readAsDataURL(file);form.querySelector('[data-bank-image-status]').textContent='Image selected. Save the question to upload it.'}catch(error){event.target.value='';form.querySelector('[data-bank-image-status]').textContent=error.message}return}
  if(BANK_IMAGE_FIELDS.includes(event.target.name))preview(form,event.target.name,event.target.value)
 })
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-bank-image-remove]');if(!button)return;event.preventDefault();const form=button.closest('form'),key=button.dataset.bankImageRemove;form.elements[key].value='';form.querySelector(`[data-bank-image-file="${key}"]`).value='';preview(form,key,'')})
}
