"use client";

import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Floating banner shown when a write to the server failed. It lets the user
 * push the full local state to the server again (local state is durable in
 * localStorage, so it's the source of truth for recovery).
 */
export const SyncStatusBanner = () => {
  const { syncError, isSyncing, retrySync } = useAppContext();
  const { t } = useI18n();

  if (!syncError) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 bg-red-600 text-white rounded-xl shadow-lg max-w-md mx-4 print:hidden">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <span className="text-sm flex-1">{t.common.syncFailed}</span>
      <button
        onClick={retrySync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? t.common.retrying : t.common.retry}
      </button>
    </div>
  );
};
