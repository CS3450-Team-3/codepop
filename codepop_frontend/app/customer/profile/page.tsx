// app/customer/profile/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Server,
  X,
  Loader2,
  CheckCircle,
  Plus,
  ChevronRight,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { updateMe } from '@/models/api/user';
import {
  getUserPreferences,
  createPreference,
  deletePreference,
} from '@/models/api/preferences';
import { getUserDrinks } from '@/models/api/drinks';
import { getInventory } from '@/models/api/inventory';
import { Preference } from '@/models/types/preference';
import { Drink } from '@/models/types/drink';
import { Inventory } from '@/models/types/inventory';
import CustomizeModal from '@/components/modals/CustomizeModal';
import DrinkColorAvatar from '@/components/drinks/DrinkColorAvatar';

const SUGGESTED_TAGS = [
  'Fruity', 'Sweet', 'Sour', 'Citrus', 'Tropical', 'Berry',
  'Mint', 'Vanilla', 'Caramel', 'Coconut', 'Peach', 'Mango',
  'Watermelon', 'Cherry', 'Raspberry', 'Strawberry', 'Lime',
  'Lemon', 'Bubbly', 'Light', 'Bold', 'No Caffeine', 'Energy',
  'Creamy', 'Refreshing',
];

interface EditFieldModalProps {
  label: string;
  currentValue: string;
  type?: string;
  hint?: string;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}

