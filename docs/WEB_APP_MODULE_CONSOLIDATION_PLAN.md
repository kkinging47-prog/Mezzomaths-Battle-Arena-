# Mezzo Maths Web App Module Consolidation Plan

This document starts the consolidation work recommended after the audit. The current app grew through many feature enhancers. To reduce conflicts and make the app easier to test, future work should be grouped into stable modules.

## Stable module boundaries

### 1. Auth Module
Owns Supabase client checks, signup, login, logout, password visibility, profile persistence, role safety, approval status, and access events.

Target files to merge over time:
- `production-auth-cloud-sync.js`
- `persistent-login-details-sync.js`
- `role-safe-signup-handler.js`
- `password-visibility-toggle.js`
- `mobile-auth-role-fix.js`
- `signup-success-modal.js`

### 2. Admin Module
Owns admin dashboard, question bank management, workbook import, topic upload, logo/branding, health checks and staff controls.

Target files to merge over time:
- `admin-control-hub-enhancer.js`
- `admin-system-health-checker.js`
- `admin-topic-question-uploader.js`
- `admin-exact-workbook-importer.js`
- `admin-workbook-question-selector-fix.js`
- `admin-staff-branding-enhancer.js`
- `admin-logo-reliable-save-fix.js`

### 3. BECE Module
Owns BECE practice, Sunday trial, timer, cumulative reports, image questions, corrections, leaderboards and reports.

Target files to merge over time:
- `bece-practice-enhancer.js`
- `bece-report-enhancer.js`
- `bece-cumulative-report-fix.js`
- `bece-timer-enhancer.js`
- `bece-admin-enhancer.js`
- `bece-image-question-enhancer.js`
- `bece-time-report-enhancer.js`
- `bece-correction-enhancer.js`
- `bece-sunday-trial-window-v2.js`
- `bece-sunday-entry-popup.js`
- `bece-sunday-hardening.js`

### 4. Teacher Tools Module
Owns lesson planning, assignment centre, practical activities, strands and teacher dashboard.

Target files to merge over time:
- `teacher-classroom-tools-enhancer.js`
- `teacher-assignment-centre.js`
- `teacher-practical-activities-enhancer.js`
- `teacher-strands-expander.js`

### 5. Course Builder Module
Owns course creation, lessons, media, tasks, classwork/homework, certificates and paid courses.

Target files to merge over time:
- `course-lms-complete-enhancer.js`
- `professional-course-builder.js`
- `course-media-builder-enhancer.js`
- `course-session-enhancer.js`

### 6. Payments Module
Owns subscription gate, Paystack initialization, payment verification, receipt emails and database subscription records.

Target files to merge over time:
- `subscription-gate-enhancer.js`
- `subscription-button-enhancer.js`
- `api/paystack-initialize.js`
- `api/paystack-verify.js`

### 7. Reports and Intelligence Module
Owns learner analysis, donor dashboard, school progress, AI-style reports and progress snapshots.

Target files to merge over time:
- `learner-intelligence-enhancer.js`
- `donor-impact-dashboard.js`
- `school-progress-enhancer.js`
- `production-live-readiness-checker.js`

## Consolidation rules

1. New feature work should go into one of the seven module groups above.
2. Each module should expose only one public initializer, for example `initAuthModule()` or `initBecemodule()`.
3. Event listeners should be registered once and guarded against duplicate installation.
4. Database calls should live in module-specific service functions, not directly inside UI rendering code.
5. All public tables must use RLS and expose public data only through safe views or security-definer RPCs.
6. CSV upload remains the safe default until a reviewed Excel parser is selected.
7. Public campaign forms must use database-backed rate limiting and one-attempt rules.

## Immediate consolidation status

Completed in this hardening pass:
- Supabase client now requires Vercel environment variables instead of hardcoded fallback details.
- Public Sunday BECE leaderboard is isolated from private attempts data.
- Sunday BECE duplicate attempt checks are enforced through Supabase.
- Role-safe signup is separated and loaded before the older auth handler to preserve teacher and Mezzo staff roles.
- Excel upload loading is disabled; CSV/JSON/TXT upload remains through the existing admin topic uploader.
- Paystack verification now writes verified subscription records to Supabase when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Database-backed public signup rate limiting has been added through migration `017_sunday_bece_privacy_attempt_limits.sql`.
