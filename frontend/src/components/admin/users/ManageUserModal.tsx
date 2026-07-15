'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, UserCog, UserMinus, X } from 'lucide-react';

type UserRole = 'STUDENT' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'DEACTIVATED';

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  learnifyEnabled: boolean;
  doctorsQuizzEnabled: boolean;
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
      learnifyEnabled: boolean;
      doctorsQuizzEnabled: boolean;
    }
  ) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  onDeleteAccount: (userId: string) => Promise<void>;
};

const ROLE_OPTIONS: UserRole[] = ['STUDENT', 'ADMIN'];

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
  const [accessState, setAccessState] = useState({ learnifyEnabled: false, doctorsQuizzEnabled: false });

  useEffect(() => {
    if (!isOpen || !user) return;
    setRole(user.role);
    setStatus(user.status);
    setAccessState({
      learnifyEnabled: user.learnifyEnabled,
      doctorsQuizzEnabled: user.doctorsQuizzEnabled,
    });
    setIsDoubleConfirm(false);
  }, [isOpen, user]);

  useEffect(() => {
    const onEscClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSaving) onClose();
    };
    window.addEventListener('keydown', onEscClose);
    return () => window.removeEventListener('keydown', onEscClose);
  }, [isOpen, isSaving, onClose]);

  const nextStatus = useMemo<UserStatus>(() => (status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'), [status]);

  if (!isOpen || !user) return null;

  const handleNuclearAction = async () => {
    if (!isDoubleConfirm) {
      setIsDoubleConfirm(true);
      return;
    }
    await onDeleteAccount(user.id);
  };

  const handleToggleStatus = () => {
    const next = nextStatus;
    setStatus(next);
    setAccessState({
      learnifyEnabled: next === 'ACTIVE',
      doctorsQuizzEnabled: next === 'ACTIVE',
    });
  };

  const handleToggleAccess = (field: 'learnifyEnabled' | 'doctorsQuizzEnabled') => {
    const nextAccess = { ...accessState, [field]: !accessState[field] };
    setAccessState(nextAccess);
    setStatus(nextAccess.learnifyEnabled || nextAccess.doctorsQuizzEnabled ? 'ACTIVE' : 'DEACTIVATED');
  };

  const hasPendingChanges =
    role !== user.role ||
    status !== user.status ||
    accessState.learnifyEnabled !== user.learnifyEnabled ||
    accessState.doctorsQuizzEnabled !== user.doctorsQuizzEnabled;

  const handleSaveChanges = async () => {
    if (!hasPendingChanges) return;
    await onSaveChanges(user.id, {
      role,
      status,
      learnifyEnabled: accessState.learnifyEnabled,
      doctorsQuizzEnabled: accessState.doctorsQuizzEnabled,
    });
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
            <p className="mt-1 text-sm text-gray-500">{user.fullName} - {user.email}</p>
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
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <UserCog size={16} />
              <h3 className="text-sm font-medium">Role Switching</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
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
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <ShieldCheck size={16} />
              <h3 className="text-sm font-medium">Account Restriction</h3>
            </div>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isSaving}
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${
                nextStatus === 'DEACTIVATED' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {nextStatus === 'DEACTIVATED' ? 'Deactivate User' : 'Reactivate User'}
            </button>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <Lock size={16} />
              <h3 className="text-sm font-medium">Platform Access Control</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Learnify Access</p>
                  <p className="text-xs text-gray-500">Enable or disable Learnify platform access</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleToggleAccess('learnifyEnabled')}
                  className={`relative h-6 w-12 rounded-full transition ${accessState.learnifyEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                  aria-pressed={accessState.learnifyEnabled}
                  aria-label="Toggle Learnify Access"
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${accessState.learnifyEnabled ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">DoctorsQuizz Access</p>
                  <p className="text-xs text-gray-500">Enable or disable DoctorsQuizz platform access</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleToggleAccess('doctorsQuizzEnabled')}
                  className={`relative h-6 w-12 rounded-full transition ${accessState.doctorsQuizzEnabled ? 'bg-purple-600' : 'bg-gray-300'}`}
                  aria-pressed={accessState.doctorsQuizzEnabled}
                  aria-label="Toggle DoctorsQuizz Access"
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${accessState.doctorsQuizzEnabled ? 'left-7' : 'left-1'}`}
                  />
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving || !hasPendingChanges}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              Save Changes
            </button>
          </div>

          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-red-700">
              <UserMinus size={16} />
              <h3 className="text-sm font-medium">Critical Actions</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onResetPassword(user.id)}
                disabled={isSaving}
                className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={handleNuclearAction}
                disabled={isSaving}
                className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isDoubleConfirm ? 'Confirm Delete Account' : 'Delete Account'}
              </button>
            </div>
            <p className="mt-2 text-xs text-red-500">
              Deletion requires double confirmation to avoid irreversible mistakes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
