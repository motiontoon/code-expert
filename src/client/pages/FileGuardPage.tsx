import React, { useEffect, useState } from 'react';
import { fileGuardApi, FileAuditEntry, FileGuardStats } from '../services/api';

export default function FileGuardPage() {
  const [stats, setStats] = useState<FileGuardStats | null>(null);
  const [logs, setLogs] = useState<FileAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      fileGuardApi.stats().then((d) => setStats(d.stats)),
      fileGuardApi.audit({ limit: 100 }).then((d) => setLogs(d.logs)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-forge-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">File Guard</h1>
        <p className="text-dark-muted mt-1">
          Read-before-write enforcement. Every file must be read before it can be modified.
        </p>
      </div>

      {/* How it works */}
      <div className="card glow-border mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">How File Guard Works</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-dark-bg">
            <p className="text-forge-400 font-medium mb-1">1. Read First</p>
            <p className="text-dark-muted">Before any file can be modified, the engine must read its current content.</p>
          </div>
          <div className="p-3 rounded-lg bg-dark-bg">
            <p className="text-amber-400 font-medium mb-1">2. Guard Check</p>
            <p className="text-dark-muted">Every write operation is checked against the read log. No read = no write.</p>
          </div>
          <div className="p-3 rounded-lg bg-dark-bg">
            <p className="text-green-400 font-medium mb-1">3. Audit Trail</p>
            <p className="text-dark-muted">All operations are logged with timestamps, content hashes, and compliance status.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-white">{stats?.totalWrites || 0}</p>
          <p className="text-dark-muted text-sm mt-1">Total Writes</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-400">{stats?.passed || 0}</p>
          <p className="text-dark-muted text-sm mt-1">Passed</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${(stats?.violations || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {stats?.violations || 0}
          </p>
          <p className="text-dark-muted text-sm mt-1">Violations</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-forge-400">{stats?.complianceRate || '100'}%</p>
          <p className="text-dark-muted text-sm mt-1">Compliance</p>
        </div>
      </div>

      {/* Audit Log */}
      <div className="card p-0">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-white">Audit Log</h2>
        </div>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-dark-muted">No audit entries yet</div>
        ) : (
          <div className="divide-y divide-dark-border">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 p-4 text-sm">
                <span className={`w-2 h-2 rounded-full ${log.guardPassed ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-xs truncate">{log.filePath}</p>
                  <p className="text-dark-muted text-xs mt-0.5">
                    {log.action} · {log.wasReadFirst ? 'Read first' : 'No prior read'}
                    {log.guardMessage && ` · ${log.guardMessage}`}
                  </p>
                </div>
                <span className={log.guardPassed ? 'badge-success' : 'badge-danger'}>
                  {log.guardPassed ? 'Passed' : 'Violation'}
                </span>
                <span className="text-dark-muted text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
