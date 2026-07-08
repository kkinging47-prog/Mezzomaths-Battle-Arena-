import './smartboard-fit.css'

let lastSmartClass = ''
let syncQueued = false

function setSelectValue(id, value) {
  const el = document.getElementById(id)
  if (el && el.value !== value) el.value = value
}

function syncParticipantClasses() {
  const smartClass = document.getElementById('smartClass')
  if (!smartClass) return
  lastSmartClass = smartClass.value || lastSmartClass
  setSelectValue('aClass', lastSmartClass)
  setSelectValue('bClass', lastSmartClass)
}

function queueSync() {
  if (syncQueued) return
  syncQueued = true
  requestAnimationFrame(() => {
    syncQueued = false
    syncParticipantClasses()
  })
}

document.addEventListener('change', event => {
  if (event.target?.id === 'smartClass') {
    lastSmartClass = event.target.value
    setTimeout(syncParticipantClasses, 0)
    setTimeout(syncParticipantClasses, 40)
  }
})

const observer = new MutationObserver(queueSync)
observer.observe(document.body, { childList: true, subtree: true, attributes: false })
window.addEventListener('load', queueSync)
setTimeout(queueSync, 250)
