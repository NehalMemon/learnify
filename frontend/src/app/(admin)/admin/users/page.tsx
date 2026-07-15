'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Search, ShieldCheck, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { ManageUserModal, type ManagedUser } from '@/components/admin/users/ManageUserModal';

type UserRole = 'STUDENT' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'DEACTIVATED';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  status: UserStatus;
  learnifyEnabled: boolean;
  doctorsQuizzEnabled: boolean;
  latestAttemptId: string | null;
};

type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  role?: UserRole;
  createdAt: string;
  status?: UserStatus;
  learnifyEnabled?: boolean;
  doctorsQuizzEnabled?: boolean;
  quizAttempts?: Array<{ id: string }>;
};

const PAGE_SIZE = 10;

type AccessFilter = 'ALL' | 'DOCTORS_QUIZZ_ENABLED' | 'LEARNIFY_DISABLED';

const roleClasses: Record<UserRole, string> = {
  STUDENT: 'bg-sky-50 text-sky-700 border border-sky-200',
  ADMIN: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const statusClasses: Record<UserStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  DEACTIVATED: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const toUserRow = (user: ApiUser): UserRow => {
  const hasStatus = user.status === 'ACTIVE' || user.status === 'DEACTIVATED';
  const inferredStatus = user.learnifyEnabled || user.doctorsQuizzEnabled ? 'ACTIVE' : 'DEACTIVATED';
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: (user.role as UserRole) || 'STUDENT',
    createdAt: user.createdAt,
    status: hasStatus ? user.status : inferredStatus,
    learnifyEnabled: Boolean(user.learnifyEnabled),
    doctorsQuizzEnabled: Boolean(user.doctorsQuizzEnabled),
    latestAttemptId: user.quizAttempts?.[0]?.id ?? null,
  };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('ALL');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await adminApi.listUsers({
          page,
          limit: PAGE_SIZE,
          search: searchQuery || undefined,
          timestamp: new Date().getTime(),
        });
        const payload = response.data?.data;
        const userList = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
        const pagination = payload?.pagination || response.data?.pagination;
        setUsers(userList.map(toUserRow));
        setTotalPages(Math.max(1, Number(pagination?.pages || pagination?.totalPages || 1)));
      } catch {
        setError('Failed to load users. Please retry.');
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [page, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (accessFilter === 'DOCTORS_QUIZZ_ENABLED') {
      return users.filter((user) => user.doctorsQuizzEnabled);
    }
    if (accessFilter === 'LEARNIFY_DISABLED') {
      return users.filter((user) => !user.learnifyEnabled);
    }
    return users;
  }, [accessFilter, users]);

  const tableInfo = useMemo(() => {
    if (!filteredUsers.length) return 'No users found for this filter.';
    return `Showing ${filteredUsers.length} users on page ${page} of ${totalPages}`;
  }, [filteredUsers.length, page, totalPages]);

  const patchUserOptimistically = async (userId: string, changes: Partial<UserRow>, action: () => Promise<unknown>) => {
    const previous = users;
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...changes } : user)));
    try {
      await action();
      if (selectedUser?.id === userId) {
        setSelectedUser((current) => (current ? { ...current, ...changes } : current));
      }
    } catch {
      setUsers(previous);
      throw new Error('Operation failed');
    }
  };

  const handleSaveUserChanges = async (
    userId: string,
    changes: {
      role: UserRole;
      status: UserStatus;
      learnifyEnabled: boolean;
      doctorsQuizzEnabled: boolean;
    }
  ) => {
    const currentUser = users.find((user) => user.id === userId);
    if (!currentUser) return;

    const roleChanged = currentUser.role !== changes.role;
    const accessChanged =
      currentUser.learnifyEnabled !== changes.learnifyEnabled ||
      currentUser.doctorsQuizzEnabled !== changes.doctorsQuizzEnabled;
    const statusChanged = currentUser.status !== changes.status;

    if (!roleChanged && !accessChanged && !statusChanged) return;

    setIsSaving(true);
    try {
      await patchUserOptimistically(
        userId,
        {
          role: changes.role,
          status: changes.status,
          learnifyEnabled: changes.learnifyEnabled,
          doctorsQuizzEnabled: changes.doctorsQuizzEnabled,
        },
        async () => {
          if (roleChanged) {
            await adminApi.updateUserRole(userId, { role: changes.role });
          }

          if (accessChanged || statusChanged) {
            await adminApi.updateUserAccess(userId, {
              learnifyEnabled: changes.learnifyEnabled,
              doctorsQuizzEnabled: changes.doctorsQuizzEnabled,
            });
          }
        }
      );

      toast.success('User settings updated successfully');
    } catch {
      toast.error('Failed to save user settings');
      throw new Error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAccessBadge = (enabled: boolean) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
        enabled
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border border-gray-300 bg-gray-100 text-gray-500'
      }`}
    >
      {enabled ? <ShieldCheck size={12} /> : <Lock size={12} />}
      {enabled ? 'Enabled' : 'Disabled'}
    </span>
  );

  const handleResetPassword = async (userId: string) => {
    setIsSaving(true);
    try {
      await adminApi.resetUserPassword(userId);
      toast.success('Password reset request sent');
    } catch {
      toast.error('Unable to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const previous = users;
    setIsSaving(true);
    setUsers((current) => current.filter((user) => user.id !== userId));
    try {
      await adminApi.deleteUser(userId);
      setSelectedUser(null);
      toast.success('User account removed');
    } catch {
      setUsers(previous);
      toast.error('Unable to delete account');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">User Command Center</h1>
        <p className="text-sm text-gray-500">Control user access, account roles, and platform status instantly.</p>
      </header>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xl">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email"
              className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
              aria-label="Search users by name or email"
            />
          </div>
          <select
            value={accessFilter}
            onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 sm:w-auto"
            aria-label="Filter by platform access"
          >
            <option value="ALL">All Users</option>
            <option value="DOCTORS_QUIZZ_ENABLED">Users with DoctorsQuizz Enabled</option>
            <option value="LEARNIFY_DISABLED">Users with Learnify Disabled</option>
          </select>
        </div>
      </div>

      <div className="table-scroll rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Learnify Access</th>
                <th className="px-4 py-3">Dr.Quizz Access</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Reports</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{user.fullName}</p>
                    <p className="text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleClasses[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[user.status]}`}>
                      <span className={`h-2 w-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">{renderAccessBadge(user.learnifyEnabled)}</td>
                  <td className="px-4 py-4">{renderAccessBadge(user.doctorsQuizzEnabled)}</td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-4">
                    {user.latestAttemptId ? (
                      <Link
                        href={`/admin/users/${user.id}/attempts/${user.latestAttemptId}`}
                        className="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                      >
                        View Report
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-500">No attempts</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 font-medium text-white transition hover:bg-purple-700"
                    >
                      <UserCog size={15} />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>{tableInfo}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || isLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages || isLoading}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <ManageUserModal
        isOpen={Boolean(selectedUser)}
        user={selectedUser as ManagedUser | null}
        isSaving={isSaving}
        onClose={() => setSelectedUser(null)}
        onSaveChanges={handleSaveUserChanges}
        onResetPassword={handleResetPassword}
        onDeleteAccount={handleDeleteUser}
      />
    </div>
  );
}
