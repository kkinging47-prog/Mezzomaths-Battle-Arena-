# Sunday BECE required phone and email

New public candidate registrations and new school-roster registrations require separate phone_number and email values. Ghana local numbers normalise to +233; international numbers require + and 8–15 digits. Email is trimmed, lowercased and format-checked. Both fields are required by the UI and validated by the API. An insert trigger also rejects missing/invalid contact pairs, including direct roster inserts.

The existing identity contact is retained for existing candidates, keeping IDs, sessions, identity guards and results unchanged. Legacy name/contact recovery still works. New registration can recognise an existing legacy email identity as well as a phone identity without inserting a duplicate profile. Old registrations are not assigned invented contacts or consent.

Existing profiles have Add / update phone & email. Updates require the existing signed history proof, bind the patch to that candidate, and never change identity contact. A profile without proof restores its original registration first. School-managed profiles can restore via their existing registration contact. Staff roster creation collects parent/guardian contacts and sends only roster columns to the student table.

Weekly SMS/email reminder permission is an optional, initially unchecked box. Consent is stored with a database-generated timestamp; opting out clears it. Collecting both contacts is compulsory regardless of reminder preference. This change does not activate an SMS/email delivery service or send messages. Contact ownership is not OTP-verified; format validation cannot guarantee delivery.

Validation: eight Sunday/report test files and production build pass. Tests cover Ghana/international formatting, missing phone/email rejection, consent default, legacy recovery, signed update proof and stable identity. A rolled-back synthetic database registration saved both fields and consent timestamp; no synthetic profile remained. Browser preview verified separate required tel/email inputs and unchecked optional consent. Existing contact and result records are retained. No RLS or access grants expanded.
