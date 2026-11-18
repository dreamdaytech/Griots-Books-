import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Plus, Trash2, Upload } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { DEFAULT_SERVICES, SAMPLE_JOURNALS } from '../../data/seedData';
import type {
  AcademicJournal,
  CoauthorInfo,
  Manuscript,
  PublicationPreference,
  PublicationType,
  PublishingService,
} from '../../domain/types';
import {
  ACADEMIC_PUBLICATION_TYPES,
  calculateQuotationEstimate,
  generateReferenceNumber,
  PUBLICATION_TYPE_LABELS,
  validateFileUploadMeta,
} from '../../domain/workflow';

const STEPS = [
  '1. Publication Type',
  '2. Publication Info',
  '3. Manuscript Upload',
  '4. Publishing Services',
  '5. Publication Format',
  '6. Review & Submit',
];

export function SubmissionWizardPage() {
  const { user, repo, getIdToken } = useAuth();
  const { notify } = usePlatform();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialType = (searchParams.get('type') as PublicationType) || 'book';
  const draftId = searchParams.get('draftId');

  const [step, setStep] = useState(0);
  const [manuscriptId, setManuscriptId] = useState<string>(() => draftId || `ms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const [referenceNumber, setReferenceNumber] = useState<string>(() => generateReferenceNumber());

  const [publicationType, setPublicationType] = useState<PublicationType>(initialType);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [category, setCategory] = useState('Humanities & Social Sciences');
  const [discipline, setDiscipline] = useState('');
  const [language, setLanguage] = useState('English');
  const [keywordsText, setKeywordsText] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [wordCount, setWordCount] = useState<number>(15000);
  const [pageCount, setPageCount] = useState<number>(60);
  const [objectives, setObjectives] = useState('');
  const [coauthors, setCoauthors] = useState<CoauthorInfo[]>([]);

  // Academic fields
  const [journalId, setJournalId] = useState('');
  const [ethicsDeclaration, setEthicsDeclaration] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState('');
  const [fundingInfo, setFundingInfo] = useState('');
  const [dataAvailability, setDataAvailability] = useState('');

  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileNotes, setFileNotes] = useState('Initial submission manuscript file');
  const [uploadedVersionCount, setUploadedVersionCount] = useState(0);

  // Services & preference
  const [services, setServices] = useState<PublishingService[]>(DEFAULT_SERVICES);
  const [journals, setJournals] = useState<AcademicJournal[]>(SAMPLE_JOURNALS);
  const [selectedServices, setSelectedServices] = useState<string[]>(['srv_eval']);
  const [publicationPreference, setPublicationPreference] = useState<PublicationPreference>('both');
  const [declarationsAccepted, setDeclarationsAccepted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    repo.listActiveServices().then(setServices).catch(() => {});
    repo.listJournals().then(setJournals).catch(() => {});
  }, [repo]);

  useEffect(() => {
    if (!draftId || !user) return;
    repo
      .getManuscriptById(draftId, user)
      .then((ms) => {
        if (!ms) return;
        setManuscriptId(ms.id);
        setReferenceNumber(ms.referenceNumber);
        setPublicationType(ms.publicationType);
        setTitle(ms.title);
        setSubtitle(ms.subtitle || '');
        setAbstract(ms.abstract || '');
        setCategory(ms.category || '');
        setDiscipline(ms.discipline || '');
        setLanguage(ms.language || 'English');
        setKeywordsText((ms.keywords || []).join(', '));
        setTargetAudience(ms.targetAudience || '');
        setAffiliation(ms.affiliation || '');
        setWordCount(ms.wordCount || 0);
        setPageCount(ms.pageCount || 0);
        setObjectives(ms.objectives || '');
        setCoauthors(ms.coauthors || []);
        setJournalId(ms.journalId || '');
        setEthicsDeclaration(ms.ethicsDeclaration || '');
        setConflictOfInterest(ms.conflictOfInterest || '');
        setFundingInfo(ms.fundingInfo || '');
        setDataAvailability(ms.dataAvailability || '');
        setSelectedServices(ms.requestedServices || []);
        setPublicationPreference(ms.publicationPreference || 'both');
        setDeclarationsAccepted(ms.declarationsAccepted);
        setUploadedVersionCount(ms.currentVersionNumber);
      })
      .catch(() => {});
  }, [draftId, repo, user]);

  const isAcademic = ACADEMIC_PUBLICATION_TYPES.includes(publicationType);

  const estimate = useMemo(() => {
    const chosen = services.filter((s) => selectedServices.includes(s.id));
    return calculateQuotationEstimate(chosen, wordCount, pageCount);
  }, [pageCount, selectedServices, services, wordCount]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFileUploadMeta({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file.');
      setSelectedFile(null);
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
  };

  const buildManuscriptRecord = (status: 'draft' | 'submitted'): Manuscript => {
    const now = new Date().toISOString();
    return {
      id: manuscriptId,
      referenceNumber,
      authorId: user!.uid,
      authorName: user!.displayName,
      title: title.trim() || 'Untitled Manuscript Draft',
      subtitle: subtitle.trim(),
      abstract: abstract.trim(),
      publicationType,
      category: category.trim(),
      discipline: discipline.trim(),
      language: language.trim() || 'English',
      keywords: keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 20),
      targetAudience: targetAudience.trim(),
      coauthors: coauthors.filter((c) => c.name.trim()),
      affiliation: affiliation.trim(),
      wordCount: Number(wordCount) || 0,
      pageCount: Number(pageCount) || 0,
      objectives: objectives.trim(),
      requestedServices: selectedServices,
      publicationPreference,
      status,
      journalId: isAcademic ? journalId : '',
      ethicsDeclaration: isAcademic ? ethicsDeclaration.trim() : '',
      conflictOfInterest: isAcademic ? conflictOfInterest.trim() : '',
      fundingInfo: isAcademic ? fundingInfo.trim() : '',
      dataAvailability: isAcademic ? dataAvailability.trim() : '',
      declarationsAccepted,
      currentVersionNumber: uploadedVersionCount,
      isSample: false,
      createdAt: now,
      updatedAt: now,
    };
  };

  const persistManuscriptAndFile = async (targetStatus: 'draft' | 'submitted') => {
    if (!user) return;
    if (targetStatus === 'submitted') {
      if (!title.trim() || title.trim().length < 2) {
        setErrorMsg('Please provide a manuscript title before submitting.');
        setStep(1);
        return;
      }
      if (!declarationsAccepted) {
        setErrorMsg('You must confirm authorship, rights, and policy declarations to submit.');
        setStep(5);
        return;
      }
      if (!selectedFile && uploadedVersionCount === 0) {
        setErrorMsg('Please attach your manuscript document (PDF or DOCX) in Step 3 before submitting.');
        setStep(2);
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const record = buildManuscriptRecord(targetStatus);
      const saved = await repo.saveManuscript(
        record,
        user,
        targetStatus === 'submitted' ? 'Submitted manuscript' : 'Saved draft',
      );

      if (selectedFile) {
        const token = await getIdToken();
        const ver = await repo.addManuscriptVersion(saved, selectedFile, fileNotes, user, token);
        setUploadedVersionCount(ver.versionNumber);
        setSelectedFile(null);
      }

      if (targetStatus === 'submitted' && selectedServices.length > 0) {
        await repo.createQuotationRequest(
          {
            manuscriptId: saved.id,
            manuscriptTitle: saved.title,
            serviceIds: selectedServices,
            notes: 'Services requested during manuscript submission.',
            estimatedAmount: estimate.estimatedTotal,
            currency: estimate.currency,
          },
          user,
        );
      }

      notify(
        targetStatus === 'submitted'
          ? `Manuscript ${saved.referenceNumber} submitted successfully.`
          : `Draft ${saved.referenceNumber} saved.`,
        'success',
      );
      navigate(`/dashboard/manuscripts/${saved.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save manuscript.';
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <PortalLayout
      title="Submit a Manuscript"
      breadcrumb={`Author Workspace / Submission Wizard (${referenceNumber})`}
      actions={
        <button
          type="button"
          disabled={saving}
          onClick={() => persistManuscriptAndFile('draft')}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          Save Draft
        </button>
      }
    >
      {/* Stepper */}
      <nav aria-label="Submission steps" className="mb-8 overflow-x-auto pb-2">
        <ol className="flex items-center gap-2 min-w-max">
          {STEPS.map((label, idx) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(idx)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  step === idx
                    ? 'bg-[#22170D] text-white border-[#22170D] dark:bg-[#946000] dark:border-[#946000]'
                    : idx < step
                      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
                      : 'bg-white text-slate-600 border-stone-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 p-4 text-sm text-red-900 dark:text-red-200"
        >
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        {/* Step 1: Publication Type */}
        {step === 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
              Step 1 — Select Publication Type
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Your selection configures the editorial workflow and required metadata fields.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(PUBLICATION_TYPE_LABELS) as PublicationType[]).map((typeKey) => (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setPublicationType(typeKey)}
                  className={`p-4 text-left rounded-xl border transition-colors ${
                    publicationType === typeKey
                      ? 'border-[#946000] bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-[#946000]'
                      : 'border-stone-200 dark:border-slate-800 hover:border-stone-400'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {PUBLICATION_TYPE_LABELS[typeKey]}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {ACADEMIC_PUBLICATION_TYPES.includes(typeKey)
                      ? 'Academic peer-review workflow'
                      : 'Standard editorial & production workflow'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Publication Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                Step 2 — Publication Information
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Provide accurate bibliographic details, coauthors, and synopsis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="ms-title" className="block text-xs font-semibold mb-1">
                  Manuscript Title *
                </label>
                <input
                  id="ms-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter full title"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="ms-subtitle" className="block text-xs font-semibold mb-1">
                  Subtitle (Optional)
                </label>
                <input
                  id="ms-subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="ms-abstract" className="block text-xs font-semibold mb-1">
                  Abstract / Synopsis
                </label>
                <textarea
                  id="ms-abstract"
                  rows={4}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Provide a clear summary of scope, thesis, or research findings..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-category" className="block text-xs font-semibold mb-1">
                  Category
                </label>
                <input
                  id="ms-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-discipline" className="block text-xs font-semibold mb-1">
                  Genre or Academic Discipline
                </label>
                <input
                  id="ms-discipline"
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  placeholder="e.g. Environmental History, Literary Nonfiction"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-language" className="block text-xs font-semibold mb-1">
                  Language
                </label>
                <input
                  id="ms-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-keywords" className="block text-xs font-semibold mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  id="ms-keywords"
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  placeholder="urbanism, policy, sustainability"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-affiliation" className="block text-xs font-semibold mb-1">
                  Institutional Affiliation
                </label>
                <input
                  id="ms-affiliation"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-audience" className="block text-xs font-semibold mb-1">
                  Target Audience
                </label>
                <input
                  id="ms-audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="General readers, university scholars, practitioners"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="ms-words" className="block text-xs font-semibold mb-1">
                  Estimated Word Count
                </label>
                <input
                  id="ms-words"
                  type="number"
                  min={0}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="ms-pages" className="block text-xs font-semibold mb-1">
                  Estimated Page Count
                </label>
                <input
                  id="ms-pages"
                  type="number"
                  min={0}
                  value={pageCount}
                  onChange={(e) => setPageCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 tabular-nums"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="ms-objectives" className="block text-xs font-semibold mb-1">
                  Publication Objectives
                </label>
                <textarea
                  id="ms-objectives"
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Describe intended release timeline, audience, or academic goals..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Coauthors */}
            <div className="pt-4 border-t border-stone-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Coauthors / Contributors
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setCoauthors((prev) => [...prev, { name: '', affiliation: '', orcid: '' }])
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Coauthor</span>
                </button>
              </div>
              {coauthors.length === 0 ? (
                <p className="text-xs text-slate-500">No coauthors listed.</p>
              ) : (
                <div className="space-y-3">
                  {coauthors.map((ca, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        placeholder="Coauthor name"
                        value={ca.name}
                        onChange={(e) =>
                          setCoauthors((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)),
                          )
                        }
                        className="sm:col-span-4 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                      />
                      <input
                        placeholder="Institution / Affiliation"
                        value={ca.affiliation || ''}
                        onChange={(e) =>
                          setCoauthors((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, affiliation: e.target.value } : item,
                            ),
                          )
                        }
                        className="sm:col-span-4 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                      />
                      <input
                        placeholder="ORCID (optional)"
                        value={ca.orcid || ''}
                        onChange={(e) =>
                          setCoauthors((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, orcid: e.target.value } : item)),
                          )
                        }
                        className="sm:col-span-3 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        aria-label={`Remove coauthor ${idx + 1}`}
                        onClick={() => setCoauthors((prev) => prev.filter((_, i) => i !== idx))}
                        className="sm:col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Academic Declarations */}
            {isAcademic && (
              <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Academic & Research Declarations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="ms-journal" className="block text-xs font-semibold mb-1">
                      Target Academic Journal (Optional)
                    </label>
                    <select
                      id="ms-journal"
                      value={journalId}
                      onChange={(e) => setJournalId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    >
                      <option value="">General Academic / Unassigned</option>
                      {journals.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} ({j.reviewModel.replace(/_/g, '-')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ms-ethics" className="block text-xs font-semibold mb-1">
                      Research Ethics Declaration
                    </label>
                    <textarea
                      id="ms-ethics"
                      rows={2}
                      value={ethicsDeclaration}
                      onChange={(e) => setEthicsDeclaration(e.target.value)}
                      placeholder="IRB/ethics board approval or N/A"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label htmlFor="ms-coi" className="block text-xs font-semibold mb-1">
                      Conflicts of Interest
                    </label>
                    <textarea
                      id="ms-coi"
                      rows={2}
                      value={conflictOfInterest}
                      onChange={(e) => setConflictOfInterest(e.target.value)}
                      placeholder="Declare any financial or institutional conflicts, or state None"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label htmlFor="ms-funding" className="block text-xs font-semibold mb-1">
                      Funding Information
                    </label>
                    <input
                      id="ms-funding"
                      value={fundingInfo}
                      onChange={(e) => setFundingInfo(e.target.value)}
                      placeholder="Grant numbers or institutional sponsor"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label htmlFor="ms-data" className="block text-xs font-semibold mb-1">
                      Data Availability Statement
                    </label>
                    <input
                      id="ms-data"
                      value={dataAvailability}
                      onChange={(e) => setDataAvailability(e.target.value)}
                      placeholder="Repository link or availability upon request"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Manuscript Upload */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                Step 3 — Private Manuscript Upload
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Supported formats: PDF, DOCX, DOC, TXT, Markdown (max 25 MB). Files are stored in
                private storage and tracked by version number.
              </p>
            </div>

            {uploadedVersionCount > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
                This draft currently has <strong>v{uploadedVersionCount}</strong> uploaded. Uploading another file will preserve v{uploadedVersionCount} and create a new version.
              </div>
            )}

            <div className="rounded-xl border-2 border-dashed border-stone-300 dark:border-slate-700 p-8 text-center">
              <Upload className="w-8 h-8 mx-auto text-slate-400" />
              <label
                htmlFor="ms-file-upload"
                className="mt-3 inline-block cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000]"
              >
                Choose Manuscript File
              </label>
              <input
                id="ms-file-upload"
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={handleFileChange}
                className="sr-only"
              />
              <p className="mt-2 text-xs text-slate-500">
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : 'No new file selected yet'}
              </p>
            </div>

            <div>
              <label htmlFor="ms-file-notes" className="block text-xs font-semibold mb-1">
                Version Notes
              </label>
              <input
                id="ms-file-notes"
                value={fileNotes}
                onChange={(e) => setFileNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>
          </div>
        )}

        {/* Step 4: Publishing Requirements / Services */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                  Step 4 — Requested Publishing Services
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Select individual or combined editorial, design, identifier, or print services.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Estimated Scope Baseline</p>
                <p className="text-lg font-semibold text-[#22170D] dark:text-white tabular-nums">
                  {estimate.currency} {estimate.estimatedTotal.toLocaleString()}
                  {estimate.hasCustomQuote ? ' + Custom' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((srv) => {
                const checked = selectedServices.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={`p-4 text-left rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                      checked
                        ? 'border-[#946000] bg-amber-50/50 dark:bg-amber-950/30'
                        : 'border-stone-200 dark:border-slate-800 hover:border-stone-400'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {srv.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {srv.description}
                      </p>
                      <p className="mt-2 text-xs font-mono text-slate-500 tabular-nums">
                        {srv.pricingMethod === 'custom_quote'
                          ? 'Custom Quote'
                          : `${srv.currency} ${srv.basePrice} (${srv.pricingMethod.replace(/_/g, ' ')})`}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        checked
                          ? 'bg-[#946000] border-[#946000] text-white'
                          : 'border-stone-300 dark:border-slate-600'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Publication Preference */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
              Step 5 — Publication Preference
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { val: 'digital_only', title: 'Digital publication only', desc: 'Online catalogue release, eBook, or open-access article.' },
                { val: 'print_only', title: 'Printed publication only', desc: 'Paperback or hardcover physical production.' },
                { val: 'both', title: 'Both digital and printed publication', desc: 'Coordinated print edition and digital catalogue release.' },
                { val: 'editorial_only', title: 'Editorial services only', desc: 'Evaluation, editing, proofreading, or formatting without platform release.' },
                { val: 'consultation', title: 'Undecided / Require consultation', desc: 'Discuss distribution formats after editorial assessment.' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPublicationPreference(opt.val as PublicationPreference)}
                  className={`p-4 text-left rounded-xl border transition-colors ${
                    publicationPreference === opt.val
                      ? 'border-[#946000] bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-[#946000]'
                      : 'border-stone-200 dark:border-slate-800'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{opt.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Review & Submit */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
                Step 6 — Review & Confirm Submission
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Verify all metadata, uploaded manuscript document, and declarations before submitting.
              </p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Reference Number</dt>
                <dd className="font-mono font-semibold mt-0.5">{referenceNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Publication Type</dt>
                <dd className="font-medium mt-0.5">{PUBLICATION_TYPE_LABELS[publicationType]}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Title</dt>
                <dd className="font-serif text-lg font-semibold mt-0.5">{title || 'Untitled'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Document File</dt>
                <dd className="mt-0.5">
                  {selectedFile
                    ? `${selectedFile.name} (ready to upload)`
                    : uploadedVersionCount > 0
                      ? `Version v${uploadedVersionCount} already attached`
                      : 'No file attached'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Requested Services</dt>
                <dd className="mt-0.5">{selectedServices.length} selected (Est. {estimate.currency} {estimate.estimatedTotal.toLocaleString()})</dd>
              </div>
            </dl>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-stone-200 dark:border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={declarationsAccepted}
                onChange={(e) => setDeclarationsAccepted(e.target.checked)}
                className="mt-1"
              />
              <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                I confirm that I am the author or authorized representative for this manuscript,
                possess the necessary rights to submit it for editorial review, and accept the
                platform Editorial, Peer Review, and Submission policies.
              </span>
            </label>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-slate-700 disabled:opacity-40"
          >
            Previous Step
          </button>

          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#22170D] text-white hover:bg-[#382511] dark:bg-[#946000]"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => persistManuscriptAndFile('submitted')}
                className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#946000] text-white hover:bg-[#734B00] disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
