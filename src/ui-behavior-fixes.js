import './ui-behavior-fixes.css'

let queued = false

function isDatabaseStatus(text = '') {
  const t = String(text).toLowerCase()
  return (
    t.includes('database load') ||
    t.includes('loaded') && t.includes('supabase') ||
    t.includes('questions from supabase') ||
    t.includes('questions loaded') ||
    t.includes('loaded') && t.includes('database') ||
    t.includes('supabase database') ||
    t.includes('load questions from database')
  )
}

function hideDatabasePopups() {
  document.querySelectorAll('.status-banner,.role-admin-toast,.subscription-toast,.signup-email-toast').forEach(node => {
    if (isDatabaseStatus(node.textContent || '')) {
      node.dataset.hiddenDatabaseStatus = 'true'
      node.style.display = 'none'
      if (!node.classList.contains('status-banner')) setTimeout(() => node.remove(), 50)
    }
  })
}

function queueFixes() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    hideDatabasePopups()
  })
}

const observer = new MutationObserver(queueFixes)
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: false })
window.addEventListener('load', queueFixes)
setTimeout(queueFixes, 300)
