'use client';

import { useRouter } from 'next/navigation';
import { X, Share2, Hash, Camera, Gift } from 'lucide-react';

interface SocialDrinkingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SocialDrinkingModal({
  open,
  onClose,
}: SocialDrinkingModalProps) {
  const router = useRouter();

  if (!open) return null;

  const handleShareNow = () => {
    onClose();
    router.push('/share');
  };

  const steps = [
    {
      Icon: Camera,
      title: 'Snap a photo',
      body: 'Take a picture of your CodePop drink — the more creative, the better!',
    },
    {
      Icon: Hash,
      title: 'Post with #SocialDrinking',
      body: 'Share on any social platform and include the #SocialDrinking hashtag.',
    },
    {
      Icon: Gift,
      title: 'Get 10% off',
      body: 'Show us your post at the counter and we\'ll take 10% off your next order.',
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-drinking-title"
        className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      >
        <div className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl sm:mx-4">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-violet-500 to-violet-600 px-6 pb-6 pt-8 text-white sm:rounded-t-3xl">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
              <Hash size={24} />
            </div>
            <h2
              id="social-drinking-title"
              className="text-xl font-bold"
            >
              #SocialDrinking
            </h2>
            <p className="mt-1 text-sm text-violet-100">
              Share your drink, save on your next one.
            </p>
          </div>

          {/* Steps */}
          <div className="px-6 py-5 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex shrink-0 items-start">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                    <step.Icon size={18} className="text-violet-600" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-bold text-slate-900">
                    {i + 1}. {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Fine print */}
          <div className="mx-6 mb-4 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Limited to one redemption per order. Post must be public and
              include the hashtag. Valid at participating CodePop locations.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={handleShareNow}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 transition-colors"
            >
              <Share2 size={15} />
              Share now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}