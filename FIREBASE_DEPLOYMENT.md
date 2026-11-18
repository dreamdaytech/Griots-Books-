# Firebase deployment and validation — Griots Books Phase 1

## Verified application target

- Google Cloud / Firebase project ID: `subscription-tracker-92b0b`
- **Named** Firestore database ID: `ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf`
- Region supplied by the project owner: Oregon (`us-west1`); region was **not** independently verified against the live project.
- Firebase application configuration: `firebase-applet-config.json`
- Rules source: `firestore.rules`

The target identifiers match those supplied by the platform owner and the currently committed application configuration. This is **not** a confirmation of the live rules currently deployed to Firestore.

**Do not deploy to the project's `(default)` database.** This application uses the named database above.

## Before a production rules deployment

1. Confirm you are signed into the correct Firebase / Google Cloud account and have permission to manage Rules for the named database.
2. Read the **live deployed rules** for this *specific* database and save a timestamped backup outside the application repository.
3. Compare live rules to this branch's `firestore.rules`; reconcile any newer rules/features that are only present in production. Never blindly replace live rules that differ.
4. Inspect any existing `publicProfiles` records: profile biographies should only be publicly readable for individuals who explicitly opt in (`isPublic === true`).
5. Inspect published publication records with a legacy `excerpt` field to ensure no unapproved manuscript content is readable. Remove any confidential excerpts prior to exposing or enabling public preview.
6. Run Firestore emulator/simulator tests, especially anonymous/public reads, author profile opt-out, author opt-in, manuscript isolation, publishing-manager writes and approved-preview restrictions.
7. Verify current Firebase indexes remain intact. The rules-only command below does not deploy indexes.

## Guard and scoped rules-only deployment

From the repository root, after checking out this branch or its eventual merged commit:

```sh
node scripts/verify-firebase-target.mjs
firebase login
firebase firestore:databases:get ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf --project subscription-tracker-92b0b
firebase deploy --only firestore:ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf --project subscription-tracker-92b0b
```

Use a current Firebase CLI. The **database-scoped** selector is preferred here over an unqualified `firebase deploy`. On successful deployment, verify the CLI output explicitly names `ai-studio-32d4773e-44c8-46f5-91e1-eeb96a1daadf` and check the deployed rules on that database.

Firebase CLI's named-database deployment behavior should be tested before production use; if this command does not deploy to the exact target, **stop** rather than trying a broader deploy. See the official documentation:
- https://firebase.google.com/docs/rules/manage-deploy
- https://firebase.google.com/docs/cli/

Rules deployments replace existing rule sources for the targeted database and are not automatically rolled back. Wait for propagation and verify real authorized/unauthorized user scenarios after deployment.

## Suggested tests

- Anonymous visitor: view published catalogue and explicitly opted-in author profiles; never view drafts or non-public author profiles.
- Author A: edit their own public profile visibility; cannot view author B's profile if B has not opted in.
- Authorized publishing manager: add enhanced publication metadata and explicitly approve a text-only preview; retain publication date when editing an already released book.
- Unprivileged author: cannot directly approve or publish a manuscript or change publication metadata.
- Published books: show identifiers only when entered and verified, not because arbitrary text was typed.
- Existing accounts and publications: load without migration, since new fields are optional.

## GitHub release order

1. Review and test the new rules against the current live rules.
2. Deploy compatible rules to the correct **named** database.
3. Confirm permissions and readiness for the new UI.
4. Merge Pull Request #2 only after deployment succeeds; then verify the deployed website and smoke-test all workflows.

No Firestore data migration, index change, or production deployment is done by adding these files to GitHub.
