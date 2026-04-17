'use client';

import { useState } from 'react';
import {
  Twitter,
  Facebook,
  Instagram,
  MessageCircle,
  Mail,
  Link as LinkIcon,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/app/contextProviders/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

const SHARE_TEXT = 'Check out CodePop — build your perfect custom soda! 🥤 #SocialDrinking';

type ShareTarget = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
  buildUrl: (url: string, text: string) => string;
};

const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'twitter',
    label: 'X / Twitter',
    Icon: Twitter,
    accent: 'bg-slate-900 text-white',
    buildUrl: (url, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}&hashtags=SocialDrinking`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    Icon: Facebook,
    accent: 'bg-blue-600 text-white',
    buildUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    Icon: Instagram,
    accent: 'bg-gradient-to-br from-pink-500 via-red-500 to-amber-400 text-white',
    // IG has no direct web-share intent — we open the site and copy caption
    buildUrl: () => 'https://www.instagram.com/',
  },
  {
    id: 'sms',
    label: 'Text Message',
    Icon: MessageCircle,
    accent: 'bg-green-500 text-white',
    buildUrl: (url, text) =>
      `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    id: 'email',
    label: 'Email',
    Icon: Mail,
    accent: 'bg-violet-500 text-white',
    buildUrl: (url, text) =>
      `mailto:?subject=${encodeURIComponent(
        'Check out CodePop'
      )}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
];

export default function SharePage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://codepop.app';

  const handleShare = async (target: ShareTarget) => {
    // For Instagram, copy the caption so the user can paste it
    if (target.id === 'instagram') {
      try {
        await navigator.clipboard.writeText(`${SHARE_TEXT} ${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // non-fatal
      }
    }

    const url = target.buildUrl(shareUrl, SHARE_TEXT);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // non-fatal
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onMenuClick={() => setSidebarOpen(true)} title="Share" />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-20">
        {/* ── Hero ── */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            Share with friends 💜
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Spread the word and get rewarded for it.
          </p>
        </div>

        {/* ── #SocialDrinking promo ── */}
        {user?.user_type === 'customer' && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-5 text-white shadow-sm">
            <p className="text-sm font-bold">Get 10% off your next order 🎉</p>
            <p className="mt-1 text-xs text-violet-100">
              Post on any platform below with{' '}
              <span className="font-semibold">#SocialDrinking</span> and show us
              at the counter to redeem.
            </p>
          </div>
        )}

        {/* ── Share targets ── */}
        <h2 className="mb-3 text-sm font-bold text-slate-700">Share to</h2>
        <div className="grid grid-cols-3 gap-3">
          {SHARE_TARGETS.map((target) => (
            <button
              key={target.id}
              onClick={() => handleShare(target)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md active:scale-95"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${target.accent}`}
              >
                <target.Icon size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-700 text-center leading-tight">
                {target.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Copy link ── */}
        <h2 className="mt-6 mb-3 text-sm font-bold text-slate-700">Or copy link</h2>
        <button
          onClick={handleCopyLink}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              {copied ? (
                <Check size={18} className="text-green-600" />
              ) : (
                <LinkIcon size={18} className="text-slate-600" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">
                {copied ? 'Copied!' : 'Copy link'}
              </p>
              <p className="max-w-[220px] truncate text-xs text-slate-400">
                {shareUrl}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </main>

      <BottomNav onCustomizeClick={() => {}} />
    </div>
  );
}