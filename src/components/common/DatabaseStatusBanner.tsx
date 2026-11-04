import React from 'react';
import { useDatabaseConnection } from '../../context/DatabaseConnectionContext';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DatabaseStatusBanner: React.FC = () => {
  const { status, errorMessage, retryConnection } = useDatabaseConnection();

  if (status === 'connected') return null;

  const isReconnecting = status === 'reconnecting';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full bg-rose-600 text-white shadow-md z-40 relative"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              {isReconnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-white" />
              )}
            </div>

            <div>
              <div className="font-bold flex items-center gap-2 tracking-tight text-sm">
                <span>{isReconnecting ? 'Reconnecting to database...' : 'Database Connection Failed'}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/20 text-rose-100">
                  {isReconnecting ? 'Verifying' : 'Offline'}
                </span>
              </div>
              <p className="text-rose-100 text-xs mt-0.5 leading-snug">
                {isReconnecting
                  ? 'Attempting to re-establish secure connection with PostgreSQL database...'
                  : errorMessage || 'We are unable to connect to the database. Please try again later.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => retryConnection()}
              disabled={isReconnecting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconnecting...' : 'Retry Connection'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
