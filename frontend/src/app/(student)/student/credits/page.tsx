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
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';
import { submitCreditRequest, getMyCreditRequests } from '@/app/actions/creditActions';

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
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  created_at: string;
}

export default function StudentCreditsPage() {
  const [currentCredits, setCurrentCredits] = useState<number>(0);
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proofFileName, setProofFileName] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastRequests, setPastRequests] = useState<PastRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const { data: profile } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();
          if (profile?.credits !== undefined && !cancelled) {
            setCurrentCredits(profile.credits);
          }
        }
      } catch {
        // Fallback default 0
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
    };
  }, []);

  const handleOpenModal = (pkg: CreditPackage) => {
    setSelectedPkg(pkg);
    setProofFileName('');
    setProofUrl('');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      // Simulate file upload URL generation
      setProofUrl(`https://storage.learnify.pk/receipts/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    if (!proofFileName) {
      toast.error('Please upload your proof of payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCreditRequest({
        amount: selectedPkg.credits,
        price: selectedPkg.price,
        reason: `${selectedPkg.name} ($${selectedPkg.price} for ${selectedPkg.credits} credits)`,
        proofImageUrl: proofUrl,
      });

      if (res.success) {
        toast.success(
          'Request submitted! Credits will be added once an Admin verifies your payment.',
          { duration: 5000 }
        );
        setIsModalOpen(false);

        // Refresh past requests
        const reqRes = await getMyCreditRequests();
        if (reqRes.success && reqRes.data) {
          setPastRequests(reqRes.data as PastRequest[]);
        }
      } else {
        toast.error(res.error || 'Failed to submit credit request');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header & Current Balance ───────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-gray-200 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 p-8 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
              SaaS Credit Store
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Buy Platform Credits</h1>
          <p className="mt-1 text-sm text-purple-200">
            Top up your balance to unlock premium question banks, AI explanations, and mock exams.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-md border border-white/15">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-purple-950 font-black shadow-md">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-purple-200">Your Balance</p>
            <p className="text-2xl font-black text-amber-300">{currentCredits.toLocaleString()} Credits</p>
          </div>
        </div>
      </div>

      {/* ── Pricing Tiers Grid ────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Select a Credit Package
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                pkg.popular
                  ? 'border-purple-500 ring-2 ring-purple-500/20'
                  : 'border-gray-200'
              }`}
            >
              {pkg.badge && (
                <span
                  className={`absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm ${
                    pkg.popular ? 'bg-purple-600' : 'bg-indigo-600'
                  }`}
                >
                  {pkg.badge}
                </span>
              )}

              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{pkg.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-purple-700">{pkg.credits}</span>
                  <span className="text-sm font-bold text-gray-500">Credits</span>
                </div>

                <p className="mt-1 text-2xl font-bold text-gray-900">${pkg.price} USD</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  ${(pkg.price / pkg.credits).toFixed(3)} per credit
                </p>

                <ul className="mt-6 space-y-2.5 border-t border-gray-100 pt-4 text-xs text-gray-600">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleOpenModal(pkg)}
                className={`mt-8 w-full rounded-2xl py-3 text-sm font-extrabold transition-colors duration-150 ${
                  pkg.popular
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                Request {pkg.credits} Credits
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request History Section ───────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-purple-600" />
          Your Credit Requests History
        </h2>

        {pastRequests.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No credit purchase requests submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Package / Details</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pastRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(req.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {req.reason || 'Credit Purchase'}
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-700">
                      +{req.amount} Credits
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl z-10 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                  Step 2 of 2 — Payment Verification
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-0.5">
                  {selectedPkg.name} ({selectedPkg.credits} Credits)
                </h3>
                <p className="text-sm font-bold text-purple-700 mt-0.5">
                  Amount Due: ${selectedPkg.price} USD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bank Transfer Instructions */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Bank Transfer Instructions
              </div>
              <div className="space-y-1.5 text-xs text-indigo-950 font-medium">
                <p><span className="text-indigo-600 font-bold">Bank Name:</span> Learnify Global FinTech Bank</p>
                <p><span className="text-indigo-600 font-bold">Account Title:</span> Learnify Medical Pvt Ltd</p>
                <p><span className="text-indigo-600 font-bold">Account Number:</span> PK98-LRNF-0019-8876-5432-01</p>
                <p><span className="text-indigo-600 font-bold">Reference:</span> LRNF-CREDITS-{selectedPkg.credits}</p>
              </div>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                  Upload Proof of Payment Screenshot
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition hover:border-purple-400">
                  <Upload className="h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-xs font-semibold text-gray-700">
                    {proofFileName ? proofFileName : 'Click or drop screenshot here (PNG, JPG, PDF)'}
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    required
                  />
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
                <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>
                  Your credit request will be reviewed by an Admin. Credits are credited upon verification.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
