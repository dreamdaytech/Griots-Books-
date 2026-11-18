import React from 'react';

export interface PublicationMetadataFormData {
  category: string;
  language: string;
  edition: string;
  imprint: string;
  series: string;
  pageCount: string;
  publicationYear: string;
  subjectsText: string;
  contentsText: string;
  coverUrl: string;
  isbnPrint: string;
  isbnDigital: string;
  previewText: string;
  previewEnabled: boolean;
}

export const EMPTY_PUBLICATION_METADATA: PublicationMetadataFormData = {
  category: '',
  language: '',
  edition: '',
  imprint: '',
  series: '',
  pageCount: '',
  publicationYear: '',
  subjectsText: '',
  contentsText: '',
  coverUrl: '',
  isbnPrint: '',
  isbnDigital: '',
  previewText: '',
  previewEnabled: false,
};

const fieldStyle = 'w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950';

export function PublicationMetadataFields({
  value,
  onChange,
}: {
  value: PublicationMetadataFormData;
  onChange: React.Dispatch<React.SetStateAction<PublicationMetadataFormData>>;
}) {
  const change = (key: keyof PublicationMetadataFormData, input: string | boolean) =>
    onChange((old) => ({ ...old, [key]: input }));

  return (
    <fieldset className="space-y-4 border-t border-stone-200 dark:border-slate-800 pt-5">
      <legend className="font-serif text-lg font-semibold text-[#22170D] dark:text-white px-1">Enhanced Publication Metadata</legend>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Complete only verified details. Optional fields are omitted when empty. No identifiers are generated automatically.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          ['category', 'Subject / Genre', 'Literature, Humanities, etc.'],
          ['language', 'Publication Language', 'English'],
          ['edition', 'Edition', 'First edition'],
          ['imprint', 'Publishing Imprint', 'Authorized imprint name'],
          ['series', 'Book Series', 'Series name (if applicable)'],
          ['coverUrl', 'Public Cover Image URL', 'https://... approved cover'],
          ['isbnPrint', 'Verified Print ISBN', 'Issued ISBN for the printed edition'],
          ['isbnDigital', 'Verified Digital ISBN', 'Issued ISBN for the eBook edition'],
        ] as const).map(([key, label, placeholder]) => (
          <label key={key} className="block text-xs font-semibold">{label}
            <input value={value[key]} onChange={(e) => change(key, e.target.value)} placeholder={placeholder}
              className={`mt-1 ${fieldStyle}`} />
          </label>
        ))}
        <label className="block text-xs font-semibold">Page Count
          <input type="number" min={1} max={50000} step={1} value={value.pageCount}
            onChange={(e) => change('pageCount', e.target.value)} placeholder="e.g. 240"
            className={`mt-1 ${fieldStyle}`} />
        </label>
        <label className="block text-xs font-semibold">Publication Year
          <input type="number" min={1400} max={2100} step={1} value={value.publicationYear}
            onChange={(e) => change('publicationYear', e.target.value)} placeholder="e.g. 2026"
            className={`mt-1 ${fieldStyle}`} />
        </label>
      </div>
      <label className="block text-xs font-semibold">Subjects / Keywords (comma-separated)
        <textarea rows={2} value={value.subjectsText} onChange={(e) => change('subjectsText', e.target.value)}
          placeholder="African Literature, History, Education" className={`mt-1 ${fieldStyle}`} />
      </label>
      <label className="block text-xs font-semibold">Table of Contents (one chapter or section per line)
        <textarea rows={4} value={value.contentsText} onChange={(e) => change('contentsText', e.target.value)}
          placeholder={'Introduction\nChapter 1\nChapter 2\nConclusion'} className={`mt-1 ${fieldStyle}`} />
      </label>
      <div className="rounded-xl border border-[#D9B36A]/60 bg-[#FAF7F0] dark:bg-slate-950 p-4 space-y-3">
        <p className="font-semibold text-sm">Read Inside — Public Preview Approval</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Paste only text the rights holder and publishing manager have approved for public display.
          Never paste confidential reviewer comments or a complete private manuscript.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={value.previewEnabled} onChange={(e) => change('previewEnabled', e.target.checked)}
            className="h-4 w-4 accent-[#946000]" />
          Approve this excerpt for the public catalogue
        </label>
        <label className="block text-xs font-semibold">Approved Preview Text
          <textarea rows={6} maxLength={12000} value={value.previewText}
            onChange={(e) => change('previewText', e.target.value)}
            placeholder="Paste an expressly approved preview excerpt..." className={`mt-1 ${fieldStyle}`} />
        </label>
        {!value.previewEnabled && (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Preview is disabled. No excerpt text will be stored in the new public publication record until explicitly approved.
          </p>
        )}
      </div>
    </fieldset>
  );
}
