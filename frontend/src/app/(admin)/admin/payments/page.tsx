'use client';

import React, { useEffect, useState } from 'react';
import { Header, Footer, Container, Sidebar, AuthGuard } from '@/components/layout';
import { adminApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  enrollment: {
    id: string;
    course: {
      title: string;
    };
  };
  proofImageUrl?: string;
  createdAt: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await adminApi.listPayments({ limit: 50, status: filterStatus || undefined });
        setPayments(response.data.data?.payments || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [filterStatus]);

  const handleVerifyPayment = async (id: string) => {
    if (!confirm('Verify this payment?')) return;

    try {
      await adminApi.verifyPayment(id);
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'VERIFIED' as const } : p))
      );
      alert('Payment verified successfully');
    } catch (error: unknown) {
      console.error('Error verifying payment:', error);
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || 'Failed to verify payment');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex flex-grow">
          <Sidebar variant="admin" />
          <main className="flex-1 py-8">
            <Container>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Payment Management
                </h1>
                <p className="text-gray-600">
                  Review and verify payment submissions
                </p>
              </div>

              {/* Filter */}
              <div className="mb-6">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Payments</option>
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}

              {/* Payments List */}
              {!isLoading && payments.length > 0 && (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {payment.user.fullName}
                              </h3>
                              <Badge variant={getStatusBadgeVariant(payment.status)}>
                                {payment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Course: {payment.enrollment.course.title}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Amount: {payment.amount} {payment.currency}</span>
                              <span>Email: {payment.user.email}</span>
                              <span>Date: {new Date(payment.createdAt).toLocaleDateString()}</span>
                            </div>
                            {payment.proofImageUrl && (
                              <div className="mt-3">
                                <a
                                  href={payment.proofImageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  View Payment Proof →
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {payment.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleVerifyPayment(payment.id)}
                                >
                                  Verify
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => alert('Reject payment functionality would be implemented here')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && payments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No payments found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filterStatus ? 'Try adjusting your filter' : 'No payment submissions yet'}
                  </p>
                </div>
              )}
            </Container>
          </main>
        </div>
        <Footer />
      </div>
    </AuthGuard>
  );
}
