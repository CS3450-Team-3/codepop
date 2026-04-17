'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Trophy,
  Medal,
  Crown,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import { getLeaderboard } from '@/models/api/leaderboard';
import {
  LeaderboardEntry,
  LeaderboardResponse,
} from '@/models/types/leaderboard';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

// ── Helpers ──────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// Podium styling per medal position
const PODIUM_STYLES: Record<
  number,
  { ring: string; bg: string; text: string; Icon: React.ComponentType<{ size?: number; className?: string }>; label: string }
> = {
  1: {
    ring: 'ring-amber-300',
    bg: 'bg-gradient-to-br from-amber-400 to-amber-500',
    text: 'text-amber-600',
    Icon: Crown,
    label: '1st',
  },
  2: {
    ring: 'ring-slate-300',
    bg: 'bg-gradient-to-br from-slate-300 to-slate-400',
    text: 'text-slate-500',
    Icon: Medal,
    label: '2nd',
  },
  3: {
    ring: 'ring-orange-300',
    bg: 'bg-gradient-to-br from-orange-400 to-orange-500',
    text: 'text-orange-600',
    Icon: Medal,
    label: '3rd',
  },
};

// ── Page ─────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLeaderboard('local');
      setData(result);
    } catch {
      setError('Could not load the leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  const isCurrentUser = (entry: LeaderboardEntry): boolean =>
    !!user && entry.userName.toLowerCase() === user.username.toLowerCase();

  const top5 = data?.top5 ?? [];
  const podium = top5.slice(0, 3);
  const rest = top5.slice(3); // positions 4–5
  const local = data?.localLeaderboard ?? [];

  const userInTop5 = top5.some(isCurrentUser);
  const userScore =
    top5.find(isCurrentUser)?.score ??
    local.find(isCurrentUser)?.score ??
    null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        title="Leaderboard"
        rightAction={
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh leaderboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-20 space-y-6">
        {/* ── Hero ── */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leaderboard 🏆</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Top drinkers at your home store.
          </p>
        </div>

        {/* ── User summary card ── */}
        {user && userScore !== null && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">
                  Your stats
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {userScore}{' '}
                  <span className="text-sm font-medium text-violet-100">
                    drink{userScore === 1 ? '' : 's'} ordered
                  </span>
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <TrendingUp size={22} />
              </div>
            </div>
            {userInTop5 && (
              <p className="mt-2 text-xs font-semibold text-violet-100">
                🎉 You&apos;re in the top 5!
              </p>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Loader2 size={28} className="animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Loading leaderboard...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="rounded-2xl bg-red-50 p-5 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs font-bold text-red-500 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && top5.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <Users className="mx-auto mb-2 text-slate-300" size={28} />
            <p className="text-sm font-semibold text-slate-600">
              No rankings yet
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Be the first to order and claim the top spot!
            </p>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && top5.length > 0 && (
          <>
            {/* Podium — top 3 */}
            {podium.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold text-slate-700">
                  Top of the charts
                </h2>
                <Podium
                  entries={podium}
                  isCurrentUser={isCurrentUser}
                />
              </section>
            )}

            {/* Ranks 4–5 */}
            {rest.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold text-slate-700">
                  Honorable mentions
                </h2>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  {rest.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.position}
                      entry={entry}
                      highlight={isCurrentUser(entry)}
                      showDivider={i < rest.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Local leaderboard (only if user is outside top 5) */}
            {local.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-700">
                    Your ranking
                  </h2>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                    Nearby
                  </span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  {local.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.position}
                      entry={entry}
                      highlight={isCurrentUser(entry)}
                      showDivider={i < local.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Footer note */}
            <p className="text-center text-[11px] text-slate-400">
              Rankings are based on total drinks ordered at your home store.
            </p>
          </>
        )}
      </main>

      <BottomNav onCustomizeClick={() => {}} />
    </div>
  );
}

// ── Podium component ─────────────────────────────────────────────────
function Podium({
  entries,
  isCurrentUser,
}: {
  entries: LeaderboardEntry[];
  isCurrentUser: (e: LeaderboardEntry) => boolean;
}) {
  // Find the top 3 by position (handles cases where <3 entries exist)
  const first = entries.find((e) => e.position === 1);
  const second = entries.find((e) => e.position === 2);
  const third = entries.find((e) => e.position === 3);

  return (
    <div className="grid grid-cols-3 items-end gap-2 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
      {/* 2nd */}
      <div className="flex flex-col items-center">
        {second ? (
          <PodiumCard entry={second} height="h-20" mine={isCurrentUser(second)} />
        ) : (
          <PodiumPlaceholder position={2} height="h-20" />
        )}
      </div>

      {/* 1st */}
      <div className="flex flex-col items-center">
        {first ? (
          <PodiumCard entry={first} height="h-28" mine={isCurrentUser(first)} />
        ) : (
          <PodiumPlaceholder position={1} height="h-28" />
        )}
      </div>

      {/* 3rd */}
      <div className="flex flex-col items-center">
        {third ? (
          <PodiumCard entry={third} height="h-16" mine={isCurrentUser(third)} />
        ) : (
          <PodiumPlaceholder position={3} height="h-16" />
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  height,
  mine,
}: {
  entry: LeaderboardEntry;
  height: string;
  mine: boolean;
}) {
  const style = PODIUM_STYLES[entry.position];
  const { Icon } = style;

  return (
    <div className="flex w-full flex-col items-center">
      {/* Avatar */}
      <div className="relative mb-2">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-4 ${style.ring} ${
            mine ? 'ring-violet-400' : ''
          } bg-gradient-to-br from-violet-500 to-violet-600`}
        >
          {getInitials(entry.userName)}
        </div>
        <div
          className={`absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${style.bg} shadow`}
        >
          <Icon size={12} className="text-white" />
        </div>
      </div>

      {/* Name + score */}
      <p
        className={`max-w-full truncate text-xs font-bold ${
          mine ? 'text-violet-700' : 'text-slate-800'
        }`}
        title={entry.userName}
      >
        {entry.userName}
        {mine && ' (you)'}
      </p>
      <p className={`text-[11px] font-semibold ${style.text}`}>
        {entry.score} drink{entry.score === 1 ? '' : 's'}
      </p>

      {/* Pillar */}
      <div
        className={`mt-2 w-full rounded-t-xl ${style.bg} ${height} flex items-start justify-center pt-1.5 shadow-inner`}
      >
        <span className="text-xs font-bold text-white/90">{style.label}</span>
      </div>
    </div>
  );
}

function PodiumPlaceholder({
  position,
  height,
}: {
  position: number;
  height: string;
}) {
  return (
    <div className="flex w-full flex-col items-center opacity-40">
      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-400">
        <Users size={18} />
      </div>
      <p className="text-xs font-semibold text-slate-400">—</p>
      <p className="text-[11px] text-slate-400">0 drinks</p>
      <div
        className={`mt-2 w-full rounded-t-xl bg-slate-200 ${height} flex items-start justify-center pt-1.5`}
      >
        <span className="text-xs font-bold text-slate-400">
          {position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'}
        </span>
      </div>
    </div>
  );
}

// ── List row ─────────────────────────────────────────────────────────
function LeaderboardRow({
  entry,
  highlight,
  showDivider,
}: {
  entry: LeaderboardEntry;
  highlight: boolean;
  showDivider: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        highlight ? 'bg-violet-50' : 'bg-white'
      } ${showDivider ? 'border-b border-slate-100' : ''}`}
    >
      {/* Rank badge */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
          highlight
            ? 'bg-violet-600 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        #{entry.position}
      </div>

      {/* Avatar + name */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${
            highlight
              ? 'bg-gradient-to-br from-violet-500 to-violet-600'
              : 'bg-slate-400'
          }`}
        >
          {getInitials(entry.userName)}
        </div>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${
              highlight ? 'text-violet-700' : 'text-slate-800'
            }`}
          >
            {entry.userName}
            {highlight && (
              <span className="ml-1.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white align-middle">
                YOU
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1 text-right shrink-0">
        <Trophy
          size={12}
          className={highlight ? 'text-violet-500' : 'text-slate-300'}
        />
        <span
          className={`text-sm font-bold ${
            highlight ? 'text-violet-700' : 'text-slate-700'
          }`}
        >
          {entry.score}
        </span>
      </div>
    </div>
  );
}