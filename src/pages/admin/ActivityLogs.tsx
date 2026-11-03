import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ScrollText, Clock, User, ShieldCheck } from 'lucide-react';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getActivityLogs().then((res) => {
      setLogs(res.logs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit & Proctor Activity Logs</h1>
        <p className="text-xs text-slate-500 mt-1">Immutable audit trail of administrator actions, exam creations, and student status modifications</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/70 transition">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700 uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-600">Target: <strong className="text-slate-900 font-semibold">{log.resource}</strong></span>
                  </div>
                  <pre className="text-[11px] text-slate-700 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 max-w-xl overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1.5 pt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
