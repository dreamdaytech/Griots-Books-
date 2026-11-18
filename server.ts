import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  canAccessAdminConsole,
  canAccessEditorialWorkspace,
  canAccessPeerReviewWorkspace,
  canManageReviewers,
  canReleasePublication,
  canSubmitPeerReview,
  canViewManuscript,
  filterVisibleComments,
} from './src/domain/rbac.ts';
import {
  calculateOverallScore,
  clampRubricScore,
  filterVisiblePeerReviews,
  validatePeerReviewInput,
} from './src/domain/peerReview.ts';
import type {
  AcademicJournal,
  AuditLog,
  EditorialComment,
  Manuscript,
  ManuscriptHistory,
  ManuscriptVersion,
  NotificationItem,
  PeerReview,
  PeerReviewAnnotation,
  PlatformSettings,
  PublicAuthorProfile,
  PublicationRecord,
  PublishingService,
  ServiceQuotation,
  UserProfile,
} from './src/domain/types.ts';
import { canTransitionStatus, validateFileUploadMeta } from './src/domain/workflow.ts';
import {
  DEFAULT_PLATFORM_SETTINGS,
  DEFAULT_SERVICES,
  SAMPLE_JOURNALS,
  SAMPLE_PUBLIC_AUTHORS,
  SAMPLE_PUBLICATIONS,
} from './src/data/seedData.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const PRIVATE_UPLOADS_DIR = path.resolve(process.cwd(), '.private_uploads');
const DATA_DIR = path.resolve(process.cwd(), '.data');
const SANDBOX_DB_PATH = path.join(DATA_DIR, 'sandbox-db.json');
const CONTACT_LOG_PATH = path.join(DATA_DIR, 'contact-inquiries.json');

fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

