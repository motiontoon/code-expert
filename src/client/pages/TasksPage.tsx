import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasks, CodingTask, Pagination } from '../services/api';

const statusColors: Record<string, string> = {
  completed: 'badge-success',
  failed: 'badge-danger',
  queued: 'badge-neutral',
  reading: 'badge-info',
  coding: 'badge-info',
  testing: 'badge-warning',
  reviewing: 'badge-warning',
  cancelled: 'badge-neutral',
};

const priorityColors: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-dark-muted',
};

export default function TasksPage() {
  const [taskList, setTaskList] = useState<CodingTask[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filter, setFilter] = useState({ status: '', taskType: '' });
  const [page, setPage] = useState(1);

  const fetchTasks = async () => {
    try {
      const params: Record<string, string | number> = { page };
      if (filter.status) params.status = filter.status;
      if (filter.taskType) params.taskType = filter.taskType;
      const data = await tasks.list(params as never);
      setTaskList(data.tasks);
      setPagination(data.pagination);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Coding Tasks</h1>
          <p className="text-dark-muted mt-1">Manage your AI coding task queue</p>
        </div>
        <Link to="/tasks/new" className="btn-primary">+ New Task</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filter.status}
          onChange={(e) => { setFilter((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="reading">Reading</option>
          <option value="coding">Coding</option>
          <option value="testing">Testing</option>
          <option value="reviewing">Reviewing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filter.taskType}
          onChange={(e) => { setFilter((f) => ({ ...f, taskType: e.target.value })); setPage(1); }}
          className="input w-auto"
        >
          <option value="">All Types</option>
          <option value="feature">Feature</option>
          <option value="bugfix">Bug Fix</option>
          <option value="refactor">Refactor</option>
          <option value="test">Test</option>
          <option value="docs">Docs</option>
          <option value="review">Review</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Task List */}
      <div className="card p-0">
        {taskList.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-dark-muted text-lg">No tasks found</p>
            <Link to="/tasks/new" className="btn-primary mt-4 inline-block">Create your first task</Link>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {taskList.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="flex items-center gap-4 p-4 hover:bg-dark-bg/50 transition-colors"
              >
                <div className={`w-1 h-10 rounded-full ${priorityColors[task.priority]?.replace('text-', 'bg-') || 'bg-dark-border'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{task.title}</p>
                    <span className="badge-neutral text-[10px]">{task.taskType}</span>
                  </div>
                  <p className="text-dark-muted text-xs mt-0.5">
                    {task.repository?.fullName || 'No repo'} · {task.branch || 'no branch'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={statusColors[task.status] || 'badge-neutral'}>{task.status}</span>
                  <p className="text-dark-muted text-xs mt-1">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost text-sm"
          >
            Previous
          </button>
          <span className="text-dark-muted text-sm">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="btn-ghost text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
