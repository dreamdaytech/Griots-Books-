# Griots Books — AI Studio Sync & Production Release Handoff

**Release:** Phase 1 publication discovery, author profiles and approved previews

**Repository:** https://github.com/dreamdaytech/Griots-Books-

**Pull request:** https://github.com/dreamdaytech/Griots-Books-/pull/2

**Feature branch:** `feature/publication-discovery-phase1`

**Baseline on 2026-11-18:** main = `50f0cc1f69873cb1e6c5bcdef905d914b3079784`; reviewed feature head = `25638d5d502a61ae4e8bca92ad218594eff88938`.

**Target Google Cloud project:** `subscription-tracker-92b0b`

**Target named Firestore database:** `ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf`

**Owner-reported region:** Oregon (`us-west1`); verify with live database metadata.

## What is independently verified in GitHub

- Main contains the existing Griots Books brand, official logo assets, editorial and peer-review modules.
- PR #2 is ahead of main and conflict-free, and its latest automated checks passed (TypeScript, unit tests, production build and named-database emulator smoke tests).
- The repository holds final privacy rules, short-lived transition rules, database-scoped Firebase deployment configs and read-only rules audit script.
- No evidence of a *new main commit* from AI Studio's most recent reported validation was found as of this handoff.
- None of these GitHub facts proves that the latest AI Studio workspace is synchronized or that the live Firestore rules have been deployed.

## Instructions for AI Studio — do not skip a step

### A. Confirm actual workspace and Git state first

1. Identify the currently running AI Studio application's code revision, connected repository branch and last successful push SHA. Compare them with the PR and main SHAs above.
2. Identify any **unpushed** AI Studio work (including logo, peer review and Firestore changes). Save a branch or checkpoint **before importing or switching branches**. Never overwrite those changes.
3. Compare AI Studio's current implementation against the feature branch. Preserve the existing publishing/academic and peer-review workflows; do not replace the application with fresh scaffolding.
4. Report whether there are conflicts and exactly which files differ. If AI Studio cannot checkout or import PR #2, stop with an actionable Git synchronization blocker.

### B. Verify live Firebase security rules and database

1. Authenticate using the existing project connection, not shared credentials in chat.
2. Confirm the project ID and exact **named** database ID above; do not access or deploy rules to `(default)`.
3. Fetch the actual named database metadata and the actual *deployed* Firestore rules release, including its immutable ruleset ID.
4. Back up the current deployed rules to a secure location **outside the public Git repository**, and record the backup location and revision.
5. Compare deployed rules with `origin/main:firestore.rules`. If they differ, inspect and reconcile production-only changes; do not overwrite them.
6. Review legacy publicly released publication excerpts and pre-existing public author profiles for sensitive content. Preserve private manuscripts and unauthorized reviewer data.

### C. Test the intended application + rules pair

1. Run all existing build, lint and test commands.
2. Run the named-database emulator tests for both final and transition rules. Add scenario tests for authorized author and publishing-manager reads/writes before rollout if not already covered.
3. Confirm that unauthenticated users cannot list private profiles or manuscripts; ensure authors can opt in/out, managers can save metadata, and unauthorized users cannot publish.
4. Confirm there are no hidden references to Firestore `(default)` or a different project.

### D. Release safely, without weakening current production security

Use [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md), adjusted to *actual* deployed rules.

- If the current deployed rules already enforce stronger privacy, **do not deploy temporary compatibility rules that would weaken them**. First update the frontend in a compatible manner.
- If the existing site requires the older author-directory query, the temporary compatibility rules are only a last-mile bridge. They must not grant broader privileges than the current deployed rules; only use them after verifying equivalence.
- Deploy the tested client and final rules in a coordinated change window. Do not leave transition rules active.
- Immediately verify production read/write permissions and site behavior. Have a tested rollback plan that restores a compatible client-and-rules pair.
- Verify the connected hosting environment actually deployed the new client, rather than merely building locally.

### E. GitHub merge and evidence

- The reviewed PR must not be merged until its application/rules compatibility is verified.
- Push any preserved AI Studio-only changes to a **separate branch**, then merge or cherry-pick after conflict review. Do not force-push or overwrite main.
- If able and authorized, deploy the correct rules and application. Provide proof of:
  1. Project ID, named Firestore database ID and region
  2. Backup confirmation
  3. Previous and new deployed ruleset IDs
  4. Deployed application revision / commit SHA
  5. CI test results and live smoke test outcomes
  6. Any unresolved issues or permissions preventing completion
- Do not report "production deployed" based solely on compiling, linting or editing `firestore.rules`.

## Latest GitHub status

The feature branch contains the Phase 1 code, and PR #2 remains separate from main until live Firebase release evidence is available. This separation protects the running application from breaking changes to Firestore permissions.

**No service-account keys, access tokens or private document content should be pasted into GitHub, AI Studio prompts, or release logs.**
