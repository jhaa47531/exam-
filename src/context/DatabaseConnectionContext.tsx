import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api, DatabaseHealthStatus } from '../services/api';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface DatabaseConnectionContextType {
  status: ConnectionStatus;
  connected: boolean;
  latencyMs: number | null;
  lastChecked: string | null;
  errorMessage: string | null;
  isOperationsDisabled: boolean;
  retryConnection: () => Promise<void>;
  simulateOutage: (disconnect: boolean) => Promise<void>;
}

const DatabaseConnectionContext = createContext<DatabaseConnectionContextType | undefined>(undefined);

export const DatabaseConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isCheckingRef = useRef<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkHealth = useCallback(async (isUserInitiated: boolean = false): Promise<void> => {
    // Avoid concurrent overlapping checks
    if (isCheckingRef.current) return;

    // Throttle automatic checks to at most once every 5 seconds unless user explicitly requested retry
    const now = Date.now();
    if (!isUserInitiated && now - lastCheckTimeRef.current < 5000) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckTimeRef.current = now;

    if (isUserInitiated) {
      setStatus('reconnecting');
    }

    try {
      const health: DatabaseHealthStatus = await api.health.getDatabaseStatus();
      setLastChecked(health.timestamp || new Date().toISOString());
      setLatencyMs(health.latencyMs || null);

      if (health.connected) {
        setStatus('connected');
        setErrorMessage(null);
      } else {
        setStatus('disconnected');
        setErrorMessage(
          health.message || 'We are unable to connect to the database. Please try again later.'
        );
      }
    } catch {
      setStatus('disconnected');
      setErrorMessage('We are unable to connect to the database. Please try again later.');
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  const retryConnection = async (): Promise<void> => {
    await checkHealth(true);
  };

  const simulateOutage = async (disconnect: boolean): Promise<void> => {
    try {
      await api.health.simulateOutage(disconnect);
      await checkHealth(true);
    } catch (err) {
      console.error('Failed to toggle outage simulation:', err);
    }
  };

  useEffect(() => {
    // 1. Initial health check on application boot
    checkHealth(false);

    // 2. Periodic background health monitoring every 30 seconds
    const interval = setInterval(() => {
      checkHealth(false);
    }, 30000);

    // 3. Listen to database error events dispatched on failed backend operations
    const handleDatabaseError = () => {
      checkHealth(false);
    };

    window.addEventListener('exampro:database-error', handleDatabaseError);

    return () => {
      clearInterval(interval);
      window.removeEventListener('exampro:database-error', handleDatabaseError);
    };
  }, [checkHealth]);

  const isOperationsDisabled = status === 'disconnected' || status === 'reconnecting';

  return (
    <DatabaseConnectionContext.Provider
      value={{
        status,
        connected: status === 'connected',
        latencyMs,
        lastChecked,
        errorMessage,
        isOperationsDisabled,
        retryConnection,
        simulateOutage,
      }}
    >
      {children}
    </DatabaseConnectionContext.Provider>
  );
};

export function useDatabaseConnection() {
  const context = useContext(DatabaseConnectionContext);
  if (!context) {
    throw new Error('useDatabaseConnection must be used within a DatabaseConnectionProvider');
  }
  return context;
}
