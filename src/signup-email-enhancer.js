import './signup-email.css'

let sendingWelcome = false

function toast(message) {
  const old = document.querySelector('.signup-email-toast')
  if (old) old.remove()
  const node = document.createElement('div')
  node.className = 'signup-email-toast'
  node.textContent = message
  document.body.appendChild(node)
  setTimeout(() => node.remove(), 4200)
}

async function sendWelcomeEmail(data) {
  if (sendingWelcome || !data.email) return
  const key = `welcome_sent_${data.email}`
  if (sessionStorage.getItem(key)) return
  sendingWelcome = true
  try {
    const response = await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const result = await response.json().catch(() => ({}))
    sessionStorage.setItem(key, '1')
    if (response.ok && result.sent) toast('Confirmation email sent to the student.')
    else if (response.ok) toast('Account created. Email sending is not configured yet.')
    else toast(result.error || 'Account created, but email confirmation failed.')
  } catch {
    toast('Account created, but email confirmation could not be sent.')
  } finally {
    sendingWelcome = false
  }
}

document.addEventListener('submit', event => {
  const form = event.target
  if (form?.id !== 'signupForm') return
  const data = Object.fromEntries(new FormData(form).entries())
  setTimeout(() => sendWelcomeEmail(data), 650)
}, true)
