'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Sparkles,
  CheckCircle2,
  Upload,
  Building2,
  ShieldCheck,
  Clock3,
  X,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useConfirm } from '@/components/providers/ModalProvider';
import {
  submitCreditRequest,
  getMyCreditRequests,
  getUserCredits,
  uploadPaymentProof,
} from '@/app/actions/creditActions';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  badge?: string;
  popular?: boolean;
  features: string[];
}

const PACKAGES: CreditPackage[] = [
  {
    id: 'pkg-basic',
    name: 'Basic Pack',
    credits: 100,
    price: 10,
    features: [
      'Access to standard question banks',
      'Instant AI explanation view',
      'No expiration date',
    ],
  },
  {
    id: 'pkg-plus',
    name: 'Plus Pack',
    credits: 500,
    price: 40,
    badge: 'Popular',
    popular: true,
    features: [
      'Includes everything in Basic',
      'Save 20% compared to Basic',
      'Priority quiz attempt processing',
      'Full performance analytics',
    ],
  },
  {
    id: 'pkg-pro',
    name: 'Pro Pack',
    credits: 1000,
    price: 75,
    badge: 'Best Value',
    features: [
      'Includes everything in Plus',
      'Save 25% discount',
      'Unlimited mock exam retakes',
      'Personalized weak-area reports',
    ],
  },
  {
    id: 'pkg-ultra',
    name: 'Ultra Pack',
    credits: 1500,
    price: 100,
    badge: 'Ultimate',
    features: [
      'Maximum value bundle (Save 33%)',
      'All premium question banks',
      'Direct faculty Q&A sessions',
      'VIP support access',
    ],
  },
];

interface PastRequest {
  id: string;
  package_name?: string;
  amount?: number;
  credits_requested?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  created_at: string;
}

