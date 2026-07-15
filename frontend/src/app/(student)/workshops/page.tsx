'use client';

import React, { useEffect, useState } from 'react';
import { workshopsApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface Workshop {
  id: string;
  title: string;
  description: string;
  instructor: string;
  scheduledAt: string;
  duration: number;
  division?: {
    name: string;
    slug: string;
  };
  isPaid: boolean;
  price?: number;
  currency: string;
  seatsTotal: number;
  seatsAvailable: number;
}

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const response = await workshopsApi.listWorkshops({ upcoming: true });
        setWorkshops(response.data.data || []);
      } catch (error) {
        console.error('Error fetching workshops:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  const handleRegister = async (workshopId: string) => {
    try {
      await workshopsApi.register(workshopId);
      alert('Successfully registered for workshop!');
    } catch (error: unknown) {
      console.error('Error registering:', error);
      const message =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      alert(message || 'Failed to register');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Workshops
        </h1>
        <p className="text-gray-500">
          Join live interactive workshops and learn from industry experts
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* Workshops Grid */}
      {!isLoading && workshops.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workshops.map((workshop) => (
            <Card key={workshop.id}>
              <CardContent className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  {workshop.isPaid ? (
                    <Badge variant="success">
                      {workshop.price} {workshop.currency}
                    </Badge>
                  ) : (
                    <Badge variant="info">Free</Badge>
                  )}
                  {workshop.seatsAvailable === 0 ? (
                    <Badge variant="danger">Full</Badge>
                  ) : (
                    <Badge variant="default">
                      {workshop.seatsAvailable} seats left
                    </Badge>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {workshop.title}
                </h3>

                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {workshop.description}
                </p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{workshop.instructor}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{formatDate(workshop.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{workshop.duration} minutes</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleRegister(workshop.id)}
                  disabled={workshop.seatsAvailable === 0}
                  className="w-full"
                >
                  {workshop.seatsAvailable === 0 ? 'Workshop Full' : 'Register Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && workshops.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 shadow-sm rounded-lg">
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No workshops available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Check back later for upcoming workshops
          </p>
        </div>
      )}
    </div>
  );
}
