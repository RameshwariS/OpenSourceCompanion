import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkAllRead, useMarkRead, useNotificationSocket, useNotifications } from '../hooks/useNotifications';
import { timeAgo } from '../utils/format';

export default function NotificationBell() {
  useNotificationSocket();
  const navigate = useNavigate();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click and on Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;

  function openItem(n) {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link.startsWith('/')) navigate(n.link);
    else if (n.link.startsWith('https://github.com/')) window.open(n.link, '_blank', 'noopener,noreferrer');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unread} unread)`}
        aria-expanded={open}
        className="relative rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full bg-emerald-600 px-1 text-center text-xs font-medium text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button
              onClick={() => markAll.mutate()}
              disabled={unread === 0 || markAll.isPending}
              className="text-xs text-emerald-500 hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          {data?.items.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              Nothing yet. Follow an organization and new issues will show up here.
            </p>
          )}

          <ul className="max-h-96 overflow-y-auto">
            {data?.items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n)}
                  className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                    n.read ? 'text-slate-500' : 'font-medium'
                  }`}
                >
                  {/* Plain text on purpose: React escapes it */}
                  <span className="block break-words">{n.message}</span>
                  <span className="text-xs font-normal text-slate-500">{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}