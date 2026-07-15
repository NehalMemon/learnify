'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAdmin = false,
  redirectTo = '/login',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const user = getUser();

      if (!user) {
        // Not authenticated
        router.replace(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
        setIsAuthorized(false);
      } else if (requireAdmin && user.role !== 'ADMIN') {
        // Not an admin
        router.replace('/dashboard');
        setIsAuthorized(false);
      } else {
        // Authorized
        setIsAuthorized(true);
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [requireAdmin, redirectTo, pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};