export default function StudentCreditsPage() {
  const { user: authUser } = useAuthContext();
  const confirm = useConfirm();
  const [currentCredits, setCurrentCredits] = useState<number>(authUser?.credits ?? 0);
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileName, setProofFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    if (authUser?.credits !== undefined) {
      setCurrentCredits(authUser.credits);
    }

    const loadUserData = async () => {
      try {
        // 1. Fetch live user credits from server action (bypasses stale client cache)
        const serverRes = await getUserCredits();
        if (serverRes.success && typeof serverRes.credits === 'number' && !cancelled) {
          setCurrentCredits(serverRes.credits);
        }

        // 2. Client Supabase fetch & Realtime subscription setup
        const supabase = createClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        const targetUserId = sbUser?.id || authUser?.id;

        if (targetUserId && !cancelled) {
          const { data: profile } = await supabase
            .from('users')
            .select('credits')
            .eq('id', targetUserId)
            .single();

          if (profile && typeof profile.credits === 'number' && !cancelled) {
            setCurrentCredits(profile.credits);
          }

          // Realtime channel for live credit balance & request updates
          channel = supabase
            .channel(`credits-page-${targetUserId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${targetUserId}`,
              },
              (payload) => {
                if (payload.new && typeof payload.new.credits === 'number') {
                  setCurrentCredits(payload.new.credits);
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'credit_requests',
                filter: `user_id=eq.${targetUserId}`,
              },
              async () => {
                const reqRes = await getMyCreditRequests();
                if (reqRes.success && reqRes.data && !cancelled) {
                  setPastRequests(reqRes.data as PastRequest[]);
                }
                const liveCreditRes = await getUserCredits();
                if (liveCreditRes.success && typeof liveCreditRes.credits === 'number' && !cancelled) {
                  setCurrentCredits(liveCreditRes.credits);
                }
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error('StudentCreditsPage loadUserData exception:', err);
      }
    };

    const loadRequests = async () => {
      const res = await getMyCreditRequests();
      if (res.success && res.data && !cancelled) {
        setPastRequests(res.data as PastRequest[]);
      }
    };

    loadUserData();
    loadRequests();
    return () => {
      cancelled = true;
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [authUser?.id, authUser?.credits]);

  const handleOpenModal = (pkg: CreditPackage) => {
    setSelectedPkg(pkg);
    setProofFile(null);
    setProofFileName('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    let publicUrl: string | null = null;

    // 1. Intercept Logic: check if proofFile is empty
    if (!proofFile) {
      const proceed = await confirm({
        title: 'Missing Image',
        message: 'You have not submitted a proof of payment. Proceed anyway?',
        confirmText: 'Proceed',
      });
      if (!proceed) {
        return;
      }
    } else {
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('file', proofFile);

        const uploadRes = await uploadPaymentProof(formData);
        if (!uploadRes.success || !uploadRes.publicUrl) {
          console.error('uploadPaymentProof failed:', uploadRes.error);
          toast.error(uploadRes.error || 'Failed to upload proof image. Please try again.');
          setIsSubmitting(false);
          return;
        }

        publicUrl = uploadRes.publicUrl;
      } catch (error) {
        console.error('Error uploading payment proof:', error);
        toast.error('Failed to upload proof image. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Submit credit request Server Action with image URL or null
    setIsSubmitting(true);
    try {
      const res = await submitCreditRequest({
        packageName: selectedPkg.name,
        creditsRequested: selectedPkg.credits,
        price: selectedPkg.price,
        proofImageUrl: publicUrl,
      });

      if (res.success) {
        // 1. Trigger success toast immediately after server action completes
        toast.success('Request submitted successfully! An admin will review it shortly.');

        // 2. Reset form state
        setProofFile(null);
        setProofFileName('');

        // 3. Close Modal
        setIsModalOpen(false);

        // Refresh past requests
        const reqRes = await getMyCreditRequests();
        if (reqRes.success && reqRes.data) {
          setPastRequests(reqRes.data as PastRequest[]);
        }
      } else {
        console.error('Credit request submission failed:', res.error);
        toast.error(res.error || 'Failed to submit credit request');
      }
    } catch (error) {
      console.error('Error processing credit submission:', error);
      toast.error('Network or server error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 font-sans text-slate-900 antialiased">
      {/* ── Page Header & Current Balance ───────────────────────────────── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-slate-300 border border-white/15">
              SaaS Credit Store
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">Buy Platform Credits</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Top up your balance to unlock premium question banks, AI explanations, and mock exams.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/60 p-4 sm:p-5 backdrop-blur-md border border-purple-500/30 shrink-0 shadow-lg shadow-purple-950/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black shadow-md shadow-purple-500/25 ring-2 ring-purple-400/30">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-purple-200/90 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Current Balance
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentCredits.toLocaleString()} <span className="text-sm font-bold text-purple-200">Credits</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Pricing Tiers Grid ────────────────────────────────────────── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-slate-900" />
            Select a Credit Package
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Flexible credit tiers for every learning requirement.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md ${
                pkg.popular
                  ? 'border-slate-900 ring-1 ring-slate-900/10'
                  : 'border-slate-200/80'
              }`}
            >
              {pkg.badge && (
                <span
                  className={`absolute -top-2.5 right-4 rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm ${
                    pkg.popular ? 'bg-slate-900' : 'bg-slate-700'
                  }`}
                >
                  {pkg.badge}
                </span>
              )}

              <div>
                <h3 className="text-base font-extrabold text-slate-950">{pkg.name}</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-950">{pkg.credits}</span>
                  <span className="text-xs font-bold text-slate-500">Credits</span>
                </div>

                <p className="mt-1 text-xl font-bold text-slate-900">${pkg.price} USD</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                  ${(pkg.price / pkg.credits).toFixed(3)} per credit
                </p>

                <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-900 mt-0.5" />
                      <span className="leading-normal">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenModal(pkg)}
                className={`mt-6 w-full rounded-lg py-2.5 text-xs font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 ${
                  pkg.popular
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                Request {pkg.credits} Credits
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request History Section ───────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="text-base font-extrabold text-slate-950 mb-4 flex items-center gap-2 tracking-tight">
          <Clock3 className="h-4.5 w-4.5 text-slate-900" />
          Credit Purchase History
        </h2>

        {pastRequests.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center font-medium">
            No credit purchase requests submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Package / Reason</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {new Date(req.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {req.package_name || req.reason || 'Credit Purchase'}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-slate-950">
                      +{(req.credits_requested ?? req.amount ?? 0)} Credits
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payment Instructions & Upload Modal ───────────────────────── */}
      {isModalOpen && selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl z-10 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Step 2 of 2 — Payment Verification
                </span>
                <h3 className="text-lg font-extrabold text-slate-950 mt-0.5">
                  {selectedPkg.name} ({selectedPkg.credits} Credits)
                </h3>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  Amount Due: ${selectedPkg.price} USD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Bank Transfer Instructions */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-950 font-bold text-xs">
                <Building2 className="h-4 w-4 text-slate-900" />
                Bank Transfer Instructions
              </div>
              <div className="space-y-1 text-xs text-slate-700 font-medium">
                <p><span className="text-slate-900 font-bold">Bank Name:</span> Learnify Global FinTech Bank</p>
                <p><span className="text-slate-900 font-bold">Account Title:</span> Learnify Medical Pvt Ltd</p>
                <p><span className="text-slate-900 font-bold">Account Number:</span> PK98-LRNF-0019-8876-5432-01</p>
                <p><span className="text-slate-900 font-bold">Reference:</span> LRNF-CREDITS-{selectedPkg.credits}</p>
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Upload Proof of Payment Screenshot <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 text-center transition-colors hover:border-slate-900">
                  <Upload className="h-6 w-6 text-slate-900 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">
                    {proofFileName ? proofFileName : 'Click or drop screenshot here (PNG, JPG, PDF)'}
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 border border-slate-200 p-3 text-xs text-slate-800 font-medium">
                <ShieldCheck className="h-4 w-4 text-slate-900 flex-shrink-0" />
                <span>
                  Your credit request will be reviewed by an Admin. Credits are added upon verification.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
