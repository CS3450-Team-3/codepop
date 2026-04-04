// app/admin/settings/page.tsx
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
  Shield,
  Bell,
  Database,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { updateMe } from '@/models/api/user';
import { createNotification } from '@/models/api/notifications';
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
          <h3 className="text-base font-bold text-slate-900">
            Edit {label}
          </h3>
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
            {saving ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Broadcast notification modal ──────────────────────────────────────────────
function BroadcastModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await createNotification({
        Message: message.trim(),
        Type: type,
        Global: true,
        UserID: userId,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch {
      setError('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
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
            Broadcast Notification
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Type
          </label>
          <div className="flex gap-2">
            {['info', 'warning', 'alert'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl border py-2 text-xs font-semibold capitalize transition-colors ${
                  type === t
                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your broadcast message..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {success && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            <CheckCircle size={14} />
            Notification sent!
          </div>
        )}

        {error && (
          <p className="mb-3 text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending || success}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
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

function Row({
  icon,
  label,
  value,
  onClick,
  destructive = false,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  sub?: string;
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
      <div className="flex-1 min-w-0">
        <span
          className={`block text-sm font-medium ${
            destructive ? 'text-red-500' : 'text-slate-700'
          }`}
        >
          {label}
        </span>
        {sub && (
          <span className="text-xs text-slate-400">{sub}</span>
        )}
      </div>
      {value && (
        <span className="max-w-[120px] truncate text-sm text-slate-400">
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
export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

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
    admin: 'Admin',
    super_admin: 'Super Admin',
  };

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
          <h1 className="text-base font-bold text-slate-900">Settings</h1>
          <div className="w-9" />
        </div>
      </header>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-20 space-y-4">
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
          <span className="mt-1 rounded-full bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-600">
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

        {/* System tools — things that exist now */}
        <Section title="System">
          <Row
            icon={<Bell size={18} />}
            label="Broadcast Notification"
            sub="Send a global message to all users"
            onClick={() => setShowBroadcast(true)}
          />
          <Row
            icon={<Shield size={18} />}
            label="User Management"
            sub="Manage accounts and permissions"
            onClick={() => router.push('/admin/users')}
          />
          <Row
            icon={<Database size={18} />}
            label="Server Network"
            sub="Monitor P2P infrastructure"
            onClick={() => router.push('/admin/servers')}
          />
        </Section>

        {/* Placeholder for future system config */}
        <Section title="System Configuration">
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">
                  <Shield size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Security Policies
                  </p>
                  <p className="text-xs text-slate-400">
                    Rate limiting, auth rules
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                Coming soon
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">
                  <Database size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Sync Configuration
                  </p>
                  <p className="text-xs text-slate-400">
                    P2P sync interval, master list
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                Coming soon
              </span>
            </div>
          </div>
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
          CodePop v1.0.0 · Admin
        </p>
      </main>

      {/* Edit field modal */}
      {editField && (
        <EditModal
          label={editField.label}
          currentValue={editField.value}
          type={editField.type}
          onSave={(value) => handleSave(editField.key, value)}
          onClose={() => setEditField(null)}
        />
      )}

      {/* Broadcast modal */}
      {showBroadcast && (
        <BroadcastModal
          userId={user.id}
          onClose={() => setShowBroadcast(false)}
        />
      )}
    </div>
  );
}