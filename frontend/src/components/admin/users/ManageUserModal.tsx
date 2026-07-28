'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, UserCog, UserMinus, X } from 'lucide-react';

type UserRole = 'STUDENT' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

type ManageUserModalProps = {
  isOpen: boolean;
  user: ManagedUser | null;
  isSaving: boolean;
  onClose: () => void;
  onSaveChanges: (
    userId: string,
    changes: {
      role: UserRole;
      status: UserStatus;
    }
  ) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  onDeleteAccount: (userId: string) => Promise<void>;
};

const ROLE_OPTIONS: UserRole[] = ['STUDENT', 'ADMIN'];
const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INACTIVE', 'PENDING'];

export function ManageUserModal({
  isOpen,
  user,
  isSaving,
  onClose,
  onSaveChanges,
  onResetPassword,
  onDeleteAccount,
}: ManageUserModalProps) {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [isDoubleConfirm, setIsDoubleConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setRole(user.role);
    setStatus(user.status);
    setIsDoubleConfirm(false);
  }, [isOpen, user]);

  useEffect(() => {
    const onEscClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSaving) onClose();
    };
    window.addEventListener('keydown', onEscClose);
    return () => window.removeEventListener('keydown', onEscClose);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !user) return null;

  const handleNuclearAction = async () => {
    if (!isDoubleConfirm) {
      setIsDoubleConfirm(true);
      return;
    }
    await onDeleteAccount(user.id);
  };

  const hasPendingChanges = role !== user.role || status !== user.status;

  const handleSaveChanges = async () => {
    if (!hasPendingChanges) return;
    await onSaveChanges(user.id, { role, status });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-user-title"
      onClick={!isSaving ? onClose : undefined}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 id="manage-user-title" className="text-xl font-semibold text-gray-900">
              Manage User Access
            </h2>
            <p className="mt-1 text-sm text-gray-500">{user.fullName} — {user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Role Switching */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <UserCog size={16} />
              <h3 className="text-sm font-medium">Role Assignment</h3>
            </div>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
              aria-label="Select user role"
              disabled={isSaving}
            >
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </section>

          {/* Status Governance */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <ShieldCheck size={16} />
              <h3 className="text-sm font-medium">Account Status Governance</h3>
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatus)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
              aria-label="Select user status"
              disabled={isSaving}
            >
              {STATUS_OPTIONS.map((statusOpt) => (
                <option key={statusOpt} value={statusOpt}>
                  {statusOpt}
                </option>
              ))}
            </select>
          </section>

          {/* Destructive Actions */}
          <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
            <button
              type="button"
              onClick={() => onResetPassword(user.id)}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed"
            >
              Send Password Reset Email
            </button>
            <button
              type="button"
              onClick={handleNuclearAction}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed"
            >
              <UserMinus size={16} />
              {isDoubleConfirm ? 'Click to Confirm Permanent Deletion' : 'Delete Account'}
            </button>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!hasPendingChanges || isSaving}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
