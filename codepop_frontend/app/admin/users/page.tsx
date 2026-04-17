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
  MapPin,
  Store,
} from 'lucide-react';
import { getUsers, deleteUserById, editUserById } from '@/models/api/user';
import { getServers } from '@/models/api/admin';
import { GetUser, UserType } from '@/models/types/user';
import { Server } from '@/models/types/server';
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

function EditUserModal({
  user,
  currentAdmin,
  onSave,
  onClose,
}: {
  user: GetUser;
  currentAdmin?: GetUser;
  onSave: (newRole: UserType, homeServerId?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserType>(
    (user.user_type as UserType) ?? 'customer'
  );
  const [selectedStore, setSelectedStore] = useState<string>(
    user.home_server ?? ''
  );
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = currentAdmin?.user_type === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      const loadServers = async () => {
        setLoadingServers(true);
        try {
          const data = await getServers();
          setServers(data);
        } catch {
          console.error('Failed to load servers');
        } finally {
          setLoadingServers(false);
        }
      };
      loadServers();
    }
  }, [isSuperAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selectedRole, isSuperAdmin ? selectedStore : undefined);
      onClose();
    } catch {
      setError('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = selectedRole !== user.user_type || (isSuperAdmin && selectedStore !== (user.home_server ?? ''));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Edit User
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

        {/* Role Selection */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            User Role
          </p>
          <div className="space-y-2">
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
        </div>

        {/* Store Selection (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Assigned Store / Home Server
            </p>
            {loadingServers ? (
              <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                Loading stores...
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                >
                  <option value="">Default / Not Assigned</option>
                  {servers.map((s) => (
                    <option key={s.ServerID} value={s.ServerID}>
                      {s.StoreName || s.ServerID}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <MapPin size={16} />
                </div>
              </div>
            )}
          </div>
        )}

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
            disabled={saving || !hasChanges}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Save Changes'
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
  onEditUser,
}: {
  user: GetUser;
  currentUserId: string;
  onDelete: (user: GetUser) => void;
  onEditUser: (user: GetUser) => void;
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
            <div className="flex justify-between items-center py-0.5">
              <span className="flex items-center gap-1.5 text-slate-500">
                <MapPin size={13} className="text-slate-400" />
                Region
              </span>
              <span className="font-semibold text-slate-700">
                {user.home_server_details?.RegionName ?? user.home_server_details?.Region ?? 'Not assigned'}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Store size={13} className="text-slate-400" />
                Store
              </span>
              <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                {user.home_server_details?.StoreName ?? user.home_server ?? 'Not assigned'}
              </span>
            </div>
          </div>

          {/* Actions — disabled for self to prevent lockout */}
          {!isSelf && (
            <div className="flex gap-2">
              <button
                onClick={() => onEditUser(user)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
              >
                <Shield size={13} />
                Edit User
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
  { id: 'logistics_manager', label: 'Logistics' },
  { id: 'repair_staff', label: 'Repairs' },
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
  const [roleFilters, setRoleFilters] = useState<RoleFilter[]>(['all']);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [allServers, setAllServers] = useState<Server[]>([]);

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<GetUser | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<GetUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
      
      const serversData = await getServers();
      setAllServers(serversData);
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

  const handleEditUser = useCallback(
    async (target: GetUser, newRole: UserType, homeServerId?: string) => {
      await editUserById(target.id, {
        username: target.username,
        password: '',
        first_name: target.first_name ?? '',
        last_name: target.last_name ?? '',
        user_type: newRole,
        home_server: homeServerId,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, user_type: newRole, home_server: homeServerId ?? u.home_server }
            : u
        )
      );
    },
    []
  );

  const toggleRoleFilter = (id: RoleFilter) => {
    setRoleFilters((prev) => {
      if (id === 'all') return ['all'];
      
      let next = prev.filter((f) => f !== 'all');
      if (next.includes(id)) {
        next = next.filter((f) => f !== id);
      } else {
        next = [...next, id];
      }
      
      return next.length === 0 ? ['all'] : next;
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const isAllRoles = roleFilters.includes('all');
    const matchesRole =
      isAllRoles || (u.user_type && roleFilters.includes(u.user_type as RoleFilter));
    const matchesStore =
      storeFilter === 'all' || u.home_server === storeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.first_name ?? '').toLowerCase().includes(q) ||
      (u.last_name ?? '').toLowerCase().includes(q);
    return matchesRole && matchesStore && matchesSearch;
  });

  return (
    <div className="min-h-screen app-bg relative">
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

        {/* Search & Store Filter */}
        <div className="flex gap-2 px-4 pb-3 pt-1">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search..."
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

          <div className="relative w-32 shrink-0">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-xs font-bold text-slate-600 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">All Stores</option>
              {allServers.map((s) => (
                <option key={s.ServerID} value={s.ServerID}>
                  {s.StoreName || s.ServerID.slice(0, 8)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        {/* Role filter tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleRoleFilter(f.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                roleFilters.includes(f.id)
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

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-44 space-y-3">
        {/* Count */}
        {!loading && !error && (
          <p className="px-1 text-xs text-slate-400">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {!roleFilters.includes('all') && ` · ${roleFilters.length} roles selected`}
            {storeFilter !== 'all' && ` · ${allServers.find(s => s.ServerID === storeFilter)?.StoreName || 'Selected Store'}`}
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
            {(search || !roleFilters.includes('all') || storeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilters(['all']);
                  setStoreFilter('all');
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
              onEditUser={setEditUserTarget}
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

      {editUserTarget && (
        <EditUserModal
          user={editUserTarget}
          currentAdmin={currentUser as unknown as GetUser}
          onSave={(role, homeServerId) => handleEditUser(editUserTarget, role, homeServerId)}
          onClose={() => setEditUserTarget(null)}
        />
      )}
    </div>
  );
}