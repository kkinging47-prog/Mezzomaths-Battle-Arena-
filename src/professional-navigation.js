import './professional-navigation.css'

const readProfile = () => {
  try { return JSON.parse(localStorage.getItem('mezzo_profile') || 'null') } catch { return null }
}
const shortcuts = [
  ['home','🏠','Home','[data-target="home"]'],
  ['practice','🧠','Practice','[data-target="solo"],[data-start-daily]'],
  ['battle','⚔️','Battle','[data-target="battle"]'],
  ['bece','📘','BECE','[data-bece-page]']
]
let queued = false
function setup(nav) {
  if (nav.classList.contains('app-nav-ready')) return
  nav.classList.add('app-nav-ready')
  const menu = nav.querySelector('.tab-scroll')
  menu.id ||= 'mezzo-activities-menu'
  menu.setAttribute('aria-label','All activities')
  const bar = document.createElement('div')
  bar.className = 'app-nav-actions'
  bar.innerHTML = `<div class="app-nav-primary" aria-label="Quick navigation">${shortcuts.map(([key,icon,label])=>`<button type="button" data-nav-shortcut="${key}" aria-label="${label}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</div><button type="button" class="app-nav-more" data-nav-more aria-expanded="false" aria-controls="${menu.id}">✨ More activities</button><div class="app-nav-account"><button type="button" data-nav-account aria-expanded="false"></button><div class="app-nav-account-menu" data-nav-account-menu hidden><button type="button" data-nav-admin>Admin workspace</button><button type="button" data-nav-logout>Log out</button></div></div>`
  nav.insertBefore(bar,menu)
}
function syncNav() {
  document.querySelectorAll('.screen-tabs').forEach(nav=>{
    const menu = nav.querySelector('.tab-scroll')
    if (!menu || (!menu.querySelector('[data-target="auth"]') && menu.children.length < 7)) return
    setup(nav)
    const profile = readProfile()
    const account = nav.querySelector('[data-nav-account]')
    const label = profile ? `${profile.role==='admin'?'🛡️':'👤'} ${String(profile.full_name || profile.email || 'My account').split(/\s+/)[0]}` : '🔐 Sign in / Join'
    if(account.textContent !== label) account.textContent = label
    const logout = nav.querySelector('[data-nav-logout]')
    logout.hidden = !profile
    nav.querySelector('[data-nav-admin]').hidden = profile?.role !== 'admin'
    shortcuts.forEach(([key,,,selector])=>{
      const button = nav.querySelector(`[data-nav-shortcut="${key}"]`)
      const original = menu.querySelector(selector)
      button.hidden = !original
      button.classList.toggle('active',Boolean(original?.classList.contains('active')))
    })
  })
}
function closeMenus(except=null) {
  document.querySelectorAll('.app-nav-ready').forEach(nav=>{
    if(nav!==except) nav.classList.remove('app-nav-expanded')
    const more=nav.querySelector('[data-nav-more]')
    more?.setAttribute('aria-expanded',String(nav.classList.contains('app-nav-expanded')))
    const account=nav.querySelector('[data-nav-account]')
    const panel=nav.querySelector('[data-nav-account-menu]')
    if(!account || !panel)return
    if(!except || nav!==except){account.setAttribute('aria-expanded','false');panel.hidden=true}
  })
}
function queue() {
  if(queued)return
  queued=true
  requestAnimationFrame(()=>{queued=false;syncNav()})
}
document.addEventListener('click',event=>{
  const nav=event.target.closest('.app-nav-ready')
  const shortcut=event.target.closest('[data-nav-shortcut]')
  if(shortcut && nav){
    event.preventDefault()
    const selector=shortcuts.find(([key])=>key===shortcut.dataset.navShortcut)?.[3]
    nav.querySelector('.tab-scroll')?.querySelector(selector)?.click()
    closeMenus()
    return
  }
  if(event.target.closest('[data-nav-more]') && nav){
    event.preventDefault()
    const open=!nav.classList.contains('app-nav-expanded')
    closeMenus()
    nav.classList.toggle('app-nav-expanded',open)
    nav.querySelector('[data-nav-more]').setAttribute('aria-expanded',String(open))
    return
  }
  if(event.target.closest('[data-nav-account]') && nav){
    event.preventDefault()
    if(!readProfile()){(nav.querySelector('.tab-scroll [data-target="auth"]') || document.querySelector('[data-target="auth"]'))?.click();closeMenus();return}
    const button=nav.querySelector('[data-nav-account]'),panel=nav.querySelector('[data-nav-account-menu]')
    const open=panel.hidden
    closeMenus()
    panel.hidden=!open
    button.setAttribute('aria-expanded',String(open))
    return
  }
  if(event.target.closest('[data-nav-logout]') && nav){
    event.preventDefault()
    nav.querySelector('[data-live-logout]')?.click()
    closeMenus()
    return
  }
  if(event.target.closest('[data-nav-admin]') && nav){
    event.preventDefault()
    (nav.querySelector('[data-target="admin"]') || document.querySelector('[data-target="admin"]'))?.click()
    closeMenus()
    return
  }
  if(!event.target.closest('.app-nav-ready'))closeMenus()
},true)
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenus()})
new MutationObserver(queue).observe(document.body,{childList:true,subtree:true})
window.addEventListener('storage',queue)
window.addEventListener('mezzoProfileUpdated',queue)
window.addEventListener('load',queue)
setTimeout(queue,350)