function EditFieldModal({
  label,
  currentValue,
  type = 'text',
  hint,
  onSave,
  onClose,
}: EditFieldModalProps) {
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
        {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
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
            disabled={saving || value === currentValue || !value.trim()}
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

function InfoRow({
  icon,
  label,
  value,
  onClick,
  placeholder = '—',
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  onClick?: () => void;
  placeholder?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3.5 text-left last:border-0 transition-colors ${
        onClick ? 'hover:bg-slate-50' : 'cursor-default'
      }`}
    >
      <span className="text-slate-400">{icon}</span>
      <span className="w-24 shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      <span className="flex-1 truncate text-sm text-slate-800">
        {value || placeholder}
      </span>
      {onClick && (
        <ChevronRight size={15} className="shrink-0 text-slate-300" />
      )}
    </button>
  );
}

export default function CustomerProfilePage() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [favoriteDrinks, setFavoriteDrinks] = useState<Drink[]>([]);
  // Inventory only needed here for the "Order Again" modal on saved drinks
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // "Order Again" modal — pre-filled with a specific saved drink
  const [orderAgainDrink, setOrderAgainDrink] = useState<Drink | null>(null);

  const [editField, setEditField] = useState<{
    label: string;
    key: 'first_name' | 'last_name' | 'email';
    value: string;
    type?: string;
    hint?: string;
  } | null>(null);

  const [newPref, setNewPref] = useState('');
  const [addingPref, setAddingPref] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [prefs, drinks, inv] = await Promise.all([
        getUserPreferences(user.id),
        getUserDrinks(user.id),
        getInventory(),
      ]);
      setPreferences(prefs);
      setFavoriteDrinks(drinks);
      setInventory(inv);
    } catch {
      // Non-fatal
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveField = async (
    key: 'first_name' | 'last_name' | 'email',
    value: string
  ) => {
    await updateMe({ [key]: value });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddPreference = async (tag: string) => {
    if (!user) return;
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (
      preferences.some(
        (p) => p.Preference.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setPrefError('You already have that preference.');
      setTimeout(() => setPrefError(null), 2000);
      return;
    }
    setAddingPref(true);
    setPrefError(null);
    try {
      const pref = await createPreference({
        UserID: user.id,
        Preference: trimmed,
      });
      setPreferences((prev) => [...prev, pref]);
      setNewPref('');
    } catch {
      setPrefError('Could not save preference. Try again.');
    } finally {
      setAddingPref(false);
    }
  };

  const handleDeletePreference = async (prefId: number) => {
    try {
      await deletePreference(prefId);
      setPreferences((prev) =>
        prev.filter((p) => p.PreferenceID !== prefId)
      );
    } catch {
      // Silent
    }
  };

  if (!user) return null;

  const initials =
    `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
    user.username[0].toUpperCase();

  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;

  const addedTagNames = new Set(
    preferences.map((p) => p.Preference.toLowerCase())
  );
  const availableSuggestions = SUGGESTED_TAGS.filter(
    (t) => !addedTagNames.has(t.toLowerCase())
  );

  return (
    // pt-14 for fixed header, pb-24 for fixed bottom nav
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-14 space-y-4">
      {/* ── Avatar ── */}
      <div className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-600 text-2xl font-bold text-white shadow-lg">
          {initials}
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {displayName}
        </h1>
        <p className="text-sm text-slate-400">
          {user.email ?? `@${user.username}`}
        </p>
        {saveSuccess && (
          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
            <CheckCircle size={12} />
            Profile updated
          </div>
        )}
      </div>

      {/* ── Account ── */}
      <Section title="Account">
        <InfoRow
          icon={<User size={17} />}
          label="First Name"
          value={user.first_name}
          onClick={() =>
            setEditField({
              label: 'First Name',
              key: 'first_name',
              value: user.first_name ?? '',
            })
          }
        />
        <InfoRow
          icon={<User size={17} />}
          label="Last Name"
          value={user.last_name}
          onClick={() =>
            setEditField({
              label: 'Last Name',
              key: 'last_name',
              value: user.last_name ?? '',
            })
          }
        />
        <InfoRow
          icon={<Mail size={17} />}
          label="Email"
          value={user.email}
          onClick={() =>
            setEditField({
              label: 'Email',
              key: 'email',
              value: user.email ?? '',
              type: 'email',
            })
          }
        />
        <InfoRow
          icon={<Server size={17} />}
          label="Home Server"
          value={user.home_server ?? 'Default'}
          // hint="Assigned at registration."
        />
      </Section>

      {/* ── Flavor preferences ── */}
      <Section title="Flavor Preferences">
        <div className="px-4 py-4 space-y-4">
          {dataLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-violet-400" />
            </div>
          ) : preferences.length === 0 ? (
            <p className="text-sm text-slate-400">
              No preferences yet — add some to help AI make better
              recommendations!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences.map((pref) => (
                <span
                  key={pref.PreferenceID}
                  className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
                >
                  {pref.Preference}
                  <button
                    onClick={() =>
                      handleDeletePreference(pref.PreferenceID)
                    }
                    className="rounded-full text-violet-400 hover:text-violet-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {prefError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <AlertCircle size={13} />
              {prefError}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a preference..."
              value={newPref}
              onChange={(e) => setNewPref(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddPreference(newPref);
              }}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              onClick={() => handleAddPreference(newPref)}
              disabled={!newPref.trim() || addingPref}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              {addingPref ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add
            </button>
          </div>

          {availableSuggestions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddPreference(tag)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Saved drinks ── */}
      <Section title="Saved Drinks">
        {dataLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-violet-400" />
          </div>
        ) : favoriteDrinks.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Heart size={24} className="mb-2 text-slate-300" />
            <p className="text-sm text-slate-400">
              No saved drinks yet. Favorite a drink from the menu!
            </p>
          </div>
        ) : (
          favoriteDrinks.map((drink) => (
            <div
              key={drink.DrinkID}
              className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0"
            >
              <DrinkColorAvatar
                sodas={
                  Array.isArray(drink.SodaUsed)
                    ? drink.SodaUsed
                    : [drink.SodaUsed]
                }
                name={drink.Name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {drink.Name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {Array.isArray(drink.SodaUsed)
                    ? drink.SodaUsed.join(', ')
                    : drink.SodaUsed}
                  {drink.SyrupsUsed && drink.SyrupsUsed.length > 0
                    ? ` · ${drink.SyrupsUsed.slice(0, 2).join(', ')}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-violet-600">
                  ${drink.Price.toFixed(2)}
                </span>
                <button
                  onClick={() => setOrderAgainDrink(drink)}
                  className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
                >
                  Order Again
                </button>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Edit field modal */}
      {editField && (
        <EditFieldModal
          label={editField.label}
          currentValue={editField.value}
          type={editField.type}
          hint={editField.hint}
          onSave={(value) => handleSaveField(editField.key, value)}
          onClose={() => setEditField(null)}
        />
      )}

      {/* Order Again modal — pre-filled with saved drink */}
      {orderAgainDrink && (
        <CustomizeModal
          drink={orderAgainDrink}
          inventory={inventory}
          onClose={() => setOrderAgainDrink(null)}
        />
      )}
    </main>
  );
}