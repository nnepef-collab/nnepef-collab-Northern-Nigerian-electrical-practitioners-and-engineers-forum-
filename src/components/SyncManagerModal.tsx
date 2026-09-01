import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Database, 
  X, 
  Clock, 
  Layers, 
  Play, 
  Eye, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  QueuedOperation, 
  SyncStatusState, 
  subscribeToSyncStatus, 
  getAllQueuedOperations, 
  removeOperation, 
  clearQueue, 
  processQueue 
} from '../lib/syncManager';

interface SyncManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncManagerModal: React.FC<SyncManagerModalProps> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncedAt: null,
    lastSyncError: null,
    syncedCount: 0,
    failedCount: 0,
  });

  const [queuedItems, setQueuedItems] = useState<QueuedOperation[]>([]);
  const [selectedOp, setSelectedOp] = useState<QueuedOperation | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    loadQueueData();

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  const loadQueueData = async () => {
    setLoadingItems(true);
    try {
      const items = await getAllQueuedOperations();
      setQueuedItems(items);
    } catch (err) {
      console.error('Failed to load queued offline operations:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleManualSync = async () => {
    const result = await processQueue();
    await loadQueueData();
  };

  const handleRemoveOp = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to remove this operation from the offline sync buffer?')) {
      await removeOperation(id);
      if (selectedOp?.id === id) setSelectedOp(null);
      await loadQueueData();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear all buffered offline write operations? Unsynced changes will be lost.')) {
      await clearQueue();
      setSelectedOp(null);
      await loadQueueData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${syncStatus.isOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              {syncStatus.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Offline Sync Manager
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  syncStatus.isOnline 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}>
                  {syncStatus.isOnline ? 'ONLINE' : 'OFFLINE MODE'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                IndexedDB persistent transaction buffer for local database write operations
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Buffered Items</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{syncStatus.pendingCount}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Synced Today</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{syncStatus.syncedCount}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Failed Retries</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{syncStatus.failedCount}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Last Sync Time</div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Controls & Info Banner */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncStatus.isSyncing || queuedItems.length === 0 || !syncStatus.isOnline}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              {syncStatus.isSyncing ? 'Synchronizing Operations...' : 'Sync All Operations Now'}
            </button>

            <button
              onClick={handleClearAll}
              disabled={queuedItems.length === 0}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Automatic retries trigger on network reconnection
          </span>
        </div>

        {/* Content Body: Left List + Right Inspector */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          
          {/* Operations List */}
          <div className="md:col-span-6 lg:col-span-5 p-4 overflow-y-auto space-y-2 max-h-[450px]">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Buffered Writes ({queuedItems.length})</span>
              <button 
                onClick={loadQueueData} 
                className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Refresh
              </button>
            </h4>

            {loadingItems ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                Loading IndexedDB sync buffer...
              </div>
            ) : queuedItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Offline Buffer Empty</p>
                <p className="text-[11px] text-slate-400 mt-1">All database writes have been fully persisted in local storage.</p>
              </div>
            ) : (
              queuedItems.map((op) => {
                const isSelected = selectedOp?.id === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          op.operation === 'INSERT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          op.operation === 'UPDATE' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          op.operation === 'DELETE' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {op.operation}
                        </span>
                        <span className="font-semibold text-xs text-slate-900 dark:text-white font-mono">
                          {op.table}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleRemoveOp(op.id, e)}
                        title="Delete from offline buffer"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Module: {op.moduleName || 'System'}</span>
                      <span className="font-mono">{new Date(op.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {op.retryCount > 0 && (
                      <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Retry attempts: {op.retryCount}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Operation Payload Inspector */}
          <div className="md:col-span-6 lg:col-span-7 p-4 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto max-h-[450px]">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Payload & Diagnostic Inspector
            </h4>

            {selectedOp ? (
              <div className="space-y-3 text-xs">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Operation ID</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold truncate block">{selectedOp.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Table / Bucket</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{selectedOp.table}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedOp.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Enqueued At</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{new Date(selectedOp.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {selectedOp.lastError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
                    <div className="font-bold mb-0.5 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Last Retry Failure:
                    </div>
                    <p className="text-[11px] font-mono leading-relaxed">{selectedOp.lastError}</p>
                  </div>
                )}

                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold mb-1">
                    Buffered JSON Payload / Data Object:
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                    {typeof selectedOp.payload === 'string' && selectedOp.payload.startsWith('data:') 
                      ? `[Data URL File Binary Payload - Length: ${selectedOp.payload.length} chars]`
                      : JSON.stringify(selectedOp.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <Eye className="w-8 h-8 opacity-40" />
                Select a buffered operation from the left list to inspect its target table, retry history, and full JSON payload.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Storage: HTML5 IndexedDB Persistent Local Buffer</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
