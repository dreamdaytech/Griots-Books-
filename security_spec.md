# Security Specification — Publishing Platform Firestore Rules

## 1. Data Invariants
1. **No Self-Assigned Privileged Roles**: Public user registration (`create` on `/users/{userId}`) may only assign non-privileged roles (`author`, `researcher`). Assigning `editor`, `managing_editor`, `editor_in_chief`, `reviewer`, `publishing_manager`, `admin`, or `super_admin` is restricted strictly to verified Administrators.
2. **PII Isolation**: Private user records (`/users/{userId}`) containing `email` and account status are readable only by the profile owner, editorial staff (for assignment lookup), or administrators. Public author listings use `/publicProfiles/{userId}` with zero PII.
3. **Manuscript Confidentiality**: Unpublished manuscripts (`/manuscripts/{manuscriptId}`) and their subcollections (`/versions`, `/comments`, `/history`) are readable only by the owning author, assigned/authorized editorial staff, or administrators. Public visitors can never query or read manuscripts.
4. **Internal Editorial Note Confidentiality**: Comments with `visibility == 'internal_editorial'` or `visibility == 'confidential_review'` are never readable by the manuscript author.
5. **State Machine Integrity**: Normal authors can only create manuscripts in `'draft'` or `'submitted'` status and can only withdraw (`'withdrawn'`) or submit (`'submitted'`) their own manuscripts. Editorial transitions (`under_initial_review`, `author_revision_required`, `approved_for_publication`, `published`, `rejected`) require editorial/admin authorization.
6. **Public Catalogue Protection**: `/publications/{publicationId}` allows public `get` and `list` ONLY when `resource.data.releaseStatus == 'published'`. Approved or archived records remain hidden from public queries.
7. **Immutable Audit & Version Records**: `/manuscripts/{id}/versions`, `/manuscripts/{id}/history`, and `/auditLogs` cannot be modified or deleted by non-admins once created.

## 2. The "Dirty Dozen" Attack Payloads
1. **Privilege Escalation on Registration**: Creating `/users/attacker1` with `roles: ['super_admin']` -> MUST FAIL (`PERMISSION_DENIED`).
2. **Role Self-Promotion on Update**: Updating own `/users/author1` document adding `'editor'` to `roles` -> MUST FAIL (`PERMISSION_DENIED`).
3. **Cross-Author Manuscript Read**: Author A reading `/manuscripts/ms_of_author_b` -> MUST FAIL (`PERMISSION_DENIED`).
4. **Confidential Editorial Note Snooping**: Author A reading `/manuscripts/ms_of_author_a/comments/internal_1` where `visibility == 'internal_editorial'` -> MUST FAIL (`PERMISSION_DENIED`).
5. **Author Bypassing Editorial Approval**: Author A updating their own manuscript directly to `status: 'published'` or `status: 'approved_for_publication'` -> MUST FAIL (`PERMISSION_DENIED`).
6. **Shadow Field Injection on Manuscript**: Creating a manuscript with an unlisted ghost field `isVerifiedByAdmin: true` -> MUST FAIL (`PERMISSION_DENIED`).
7. **Oversized ID Poisoning**: Creating `/manuscripts/invalid!id_with_1500_chars...` -> MUST FAIL (`PERMISSION_DENIED`).
8. **Forged Author Identity**: Author A creating a manuscript with `authorId: 'author_b'` -> MUST FAIL (`PERMISSION_DENIED`).
9. **Public Scraping of Unpublished Catalogue Item**: Unauthenticated visitor reading `/publications/pub_approved_only` where `releaseStatus == 'approved'` -> MUST FAIL (`PERMISSION_DENIED`).
10. **Author Creating/Mutating Service Pricing**: Normal author writing to `/services/srv_1` -> MUST FAIL (`PERMISSION_DENIED`).
11. **Tampering with Audit Logs**: Normal user updating or deleting `/auditLogs/log_1` -> MUST FAIL (`PERMISSION_DENIED`).
12. **Cross-User Notification Read/Write**: Author A reading or creating `/notifications/notif_of_author_b` -> MUST FAIL (`PERMISSION_DENIED`).
