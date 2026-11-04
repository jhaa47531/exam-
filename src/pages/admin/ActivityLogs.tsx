import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ScrollText,
  Clock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion state
  const [targetLog, setTargetLog] = useState<any | null>(null);
  const [isClearAllMode, setIsClearAllMode] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getActivityLogs();
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error(err);
      setBannerMessage({ type: 'error', text: err.message || 'Failed to load audit logs' });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteSingleModal = (log: any) => {
    setTargetLog(log);
    setIsClearAllMode(false);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const openClearAllModal = () => {
    setTargetLog(null);
    setIsClearAllMode(true);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (isClearAllMode) {
        const res = await api.admin.clearActivityLogs();
        setBannerMessage({ type: 'success', text: res.message || 'All activity logs cleared.' });
      } else if (targetLog) {
        const res = await api.admin.deleteActivityLog(targetLog.id);
        setBannerMessage({ type: 'success', text: res.message || 'Log record removed successfully.' });
      }
      setDeleteModalOpen(false);
      setTargetLog(null);
      await loadLogs();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to complete delete operation');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit & Proctor Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit trail of administrator actions, exam creations, and student status modifications
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={openClearAllModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 transition shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Logs</span>
          </button>
        )}
      </div>

      {bannerMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-xs ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}

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
              <div
                key={log.id}
                className="p-4.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700 uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-600">
                      Target: <strong className="text-slate-900 font-semibold">{log.resource}</strong>
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-700 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 max-w-xl overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => openDeleteSingleModal(log)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete log entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete / Clear Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={isClearAllMode ? 'Clear All Activity Logs' : 'Delete Audit Log Entry'}
        message={
          isClearAllMode
            ? 'Are you sure you want to permanently clear all system audit logs? This action cannot be undone.'
            : `Are you sure you want to delete audit log entry for action "${targetLog?.action}" on target "${targetLog?.resource}"?`
        }
        confirmText={isClearAllMode ? 'Clear All Logs' : 'Delete Log'}
        isArchiveOptionAvailable={false}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setTargetLog(null);
          setDeleteError(null);
        }}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
};
