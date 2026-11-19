# Griots Books — Safe Firestore Phase 1 Release

## Confirmed code configuration

- Google Cloud / Firebase project: `subscription-tracker-92b0b`
- Named Firestore database: `ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf`
- Region supplied by the owner: Oregon (`us-west1`), not independently verified against live database metadata.
- The app selects that named database via `firebase-applet-config.json` and `initializeFirestore(..., databaseId)`.
- The repository's Firebase target preflight runs in CI.

The connection details identify the intended target. They **do not** prove the remote database, current deployed rules or Firebase permissions have been inspected.

## Why this requires a staged rollout

**Do not deploy the final `firestore.rules` before updating the website.**

The current `main` website requests the full `publicProfiles` collection. The new privacy rules restrict listing to authors who opted into public profiles using `isPublic == true`. Applying the new rules first would cause the old website's author-directory query to fail, potentially returning sample fallback data.

A transition ruleset is therefore supplied. It preserves the old public-profile *read* behavior during a short coordinated release, while allowing the new optional author/edition fields to be written.

**Important:** the temporary rules do **not** enforce new author opt-out privacy until the final rules are deployed. Do not leave them active after releasing the updated website. Do not accept author requests for profile privacy during this transition without clear safeguards.

## Read-only live rules audit (recommended first action)

A safe read-only verifier is included at `scripts/audit-live-firestore.py`. It requires no service-account key and uses the currently authenticated Google Cloud account (for example, Google Cloud Shell).

Open [Google Cloud Shell](https://console.cloud.google.com/cloudshell/editor?project=subscription-tracker-92b0b), then run:

```sh
git clone https://github.com/dreamdaytech/Griots-Books-.git
cd Griots-Books-
git checkout feature/publication-discovery-phase1
python3 scripts/audit-live-firestore.py
```

The script will:

1. Verify that project and named database match the Griots Books application configuration.
2. Read the real Firestore database metadata and the release associated with this named database.
3. Download and back up the currently deployed rules to a private temporary directory **outside Git**.
4. Compare the live source with `origin/main:firestore.rules` using SHA-256 checksums.
5. Stop without changing anything if the baseline differs or API access is unavailable.

**Do not paste or commit Google access tokens or service-account keys.** The only required output to share for review is the script's status and (if necessary) the differences between live rules and main, with any sensitive project-specific information redacted. The script does **not** release the new rules.

## Required preconditions

1. Have access to the real Firebase project and specifically the named Firestore database, not `(default)`.
2. From Google Cloud or Firebase, inspect and back up the **currently deployed** rules, including a timestamp and release version. Reconcile any production-only changes with the proposed rules before deploying. The repository cannot substitute for this live review.
3. Review data: existing public author profiles and legacy `excerpt` values on published records may already be public. Remove any unauthorized manuscript excerpts before enabling previews.
4. Use a planned maintenance/deployment window and ensure the frontend deployment can happen immediately after the temporary rules, followed by the final rules.
5. Test authorization against the Firestore Emulator / Rules Simulator: public vs private profile reads, published vs draft reads, author ownership, manager metadata writes, and unrelated manuscript access.
6. Verify live production uses these credentials and that no other product unintentionally shares this database.

## Step 1 — Local preflight

From the checked-out feature branch:

```sh
node scripts/verify-firebase-target.mjs
firebase login
firebase firestore:databases:get ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf --project subscription-tracker-92b0b
```

The first command verifies repository configuration only, not live permissions or live deployed rules. Use a current Firebase CLI.

## Step 2 — Deploy temporary compatibility rules (short-lived)

After backup and a review of *live* rules:

```sh
firebase deploy --config firebase.transition.json --only firestore:ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf --project subscription-tracker-92b0b
```

Confirm the CLI output explicitly names the intended **named database**, and test that the current website still works. The transitional rules preserve the previous public author-directory access while accepting new publication metadata fields.

**Do not proceed if the CLI reports no databases deployed, targets another database, or produces rules errors. Do not try a broader unqualified deploy as a workaround.**

## Step 3 — Release updated frontend

Merge [Pull Request #2](https://github.com/dreamdaytech/Griots-Books-/pull/2) after the transitional rules pass checks. Ensure AI Studio / hosting actually deploys the updated `main` code and that public author directory requests now use `where('isPublic','==',true)`.

Smoke-test the public catalogue, author listings, authenticated author profile editor, publishing manager editor and manuscript submissions. Do not enable public-profile opt-out while temporary rules remain active.

## Step 4 — Immediately deploy the FINAL privacy rules

From the new `main` commit:

```sh
node scripts/verify-firebase-target.mjs
firebase deploy --config firebase.json --only firestore:ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf --project subscription-tracker-92b0b
```

Verify the command reports a successful rules release for the named database. Allow propagation, then verify:
- Anonymous visitors see only published titles and `isPublic == true` author profiles.
- Non-public and legacy profile documents cannot be fetched by anonymous visitors.
- A signed-in author can opt in/out and save their profile.
- Authors cannot view another person's confidential manuscripts.
- Publishing managers can update approved public metadata, and an unprivileged author cannot.
- Approved text-only excerpts appear only for published records with `previewEnabled == true`.

## Step 5 — Confirm deployment and clean up

Confirm the *live* Firestore rules match `firestore.rules` and the live website uses the updated code. Keep the backup ruleset available for controlled rollback. Transition files are for coordinated migration only; remove them from the repository after confirmed rollout.

**Rollback note:** Restoring the old code after switching to new strict rules may break the old author-directory query. Recover the application and rules as an explicitly coordinated pair, not independently.

## Important limitations

- Merely committing `firestore.rules`, `firebase.json` or a PR **never deploys** the database rules.
- CI target preflight, TypeScript, workflow tests, and build verification do **not** establish live security.
- No Firestore data, indexes, hosting, or live rules have been modified by these repository changes.
- Firebase CLI rules deployment overwrites rules for the targeted database; a backup and deliberate review are mandatory.

Reference: https://firebase.google.com/docs/rules/manage-deploy and https://firebase.google.com/docs/cli/ .
