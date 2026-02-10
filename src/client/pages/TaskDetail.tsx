import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasks, CodingTask } from '../services/api';

const stepIcons: Record<string, string> = {
  read: '📖',
  analyze: '🔍',
  plan: '📋',
  write: '✏️',
  test: '🧪',
  commit: '📦',
  push: '🚀',
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<CodingTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    tasks.get(id).then((d) => { setTask(d.task); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await tasks.cancel(id);
      toast.success('Task cancelled');
      setTask((t) => t ? { ...t, status: 'cancelled' } : t);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      await tasks.retry(id);
      toast.success('Task re-queued');
      setTask((t) => t ? { ...t, status: 'queued' } : t);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to retry');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-forge-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!task) {
    return <div className="text-center py-16"><p className="text-dark-muted">Task not found</p></div>;
  }

  const isActive = ['reading', 'coding', 'testing', 'reviewing'].includes(task.status);
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(task.status);

  return (
    <div>
      <button onClick={() => navigate('/tasks')} className="btn-ghost text-sm mb-4">← Back to Tasks</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'failed' ? 'badge-danger' : 'badge-info'}`}>
              {task.status}
            </span>
          </div>
          <p className="text-dark-muted mt-1">
            {task.taskType} · {task.priority} priority · {task.repository?.fullName || 'No repo'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isTerminal && <button onClick={handleCancel} className="btn-danger text-sm">Cancel</button>}
          {task.status === 'failed' && <button onClick={handleRetry} className="btn-primary text-sm">Retry</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
            <p className="text-dark-text whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Steps */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Execution Steps</h2>
            {task.steps && task.steps.length > 0 ? (
              <div className="space-y-3">
                {task.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-bg">
                    <span className="text-lg">{stepIcons[step.action] || '•'}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm">{step.description}</p>
                      <p className="text-dark-muted text-xs">Step {step.stepNumber} · {step.action}</p>
                    </div>
                    <span className={`badge ${step.status === 'completed' ? 'badge-success' : step.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                      {step.status}
                    </span>
                    {step.duration && (
                      <span className="text-dark-muted text-xs font-mono">{step.duration}ms</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-muted text-sm">No steps recorded yet</p>
            )}
          </div>

          {/* Error */}
          {task.errorMessage && (
            <div className="card border-red-600/30">
              <h2 className="text-lg font-semibold text-red-400 mb-2">Error</h2>
              <pre className="text-red-300 text-sm font-mono whitespace-pre-wrap bg-red-600/10 p-3 rounded-lg">
                {task.errorMessage}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-dark-muted">Branch</dt>
                <dd className="text-white font-mono text-xs">{task.branch || '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Target</dt>
                <dd className="text-white font-mono text-xs">{task.targetBranch || 'main'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Retries</dt>
                <dd className="text-white">{task.retryCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Created</dt>
                <dd className="text-white text-xs">{new Date(task.createdAt).toLocaleString()}</dd>
              </div>
              {task.startedAt && (
                <div className="flex justify-between">
                  <dt className="text-dark-muted">Started</dt>
                  <dd className="text-white text-xs">{new Date(task.startedAt).toLocaleString()}</dd>
                </div>
              )}
              {task.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-dark-muted">Completed</dt>
                  <dd className="text-white text-xs">{new Date(task.completedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Changes</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-dark-muted">Files Created</dt>
                <dd className="text-white">{task.filesCreated}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Files Modified</dt>
                <dd className="text-white">{task.filesModified}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Lines Added</dt>
                <dd className="text-green-400">+{task.linesAdded}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-dark-muted">Lines Removed</dt>
                <dd className="text-red-400">-{task.linesRemoved}</dd>
              </div>
            </dl>
          </div>

          {task.pullRequestUrl && (
            <a href={task.pullRequestUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-center block">
              View Pull Request
            </a>
          )}

          {isActive && (
            <div className="card glow-border text-center">
              <div className="w-8 h-8 border-4 border-forge-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-forge-400 text-sm font-medium">Task in progress...</p>
              <p className="text-dark-muted text-xs mt-1">The engine is {task.status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
