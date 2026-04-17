// app/manage/settings/page.tsx
'use client';

import { useState } from 'react';
import {
  Menu,
  User,
  Mail,
  Lock,
  ChevronRight,
  LogOut,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { updateMe } from '@/models/api/user';
import Sidebar from '@/components/layout/Sidebar';

// ── Edit modal ────────────────────────────────────────────────────────────────
interface EditModalProps {
  label: string;
  currentValue: string;
  type?: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}

function EditModal({
  label,
  currentValue,
  type = 'text',
  onSave,
  onClose,
}: EditModalProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
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
          <h3 className="text-base font-bold text-slate-900">Edit {label}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || value === currentValue}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({
  icon,
  label,
  value,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition-colors last:border-0 ${
        onClick
          ? destructive
            ? 'hover:bg-red-50'
            : 'hover:bg-slate-50'
          : 'cursor-default'
      }`}
    >
      <span className={destructive ? 'text-red-400' : 'text-slate-400'}>
        {icon}
      </span>
      <span
        className={`flex-1 text-sm font-medium ${
          destructive ? 'text-red-500' : 'text-slate-700'
        }`}
      >
        {label}
      </span>
      {value && (
        <span className="max-w-[140px] truncate text-sm text-slate-400">
          {value}
        </span>
      )}
      {onClick && !destructive && (
        <ChevronRight size={16} className="shrink-0 text-slate-300" />
      )}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ManageSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editField, setEditField] = useState<{
    label: string;
    key: 'first_name' | 'last_name' | 'email';
    value: string;
    type?: string;
  } | null>(null);

  const handleSave = async (
    key: 'first_name' | 'last_name' | 'email',
    value: string
  ) => {
    await updateMe({ [key]: value });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    store_manager: 'Store Manager',
    logistics_manager: 'Logistics Manager',
    admin: 'Admin',
    super_admin: 'Super Admin',
  };

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
          <h1 className="text-base font-bold text-slate-900">Settings</h1>
          <div className="w-9" />
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-2xl font-bold text-white shadow-lg">
            {`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
              user.username[0].toUpperCase()}
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            {user.first_name && user.last_name
              ? `${user.first_name} ${user.last_name}`
              : user.username}
          </h2>
          <span className="mt-1 rounded-full bg-violet-50 px-3 py-0.5 text-xs font-semibold text-violet-600">
            {roleLabel[user.user_type ?? ''] ?? user.user_type}
          </span>

          {saveSuccess && (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
              <CheckCircle size={12} />
              Profile updated
            </div>
          )}
        </div>

        {/* Profile */}
        <Section title="Profile">
          <Row
            icon={<User size={18} />}
            label="First Name"
            value={user.first_name ?? '—'}
            onClick={() =>
              setEditField({
                label: 'First Name',
                key: 'first_name',
                value: user.first_name ?? '',
              })
            }
          />
          <Row
            icon={<User size={18} />}
            label="Last Name"
            value={user.last_name ?? '—'}
            onClick={() =>
              setEditField({
                label: 'Last Name',
                key: 'last_name',
                value: user.last_name ?? '',
              })
            }
          />
          <Row
            icon={<Mail size={18} />}
            label="Email"
            value={user.email ?? '—'}
            onClick={() =>
              setEditField({
                label: 'Email',
                key: 'email',
                value: user.email ?? '',
                type: 'email',
              })
            }
          />
          <Row
            icon={<Lock size={18} />}
            label="Username"
            value={user.username}
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row
            icon={<LogOut size={18} />}
            label="Sign Out"
            onClick={handleLogout}
            destructive
          />
        </Section>

        <p className="text-center text-xs text-slate-400">
          CodePop v1.0.0
        </p>
      </main>

      {editField && (
        <EditModal
          label={editField.label}
          currentValue={editField.value}
          type={editField.type}
          onSave={(value) => handleSave(editField.key, value)}
          onClose={() => setEditField(null)}
        />
      )}
    </div>
  );
}