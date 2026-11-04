import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, Archive, X, ShieldAlert, WifiOff } from 'lucide-react';
import { useDatabaseConnection } from '../../context/DatabaseConnectionContext';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  archiveText?: string;
  isArchiveOptionAvailable?: boolean;
  onConfirm: () => void | Promise<void>;
  onArchive?: () => void | Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  academicWarning?: string | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Permanently Delete',
  archiveText = 'Archive Record',
  isArchiveOptionAvailable = false,
  onConfirm,
  onArchive,
  onClose,
  isLoading = false,
  error = null,
  academicWarning = null,
}) => {
  const { isOperationsDisabled } = useDatabaseConnection();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Administrative Action Required</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body message */}
          <div className="text-xs text-slate-600 leading-relaxed space-y-3">
            <p>{message}</p>

            {academicWarning && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800">
                    Academic Integrity Protection
                  </span>
                  <p className="text-[11px] leading-relaxed text-amber-700">{academicWarning}</p>
                </div>
              </div>
            )}

            {isOperationsDisabled && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
                <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-rose-800">
                    Database Connection Offline
                  </span>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Delete and archive operations are disabled while the database is unavailable. Please retry connection before proceeding.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-rose-800">
                    Operation Blocked
                  </span>
                  <p className="text-[11px] leading-relaxed text-rose-700">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {isArchiveOptionAvailable && onArchive && (
              <button
                type="button"
                onClick={onArchive}
                disabled={isLoading || isOperationsDisabled}
                title={isOperationsDisabled ? 'Disabled: Database unavailable' : undefined}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Archive className="w-4 h-4" />
                <span>{isLoading ? 'Processing...' : archiveText}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || isOperationsDisabled}
              title={isOperationsDisabled ? 'Disabled: Database unavailable' : undefined}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isLoading ? 'Deleting...' : confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
