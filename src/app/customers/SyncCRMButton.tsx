"use client";

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export default function SyncCRMButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/sync-crm', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setResult(`✅ Sync done! ${json.log?.length || 0} actions.`);
        // Reload page after short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult(`❌ ${json.error}`);
      }
    } catch (err: any) {
      setResult(`❌ ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={runSync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
      >
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing...' : 'Sync CRM'}
      </button>
      {result && (
        <span className="text-[10px] text-slate-400">{result}</span>
      )}
    </div>
  );
}
