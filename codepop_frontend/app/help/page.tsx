'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { sendChatbotMessage } from '@/models/api/chatbot';
import { ChatbotRequest, ChatbotResponse } from '@/models/types/chatbot';

// ── Local message shape ──────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  text: string;
}

// Normalize whatever shape `responses` comes back as into displayable strings
function normalizeResponses(responses: unknown): string[] {
  if (responses == null) return [];
  if (typeof responses === 'string') return [responses];
  if (Array.isArray(responses)) {
    return responses
      .map((r) => (typeof r === 'string' ? r : JSON.stringify(r)))
      .filter((s) => s.trim().length > 0);
  }
  // fallback — show as JSON
  return [JSON.stringify(responses)];
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const INITIAL_BOT_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'bot',
  text:
    "Hi there! 👋 I'm the CodePop assistant. I can help with wrong drinks, refunds, and general order questions. What's going on?",
};

const SUGGESTIONS = [
  'I got the wrong drink',
  'I want a refund',
  'My order never arrived',
  "Where's my pickup locker?",
];

export default function HelpPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_BOT_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversation context (mirrors ChatbotRequest/Response fields)
  const [wrongDrinkPhase, setWrongDrinkPhase] = useState<string>('');
  const [refundPhase, setRefundPhase] = useState<string>('');
  const [orderNum, setOrderNum] = useState<string>('');
  const [drinkNums, setDrinkNums] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Push user message optimistically
    const userMsg: ChatMessage = { id: makeId(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    const payload: ChatbotRequest = {
      message: trimmed,
      wrong_drink_phase: wrongDrinkPhase || undefined,
      refund_phase: refundPhase || undefined,
      order_num: orderNum || undefined,
      drink_nums: drinkNums || undefined,
    };

    try {
      const res: ChatbotResponse = await sendChatbotMessage(payload);

      // Update conversation context from the response
      setWrongDrinkPhase(res.wrong_drink_phase ?? '');
      setRefundPhase(res.refund_phase ?? '');
      setOrderNum(res.order_num ?? '');
      setDrinkNums(res.drink_nums ?? '');

      const botLines = normalizeResponses(res.responses);
      const botMessages: ChatMessage[] =
        botLines.length > 0
          ? botLines.map((line) => ({ id: makeId(), role: 'bot', text: line }))
          : [
              {
                id: makeId(),
                role: 'bot',
                text: "Sorry, I didn't catch that. Could you rephrase?",
              },
            ];

      setMessages((prev) => [...prev, ...botMessages]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setError('Could not reach the assistant. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setMessages([INITIAL_BOT_MESSAGE]);
    setWrongDrinkPhase('');
    setRefundPhase('');
    setOrderNum('');
    setDrinkNums('');
    setError(null);
    setInput('');
  };

  const showSuggestions = messages.length <= 1 && !sending;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        title="Help & Support"
        rightAction={
          <button
            onClick={handleReset}
            aria-label="Reset conversation"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
        }
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-4 pb-2 pt-16">
        {/* Intro */}
        <div className="pb-3">
          <h1 className="text-xl font-bold text-slate-900">Help &amp; Support</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Chat with our AI assistant for help with orders, refunds, and more.
          </p>
        </div>

        {/* Chat surface */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {sending && (
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                  <Bot size={16} className="text-violet-600" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-100 px-3 py-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60 transition-all"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>

        {/* Fallback note */}
        <p className="m-3 text-center text-[11px] text-slate-400">
          <MessageCircle size={11} className="inline align-middle mr-1" />
          Still need help? Ask a store manager at your pickup location.
        </p>
      </main>

      <BottomNav onCustomizeClick={() => {}} />
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === 'bot';
  return (
    <div
      className={`flex items-start gap-2 ${isBot ? '' : 'flex-row-reverse'}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isBot ? 'bg-violet-100' : 'bg-slate-200'
        }`}
      >
        {isBot ? (
          <Bot size={16} className="text-violet-600" />
        ) : (
          <UserIcon size={16} className="text-slate-600" />
        )}
      </div>
      <div
        className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isBot
            ? 'rounded-tl-sm bg-slate-100 text-slate-800'
            : 'rounded-tr-sm bg-violet-600 text-white'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}