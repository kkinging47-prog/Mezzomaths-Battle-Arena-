Homework delivery uses the authenticated learner's verified account email and stored course assignment. It never accepts a recipient or email body from the browser.

Configure `RESEND_API_KEY` and `HOMEWORK_FROM_EMAIL` in Supabase Edge Function secrets. Choose the sender address on your verified domain. Resend currently reports mezzomaths.org verification as failed; fix its DNS verification before enabling delivery. No sender or API key is embedded in frontend code.

The function is JWT protected and checks course enrollment. Retries of the same assignment use an idempotency key. Homework links require login; database submission validates enrollment and enforces the stored UTC deadline. No emails are sent on deployment.
