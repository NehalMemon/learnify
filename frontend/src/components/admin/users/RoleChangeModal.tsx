'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserRole } from '@/app/actions/userAdminActions';
import { UserRole } from '@/types';

export interface RoleChangeTargetUser {
  id: string;
  fullName: string;
  email?: string;
  role: UserRole;
}

interface RoleChangeModalProps {
  isOpen: boolean;
  user: RoleChangeTargetUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'STUDENT', label: 'STUDENT', description: 'Standard learner access' },
  { value: 'INSTRUCTOR', label: 'INSTRUCTOR', description: 'Course management & teaching access' },
  { value: 'ADMIN', label: 'ADMIN', description: 'Full administrative controls' },
];

export function RoleChangeModal({ isOpen, user, onClose, onSuccess }: RoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    if (!user?.id) {
      toast.error('User ID is missing or invalid');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetUserId = String(user.id).trim();
      const targetRole = String(selectedRole).trim() as UserRole;

      // Explicit argument order: 1st parameter = userId (UUID), 2nd parameter = newRole ('ADMIN' | 'INSTRUCTOR' | 'STUDENT')
      const res = await updateUserRole(targetUserId, targetRole);

      if (res.success) {
        toast.success('Role updated successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to update user role');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An unexpected error occurred while updating user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-change-modal-title"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 id="role-change-modal-title" className="text-base font-bold text-gray-900">
                Change Role for {user.fullName}
              </h2>
              {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-4">
          {/* Select Role */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-900 shadow-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.description}
                </option>
              ))}
            </select>
          </div>

          {/* Warning Note */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed font-medium">
              Changing this user&apos;s role will immediately update their access permissions across the platform.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Confirm Change</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