interface SandboxDatabase {
  settings: PlatformSettings;
  users: UserProfile[];
  publicProfiles: PublicAuthorProfile[];
  manuscripts: Manuscript[];
  versions: ManuscriptVersion[];
  comments: EditorialComment[];
  history: ManuscriptHistory[];
  reviews: PeerReview[];
  services: PublishingService[];
  quotations: ServiceQuotation[];
  journals: AcademicJournal[];
  publications: PublicationRecord[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

function createInitialSandboxDb(): SandboxDatabase {
  const now = '2026-10-18T09:00:00.000Z';
  const users: UserProfile[] = [
    {
      uid: 'sandbox_author',
      email: 'author.sample@griotsbooks.example',
      displayName: 'Elena Rostova (Sample Author)',
      roles: ['author'],
      accountStatus: 'active',
      affiliation: 'Independent Writer (Sample)',
      bio: 'Sample author account for testing manuscript submission and revisions.',
      country: 'United Kingdom',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'sandbox_author_2',
      email: 'other.sample@griotsbooks.example',
      displayName: 'Marcus Chen (Sample Author 2)',
      roles: ['author'],
      accountStatus: 'active',
      affiliation: 'Pacific Institute (Sample)',
      bio: 'Second sample author used to verify cross-author access isolation.',
      country: 'Canada',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'sandbox_researcher',
      email: 'researcher.sample@griotsbooks.example',
      displayName: 'Dr. Amara Okafor (Sample Researcher)',
      roles: ['researcher', 'author'],
      accountStatus: 'active',
      affiliation: 'Department of Environmental Policy (Sample)',
      orcid: '0000-0002-1825-0097',
      bio: 'Sample academic researcher profile.',
      country: 'Nigeria',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'sandbox_editor',
      email: 'editor.sample@griotsbooks.example',
      displayName: 'Clara Holloway (Sample Editor)',
      roles: ['editor', 'managing_editor'],
      accountStatus: 'active',
      affiliation: 'Editorial Department',
      bio: 'Sample senior editor profile.',
      country: 'United States',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'sandbox_reviewer',
      email: 'reviewer.sample@griotsbooks.example',
      displayName: 'Dr. Samuel Adeyemi (Sample Peer Reviewer)',
      roles: ['reviewer'],
      accountStatus: 'active',
      affiliation: 'West African Architectural Archive (Sample)',
      orcid: '0000-0003-4198-2241',
      bio: 'External architectural history and material culture peer reviewer.',
      country: 'Ghana',
      createdAt: now,
      updatedAt: now,
    },
    {
      uid: 'sandbox_admin',
      email: 'admin.sample@griotsbooks.example',
      displayName: 'Arthur Pendelton (Sample Admin & Manager)',
      roles: ['publishing_manager', 'platform_admin', 'super_admin'],
      accountStatus: 'active',
      affiliation: 'Executive Publishing Office',
      bio: 'Sample publishing manager and platform administrator.',
      country: 'United Kingdom',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const sampleManuscriptPrivate: Manuscript = {
    id: 'ms_sample_private_2',
    referenceNumber: 'MS-2026-0102',
    authorId: 'sandbox_author_2',
    authorName: 'Marcus Chen (Sample Author 2)',
    title: 'Coastal Infrastructure Resilience (Sample Private Submission)',
    subtitle: 'Confidential draft belonging to Author 2',
    abstract: 'Sample private submission used to verify that Author 1 cannot view Author 2 manuscripts.',
    publicationType: 'book',
    category: 'Engineering & Policy',
    discipline: 'Civil Engineering',
    language: 'English',
    keywords: ['coastal', 'resilience', 'sample'],
    wordCount: 48000,
    pageCount: 210,
    requestedServices: ['srv_eval', 'srv_copyedit'],
    publicationPreference: 'both',
    status: 'under_initial_review',
    assignedEditorId: 'sandbox_editor',
    assignedEditorName: 'Clara Holloway (Sample Editor)',
    declarationsAccepted: true,
    currentVersionNumber: 1,
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };

  const sampleAuthorManuscripts: Manuscript[] = [
    {
      id: 'ms_sample_author_review',
      referenceNumber: 'MS-2026-0101',
      authorId: 'sandbox_author',
      authorName: 'Elena Rostova (Sample Author)',
      title: 'Civic Architecture & Timber Commons (Sample)',
      subtitle: 'Regional Typologies in Northern Europe',
      abstract: 'Sample book manuscript currently undergoing initial editorial screening and reader assessment.',
      publicationType: 'book',
      category: 'Architecture & Design',
      discipline: 'Architectural History',
      language: 'English',
      keywords: ['timber', 'civic architecture', 'sample'],
      wordCount: 54000,
      pageCount: 228,
      requestedServices: ['srv_eval', 'srv_copyedit'],
      publicationPreference: 'both',
      status: 'under_initial_review',
      assignedEditorId: 'sandbox_editor',
      assignedEditorName: 'Clara Holloway (Sample Editor)',
      assignedReviewerIds: ['sandbox_reviewer'],
      declarationsAccepted: true,
      currentVersionNumber: 1,
      isSample: true,
      createdAt: now,
      updatedAt: '2026-10-24T14:20:00.000Z',
    },
    {
      id: 'ms_sample_author_revision',
      referenceNumber: 'MS-2026-0103',
      authorId: 'sandbox_author',
      authorName: 'Elena Rostova (Sample Author)',
      title: 'Urban Acoustic Ecology Field Notes (Sample)',
      subtitle: 'Soundscapes of Post-Industrial Riverfronts',
      abstract: 'Sample general article awaiting minor methodology clarifications requested by the editorial board.',
      publicationType: 'general_article',
      category: 'Urban Studies',
      discipline: 'Environmental Humanities',
      language: 'English',
      keywords: ['acoustics', 'urban ecology', 'sample'],
      wordCount: 4200,
      pageCount: 16,
      requestedServices: ['srv_copyedit'],
      publicationPreference: 'digital_only',
      status: 'author_revision_required',
      assignedEditorId: 'sandbox_editor',
      assignedEditorName: 'Clara Holloway (Sample Editor)',
      declarationsAccepted: true,
      currentVersionNumber: 1,
      isSample: true,
      createdAt: now,
      updatedAt: '2026-10-28T09:45:00.000Z',
    },
    {
      id: 'ms_sample_author_accepted',
      referenceNumber: 'MS-2026-0104',
      authorId: 'sandbox_author',
      authorName: 'Elena Rostova (Sample Author)',
      title: 'Independent Press Stewardship & Archival Craft (Sample)',
      subtitle: 'Monograph Production Guide',
      abstract: 'Sample accepted manuscript ready for catalogue release after final proof approval.',
      publicationType: 'book',
      category: 'Publishing Practice',
      discipline: 'Editorial Studies',
      language: 'English',
      keywords: ['publishing', 'archival', 'sample'],
      wordCount: 38500,
      pageCount: 164,
      requestedServices: ['srv_formatting', 'srv_cover'],
      publicationPreference: 'both',
      status: 'approved_for_publication',
      assignedEditorId: 'sandbox_editor',
      assignedEditorName: 'Clara Holloway (Sample Editor)',
      declarationsAccepted: true,
      currentVersionNumber: 2,
      isSample: true,
      createdAt: now,
      updatedAt: '2026-11-04T16:10:00.000Z',
    },
    {
      id: 'ms_sample_author_draft',
      referenceNumber: 'MS-2026-0105',
      authorId: 'sandbox_author',
      authorName: 'Elena Rostova (Sample Author)',
      title: 'Notes on Hand-Sewn Archival Bindings (Sample)',
      subtitle: 'Working Draft',
      abstract: 'Unsubmitted draft manuscript demonstrating resumable wizard state and initial Draft progress tracking.',
      publicationType: 'general_article',
      category: 'Book Arts',
      discipline: 'Material Culture',
      language: 'English',
      keywords: ['bookbinding', 'craft', 'sample'],
      wordCount: 2800,
      pageCount: 11,
      requestedServices: [],
      publicationPreference: 'digital_only',
      status: 'draft',
      declarationsAccepted: false,
      currentVersionNumber: 0,
      isSample: true,
      createdAt: now,
      updatedAt: '2026-11-10T11:30:00.000Z',
    },
  ];

  return {
    settings: { ...DEFAULT_PLATFORM_SETTINGS },
    users,
    publicProfiles: [...SAMPLE_PUBLIC_AUTHORS],
    manuscripts: [...sampleAuthorManuscripts, sampleManuscriptPrivate],
    versions: [],
    comments: [
      {
        id: 'cmt_sample_internal',
        manuscriptId: 'ms_sample_private_2',
        manuscriptAuthorId: 'sandbox_author_2',
        authorId: 'sandbox_editor',
        authorName: 'Clara Holloway (Sample Editor)',
        authorRole: 'managing_editor',
        visibility: 'internal_editorial',
        commentType: 'editorial_note',
        body: 'Internal note: verify engineering appendix figures before assigning copyeditor.',
        createdAt: now,
      },
      {
        id: 'cmt_sample_author_rev',
        manuscriptId: 'ms_sample_author_revision',
        manuscriptAuthorId: 'sandbox_author',
        authorId: 'sandbox_editor',
        authorName: 'Clara Holloway (Sample Editor)',
        authorRole: 'managing_editor',
        visibility: 'author_visible',
        commentType: 'revision_request',
        body: 'Please expand Section 2 with recording site coordinates and upload your revised manuscript.',
        createdAt: '2026-10-28T09:45:00.000Z',
      },
    ],
    history: [
      {
        id: 'hist_sample_1',
        manuscriptId: 'ms_sample_private_2',
        manuscriptAuthorId: 'sandbox_author_2',
        actorId: 'sandbox_author_2',
        actorName: 'Marcus Chen (Sample Author 2)',
        action: 'Submitted manuscript',
        fromStatus: 'draft',
        toStatus: 'submitted',
        details: 'Initial sample submission MS-2026-0102',
        createdAt: now,
      },
      {
        id: 'hist_sample_author_1',
        manuscriptId: 'ms_sample_author_review',
        manuscriptAuthorId: 'sandbox_author',
        actorId: 'sandbox_editor',
        actorName: 'Clara Holloway (Sample Editor)',
        action: 'Status changed to under initial review',
        fromStatus: 'submitted',
        toStatus: 'under_initial_review',
        details: 'Assigned to editorial screening.',
        createdAt: '2026-10-24T14:20:00.000Z',
      },
      {
        id: 'hist_sample_author_2',
        manuscriptId: 'ms_sample_author_revision',
        manuscriptAuthorId: 'sandbox_author',
        actorId: 'sandbox_editor',
        actorName: 'Clara Holloway (Sample Editor)',
        action: 'Requested author revision',
        fromStatus: 'under_initial_review',
        toStatus: 'author_revision_required',
        details: 'Minor methodological clarifications requested before copyediting.',
        createdAt: '2026-10-28T09:45:00.000Z',
      },
      {
        id: 'hist_sample_author_3',
        manuscriptId: 'ms_sample_author_accepted',
        manuscriptAuthorId: 'sandbox_author',
        actorId: 'sandbox_author',
        actorName: 'Elena Rostova (Sample Author)',
        action: 'Approved final proof',
        fromStatus: 'awaiting_proof_approval',
        toStatus: 'approved_for_publication',
        details: 'Final formatted proof approved and queued for publication release.',
        createdAt: '2026-11-04T16:10:00.000Z',
      },
    ],
    reviews: [
      {
        id: 'rev_sandbox_editor_ms1',
        manuscriptId: 'ms_sample_author_review',
        manuscriptAuthorId: 'sandbox_author',
        reviewerId: 'sandbox_editor',
        reviewerName: 'Clara Holloway (Sample Editor)',
        reviewerAffiliation: 'Editorial Department',
        recommendation: 'minor_revision',
        rubricScores: {
          originality: 5,
          rigor: 4,
          clarity: 4,
          citations: 4,
        },
        overallScore: 4.3,
        summaryFeedback:
          'Strong archival synthesis of Northern European timber civic structures. Minor structural clarifications around regional zoning timelines will strengthen Chapter 3.',
        confidentialEditorNote:
          'Recommend inviting Dr. Adeyemi for comparative structural typology validation.',
        annotations: [
          {
            id: 'ann_seed_1',
            section: 'title_abstract',
            locationRef: 'Abstract p. 1',
            severity: 'commendation',
            comment: 'Concise framing of the civic timber commons thesis and geographic scope.',
          },
          {
            id: 'ann_seed_2',
            section: 'methodology',
            locationRef: 'Section 2.3',
            severity: 'minor_suggestion',
            comment: 'Clarify archival sampling criteria for post-1920 municipal guild ledgers.',
          },
        ],
        status: 'submitted',
        createdAt: '2026-10-25T10:15:00.000Z',
        updatedAt: '2026-10-25T10:15:00.000Z',
      },
    ],
    services: [...DEFAULT_SERVICES],
    quotations: [],
    journals: [...SAMPLE_JOURNALS],
    publications: [...SAMPLE_PUBLICATIONS],
    notifications: [],
    auditLogs: [
      {
        id: 'log_init_1',
        actorId: 'sandbox_admin',
        actorName: 'Arthur Pendelton (Sample Admin & Manager)',
        action: 'initialize_sandbox',
        targetType: 'settings',
        targetId: 'global',
        summary: 'Initialized Phase 1 evaluation sandbox with clearly labelled sample records.',
        createdAt: now,
      },
    ],
  };
}

function loadSandboxDb(): SandboxDatabase {
  if (!fs.existsSync(SANDBOX_DB_PATH)) {
    const initial = createInitialSandboxDb();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(SANDBOX_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as SandboxDatabase;
    let migrated = false;
    const defaults = createInitialSandboxDb();

    if (!Array.isArray(parsed.reviews)) {
      parsed.reviews = defaults.reviews;
      migrated = true;
    }
    if (!parsed.users.some((u) => u.uid === 'sandbox_reviewer')) {
      const reviewerUser = defaults.users.find((u) => u.uid === 'sandbox_reviewer');
      if (reviewerUser) {
        parsed.users.push(reviewerUser);
        migrated = true;
      }
    }
    const sampleMs = parsed.manuscripts.find((m) => m.id === 'ms_sample_author_review');
    if (sampleMs && !Array.isArray(sampleMs.assignedReviewerIds)) {
      sampleMs.assignedReviewerIds = ['sandbox_reviewer'];
      migrated = true;
    }
    if (migrated) {
      fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const initial = createInitialSandboxDb();
    fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveSandboxDb(dbState: SandboxDatabase): void {
  fs.writeFileSync(SANDBOX_DB_PATH, JSON.stringify(dbState, null, 2), 'utf-8');
}

function loadFirebaseConfig(): { projectId?: string; firestoreDatabaseId?: string } {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
    }
  } catch {
    // Ignore missing config
  }
  return {};
}

async function verifyFirestoreAccessWithUserToken(
  bearerToken: string,
  manuscriptId: string,
): Promise<{ ok: boolean; uid?: string }> {
  const cfg = loadFirebaseConfig();
  if (!cfg.projectId || !cfg.firestoreDatabaseId) {
    return { ok: false };
  }
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/manuscripts/${encodeURIComponent(manuscriptId)}`;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!resp.ok) return { ok: false };
    // Decode JWT sub claim safely just for attribution after Firestore verified the signature & rules
    const parts = bearerToken.split('.');
    let uid: string | undefined;
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
        user_id?: string;
        sub?: string;
      };
      uid = payload.user_id || payload.sub;
    }
    return { ok: true, uid };
  } catch {
    return { ok: false };
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // ---------------------------------------------------------------------------
  // Private File Upload & Authorized Download (Live Firebase + Sandbox)
  // ---------------------------------------------------------------------------
  app.post('/api/files/upload', upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;
    const manuscriptId = String(req.body?.manuscriptId || '').trim();
    if (!file || !manuscriptId || !/^[a-zA-Z0-9_-]{1,128}$/.test(manuscriptId)) {
      res.status(400).json({ error: 'Valid manuscriptId and file are required.' });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication token required for private manuscript upload.' });
      return;
    }

    const token = authHeader.slice(7);
    const access = await verifyFirestoreAccessWithUserToken(token, manuscriptId);
    if (!access.ok) {
      res.status(403).json({ error: 'Forbidden: You are not authorized to upload files to this manuscript.' });
      return;
    }

    const validation = validateFileUploadMeta({
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const storageKey = `${manuscriptId}__${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    fs.writeFileSync(path.join(PRIVATE_UPLOADS_DIR, storageKey), file.buffer);

    res.json({
      storageKey,
      sha256,
      sizeBytes: file.size,
      mimeType: file.mimetype || 'application/octet-stream',
      fileName: path.basename(file.originalname),
    });
  });

  app.get('/api/files/download/:manuscriptId/:storageKey', async (req: Request, res: Response) => {
    const manuscriptId = String(req.params.manuscriptId || '');
    const storageKey = path.basename(String(req.params.storageKey || ''));
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(manuscriptId) || !storageKey.startsWith(`${manuscriptId}__`)) {
      res.status(400).json({ error: 'Invalid file request.' });
      return;
    }

    const authHeader = req.headers.authorization;
    const sandboxUid = String(req.headers['x-sandbox-uid'] || req.query.sandboxUid || '');
    let authorized = false;

    if (authHeader?.startsWith('Bearer ')) {
      const check = await verifyFirestoreAccessWithUserToken(authHeader.slice(7), manuscriptId);
      authorized = check.ok;
    } else if (sandboxUid) {
      const dbState = loadSandboxDb();
      const actor = dbState.users.find((u) => u.uid === sandboxUid);
      const ms = dbState.manuscripts.find((m) => m.id === manuscriptId);
      if (actor && ms && canViewManuscript(actor, ms)) {
        authorized = true;
      }
    }

    if (!authorized) {
      res.status(403).json({ error: 'Forbidden: Private manuscript files require authorized access.' });
      return;
    }

    const fullPath = path.join(PRIVATE_UPLOADS_DIR, storageKey);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File version not found in private storage.' });
      return;
    }
    res.download(fullPath, storageKey.replace(`${manuscriptId}__`, 'manuscript_'));
  });

  // ---------------------------------------------------------------------------
  // Sandbox Demo Backend API (Persisted on disk with server-side RBAC)
  // ---------------------------------------------------------------------------
  const getSandboxActor = (req: Request): UserProfile | null => {
    const uid = String(req.headers['x-sandbox-uid'] || '');
    if (!uid) return null;
    const dbState = loadSandboxDb();
    return dbState.users.find((u) => u.uid === uid) || null;
  };

  const requireSandboxActor = (req: Request, res: Response): UserProfile | null => {
    const actor = getSandboxActor(req);
    if (!actor) {
      res.status(401).json({ error: 'Authentication required.' });
      return null;
    }
    if (actor.accountStatus === 'suspended') {
      res.status(403).json({ error: 'Account is suspended.' });
      return null;
    }
    return actor;
  };

  app.get('/api/sandbox/settings', (_req, res) => {
    res.json(loadSandboxDb().settings);
  });

  app.put('/api/sandbox/settings', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Platform Admin role required.' });
      return;
    }
    const dbState = loadSandboxDb();
    dbState.settings = {
      ...dbState.settings,
      ...req.body,
      id: 'global',
      updatedAt: new Date().toISOString(),
    };
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'update_settings',
      targetType: 'settings',
      targetId: 'global',
      summary: `Updated platform settings (${dbState.settings.platformName})`,
      createdAt: new Date().toISOString(),
    });
    saveSandboxDb(dbState);
    res.json(dbState.settings);
  });

  app.get('/api/sandbox/publications/public', (_req, res) => {
    const dbState = loadSandboxDb();
    res.json(dbState.publications.filter((p) => p.releaseStatus === 'published'));
  });

  app.get('/api/sandbox/publications/:id', (req, res) => {
    const dbState = loadSandboxDb();
    const pub = dbState.publications.find((p) => p.id === req.params.id);
    if (!pub) {
      res.status(404).json({ error: 'Publication not found.' });
      return;
    }
    if (pub.releaseStatus !== 'published') {
      const actor = getSandboxActor(req);
      if (!actor || (!canReleasePublication(actor) && actor.uid !== pub.authorId)) {
        res.status(403).json({ error: 'Unpublished records are not publicly accessible.' });
        return;
      }
    }
    res.json(pub);
  });

  app.get('/api/sandbox/publications', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canReleasePublication(actor) && !canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Publishing Manager permissions required.' });
      return;
    }
    res.json(loadSandboxDb().publications);
  });

  app.post('/api/sandbox/publications', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canReleasePublication(actor)) {
      res.status(403).json({ error: 'Forbidden: Only Publishing Managers or Admins can release publications.' });
      return;
    }
    const dbState = loadSandboxDb();
    const input = req.body as Partial<PublicationRecord> & { title: string };
    const now = new Date().toISOString();
    const id = input.id || createId('pub');
    const idx = dbState.publications.findIndex((p) => p.id === id);
    const existing = idx >= 0 ? dbState.publications[idx] : undefined;
    const releaseStatus = input.releaseStatus || 'approved';

    const record: PublicationRecord = {
      id,
      manuscriptId: input.manuscriptId ?? existing?.manuscriptId,
      authorId: input.authorId ?? existing?.authorId ?? actor.uid,
      authorName: input.authorName ?? existing?.authorName ?? actor.displayName,
      title: input.title,
      subtitle: input.subtitle ?? existing?.subtitle ?? '',
      abstract: input.abstract ?? existing?.abstract ?? '',
      publicationType: input.publicationType ?? existing?.publicationType ?? 'book',
      category: input.category ?? existing?.category ?? 'General',
      format: input.format ?? existing?.format ?? 'digital',
      accessType: input.accessType ?? existing?.accessType ?? 'free',
      price: Number(input.price ?? existing?.price ?? 0),
      currency: input.currency ?? existing?.currency ?? 'USD',
      isbn: input.isbn ?? existing?.isbn ?? '',
      issn: input.issn ?? existing?.issn ?? '',
      doi: input.doi ?? existing?.doi ?? '',
      identifierStatus: input.identifierStatus ?? existing?.identifierStatus ?? 'unassigned',
      coverUrl: input.coverUrl ?? existing?.coverUrl ?? ASSET_FALLBACK_COVER,
      excerpt: input.excerpt ?? existing?.excerpt ?? '',
      releaseStatus,
      isSample: input.isSample ?? existing?.isSample ?? false,
      publishedAt: releaseStatus === 'published' ? existing?.publishedAt || now : existing?.publishedAt,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (idx >= 0) dbState.publications[idx] = record;
    else dbState.publications.unshift(record);

    if (record.manuscriptId && releaseStatus === 'published') {
      const msIdx = dbState.manuscripts.findIndex((m) => m.id === record.manuscriptId);
      if (msIdx >= 0) {
        dbState.manuscripts[msIdx].status = 'published';
        dbState.manuscripts[msIdx].updatedAt = now;
      }
    }

    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: releaseStatus === 'published' ? 'release_publication' : 'save_publication',
      targetType: 'publications',
      targetId: id,
      summary: `${releaseStatus === 'published' ? 'Released' : 'Updated'} publication "${record.title}"`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(record);
  });

  app.get('/api/sandbox/services', (_req, res) => {
    res.json(loadSandboxDb().services);
  });

  app.post('/api/sandbox/services', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Only administrators can create or edit services.' });
      return;
    }
    const dbState = loadSandboxDb();
    const input = req.body as Partial<PublishingService> & { name: string };
    const now = new Date().toISOString();
    const id = input.id || createId('srv');
    const idx = dbState.services.findIndex((s) => s.id === id);
    const existing = idx >= 0 ? dbState.services[idx] : undefined;
    const saved: PublishingService = {
      id,
      name: input.name.trim(),
      description: input.description || existing?.description || 'Professional publishing service.',
      category: input.category || existing?.category || 'Manuscript Evaluation',
      pricingMethod: input.pricingMethod || existing?.pricingMethod || 'flat_fee',
      basePrice: Number(input.basePrice ?? existing?.basePrice ?? 0),
      currency: input.currency || existing?.currency || 'USD',
      estimatedTurnaround: input.estimatedTurnaround ?? existing?.estimatedTurnaround ?? '7-10 business days',
      requirements: input.requirements ?? existing?.requirements ?? '',
      active: input.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    if (idx >= 0) dbState.services[idx] = saved;
    else dbState.services.push(saved);

    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: idx >= 0 ? 'update_service' : 'create_service',
      targetType: 'services',
      targetId: id,
      summary: `${idx >= 0 ? 'Updated' : 'Created'} publishing service "${saved.name}"`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(saved);
  });

  app.get('/api/sandbox/journals', (_req, res) => {
    res.json(loadSandboxDb().journals.filter((j) => j.active));
  });

  app.post('/api/sandbox/journals', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Admin permissions required.' });
      return;
    }
    const dbState = loadSandboxDb();
    const input = req.body as Partial<AcademicJournal> & { title: string };
    const now = new Date().toISOString();
    const id = input.id || createId('jrn');
    const idx = dbState.journals.findIndex((j) => j.id === id);
    const existing = idx >= 0 ? dbState.journals[idx] : undefined;
    const saved: AcademicJournal = {
      id,
      title: input.title,
      issn: input.issn ?? existing?.issn ?? '',
      identifierStatus: input.identifierStatus ?? existing?.identifierStatus ?? 'unassigned',
      description: input.description ?? existing?.description ?? '',
      discipline: input.discipline || existing?.discipline || 'Interdisciplinary',
      reviewModel: input.reviewModel || existing?.reviewModel || 'double_anonymous',
      editorInChief: input.editorInChief ?? existing?.editorInChief ?? '',
      sections: input.sections ?? existing?.sections ?? ['Research Articles'],
      active: input.active ?? existing?.active ?? true,
      isSample: input.isSample ?? existing?.isSample ?? false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    if (idx >= 0) dbState.journals[idx] = saved;
    else dbState.journals.push(saved);
    saveSandboxDb(dbState);
    res.json(saved);
  });

  app.get('/api/sandbox/authors/public', (_req, res) => {
    res.json(loadSandboxDb().publicProfiles);
  });

  app.get('/api/sandbox/users', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor) && !canAccessEditorialWorkspace(actor)) {
      res.status(403).json({ error: 'Forbidden: Admin or editorial staff access required.' });
      return;
    }
    res.json(loadSandboxDb().users);
  });

  app.get('/api/sandbox/users/:uid', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (actor.uid !== req.params.uid && !canAccessAdminConsole(actor) && !canAccessEditorialWorkspace(actor)) {
      res.status(403).json({ error: 'Forbidden: Cannot view another user profile.' });
      return;
    }
    const user = loadSandboxDb().users.find((u) => u.uid === req.params.uid);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json(user);
  });

  app.put('/api/sandbox/users/:uid', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (actor.uid !== req.params.uid && !canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Cannot modify another user profile.' });
      return;
    }
    const dbState = loadSandboxDb();
    const idx = dbState.users.findIndex((u) => u.uid === req.params.uid);
    const now = new Date().toISOString();
    const incoming = req.body as Partial<UserProfile>;
    if (idx < 0) {
      // Public self-registration cannot assign privileged roles
      const newProfile: UserProfile = {
        uid: req.params.uid,
        email: incoming.email || `${req.params.uid}@example.com`,
        displayName: incoming.displayName || 'Registered Author',
        roles: ['author'],
        accountStatus: 'active',
        affiliation: incoming.affiliation || '',
        orcid: incoming.orcid || '',
        bio: incoming.bio || '',
        country: incoming.country || '',
        createdAt: now,
        updatedAt: now,
      };
      dbState.users.push(newProfile);
      dbState.publicProfiles.push({
        uid: newProfile.uid,
        displayName: newProfile.displayName,
        affiliation: newProfile.affiliation,
        bio: newProfile.bio,
        orcid: newProfile.orcid,
        isSample: true,
        updatedAt: now,
      });
      saveSandboxDb(dbState);
      res.json(newProfile);
      return;
    }

    const existing = dbState.users[idx];
    const updated: UserProfile = {
      ...existing,
      displayName: incoming.displayName ?? existing.displayName,
      affiliation: incoming.affiliation ?? existing.affiliation,
      orcid: incoming.orcid ?? existing.orcid,
      bio: incoming.bio ?? existing.bio,
      country: incoming.country ?? existing.country,
      updatedAt: now,
    };
    dbState.users[idx] = updated;
    const pubIdx = dbState.publicProfiles.findIndex((p) => p.uid === updated.uid);
    const pubEntry: PublicAuthorProfile = {
      uid: updated.uid,
      displayName: updated.displayName,
      affiliation: updated.affiliation,
      bio: updated.bio,
      orcid: updated.orcid,
      isSample: true,
      updatedAt: now,
    };
    if (pubIdx >= 0) dbState.publicProfiles[pubIdx] = pubEntry;
    else dbState.publicProfiles.push(pubEntry);

    saveSandboxDb(dbState);
    res.json(updated);
  });

  app.patch('/api/sandbox/users/:uid/roles', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Only administrators can assign roles.' });
      return;
    }
    const dbState = loadSandboxDb();
    const idx = dbState.users.findIndex((u) => u.uid === req.params.uid);
    if (idx < 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const now = new Date().toISOString();
    const updates = req.body as Pick<UserProfile, 'roles' | 'accountStatus'>;
    dbState.users[idx] = {
      ...dbState.users[idx],
      roles: updates.roles,
      accountStatus: updates.accountStatus,
      updatedAt: now,
    };
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'update_user_roles',
      targetType: 'users',
      targetId: req.params.uid,
      summary: `Updated roles for ${dbState.users[idx].displayName} to [${updates.roles.join(', ')}]`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(dbState.users[idx]);
  });

  app.get('/api/sandbox/manuscripts', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const list = canAccessEditorialWorkspace(actor)
      ? dbState.manuscripts
      : dbState.manuscripts.filter((m) => canViewManuscript(actor, m));
    res.json([...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  });

  app.get('/api/sandbox/manuscripts/:id', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms) {
      res.status(404).json({ error: 'Manuscript not found.' });
      return;
    }
    if (!canViewManuscript(actor, ms)) {
      res.status(403).json({ error: 'Forbidden: You are not authorized to access this manuscript.' });
      return;
    }
    res.json(ms);
  });

  app.post('/api/sandbox/manuscripts', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const { manuscript, actionLabel } = req.body as { manuscript: Manuscript; actionLabel: string };
    const now = new Date().toISOString();
    const id = manuscript.id || createId('ms');
    const idx = dbState.manuscripts.findIndex((m) => m.id === id);

    if (idx >= 0) {
      const existing = dbState.manuscripts[idx];
      if (!canViewManuscript(actor, existing)) {
        res.status(403).json({ error: 'Forbidden: Cannot edit another author manuscript.' });
        return;
      }
      if (!canAccessEditorialWorkspace(actor) && !['draft', 'submitted', 'author_revision_required'].includes(existing.status)) {
        res.status(403).json({ error: 'Manuscript cannot be edited in its current editorial stage.' });
        return;
      }
      const nextStatus = canAccessEditorialWorkspace(actor)
        ? manuscript.status
        : manuscript.status === 'submitted' || manuscript.status === 'draft'
          ? manuscript.status
          : existing.status;

      const updated: Manuscript = {
        ...existing,
        ...manuscript,
        id,
        authorId: existing.authorId,
        referenceNumber: existing.referenceNumber,
        status: nextStatus,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      dbState.manuscripts[idx] = updated;
      dbState.history.unshift({
        id: createId('hist'),
        manuscriptId: id,
        manuscriptAuthorId: existing.authorId,
        actorId: actor.uid,
        actorName: actor.displayName,
        action: actionLabel || 'Updated manuscript',
        fromStatus: existing.status,
        toStatus: updated.status,
        details: `${actionLabel} (${updated.referenceNumber})`,
        createdAt: now,
      });
      saveSandboxDb(dbState);
      res.json(updated);
      return;
    }

    const safeStatus = manuscript.status === 'submitted' ? 'submitted' : 'draft';
    const created: Manuscript = {
      ...manuscript,
      id,
      authorId: actor.uid,
      authorName: manuscript.authorName || actor.displayName,
      status: safeStatus,
      isSample: true,
      createdAt: now,
      updatedAt: now,
    };
    dbState.manuscripts.unshift(created);
    dbState.history.unshift({
      id: createId('hist'),
      manuscriptId: id,
      manuscriptAuthorId: actor.uid,
      actorId: actor.uid,
      actorName: actor.displayName,
      action: actionLabel || (safeStatus === 'submitted' ? 'Submitted manuscript' : 'Saved draft'),
      fromStatus: '',
      toStatus: safeStatus,
      details: `${created.referenceNumber} — ${created.title}`,
      createdAt: now,
    });
    if (safeStatus === 'submitted') {
      dbState.notifications.unshift({
        id: createId('ntf'),
        userId: 'sandbox_editor',
        title: `New submission ${created.referenceNumber}`,
        message: `${actor.displayName} submitted "${created.title}" for editorial review.`,
        link: `/editorial/manuscripts/${id}`,
        read: false,
        createdAt: now,
      });
    }
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: actionLabel || 'create_manuscript',
      targetType: 'manuscripts',
      targetId: id,
      summary: `Created manuscript ${created.referenceNumber} (${safeStatus})`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(created);
  });

  app.get('/api/sandbox/manuscripts/:id/versions', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || !canViewManuscript(actor, ms)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const versions = dbState.versions
      .filter((v) => v.manuscriptId === req.params.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    res.json(versions);
  });

  app.post('/api/sandbox/files/upload', upload.single('file'), (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const file = req.file;
    const manuscriptId = String(req.body?.manuscriptId || '').trim();
    const notes = String(req.body?.notes || '').trim();

    if (!file || !manuscriptId) {
      res.status(400).json({ error: 'Manuscript ID and document file are required.' });
      return;
    }

    const dbState = loadSandboxDb();
    const msIdx = dbState.manuscripts.findIndex((m) => m.id === manuscriptId);
    if (msIdx < 0) {
      res.status(404).json({ error: 'Manuscript not found.' });
      return;
    }
    const ms = dbState.manuscripts[msIdx];
    if (ms.authorId !== actor.uid && !canAccessEditorialWorkspace(actor)) {
      res.status(403).json({ error: 'Forbidden: Only the owning author or editorial staff can upload versions.' });
      return;
    }

    const validation = validateFileUploadMeta({
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const storageKey = `${manuscriptId}__${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    fs.writeFileSync(path.join(PRIVATE_UPLOADS_DIR, storageKey), file.buffer);

    const existingVersions = dbState.versions.filter((v) => v.manuscriptId === manuscriptId);
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
      : 1;
    const now = new Date().toISOString();

    const versionRecord: ManuscriptVersion = {
      id: createId('ver'),
      manuscriptId,
      manuscriptAuthorId: ms.authorId,
      versionNumber: nextVersion,
      fileName: path.basename(file.originalname),
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
      storageKey,
      sha256,
      uploadedBy: actor.uid,
      uploadedByName: actor.displayName,
      notes,
      createdAt: now,
    };

    dbState.versions.unshift(versionRecord);
    dbState.manuscripts[msIdx].currentVersionNumber = nextVersion;
    dbState.manuscripts[msIdx].updatedAt = now;
    dbState.history.unshift({
      id: createId('hist'),
      manuscriptId,
      manuscriptAuthorId: ms.authorId,
      actorId: actor.uid,
      actorName: actor.displayName,
      action: `Uploaded document version v${nextVersion}`,
      details: `${versionRecord.fileName}${notes ? ` — ${notes}` : ''}`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(versionRecord);
  });

  app.get('/api/sandbox/manuscripts/:id/comments', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || (!canAccessEditorialWorkspace(actor) && ms.authorId !== actor.uid)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const comments = dbState.comments
      .filter((c) => c.manuscriptId === req.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(filterVisibleComments(actor, comments));
  });

  app.post('/api/sandbox/manuscripts/:id/comments', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || (!canAccessEditorialWorkspace(actor) && ms.authorId !== actor.uid)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const input = req.body as Omit<EditorialComment, 'id' | 'createdAt'>;
    const now = new Date().toISOString();
    const visibility = canAccessEditorialWorkspace(actor) ? input.visibility : 'author_visible';
    const created: EditorialComment = {
      id: createId('cmt'),
      manuscriptId: ms.id,
      manuscriptAuthorId: ms.authorId,
      authorId: actor.uid,
      authorName: actor.displayName,
      authorRole: actor.roles[0] || 'author',
      visibility,
      commentType: input.commentType || 'assessment',
      body: input.body,
      createdAt: now,
    };
    dbState.comments.unshift(created);
    if (visibility === 'author_visible' && actor.uid !== ms.authorId) {
      dbState.notifications.unshift({
        id: createId('ntf'),
        userId: ms.authorId,
        title: `Editorial feedback on ${ms.referenceNumber}`,
        message: `${actor.displayName} posted feedback on "${ms.title}".`,
        link: `/dashboard/manuscripts/${ms.id}`,
        read: false,
        createdAt: now,
      });
    }
    saveSandboxDb(dbState);
    res.json(created);
  });

  app.get('/api/sandbox/manuscripts/:id/history', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || (!canAccessEditorialWorkspace(actor) && ms.authorId !== actor.uid)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    res.json(
      dbState.history
        .filter((h) => h.manuscriptId === req.params.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  });

  app.post('/api/sandbox/manuscripts/:id/transition', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const idx = dbState.manuscripts.findIndex((m) => m.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Manuscript not found.' });
      return;
    }
    const ms = dbState.manuscripts[idx];
    const { nextStatus, note } = req.body as { nextStatus: Manuscript['status']; note: string };
    const check = canTransitionStatus(ms.status, nextStatus, ms.publicationType, actor, ms.authorId);
    if (!check.allowed) {
      res.status(403).json({ error: check.reason || 'Transition not permitted.' });
      return;
    }

    const now = new Date().toISOString();
    const prev = ms.status;
    dbState.manuscripts[idx] = { ...ms, status: nextStatus, updatedAt: now };
    dbState.history.unshift({
      id: createId('hist'),
      manuscriptId: ms.id,
      manuscriptAuthorId: ms.authorId,
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'Status transition',
      fromStatus: prev,
      toStatus: nextStatus,
      details: note || `Moved from ${prev} to ${nextStatus}`,
      createdAt: now,
    });
    if (actor.uid !== ms.authorId) {
      dbState.notifications.unshift({
        id: createId('ntf'),
        userId: ms.authorId,
        title: `Manuscript ${ms.referenceNumber} updated`,
        message: `Status changed to "${nextStatus.replace(/_/g, ' ')}".${note ? ` ${note}` : ''}`,
        link: `/dashboard/manuscripts/${ms.id}`,
        read: false,
        createdAt: now,
      });
    }
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'transition_status',
      targetType: 'manuscripts',
      targetId: ms.id,
      summary: `${ms.referenceNumber}: ${prev} -> ${nextStatus}`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(dbState.manuscripts[idx]);
  });

  app.post('/api/sandbox/manuscripts/:id/assign-editor', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessEditorialWorkspace(actor)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const dbState = loadSandboxDb();
    const idx = dbState.manuscripts.findIndex((m) => m.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Manuscript not found.' });
      return;
    }
    const { editorId, editorName } = req.body as { editorId: string; editorName: string };
    const now = new Date().toISOString();
    dbState.manuscripts[idx] = {
      ...dbState.manuscripts[idx],
      assignedEditorId: editorId,
      assignedEditorName: editorName,
      updatedAt: now,
    };
    dbState.history.unshift({
      id: createId('hist'),
      manuscriptId: dbState.manuscripts[idx].id,
      manuscriptAuthorId: dbState.manuscripts[idx].authorId,
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'Editor assigned',
      details: `Assigned ${editorName} as handling editor.`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(dbState.manuscripts[idx]);
  });

  app.get('/api/sandbox/reviewers', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canManageReviewers(actor)) {
      res.status(403).json({ error: 'Forbidden: Editorial permissions required.' });
      return;
    }
    const activeUsers = loadSandboxDb().users
      .filter((u) => u.accountStatus === 'active')
      .sort((a, b) => {
        const aRev = a.roles.includes('reviewer') ? 0 : 1;
        const bRev = b.roles.includes('reviewer') ? 0 : 1;
        if (aRev !== bRev) return aRev - bRev;
        return a.displayName.localeCompare(b.displayName);
      });
    res.json(activeUsers);
  });

  app.post('/api/sandbox/manuscripts/:id/assign-reviewers', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canManageReviewers(actor)) {
      res.status(403).json({ error: 'Forbidden: Editorial permissions required.' });
      return;
    }
    const dbState = loadSandboxDb();
    const idx = dbState.manuscripts.findIndex((m) => m.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Manuscript not found.' });
      return;
    }
    const ms = dbState.manuscripts[idx];
    const incomingIds = Array.isArray((req.body as { reviewerIds?: unknown })?.reviewerIds)
      ? ((req.body as { reviewerIds: unknown[] }).reviewerIds).filter((v): v is string => typeof v === 'string')
      : [];
    const cleanIds = Array.from(
      new Set(incomingIds.map((id) => id.trim()).filter((id) => id.length > 0 && id !== ms.authorId)),
    ).slice(0, 15);
    const previous = new Set(ms.assignedReviewerIds || []);
    const newlyAdded = cleanIds.filter((id) => !previous.has(id));
    const now = new Date().toISOString();

    dbState.manuscripts[idx] = {
      ...ms,
      assignedReviewerIds: cleanIds,
      updatedAt: now,
    };
    dbState.history.unshift({
      id: createId('hist'),
      manuscriptId: ms.id,
      manuscriptAuthorId: ms.authorId,
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'Peer reviewers updated',
      details: `Assigned ${cleanIds.length} peer reviewer${cleanIds.length === 1 ? '' : 's'}.`,
      createdAt: now,
    });
    for (const reviewerId of newlyAdded) {
      dbState.notifications.unshift({
        id: createId('ntf'),
        userId: reviewerId,
        title: `Peer review assignment: ${ms.referenceNumber}`,
        message: `${actor.displayName} assigned you to peer review "${ms.title}".`,
        link: `/editorial/manuscripts/${ms.id}`,
        read: false,
        createdAt: now,
      });
    }
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'assign_reviewers',
      targetType: 'manuscripts',
      targetId: ms.id,
      summary: `Updated assigned reviewers (${cleanIds.length}) for ${ms.referenceNumber}`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(dbState.manuscripts[idx]);
  });

  app.get('/api/sandbox/manuscripts/:id/reviews', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || !canViewManuscript(actor, ms) || !canAccessPeerReviewWorkspace(actor)) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const visible = filterVisiblePeerReviews(
      actor,
      dbState.reviews.filter((r) => r.manuscriptId === ms.id),
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    res.json(visible);
  });

  app.post('/api/sandbox/manuscripts/:id/reviews', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const ms = dbState.manuscripts.find((m) => m.id === req.params.id);
    if (!ms || !canSubmitPeerReview(actor, ms)) {
      res.status(403).json({ error: 'Forbidden: Only assigned reviewers or editorial staff can submit peer reviews.' });
      return;
    }

    const body = req.body as Partial<PeerReview>;
    const normalizedScores = {
      originality: clampRubricScore(Number(body.rubricScores?.originality ?? 3)),
      rigor: clampRubricScore(Number(body.rubricScores?.rigor ?? 3)),
      clarity: clampRubricScore(Number(body.rubricScores?.clarity ?? 3)),
      citations: clampRubricScore(Number(body.rubricScores?.citations ?? 3)),
    };
    const annotations: PeerReviewAnnotation[] = Array.isArray(body.annotations)
      ? body.annotations.slice(0, 30).map((ann, idx) => ({
          id: String(ann.id || `ann_${idx + 1}`).slice(0, 128),
          section: ann.section,
          locationRef: String(ann.locationRef || '').trim().slice(0, 120),
          severity: ann.severity,
          comment: String(ann.comment || '').trim().slice(0, 1500),
        }))
      : [];
    const status = body.status === 'submitted' ? 'submitted' : 'draft';
    const summaryFeedback = String(body.summaryFeedback || '').trim().slice(0, 5000);
    const confidentialEditorNote = String(body.confidentialEditorNote || '').trim().slice(0, 2000);

    const validation = validatePeerReviewInput({
      rubricScores: normalizedScores,
      summaryFeedback,
      annotations,
      status,
    });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Invalid peer review submission.' });
      return;
    }

    const now = new Date().toISOString();
    const targetId = (typeof body.id === 'string' && body.id.trim()) || `rev_${actor.uid}_${ms.id}`;
    const existingIdx = dbState.reviews.findIndex(
      (r) =>
        r.manuscriptId === ms.id &&
        (r.id === targetId || r.reviewerId === actor.uid),
    );
    const overallScore = calculateOverallScore(normalizedScores);
    const saved: PeerReview = {
      id: existingIdx >= 0 ? dbState.reviews[existingIdx].id : targetId,
      manuscriptId: ms.id,
      manuscriptAuthorId: ms.authorId,
      reviewerId: actor.uid,
      reviewerName: actor.displayName,
      reviewerAffiliation: actor.affiliation || '',
      recommendation: body.recommendation || 'minor_revision',
      rubricScores: normalizedScores,
      overallScore,
      summaryFeedback,
      confidentialEditorNote,
      annotations,
      status,
      createdAt: existingIdx >= 0 ? dbState.reviews[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) dbState.reviews[existingIdx] = saved;
    else dbState.reviews.unshift(saved);

    if (status === 'submitted') {
      dbState.history.unshift({
        id: createId('hist'),
        manuscriptId: ms.id,
        manuscriptAuthorId: ms.authorId,
        actorId: actor.uid,
        actorName: actor.displayName,
        action: 'Submitted peer review',
        details: `Rubric score ${overallScore.toFixed(1)}/5 (${saved.recommendation.replace(/_/g, ' ')}) with ${annotations.length} section annotation${annotations.length === 1 ? '' : 's'}.`,
        createdAt: now,
      });
      if (ms.assignedEditorId && ms.assignedEditorId !== actor.uid) {
        dbState.notifications.unshift({
          id: createId('ntf'),
          userId: ms.assignedEditorId,
          title: `Peer review submitted: ${ms.referenceNumber}`,
          message: `${actor.displayName} submitted a peer review (${overallScore.toFixed(1)}/5) on "${ms.title}".`,
          link: `/editorial/manuscripts/${ms.id}`,
          read: false,
          createdAt: now,
        });
      }
    }

    saveSandboxDb(dbState);
    res.json(saved);
  });

  app.get('/api/sandbox/quotations', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const list = canAccessEditorialWorkspace(actor) || canAccessAdminConsole(actor)
      ? dbState.quotations
      : dbState.quotations.filter((q) => q.authorId === actor.uid);
    res.json(list);
  });

  app.post('/api/sandbox/quotations', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const { manuscriptId, manuscriptTitle, serviceIds, notes, estimatedAmount, currency } = req.body as {
      manuscriptId: string;
      manuscriptTitle: string;
      serviceIds: string[];
      notes: string;
      estimatedAmount: number;
      currency: string;
    };
    const ms = dbState.manuscripts.find((m) => m.id === manuscriptId);
    if (!ms || ms.authorId !== actor.uid) {
      res.status(403).json({ error: 'You can only request quotations for your own manuscripts.' });
      return;
    }
    const now = new Date().toISOString();
    const created: ServiceQuotation = {
      id: createId('qt'),
      manuscriptId,
      manuscriptTitle: manuscriptTitle || ms.title,
      authorId: actor.uid,
      serviceIds,
      notes,
      status: 'requested',
      estimatedAmount,
      currency: currency || 'USD',
      createdAt: now,
      updatedAt: now,
    };
    dbState.quotations.unshift(created);
    dbState.auditLogs.unshift({
      id: createId('log'),
      actorId: actor.uid,
      actorName: actor.displayName,
      action: 'request_quotation',
      targetType: 'quotations',
      targetId: created.id,
      summary: `Requested service quotation for ${ms.referenceNumber}`,
      createdAt: now,
    });
    saveSandboxDb(dbState);
    res.json(created);
  });

  app.patch('/api/sandbox/quotations/:id', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const idx = dbState.quotations.findIndex((q) => q.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    const qt = dbState.quotations[idx];
    if (!canAccessAdminConsole(actor) && !canAccessEditorialWorkspace(actor) && qt.authorId !== actor.uid) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const now = new Date().toISOString();
    dbState.quotations[idx] = {
      ...qt,
      ...req.body,
      updatedAt: now,
    };
    saveSandboxDb(dbState);
    res.json(dbState.quotations[idx]);
  });

  app.get('/api/sandbox/notifications', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    res.json(loadSandboxDb().notifications.filter((n) => n.userId === actor.uid));
  });

  app.patch('/api/sandbox/notifications/:id/read', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    const dbState = loadSandboxDb();
    const idx = dbState.notifications.findIndex((n) => n.id === req.params.id && n.userId === actor.uid);
    if (idx >= 0) {
      dbState.notifications[idx].read = true;
      saveSandboxDb(dbState);
    }
    res.json({ ok: true });
  });

  app.get('/api/sandbox/audit-logs', (req, res) => {
    const actor = requireSandboxActor(req, res);
    if (!actor) return;
    if (!canAccessAdminConsole(actor)) {
      res.status(403).json({ error: 'Forbidden: Admin permissions required.' });
      return;
    }
    res.json(loadSandboxDb().auditLogs);
  });

  // Contact Inquiry Endpoint
  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }
    const existing = fs.existsSync(CONTACT_LOG_PATH)
      ? (JSON.parse(fs.readFileSync(CONTACT_LOG_PATH, 'utf-8')) as unknown[])
      : [];
    existing.unshift({
      id: createId('inq'),
      name: name.trim(),
      email: email.trim(),
      subject: (subject || 'General Inquiry').trim(),
      message: message.trim(),
      receivedAt: new Date().toISOString(),
    });
    fs.writeFileSync(CONTACT_LOG_PATH, JSON.stringify(existing, null, 2), 'utf-8');
    res.json({ ok: true, message: 'Inquiry recorded. Editorial support will respond to your email.' });
  });

  // Optional Server-Side Gemini Assistance Boundary (Advisory only)
  app.post('/api/ai/assist', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'Optional Gemini drafting assistance is not configured (GEMINI_API_KEY missing). Core workflows operate normally without AI.',
      });
      return;
    }
    const { task, content } = req.body as { task?: string; content?: string };
    if (!content?.trim()) {
      res.status(400).json({ error: 'Input text is required for drafting assistance.' });
      return;
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an editorial assistant helping an author refine metadata. Task: ${task || 'suggest keywords and polish abstract'}. Provide concise, clearly advisory suggestions without fabricating citations, DOIs, or peer-review decisions.\n\nText:\n${content.slice(0, 4000)}`,
      });
      res.json({
        advisory: true,
        disclaimer: 'AI-generated drafting suggestion for author/editor review only.',
        suggestion: response.text || '',
      });
    } catch {
      res.status(500).json({ error: 'AI assistance request could not be completed.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Griots Books server running on http://0.0.0.0:${PORT}`);
  });
}

const ASSET_FALLBACK_COVER = '/src/assets/images/cover_sample_monograph_1795006816253.jpg';

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
