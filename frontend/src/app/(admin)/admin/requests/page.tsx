'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  X,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import {
  getPendingCreditRequests,
  approveCreditRequest,
  rejectCreditRequest,
} from '@/app/actions/creditAdminActions';

interface CreditRequestRow {
  id: string;
  user_id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  proof_image_url?: string;
  created_at: string;
  users?: {
    id: string;
    full_name?: string;
    fullName?: string;
    email?: string;
    credits?: number;
  };
}

export default function AdminCreditRequestsPage() {
  const [requests, setRequests] = useState<CreditRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProofModalUrl, setActiveProofModalUrl] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPendingCreditRequests(statusFilter);
      if (res.success && res.data) {
        setRequests(res.data as CreditRequestRow[]);
      } else {
        toast.error(res.error || 'Failed to fetch credit requests');
      }
    } catch {
      toast.error('Network error fetching requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (req: CreditRequestRow) => {
    setProcessingId(req.id);
    try {
      const res = await approveCreditRequest({
        requestId: req.id,
        userId: req.user_id,
        creditAmount: req.amount,
      });

      if (res.success) {
        toast.success(`Approved! Added ${req.amount} credits to student account.`);
        fetchRequests();
      } else {
        toast.error(res.error || 'Failed to approve request');
      }
    } catch {
      toast.error('Network error approving request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: CreditRequestRow) => {
    setProcessingId(req.id);
    try {
      const res = await rejectCreditRequest({
        requestId: req.id,
        userId: req.user_id,
        reason: 'Payment proof unverified or rejected by admin',
      });

      if (res.success) {
        toast.success('Credit request rejected');
        fetchRequests();
      } else {
        toast.error(res.error || 'Failed to reject request');
      }
    } catch {
      toast.error('Network error rejecting request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const studentName = r.users?.full_name || r.users?.fullName || '';
    const studentEmail = r.users?.email || '';
    const searchLower = searchQuery.toLowerCase();
    return (
      studentName.toLowerCase().includes(searchLower) ||
      studentEmail.toLowerCase().includes(searchLower) ||
      (r.reason && r.reason.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Coins className="h-7 w-7 text-purple-600" />
            Credit Requests Ledger
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review student payment receipts and approve credit allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {/* ── Search & Status Filters ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student name, email, or package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Requests Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No {statusFilter.toLowerCase()} credit requests found.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Package / Reason</th>
                <th className="px-4 py-3">Credit Amount</th>
                <th className="px-4 py-3">Submitted Date</th>
                <th className="px-4 py-3">Payment Proof</th>
                <th className="px-4 py-3 text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((req) => {
                const name = req.users?.full_name || req.users?.fullName || 'Student';
                const email = req.users?.email || 'N/A';
                const isPending = req.status === 'PENDING';
                const isBusy = processingId === req.id;

                return (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{email}</p>
                    </td>

                    <td className="px-4 py-4 font-medium text-gray-800">
                      {req.reason || 'Credit Store Request'}
                    </td>

                    <td className="px-4 py-4 font-black text-purple-700">
                      +{req.amount} Credits
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-600">
                      {new Date(req.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-4 py-4">
                      {req.proof_image_url ? (
                        <button
                          type="button"
                          onClick={() => setActiveProofModalUrl(req.proof_image_url || null)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">No proof URL</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Proof Lightbox Modal ──────────────────────────────────────── */}
      {activeProofModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveProofModalUrl(null)}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
                Proof of Payment Receipt
              </h3>
              <button
                type="button"
                onClick={() => setActiveProofModalUrl(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-6 border border-gray-200">
              <div className="flex h-32 w-full items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold border border-purple-200 p-4 text-center">
                <p className="text-xs break-all leading-relaxed">
                  URL: {activeProofModalUrl}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={activeProofModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open original image link
              </a>

              <button
                type="button"
                onClick={() => setActiveProofModalUrl(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
