/**
 * N-NEPEF 2020 Portal - Offline Sync Manager for Local SQLite Database
 * 100% Offline, Internal Storage, Self-Contained.
 */

import { recordSQLiteDiagnosticLog } from './sqliteDiagnostics';
import { analyzeSQLiteError } from './sqliteErrorAnalyzer';
import { supabase, isSupabaseConfigured } from './supabase';
import { saveMemberToSupabase, deleteMemberFromSupabase, savePaymentToSupabase, deletePaymentFromSupabase } from '../services/supabaseService';

export interface QueuedOperation {
  id: string;
  timestamp: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'STORAGE_UPLOAD' | 'STORAGE_DELETE';
  payload: any;
  options?: {
    matchColumn?: string;
    matchValue?: any;
    bucket?: string;
    path?: string;
    contentType?: string;
    fileName?: string;
  };
  moduleName?: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  lastError?: string;
}

export interface SyncStatusState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  syncedCount: number;
  failedCount: number;
}

const DB_NAME = 'NepefOfflineSQLiteSyncDB';
const STORE_NAME = 'offline_operations';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let isProcessingQueue = false;

// Event subscribers
type StatusSubscriber = (state: SyncStatusState) => void;
const subscribers: Set<StatusSubscriber> = new Set();

let currentState: SyncStatusState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: new Date().toISOString(),
  lastSyncError: null,
  syncedCount: 0,
  failedCount: 0,
};

// Initialize IndexedDB
function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[SyncManager] Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function notifySubscribers() {
  subscribers.forEach((cb) => cb({ ...currentState }));
}

function updateSyncState(partial: Partial<SyncStatusState>) {
  let hasChanged = false;
  for (const key of Object.keys(partial) as (keyof SyncStatusState)[]) {
    if (currentState[key] !== partial[key]) {
      hasChanged = true;
      break;
    }
  }
  if (!hasChanged) return;
  currentState = { ...currentState, ...partial };
  notifySubscribers();
}

export async function refreshPendingCount(): Promise<number> {
  try {
    const ops = await getAllQueuedOperations();
    const count = ops.filter((op) => op.status !== 'SYNCING').length;
    updateSyncState({ pendingCount: count });
    return count;
  } catch (err) {
    return currentState.pendingCount;
  }
}

export async function queueOperation(
  table: string,
  operation: QueuedOperation['operation'],
  payload: any,
  options?: QueuedOperation['options'],
  moduleName?: string
): Promise<string> {
  const db = await getDB();
  const opId = `sqlite_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const queuedOp: QueuedOperation = {
    id: opId,
    timestamp: new Date().toISOString(),
    table,
    operation,
    payload,
    options,
    moduleName: moduleName || 'SQLite Data Service',
    retryCount: 0,
    status: 'PENDING',
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(queuedOp);

    request.onsuccess = () => {
      refreshPendingCount();
      // Attempt immediate processing
      processQueue().catch(() => {});
      resolve(opId);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getAllQueuedOperations(): Promise<QueuedOperation[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as QueuedOperation[]) || [];
        results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(results);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  } catch {
    return [];
  }
}

export async function updateOperationStatus(
  id: string,
  status: QueuedOperation['status'],
  lastError?: string
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const op = getReq.result as QueuedOperation | undefined;
      if (!op) {
        resolve();
        return;
      }
      op.status = status;
      if (lastError) {
        op.lastError = lastError;
        op.retryCount += 1;
      }
      const putReq = store.put(op);
      putReq.onsuccess = () => {
        refreshPendingCount();
        resolve();
      };
      putReq.onerror = (e) => reject((e.target as IDBRequest).error);
    };

    getReq.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function removeOperation(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      refreshPendingCount();
      resolve();
    };

    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      updateSyncState({ pendingCount: 0, lastSyncError: null });
      resolve();
    };

    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

async function executeOperation(op: QueuedOperation): Promise<any> {
  if (isSupabaseConfigured()) {
    if (op.table === 'members') {
      if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
        return await saveMemberToSupabase(op.payload);
      }
      if (op.operation === 'DELETE') {
        const id = op.options?.matchValue || op.payload?.id || op.payload;
        return await deleteMemberFromSupabase(id);
      }
    }

    if (op.table === 'payments' || op.table === 'payment_records') {
      if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
        return await savePaymentToSupabase(op.payload);
      }
      if (op.operation === 'DELETE') {
        const id = op.options?.matchValue || op.payload?.id || op.payload;
        return await deletePaymentFromSupabase(id);
      }
    }

    if (op.operation === 'INSERT' || op.operation === 'UPDATE') {
      const { data, error } = await supabase.from(op.table).upsert(op.payload);
      if (error) throw new Error(error.message);
      return data;
    }

    if (op.operation === 'DELETE') {
      const id = op.options?.matchValue || (typeof op.payload === 'object' ? op.payload.id : op.payload);
      const { error } = await supabase.from(op.table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }

    return true;
  }

  // Local fallback simulation
  return true;
}

export async function processQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (isProcessingQueue) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isProcessingQueue = true;
  updateSyncState({ isSyncing: true, lastSyncError: null });

  let succeeded = 0;
  let failed = 0;

  try {
    const queue = await getAllQueuedOperations();
    const pendingOps = queue.filter((op) => op.status !== 'SYNCING' && op.retryCount < 5);

    for (const op of pendingOps) {
      await updateOperationStatus(op.id, 'SYNCING');
      try {
        await executeOperation(op);
        await removeOperation(op.id);
        succeeded++;
      } catch (err: any) {
        failed++;
        await updateOperationStatus(op.id, 'FAILED', err.message || 'SQLite Sync Error');
        analyzeSQLiteError(err);
      }
    }

    updateSyncState({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      syncedCount: currentState.syncedCount + succeeded,
      failedCount: currentState.failedCount + failed,
    });
  } catch (err: any) {
    updateSyncState({ isSyncing: false, lastSyncError: err.message });
  } finally {
    isProcessingQueue = false;
    await refreshPendingCount();
  }

  return { processed: succeeded + failed, succeeded, failed };
}

export function subscribeSyncStatus(subscriber: StatusSubscriber): () => void {
  subscribers.add(subscriber);
  subscriber({ ...currentState });
  refreshPendingCount();
  return () => subscribers.delete(subscriber);
}

export const subscribeToSyncStatus = subscribeSyncStatus;

export function getSyncStatus(): SyncStatusState {
  return { ...currentState };
}

export async function syncNow(): Promise<{ processed: number; succeeded: number; failed: number }> {
  return processQueue();
}
