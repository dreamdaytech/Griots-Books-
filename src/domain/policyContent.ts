/**
 * Griots Books policy drafts: editorial source of truth for public policy pages.
 * IMPORTANT: These are review drafts, NOT legally approved/effective policies.
 * Never change status to approved without explicit legal/owner sign-off.
 */
export type PolicySlug = 'privacy' | 'terms' | 'copyright' | 'editorial';

export interface PolicySection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
}
export interface PolicyDocument {
  slug: PolicySlug;
  title: string;
  subtitle: string;
  overview: string;
  sections: PolicySection[];
  references?: { label: string; url: string }[];
}

export const POLICY_REVIEW_VERSION = 'draft-2026-11-19.1';
export const POLICY_LAST_REVIEWED = '19 November 2026';
export const POLICY_APPROVAL_STATUS = 'pending-owner-and-legal-review' as const;
export const POLICY_SLUGS: PolicySlug[] = ['privacy', 'terms', 'copyright', 'editorial'];

export function isPolicySlug(value: string | undefined): value is PolicySlug {
  return Boolean(value && POLICY_SLUGS.includes(value as PolicySlug));
}

export const POLICY_DOCUMENTS: Record<PolicySlug, PolicyDocument> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'Personal data, unpublished manuscripts and editorial confidentiality.',
    overview: 'This draft explains the information Griots Books processes when people use its public catalogue, author and researcher accounts, manuscript submission system, editorial workflow and publishing services.',
    sections: [
      {
        id: 'status',
        heading: '1. Status and responsible operator',
        paragraphs: [
          'This is a policy draft for review and does not yet state a legally approved effective date. The organisation legally responsible for operating Griots Books, its registered address, and the designated privacy contact must be confirmed by the owner before final publication.',
          'For now, use the Contact Editorial Office page for an inquiry. Do not send passwords, ID documents or confidential manuscript materials through the general contact form.'
        ],
      },
      {
        id: 'information',
        heading: '2. Information collected',
        paragraphs: [
          'The platform processes information users provide directly, information generated through publishing workflows and technical data needed to operate the service. Actual collection depends on the features a person uses.'
        ],
        bullets: [
          'Account and professional details: name, email address, account identifier, roles, affiliation, country, biography and optional ORCID identifier.',
          'Manuscript and research material: titles, abstracts, coauthor details, keywords, institution, declarations on ethics, funding, conflicts and data availability, submitted files and version history.',
          'Editorial records: reviewer assignments, rubric scores, section annotations, recommendations, internal comments, decisions, timestamps and audit events.',
          'Commercial inquiries: requested services, quotations, estimated or confirmed amounts, order status and correspondence; card or banking details must not be implied to be collected unless a real payment workflow is implemented.',
          'Contact requests and operational metadata such as support messages, authentication events and security-related activity.'
        ],
      },
      {
        id: 'purposes',
        heading: '3. Why the information is used',
        paragraphs: [
          'Information is needed to administer accounts, authenticate users, receive and evaluate manuscripts, support academic peer review, prepare quotations, coordinate approved publishing work, display voluntarily public author profiles and released catalogue entries, and investigate abuse or security incidents.',
          'The precise lawful bases and any required consent mechanisms depend on the applicable law and must be confirmed during legal review. Public profile visibility should remain an explicit choice; it is not automatically authorized by registering or submitting a manuscript.'
        ],
      },
      {
        id: 'confidentiality',
        heading: '4. Manuscripts and reviewer confidentiality',
        paragraphs: [
          'Unpublished manuscripts, confidential reviews and editorial notes are intended for the submitting author and appropriately authorized editors or assigned reviewers. A public catalogue entry must be created through a separate release process; manuscript upload alone must not publish a file.',
          'Authors may choose to display a public biography and selected professional details. A published work can still credit its author without making their account profile public. Approved Read Inside excerpts must be expressly selected for public release; manuscript originals and private reviewer commentary must not be used as public previews.',
          'A technical access rule is a security measure, not a guarantee that a service will never experience a security incident. Actual permissions and storage configurations require continuing testing and monitoring.'
        ],
      },
      {
        id: 'providers',
        heading: '5. Hosting, service providers and international handling',
        paragraphs: [
          'The current application uses Google Firebase services for authentication and Firestore records, together with application hosting and private-file handling. Cloud and support infrastructure may process data in locations outside a user’s country. The named Firestore database is configured in us-west1 (Oregon), but this is not a blanket claim that all application data stays there.',
          'Before approval, the operator must document each production provider, actual file and backup storage, applicable contracts, subprocessors and any international-transfer safeguards. Do not treat a development or demonstration storage path as evidence of durable archival storage.'
        ],
      },
      {
        id: 'sharing',
        heading: '6. Disclosure and publication',
        paragraphs: [
          'Data may need to be shared with authorized editorial personnel, selected reviewers and contracted service providers as required for a requested workflow. The public may see released catalogue metadata and author information that is approved for public display.',
          'Do not describe manuscript content as sold, licensed for AI training or shared with advertisers unless the operator has separately approved and disclosed such activities. The platform must not share confidential material with external AI services without appropriate permission, safeguards and an approved disclosure.'
        ],
      },
      {
        id: 'retention',
        heading: '7. Retention, backups and deletion',
        paragraphs: [
          'Account records, manuscripts, review decisions, quotations and audit logs can have different retention needs. A final retention schedule, deletion and backup process, archival obligations, and exceptions for disputes or scholarly integrity must be documented before approval.',
          'Users may request account or manuscript information changes through the Contact page. A request to delete a submission may be limited where publication agreements, required recordkeeping or legitimate research-integrity obligations apply; the specific legal grounds must be checked, and the operator should explain the result.'
        ],
      },
      {
        id: 'controls',
        heading: '8. User controls and privacy requests',
        paragraphs: [
          'Where supported by the platform, users can edit their account information and select whether an author profile is public. They may also ask about accessing, correcting, exporting or deleting personal information and about withdrawing any consent that is genuinely optional.',
          'The approved policy should identify the exact contact responsible, identity-verification procedure, response timelines required by applicable law and escalation route. These procedures must not be promised as automated when they have not been built.'
        ],
      },
      {
        id: 'security',
        heading: '9. Security, incidents and account responsibilities',
        paragraphs: [
          'The application uses authentication, role-scoped workflows and Firestore rules to restrict access. Users should safeguard credentials, promptly report suspicious access, and avoid uploading sensitive third-party information without appropriate permission.',
          'The final policy must describe the approved incident-response and notification procedure, without promising absolute security, unconditional recovery or specific response times that have not been adopted.'
        ],
      },
      {
        id: 'tracking',
        heading: '10. Cookies and technical measurement',
        paragraphs: [
          'Authentication and session-related browser storage may be necessary to sign in and maintain a session. Any non-essential analytics, tracking, advertising or cookie choices require an accurate inventory and a separate consent mechanism if applicable.',
          'This draft does not assert that analytics, advertising cookies or a specific consent-management platform are enabled. Such statements should be added only after verifying deployed code and providers.'
        ],
      },
      {
        id: 'updates',
        heading: '11. Changes and questions',
        paragraphs: [
          'Once legally approved, the policy should display its effective date, a clear version identifier and a description of material changes. Significant changes affecting account choices or manuscript handling should be communicated appropriately.',
          'Questions or requests can be directed through the Contact Editorial Office page until a dedicated privacy address is approved.'
        ],
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    subtitle: 'Account use, manuscript submissions and publishing services.',
    overview: 'These proposed terms describe how an independent publishing and academic-submission platform should separate ordinary website use, editorial assessment, purchased services and any future publishing agreement.',
    sections: [
      {
        id: 'status',
        heading: '1. Draft status and legal parties',
        paragraphs: [
          'These terms are a review draft and are not yet approved contractual terms. The platform operator’s registered legal name, business address, applicable governing law and dispute forum must be confirmed before this document is presented as effective.',
          'A manuscript submission, publishing-services quotation and rights-granting publishing contract are different transactions and should not be treated as the same agreement.'
        ],
      },
      {
        id: 'accounts',
        heading: '2. Registration and account conduct',
        paragraphs: [
          'Users are expected to provide accurate account and professional information and keep their credentials secure. Public registration is intended for author and researcher accounts; editorial and administrative responsibilities require separate authorization.',
          'The approved terms should define age and capacity requirements, account suspension and appeal procedures, and how a user can contact the operator regarding an account.'
        ],
      },
      {
        id: 'acceptable-use',
        heading: '3. Acceptable use',
        paragraphs: [
          'The proposed rules prohibit impersonation, uploading unlawful or malicious material, deliberately bypassing authentication or privacy controls, fabricated credentials or identifier claims, interference with other users, and infringement of others’ rights.',
          'Users must not submit someone else’s manuscript, copyrighted illustrations or private research records without suitable authority. Research submissions must not reveal confidential participant data or third-party material without necessary permissions and safeguards.'
        ],
      },
      {
        id: 'submission',
        heading: '4. Manuscript submission and assessment',
        paragraphs: [
          'Authors and their authorized representatives are responsible for the accuracy of authorship, originality declarations, contributor permissions and scholarly statements. A submission allows authorized staff to evaluate the work within the chosen workflow; it is not an automatic publishing acceptance or copyright assignment.',
          'The operator may request revisions, supporting evidence, rights documentation or clarification. Manuscripts may be declined according to editorial standards. Actual withdrawal arrangements, review timelines and appeal steps require an approved editorial policy.'
        ],
      },
      {
        id: 'separate-services',
        heading: '5. Publishing services and quotations',
        paragraphs: [
          'Displayed packages and service amounts are illustrative or estimated until a written quotation or order is confirmed by the parties. The final service agreement should identify work scope, price/currency, milestones, deliverables, author approval points, revision limits and payment requirements.',
          'Purchasing editing, design, typesetting, identifier assistance or printing services must not influence scholarly acceptance or editorial decisions. A quotation request alone does not represent a completed sale or verified payment.'
        ],
      },
      {
        id: 'payments',
        heading: '6. Payments, cancellation and refunds',
        paragraphs: [
          'The operator must approve country-appropriate payment methods, invoicing, taxes, cancellation rules and any refund or dispute process before offering binding online checkout or promising a particular refund period.',
          'Until those commercial terms are finalized, written confirmation of a service order should specify any cancellation/refund arrangement before production work begins. Do not assume that catalogue display creates an immediate purchase entitlement.'
        ],
      },
      {
        id: 'editorial',
        heading: '7. Editorial decisions and research integrity',
        paragraphs: [
          'Editors exercise independent judgment over acceptance, revision and rejection. Reviewers and staff must respect declared review models, confidentiality and conflicts of interest. Suspected plagiarism, fabrication, unethical research or manipulation may result in further investigation or a changed decision.',
          'Editorial decisions, complaints and post-publication corrections should follow the separate Editorial & Peer Review Policy and the applicable journal-specific requirements.'
        ],
      },
      {
        id: 'rights',
        heading: '8. Intellectual property and publication agreements',
        paragraphs: [
          'Submitting content for evaluation does not itself transfer ownership of the author’s copyright. Any exclusive rights, distribution rights, royalties, territory, licence duration, sublicensing, reversion terms or open-access licence require a separate, explicit publishing arrangement.',
          'A user may only upload and authorize publication or excerpts where they have the necessary rights. The separate Copyright & Licensing Policy explains proposed rights handling and notices.'
        ],
      },
      {
        id: 'availability',
        heading: '9. Service availability and records',
        paragraphs: [
          'Platform features can change and access can be interrupted by network, hosting or maintenance issues. Authors should retain their own securely stored original manuscript copies; the platform must not imply a guaranteed indefinite archival or recovery service without an implemented retention and backup policy.',
          'Security or misuse concerns may require proportionate restrictions on access while they are investigated, subject to applicable law and a fair procedure.'
        ],
      },
      {
        id: 'liability',
        heading: '10. Liability, complaints and dispute resolution',
        paragraphs: [
          'Any warranties, limitations of liability, compensation rules, complaint channels, governing law and dispute-resolution procedure must be specified with legal review and must not exclude rights that cannot lawfully be excluded.',
          'Questions about publishing orders, account records or editorial decisions should be routed to the appropriate published contact. The operator should keep a verifiable internal record of responses and decisions.'
        ],
      },
      {
        id: 'amendments',
        heading: '11. Changes to terms',
        paragraphs: [
          'Once approved and effective, terms should show an effective date and version, and material changes should be communicated in a way appropriate to existing users and active publishing orders.',
          'The final terms must not be treated as accepted automatically merely because a user visited this draft page. The application needs an approved acceptance/version-recording mechanism for binding terms.'
        ],
      },
    ],
  },
  copyright: {
    slug: 'copyright',
    title: 'Copyright & Licensing',
    subtitle: 'Respecting creators’ ownership and clearly documented publishing permissions.',
    overview: 'This draft describes the proposed copyright and licensing principles for submissions, production services, approved excerpts, published books and academic outputs.',
    sections: [
      {
        id: 'overview',
        heading: '1. Copyright ownership',
        paragraphs: [
          'The proposed starting position is that authors and other lawful rights holders retain their existing copyright when they submit a manuscript for editorial consideration. A submission or service quotation alone does not transfer copyright to Griots Books.',
          'Ownership of collaborative works, commissioned materials, translations, illustrations, photographs and institutional research may depend on prior agreements and the applicable law. The author must clarify those rights before licensing publication.'
        ],
      },
      {
        id: 'review-license',
        heading: '2. Permission to evaluate submissions',
        paragraphs: [
          'For the purpose of editorial assessment, submitting authors should grant only the limited permissions needed to store, review, comment on, revise and communicate about the submitted manuscript within authorized workflows.',
          'This limited permission is different from a public distribution licence. A draft manuscript and private peer-review material must not automatically appear in the public catalogue or be reused as marketing content.'
        ],
      },
      {
        id: 'publishing-agreements',
        heading: '3. Separate publishing agreements',
        paragraphs: [
          'Before public release, the parties should confirm the rights granted in a distinct agreement. Depending on the work, a negotiated arrangement may cover print, eBook, digital access, territory, language, edition, duration, sublicensing, promotional excerpts, royalties and termination or rights reversion.',
          'Exclusive and non-exclusive grants have different consequences. No exclusive licence or assignment should be presumed merely because the author requested editing, paid a production charge or selected a publication preference.'
        ],
      },
      {
        id: 'third-party',
        heading: '4. Third-party content and contributor permissions',
        paragraphs: [
          'Authors are responsible for identifying third-party quotations, photographs, figures, datasets, artwork, translations and other materials that require permission, acknowledgement or a suitable legal exception.',
          'Coauthors should agree on attribution, contribution and permission to submit. The publishing team may ask for permissions evidence or replacement of disputed content before production or release.'
        ],
      },
      {
        id: 'open-access',
        heading: '5. Open access and Creative Commons',
        paragraphs: [
          'Free access is not automatically an open licence. A work that is free to read may still be protected by copyright and may not grant reuse permissions beyond those provided by law.',
          'Creative Commons licences should be applied only by authorized rights holders and stated precisely on each work. For example, CC BY 4.0 permits sharing and adaptation with attribution, while CC BY-NC 4.0 adds non-commercial restrictions. Other licence variants differ. Use the official Creative Commons chooser and verify the terms before publication.',
          'Do not apply an open licence, public-domain dedication or an assumed default to any existing work without verified rights-holder approval.'
        ],
      },
      {
        id: 'previews',
        heading: '6. Read Inside previews and publicity',
        paragraphs: [
          'The platform should publish sample chapters or excerpts only when expressly authorized by the rights holder and approved through the publishing process. The licence or agreement should specify the extent and any promotional use.',
          'A private manuscript upload is never sufficient permission to make the entire work public. Reviewer notes, confidential declarations and unpublished sources must not appear in public previews.'
        ],
      },
      {
        id: 'identifiers',
        heading: '7. ISBN, ISSN and DOI identifiers',
        paragraphs: [
          'ISBN, ISSN and DOI values are bibliographic identifiers, not proof that Griots Books owns copyright, possesses exclusive distribution rights or has obtained an approval from a regulator.',
          'Identifier records should only be marked verified after checking the issuing or registration source. Different print and electronic editions may require distinct identifiers, as applicable.'
        ],
      },
      {
        id: 'complaints',
        heading: '8. Infringement notices and correction requests',
        paragraphs: [
          'A rights holder should be able to identify the disputed work, explain the claimed ownership or infringement and provide a safe method of contact. The operator should investigate credible notices, preserve relevant records, and take proportionate interim action where necessary.',
          'A response process should also allow authors or publishers to contest an inaccurate complaint. Final notice requirements and response timelines must be checked with legal counsel under the applicable law.'
        ],
      },
      {
        id: 'service-deliverables',
        heading: '9. Editing, design and production deliverables',
        paragraphs: [
          'The rights in edited text, cover illustrations, layout files, commissioned photography and other production assets should be specified in the relevant service contract. Payment for work does not, by itself, answer every copyright or licensing question.',
          'If third-party fonts, stock assets, software or templates are used, their licences may restrict later reuse and redistribution. The final customer agreement should disclose material restrictions.'
        ],
      },
      {
        id: 'law',
        heading: '10. Applicable law and policy updates',
        paragraphs: [
          'Sierra Leone’s Copyright Act 2011 and subsequent applicable regulations provide a relevant legal starting point, but this draft does not state detailed statutory interpretations or substitute for legal advice.',
          'A final version should identify the responsible publisher, approved legal contact, effective date and version, and describe how users will be informed of material changes.'
        ],
      },
    ],
    references: [
      { label: 'Creative Commons — choose and understand licences', url: 'https://creativecommons.org/chooser/' },
      { label: 'WIPO Lex — Sierra Leone Copyright Act, 2011', url: 'https://www.wipo.int/wipolex/en/legislation/details/14529' }
    ],
  },
  editorial: {
    slug: 'editorial',
    title: 'Editorial & Peer Review Policy',
    subtitle: 'Fair decisions, scholarly integrity and confidential reviewer assessments.',
    overview: 'This proposed editorial policy describes how Griots Books can apply consistent standards to creative manuscripts, research articles, monographs and journal submissions without linking acceptance to paid publishing services.',
    sections: [
      {
        id: 'scope',
        heading: '1. Scope and editorial independence',
        paragraphs: [
          'Creative books and scholarly submissions may follow different workflows. Each work is assessed for its relevance, quality, originality, integrity and suitability for the intended publishing channel.',
          'The final acceptance decision belongs to authorized editorial decision-makers under the platform’s configured roles. Purchasing evaluation, design, printing or copyediting services does not secure acceptance.'
        ],
      },
      {
        id: 'screening',
        heading: '2. Initial editorial screening',
        paragraphs: [
          'On receipt, an editor may verify required files, contributor information, genre or research discipline, declarations and overall suitability. Incomplete submissions may be returned for clarification, while unsuitable or non-compliant submissions may be declined without external review.',
          'Submission does not guarantee that a manuscript will be peer reviewed, accepted, assigned an identifier or distributed.'
        ],
      },
      {
        id: 'models',
        heading: '3. Review models and reviewer selection',
        paragraphs: [
          'Academic journals may use single-anonymous, double-anonymous or open review where specifically disclosed for the journal or submission. These models have different identity-disclosure implications and must not be promised interchangeably.',
          'Handling editors should select reviewers with appropriate expertise and consider conflicts, availability and independence. Reviewer appointments are access-controlled and may be withdrawn when necessary.'
        ],
      },
      {
        id: 'criteria',
        heading: '4. Review criteria and decisions',
        paragraphs: [
          'The existing peer-review module assesses four dimensions on a 1–5 scale: originality, rigor, clarity, and citations/ethical attribution. Reviewers can provide summary recommendations and section-specific annotations.',
          'Rubric scores and reviewer recommendations inform—but do not mechanically determine—the final decision. Possible recommendations include acceptance, minor revision, major revision or rejection. An editor considers the evidence, journal or press scope and any integrity concerns.'
        ],
      },
      {
        id: 'confidentiality',
        heading: '5. Confidentiality and reviewer conduct',
        paragraphs: [
          'Editors and reviewers must treat unpublished manuscripts, reviewer assignments and confidential comments as restricted information. They should not circulate drafts outside authorized workflows or use privileged material for personal advantage.',
          'External AI tools must not receive confidential manuscripts, reviewer reports or participant data unless an approved workflow, appropriate permissions and protective safeguards explicitly allow it. Reviewer identities must be handled according to the declared review model.'
        ],
      },
      {
        id: 'conflicts',
        heading: '6. Conflicts of interest and research ethics',
        paragraphs: [
          'Authors, editors and reviewers should disclose conflicts that could reasonably affect impartiality, including relevant financial, personal, professional or institutional relationships. Editors should recuse themselves or seek independent handling when necessary.',
          'Research submissions may require ethics review statements, informed-consent information, funding details, data availability, human or animal research safeguards and relevant contributor approvals, as appropriate to the discipline.'
        ],
      },
      {
        id: 'misconduct',
        heading: '7. Plagiarism, fabrication and other concerns',
        paragraphs: [
          'Concerns about plagiarism, manipulated data, fabricated citations, redundant submissions, authorship disputes, manipulated reviews or unethical research should be assessed fairly and proportionately.',
          'A credible concern should be documented, relevant parties given an opportunity to respond where appropriate, and an independent editorial decision recorded. The platform should not promise automated plagiarism detection or investigation tools that are not implemented.'
        ],
      },
      {
        id: 'revisions',
        heading: '8. Revision requests and editorial outcomes',
        paragraphs: [
          'Editors may request revisions and supporting explanations. Version history should preserve what was submitted and when, so editors can distinguish original and revised materials.',
          'Requests for revision are not promises of acceptance. Significant methodological or rights changes may require further review. Editors should communicate outcomes and substantive reasons in a fair, professional manner.'
        ],
      },
      {
        id: 'appeals',
        heading: '9. Complaints, appeals and independence',
        paragraphs: [
          'Authors and reviewers should have a clear channel to raise procedural errors, conflicts or concerns about editorial conduct. An appeal should identify the work, decision or conduct at issue and the supporting reason.',
          'A complaint should be considered by an appropriate person who was not solely responsible for the contested decision where feasible. The final policy must designate the responsible office, review process and realistic response windows.'
        ],
      },
      {
        id: 'post-publication',
        heading: '10. Corrections, concerns and retractions',
        paragraphs: [
          'After publication, credible errors or misconduct allegations may warrant a correction, expression of concern, withdrawal or retraction, depending on evidence and applicable standards. The scholarly record should retain transparent notices and an explanation where appropriate.',
          'Removal requests involving copyright, privacy, safety and research ethics require separate assessment. A published item’s identifier and citation record should not be silently repurposed.'
        ],
      },
      {
        id: 'ai-disclosure',
        heading: '11. Use of AI and editorial assistance',
        paragraphs: [
          'Authors should disclose material use of generative AI in manuscript development, data analysis or images where required by the chosen journal or publishing channel. Human contributors remain responsible for accuracy, originality and permissions.',
          'AI systems should not be listed as human authors or relied on as the sole basis for scholarly decisions. Editors and reviewers must protect confidentiality when using any permitted assistive tools.'
        ],
      },
      {
        id: 'updates',
        heading: '12. Policy governance and journal supplements',
        paragraphs: [
          'Each journal or imprint may add clearly disclosed discipline-specific standards, review model and any approved publication charges, provided they remain compatible with the overarching editorial policy.',
          'This policy draft is awaiting approval. The operator should publish a final version, responsible editorial contact, effective date and change history before describing these procedures as formally adopted.'
        ],
      },
    ],
    references: [
      { label: 'COPE — Principles of transparency and best practice in scholarly publishing', url: 'https://doi.org/10.24318/cope.2019.1.12' }
    ]
  }
};
