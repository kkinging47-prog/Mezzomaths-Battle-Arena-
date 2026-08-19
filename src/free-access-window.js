import './free-access-window.css'

const END = new Date('2026-12-31T23:59:59Z')
const protectedSelectors = '[data-target="solo"],[data-target="battle"],[data-target="smartboard"],[data-start-daily],[data-courses-page],[data-career-page],[data-bece-practice],[data-course-dashboard]'
function read(key, fallback){ try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback} }
function signedIn(){ const p=read('mezzo_profile',null); return Boolean(p&&(p.email||p.full_name||p.role)) }
function active(){ return new Date()<=END }
function openSignup(){ localStorage.setItem('mezzo_auth_preferred_mode','signup'); document.querySelector('[data-target="auth"]')?.click(); setTimeout(()=>document.querySelector('[data-auth-mode="signup"]')?.click(),120) }
function toast(){ document.querySelector('.free-access-toast')?.remove(); document.body.insertAdjacentHTML('beforeend','<div class="free-access-toast"><b>Free account required</b><span>Every feature is free through 31 December 2026. Create an account to continue.</span></div>');setTimeout(()=>document.querySelector('.free-access-toast')?.remove(),4500) }
document.addEventListener('click',e=>{ if(!active()||signedIn()||e.target.closest('[data-open-subscriptions]'))return; const target=e.target.closest(protectedSelectors);if(!target)return;e.preventDefault();e.stopImmediatePropagation();toast();openSignup() },true)
window.mezzoFreeAccess={active,end:'2026-12-31',signedIn}
