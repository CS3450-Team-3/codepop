'use client';

import { useEffect, useState } from 'react';
import { Server, CheckCircle, Loader2, ChevronDown } from 'lucide-react';

interface ServerOption {
  ServerID: string;
  ServerURL: string;
  StoreName?: string;
  Status?: string;
}

export default function ServerSwitcher() {
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Load available servers and the currently selected backend
  useEffect(() => {
    setLoading(true);
    fetch('/api/proxy/backend/servers/')
      .then((r) => r.json())
      .then((data: ServerOption[]) => {
        setServers(Array.isArray(data) ? data.filter((s) => s.Status === 'Active') : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Ask backend which server we are currently on
    fetch('/api/proxy/backend/p2p/discover/')
      .then((r) => r.json())
      .then((data: { ServerID?: string }) => {
        if (data.ServerID) setCurrent(data.ServerID);
      })
      .catch(() => {});
  }, []);

  const switchTo = async (server: ServerOption) => {
    if (switching) return;
    setSwitching(true);
    setOpen(false);
    const returnTo = (() => {
      if (typeof window === 'undefined') return '/';
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin && ref.pathname !== window.location.pathname) {
          return ref.pathname + ref.search + ref.hash;
        }
      } catch {}
      return '/';
    })();
    try {
      await fetch('/api/select-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: server.ServerURL }),
      });

      // Check if the existing token is accepted by the new server.
      // The backend proxies token refresh to the user's home server, so
      // tokens issued elsewhere may still be valid here.
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      let tokenValid = false;
      if (token) {
        try {
          const check = await fetch('/api/proxy/backend/users/me/', {
            headers: { Authorization: `Bearer ${token}` },
          });
          tokenValid = check.ok;
        } catch {
          tokenValid = false;
        }
      }

      if (tokenValid) {
        // Token works on the new server — no need to log in again.
        window.location.href = returnTo;
      } else {
        // Access token not accepted — try refreshing via the HttpOnly cookie,
        // which the backend proxies to the user's home server transparently.
        try {
          const refresh = await fetch('/api/proxy/backend/auth/refresh/', {
            method: 'POST',
            credentials: 'include',
          });
          if (refresh.ok) {
            const data = await refresh.json();
            if (data.access && typeof window !== 'undefined') {
              localStorage.setItem('access_token', data.access);
            }
            window.location.href = returnTo;
            return;
          }
        } catch {
          // fall through to logout
        }
        // Refresh also failed — clear tokens and send to login.
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
        window.location.href = '/auth/login';
      }
    } catch {
      setSwitching(false);
    }
  };

  const currentServer = servers.find((s) => s.ServerID === current);
  const label = currentServer?.StoreName || (current ? `Server ${current.slice(0, 8)}` : 'Unknown');

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
        <Loader2 size={13} className="animate-spin" />
        Loading servers...
      </div>
    );
  }

  if (servers.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
      >
        <Server size={15} className="shrink-0 text-violet-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700 truncate">
            {switching ? 'Switching…' : label}
          </p>
          <p className="text-[10px] text-slate-400">Connected store</p>
        </div>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {servers.map((server) => {
            const isCurrent = server.ServerID === current;
            return (
              <button
                key={server.ServerID}
                onClick={() => switchTo(server)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                  isCurrent ? 'bg-violet-50' : ''
                }`}
              >
                {isCurrent ? (
                  <CheckCircle size={14} className="shrink-0 text-violet-600" />
                ) : (
                  <Server size={14} className="shrink-0 text-slate-300" />
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-violet-700' : 'text-slate-700'}`}>
                    {server.StoreName || `Server ${server.ServerID.slice(0, 8)}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
