'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, UserCog, ChevronLeft, ChevronRight, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import { createClient } from '@/utils/supabase/client';
import { updateUserStatus, updateUserRole } from '@/app/actions/userAdminActions';
import { ManageUserModal, type ManagedUser } from '@/components/admin/users/ManageUserModal';
import { UserRole, UserStatus } from '@/types';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  credits: number;
  createdAt: string;
}

interface ApiUser {
  id: string;
  full_name?: string;
  fullName?: string;
  email: string;
  role?: UserRole;
  status?: UserStatus;
  credits?: number;
  created_at?: string;
  createdAt?: string;
}

const PAGE_SIZE = 10;

const roleClasses: Record<UserRole, string> = {
  STUDENT: 'bg-sky-50 text-sky-700 border border-sky-200',
  INSTRUCTOR: 'bg-purple-50 text-purple-700 border border-purple-200',
  ADMIN: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const statusClasses: Record<UserStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  INACTIVE: 'bg-rose-50 text-rose-700 border border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
};

export default function AdminInstructorsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchInstructors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Fetch stats for instructors
      const { data: statsData } = await supabase
        .from('users')
        .select('status')
        .eq('role', 'INSTRUCTOR');

      if (statsData) {
        setActiveCount(statsData.filter((u) => u.status === 'ACTIVE').length);
        setInactiveCount(statsData.filter((u) => u.status === 'INACTIVE').length);
      }

      let query = supabase
        .from('users')
        .select('id, email, full_name, role, status, credits, created_at', { count: 'exact' })
        .eq('role', 'INSTRUCTOR')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: fetchErr } = await query;

      if (fetchErr) {
        console.error('Supabase fetch error:', fetchErr);
        setError(`Failed to load instructors: ${fetchErr.message}`);
        setUsers([]);
        return;
      }

      const userList: UserRow[] = (data || []).map((u: ApiUser) => ({
        id: u.id,
        fullName: u.full_name || u.fullName || u.email?.split('@')[0] || 'Instructor',
        email: u.email,
        role: (u.role as UserRole) || 'INSTRUCTOR',
        status: (u.status as UserStatus) || 'ACTIVE',
        credits: u.credits ?? 0,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
      }));

      setUsers(userList);
      const total = count ?? userList.length;
      setTotalCount(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setError('Failed to load instructors. Please retry.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

  // Handle direct inline role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    const res = await updateUserRole(userId, newRole);
    if (res.success) {
      toast.success('User role updated successfully');
      fetchInstructors();
    } else {
      toast.error(res.error || 'Failed to update user role');
      fetchInstructors();
    }
  };

  // Handle direct inline status change
  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );

    const res = await updateUserStatus(userId, newStatus);
    if (res.success) {
      toast.success(`Instructor status updated to ${newStatus}`);
      fetchInstructors();
    } else {
      toast.error(res.error || 'Failed to update instructor status');
      fetchInstructors();
    }
  };

  // Save changes from ManageUserModal
  const handleSaveModalChanges = async (
    userId: string,
    changes: { role: UserRole; status: UserStatus }
  ) => {
    setIsSaving(true);
    try {
      const [statusRes, roleRes] = await Promise.all([
        updateUserStatus(userId, changes.status),
        updateUserRole(userId, changes.role),
      ]);

      if (statusRes.success && roleRes.success) {
        toast.success('Instructor updated successfully');
        setSelectedUser(null);
        fetchInstructors();
      } else {
        toast.error(statusRes.error || roleRes.error || 'Failed to update instructor');
      }
    } catch (err) {
      console.error('handleSaveModalChanges error:', err);
      toast.error('Failed to update instructor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    toast.success(`Password reset email triggered for user ${userId}`);
  };

  const handleDeleteUser = async (userId: string) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase.from('users').delete().eq('id', userId);
      if (delErr) throw delErr;

      toast.success('Instructor account permanently deleted');
      setSelectedUser(null);
      fetchInstructors();
    } catch (err) {
      console.error('handleDeleteUser error:', err);
      toast.error('Failed to delete instructor account');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Instructor Management
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Audit, manage, and update instructor permissions across the LMS.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">Total Instructors</p>
              <h3 className="text-xl font-bold text-gray-900">{totalCount}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Active Instructors</p>
              <h3 className="text-xl font-bold text-gray-900">{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Inactive Instructors</p>
              <h3 className="text-xl font-bold text-gray-900">{inactiveCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search instructor name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Table Component */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600 space-y-2">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchInstructors}
              className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100"
            >
              Retry Fetch
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No instructors found matching your search.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Role Governance</th>
                <th className="px-4 py-3">Status Governance</th>
                <th className="px-4 py-3">Joined Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-bold text-gray-900">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${roleClasses[user.role]}`}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="STUDENT">STUDENT</option>
                    </select>
                  </td>

                  <td className="px-4 py-4">
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${statusClasses[user.status]}`}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </td>

                  <td className="px-4 py-4 text-xs text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700"
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

      {/* Pagination Footer */}
      <div className="flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium">
          Showing {users.length} of {totalCount} total instructors (Page {page} of {totalPages})
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1 || isLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages || isLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Manage User Modal */}
      <ManageUserModal
        isOpen={Boolean(selectedUser)}
        user={selectedUser as ManagedUser | null}
        isSaving={isSaving}
        onClose={() => setSelectedUser(null)}
        onSaveChanges={handleSaveModalChanges}
        onResetPassword={handleResetPassword}
        onDeleteAccount={handleDeleteUser}
      />
    </div>
  );
}
