# Griots Books — Publication Discovery Upgrade (Phase 1)

## Changes

- Enhanced public catalogue with search, publication type, subject/genre, language, access, format, sorting and pagination. Filters preserve shareable URL parameters.
- Expanded publication detail template for books, general articles and academic research, featuring optional series, edition, imprint, publication year, page count, verified identifiers, table of contents and related titles.
- Text-only "Read Inside" previews appear **only when both** the record is publicly released and a Publishing Manager has explicitly approved a public excerpt. No private DOCX/PDF manuscripts are linked to preview pages.
- Dedicated contributor routes `/authors/:uid` show publicly opted-in biography/affiliation and only linked, released publications.
- Publishing Manager can edit existing catalogue metadata and enable/disable an authorized preview.
- Existing publishing/manuscript workflows, privacy-sensitive manuscript storage and editorial decisions remain unchanged.

## Database / Firestore deployment instructions

**The repository's `firestore.rules` has been updated, but committing the file does not deploy the live Firebase rules.** Review the named database and follow the **staged release runbook in [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md)**. Applying the final privacy rules before updating the current public author-directory code would break its existing collection-list query; the runbook supplies a temporary compatibility ruleset for a short coordinated rollout.

New *optional* publication fields: `isbnPrint`, `isbnDigital`, `language`, `edition`, `imprint`, `series`, `publicationYear`, `pageCount`, `subjects`, `tableOfContents`, `previewEnabled`.

Legacy publication documents remain readable because added fields are optional. Unknown prior excerpt values remain hidden in the application until re-approved. **Review any already-published Firestore document with an old `excerpt` field** before production rollout: existing public data can be read directly over Firestore while that document has a published status. Remove unpublished or unauthorized excerpt content from previously published records if any exists.

## Author privacy: opt-in

All newly created author profiles default to **not public**. An author must check *Make my author profile public* in their account profile to expose their biography, affiliation and ORCID via the public author directory. The server and Firebase catalogue read paths filter for `isPublic: true` and the Firestore rules prevent unauthorized reads of non-public profiles. Legacy publicProfiles lacking this field are hidden until their owners opt in. Demonstration profiles are deliberately flagged as sample records.

Admin and account permissions for non-public identity documents are unchanged.

## Reading preview rules

Only manually pasted, authorized **text** excerpts are supported in Phase 1. The `previewEnabled` flag is required. Enabling it is an editorial and rights-holder approval action and should only be performed by authorized publishing staff. The platform does not expose private source files, automatically generate external previews or imply a book can be bought unless checkout is implemented.

## Testing

CI runs TypeScript validation, publishing workflow tests, publication discovery/privacy tests and the Vite production build. Manual browser QA should cover:
1. Filter and sort combinations, URL sharing, pagination, mobile layout.
2. Legacy `/catalogue?type=article` links.
3. Sample and real publication detail pages; verified and unverified ISBN visibility.
4. Editing an existing published publication without changing its release status.
5. Disabling public preview removes excerpt text from the persisted public record.
6. Public profile opt-out and opt-in against the **deployed** Firestore rules.
7. Cross-author private manuscript permissions and admin approval flows remain intact.

## Next phases

Book proposals, full article publishing/reading, journal issue views, advanced print/digital commerce and external distribution are future work. Do not advertise those as already operational.
