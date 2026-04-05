// app/admin/users/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  RefreshCw,
  Loader2,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  X,
  Shield,
  User,
} from 'lucide-react';
import { getUsers, deleteUserById, editUserById } from '@/models/api/user';
import { GetUser, UserType } from '@/models/types/user';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/app/contextProviders/AuthContext';

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<
  UserType,
  { label: string; color: string }
> = {
  customer: {
    label: 'Customer',
    color: 'bg-slate-100 text-slate-600',
  },
  store_manager: {
    label: 'Store Manager',
    color: 'bg-blue-50 text-blue-700',
  },
  logistics_manager: {
    label: 'Logistics Manager',
    color: 'bg-cyan-50 text-cyan-700',
  },
  repair_staff: {
    label: 'Repair Staff',
    color: 'bg-orange-50 text-orange-700',
  },
  admin: {
    label: 'Admin',
    color: 'bg-violet-50 text-violet-700',
  },
  super_admin: {
    label: 'Super Admin',
    color: 'bg-rose-50 text-rose-700',
  },
};

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({
  user,
  onConfirm,
  onClose,
}: {
  user: GetUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError('Failed to delete user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Delete User
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Are you sure you want to delete{' '}
            <span className="font-bold">{user.username}</span>? This
            action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit role modal ───────────────────────────────────────────────────────────
const ASSIGNABLE_ROLES: UserType[] = [
  'customer',
  'store_manager',
  'logistics_manager',
  'repair_staff',
  'admin',
  'super_admin',
];

function EditRoleModal({
  user,
  onSave,
  onClose,
}: {
  user: GetUser;
  onSave: (newRole: UserType) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserType>(
    (user.user_type as UserType) ?? 'customer'
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selectedRole);
      onClose();
    } catch {
      setError('Failed to update role. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit Role
            </h3>
            <p className="text-sm text-slate-500">{user.username}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 space-y-2">
          {ASSIGNABLE_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-violet-400 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{config.label}</span>
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-violet-600" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              saving || selectedRole === user.user_type
            }
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Save Role'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User card ─────────────────────────────────────────────────────────────────
function UserCard({
  user,
  currentUserId,
  onDelete,
  onEditRole,
}: {
  user: GetUser;
  currentUserId: string;
  onDelete: (user: GetUser) => void;
  onEditRole: (user: GetUser) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelf = user.id === currentUserId;
  const roleConfig =
    ROLE_CONFIG[(user.user_type as UserType) ?? 'customer'];

  const initials =
    `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
    user.username[0].toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </p>
            {isSelf && (
              <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                You
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">@{user.username}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleConfig.color}`}
          >
            {roleConfig.label}
          </span>
          {expanded ? (
            <ChevronUp size={15} className="text-slate-400" />
          ) : (
            <ChevronDown size={15} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          {/* Details */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-xs text-slate-500 truncate max-w-[180px]">
                {user.id}
              </span>
            </div>
            {user.is_staff && (
              <div className="flex justify-between">
                <span className="text-slate-500">Staff</span>
                <span className="font-semibold text-blue-600">Yes</span>
              </div>
            )}
            {user.is_superuser && (
              <div className="flex justify-between">
                <span className="text-slate-500">Superuser</span>
                <span className="font-semibold text-rose-600">Yes</span>
              </div>
            )}
          </div>

          {/* Actions — disabled for self to prevent lockout */}
          {!isSelf && (
            <div className="flex gap-2">
              <button
                onClick={() => onEditRole(user)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
              >
                <Shield size={13} />
                Edit Role
              </button>
              <button
                onClick={() => onDelete(user)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
type RoleFilter = 'all' | UserType;

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'customer', label: 'Customers' },
  { id: 'store_manager', label: 'Managers' },
  { id: 'admin', label: 'Admins' },
  { id: 'super_admin', label: 'Super Admins' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<GetUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<GetUser | null>(null);
  const [editRoleTarget, setEditRoleTarget] = useState<GetUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // getUsers() will return GetUser[] once backend is updated
      const data = await getUsers() as unknown as GetUser[];
      setUsers(Array.isArray(data) ? data : [data]);
    } catch {
      setError('Could not load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async (target: GetUser) => {
    await deleteUserById(target.id);
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
  }, []);

  const handleEditRole = useCallback(
    async (target: GetUser, newRole: UserType) => {
      const updated = await editUserById(target.id, {
        username: target.username,
        password: '',
        first_name: target.first_name ?? '',
        last_name: target.last_name ?? '',
        user_type: newRole,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, user_type: newRole }
            : u
        )
      );
    },
    []
  );

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchesRole =
      roleFilter === 'all' || u.user_type === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.first_name ?? '').toLowerCase().includes(q) ||
      (u.last_name ?? '').toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 z-40 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-bold text-slate-900">
            User Management
          </h1>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 pt-1">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Role filter tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setRoleFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                roleFilter === f.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-36 space-y-3">
        {/* Count */}
        {!loading && !error && (
          <p className="px-1 text-xs text-slate-400">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {roleFilter !== 'all' && ` · ${ROLE_CONFIG[roleFilter as UserType]?.label}`}
            {search && ` matching "${search}"`}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2
              size={28}
              className="animate-spin text-violet-500 mb-3"
            />
            <p className="text-sm">Loading users...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle
              className="mx-auto mb-2 text-red-400"
              size={22}
            />
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs font-bold text-red-500 underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Users size={28} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              No users found
            </p>
            {(search || roleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                }}
                className="mt-3 text-xs font-bold text-violet-500 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUserId={currentUser?.id ?? ''}
              onDelete={setDeleteTarget}
              onEditRole={setEditRoleTarget}
            />
          ))
        )}
      </main>

      {/* Modals */}
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {editRoleTarget && (
        <EditRoleModal
          user={editRoleTarget}
          onSave={(role) => handleEditRole(editRoleTarget, role)}
          onClose={() => setEditRoleTarget(null)}
        />
      )}
    </div>
  );
}