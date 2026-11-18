import React, { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { DEFAULT_SERVICES } from '../../data/seedData';
import type { Manuscript, PublishingService, ServiceQuotation } from '../../domain/types';
import { calculateQuotationEstimate } from '../../domain/workflow';

export function AuthorServicesOrdersPage() {
  const { user, repo } = useAuth();
  const { notify } = usePlatform();

  const [services, setServices] = useState<PublishingService[]>(DEFAULT_SERVICES);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [quotations, setQuotations] = useState<ServiceQuotation[]>([]);
  const [selectedMsId, setSelectedMsId] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const [srvList, msList, qtList] = await Promise.all([
      repo.listActiveServices(),
      repo.listManuscriptsForActor(user),
      repo.listQuotationsForActor(user),
    ]);
    setServices(srvList);
    const ownMs = msList.filter((m) => m.authorId === user.uid);
    setManuscripts(ownMs);
    if (ownMs.length > 0 && !selectedMsId) setSelectedMsId(ownMs[0].id);
    setQuotations(qtList.filter((q) => q.authorId === user.uid));
  };

  useEffect(() => {
    void loadData();
  }, [user]);

  const targetMs = manuscripts.find((m) => m.id === selectedMsId);
  const estimate = useMemo(() => {
    const picked = services.filter((s) => selectedServices.includes(s.id));
    return calculateQuotationEstimate(picked, targetMs?.wordCount || 10000, targetMs?.pageCount || 40);
  }, [selectedServices, services, targetMs]);

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMsId || selectedServices.length === 0) {
      notify('Select a manuscript and at least one publishing service.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await repo.createQuotationRequest(
        {
          manuscriptId: selectedMsId,
          manuscriptTitle: targetMs?.title || '',
          serviceIds: selectedServices,
          notes,
          estimatedAmount: estimate.estimatedTotal,
          currency: estimate.currency,
        },
        user,
      );
      setSelectedServices([]);
      setNotes('');
      notify('Service quotation request submitted.', 'success');
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not request quotation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout title="Publishing Services & Quotations" breadcrumb="Author Workspace">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Request a Service Quotation
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Select a manuscript and required services. Estimated totals are preliminary until confirmed by an administrator.
          </p>

          <form onSubmit={handleRequestQuote} className="mt-5 space-y-5">
            <div>
              <label htmlFor="quote-ms" className="block text-xs font-semibold mb-1">
                Linked Manuscript
              </label>
              {manuscripts.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Create a manuscript draft or submission first to link a service quotation.
                </p>
              ) : (
                <select
                  id="quote-ms"
                  value={selectedMsId}
                  onChange={(e) => setSelectedMsId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
                >
                  {manuscripts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.referenceNumber} — {m.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">Available Active Services</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {services.map((srv) => {
                  const active = selectedServices.includes(srv.id);
                  return (
                    <label
                      key={srv.id}
                      className={`p-3 rounded-lg border cursor-pointer text-xs flex items-start gap-2.5 ${
                        active
                          ? 'border-[#946000] bg-amber-50/50 dark:bg-amber-950/30'
                          : 'border-stone-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() =>
                          setSelectedServices((prev) =>
                            prev.includes(srv.id) ? prev.filter((x) => x !== srv.id) : [...prev, srv.id],
                          )
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{srv.name}</p>
                        <p className="text-slate-500 mt-0.5 tabular-nums">
                          {srv.pricingMethod === 'custom_quote'
                            ? 'Custom Quote'
                            : `${srv.currency} ${srv.basePrice} (${srv.pricingMethod.replace(/_/g, ' ')})`}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="quote-notes" className="block text-xs font-semibold mb-1">
                Additional Requirements or Notes
              </label>
              <textarea
                id="quote-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Target deadline, citation style, print specifications..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Preliminary Estimate</p>
                <p className="text-lg font-semibold tabular-nums">
                  {estimate.currency} {estimate.estimatedTotal.toLocaleString()}
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || manuscripts.length === 0 || selectedServices.length === 0}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#22170D] text-white dark:bg-[#946000] disabled:opacity-40"
              >
                {submitting ? 'Submitting...' : 'Submit Quotation Request'}
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Your Quotations & Orders
          </h2>
          {quotations.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No quotation requests submitted yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {quotations.map((q) => (
                <div key={q.id} className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {q.manuscriptTitle || q.manuscriptId}
                    </span>
                    <span className="text-xs font-medium capitalize px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800">
                      {q.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">
                    {q.confirmedAmount !== undefined
                      ? `Confirmed: ${q.currency} ${q.confirmedAmount.toLocaleString()}`
                      : `Estimated: ${q.currency} ${(q.estimatedAmount || 0).toLocaleString()}`}
                  </p>
                  {q.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{q.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
