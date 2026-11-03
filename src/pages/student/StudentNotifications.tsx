import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { NotificationItem } from '../../types';
import { Bell, CheckCircle2, AlertTriangle, Info, Clock, Check } from 'lucide-react';
import { motion } from 'motion/react';

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.student.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.student.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications & Alerts</h1>
          <p className="text-xs text-slate-500 mt-1">Official alerts from proctoring office and automated exam notifications</p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 text-sm shadow-xs">
          No notifications in your inbox.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const isAlert = notif.type === 'alert' || notif.type === 'warning';
            const isSuccess = notif.type === 'success';

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4.5 rounded-2xl border transition-all duration-150 flex items-start gap-4 ${
                  notif.is_read
                    ? 'bg-white border-slate-200/80 text-slate-600 shadow-xs'
                    : 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-sm ring-1 ring-blue-500/10'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isAlert
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : isSuccess
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}
                >
                  {isAlert ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-800 border border-slate-200 transition shrink-0 cursor-pointer shadow-xs"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
