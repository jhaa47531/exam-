import React from 'react';
import { useDatabaseConnection } from '../../context/DatabaseConnectionContext';
import { Database, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DatabaseStatusIndicator: React.FC<{ showLatency?: boolean }> = ({ showLatency = false }) => {
  const { status, latencyMs, retryConnection } = useDatabaseConnection();

  if (status === 'connected') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 transition"
        title={latencyMs ? `Database query latency: ${latencyMs}ms` : 'PostgreSQL Database Connected'}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-semibold tracking-tight text-[11px] sm:text-xs">
          Database Connected
        </span>
        {showLatency && latencyMs && (
          <span className="hidden md:inline font-mono text-[10px] text-emerald-600 bg-emerald-100/70 px-1 rounded">
            {latencyMs}ms
          </span>
        )}
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800 transition"
        title="Checking database connection..."
      >
        <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
        <span className="font-semibold text-[11px] sm:text-xs">Reconnecting to database...</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => retryConnection()}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs text-rose-800 hover:bg-rose-100 transition cursor-pointer"
      title="Database connection failed. Click to retry."
    >
      <span className="w-2 h-2 rounded-full bg-rose-500" />
      <span className="font-semibold text-[11px] sm:text-xs">Database Connection Failed</span>
    </button>
  );
};
