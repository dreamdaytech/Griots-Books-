
# Griots Books — Governance policy review and rollout checklist

**Development branch:** feature/governance-policy-pages-v1
**Status:** Working policy drafts; no legal effect until formally approved and released.
**Draft version:** draft-2026-11-19.1
**Base:** GitHub main, separate from Phase 1 catalogue PR #2.

## Implemented safely

- All four governance documents have substantive sections and accessible table-of-contents links.
- Footer links and page titles identify **all four** policies as drafts.
- Unknown /policies/:slug no longer incorrectly redirects to the editorial policy.
- Registration, manuscript submission, service quotations, profile settings and reviewer workspace link to relevant guidance.
- Draft status, review date, version and approval warning are prominent; no invented effective date.
- Contextual contact links are provided. An example placeholder contact email is never presented as an approved legal email.
- No changes to Firestore Security Rules, API endpoints, user roles, manuscripts, quotations, payments or peer-review persistence.

## Owner decisions required BEFORE approval

1. **Legal operator:** confirm incorporated publishing entity, registration, address, governing law, jurisdiction and approved privacy/copyright contact. Do not assume the operator is DreamDay Technology Limited without explicit confirmation.
2. **Privacy:** confirm exact production providers, storage locations (including private-file service), access boundaries, backups, retention schedule, incident process, third-party disclosure and international transfer arrangements.
3. **Payments:** approve commercial currencies, actual payment methods, invoice flow, cancellation/refund policy, tax treatment, dispute process, order acceptance, publication obligations and customer support response targets.
4. **Copyright:** approve limited manuscript-assessment permissions, publishing contract models, rights territory/duration, royalties, licence options, rights reversion, service deliverable ownership and authorized Read Inside excerpts.
5. **Editorial:** approve journal-specific review models, reviewer eligibility, conflict handling, misconduct escalation, corrections/retractions, complaints, appeals, publication charges and AI policy.
6. **Contact:** replace default .example contact details in settings. Nominate an internal approval owner and editorial/privacy response role.
7. **Law:** review current law applicable in Sierra Leone and other markets; do not present draft bills as enacted law. Obtain qualified legal review.
8. **Final publication:** record approved text, approval date, approvers, effective date, version and communication about material changes.

## Future consent/acceptance implementation

The current submission wizard has a required authorship/rights declaration; the updated UI links to the current draft guidance. **No additional legally binding consent or policy-version log is claimed here.**

Before final binding Terms go into effect, define and implement a server-authoritative acceptance record with policy id/version, user ID, UTC accepted timestamp and context (registration, submission, service order or reviewer undertaking), with secure authorization and appropriate retention. Avoid relying solely on a client-side checkbox. Any database schema change must be reviewed alongside the deployed Firestore rules for the named Griots Books database.

A true policy withdrawal/change mechanism requires a documented technical and operational procedure. Links alone do not satisfy consent or privacy rights obligations.

## QA gates

- TypeScript validation and existing workflow/peer-review tests.
- Policy content tests: four routes, unique anchors, adequate sections and pending-approval metadata.
- Build verification and mobile/desktop page review.
- Registration and submission flows work without adding mandatory, unapproved legal consent that might lock out existing accounts.
- Reviewer note does not alter access controls.
- All policy links navigate correctly from footer, registration, manuscript submission, profile and quotation form.
- Cross-check with Phase 1 feature branch before merging both PRs; rebase/retest on changed main rather than force pushing.
- Publish approved final wording only after owner and appropriate legal/editorial sign-off.

## Standards and references (not contract terms)

- COPE, principles of transparency: https://doi.org/10.24318/cope.2019.1.12
- Creative Commons licence chooser: https://creativecommons.org/chooser/
- WIPO Lex, Sierra Leone Copyright Act 2011: https://www.wipo.int/wipolex/en/legislation/details/14529

Policy drafting does not certify legal compliance or establish that proposed operating procedures are already implemented.
