// Keep the actual form nodes so file selections and in-progress text survive
// background profile refreshes. Drafts stay in memory and are scoped by account.
const drafts = new Map()
const selector = '#sundaySpecialQuestionForm, #beceAdminQuestionForm'
function keyFor(form) {
  let owner = ''
  try { const profile = JSON.parse(localStorage.getItem('mezzo_profile') || '{}'); owner = profile.id || profile.email || '' } catch {}
  return JSON.stringify([owner, form.getAttribute('id'), form.elements.namedItem('sunday_set_id')?.value || '', form.elements.namedItem('id')?.value || 'new'])
}
export function rememberBeceDraft(form) {
  if (!form?.matches(selector)) return
  const key = keyFor(form)
  form.dataset.beceDraftKey = key
  drafts.set(key, form)
}
export function restoreBeceDrafts(container) {
  for (const fresh of container.querySelectorAll(selector)) {
    const draft = drafts.get(keyFor(fresh))
    if (!draft || draft === fresh) continue
    fresh.replaceWith(draft)
    const details = draft.closest('details')
    if (details) details.open = true
  }
}
export function clearBeceDraft(form) {
  if (!form) return
  drafts.delete(form.dataset.beceDraftKey || keyFor(form))
  delete form.dataset.beceDraftKey
}
for (const event of ['input', 'change']) {
  document.addEventListener(event, e => rememberBeceDraft(e.target?.closest?.(selector)), true)
}
