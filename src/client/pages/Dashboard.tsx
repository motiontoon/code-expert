import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasks, projects, fileGuardApi, TaskStats, EngineStatus, Project, CodingTask, FileGuardStats } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [engine, setEngine] = useState<EngineStatus | null>(null);
  const [recentTasks, setRecentTasks] = useState<CodingTask[]>([]);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [guardStats, setGuardStats] = useState<FileGuardStats | null>(null);

  useEffect(() => {
    Promise.allSettled([
      tasks.stats().then((d) => setStats(d.stats)),
      tasks.engineStatus().then((d) => setEngine(d.engine)),
      tasks.list({ page: 1 }).then((d) => setRecentTasks(d.tasks.slice(0, 5))),
      projects.list().then((d) => setProjectList(d.projects.slice(0, 5))),
      fileGuardApi.stats().then((d) => setGuardStats(d.stats)),
    ]);
  }, []);

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'badge-success',
      failed: 'badge-danger',
      queued: 'badge-neutral',
      reading: 'badge-info',
      coding: 'badge-info',
      testing: 'badge-warning',
      reviewing: 'badge-warning',
      cancelled: 'badge-neutral',
    };
    return colors[status] || 'badge-neutral';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.displayName || user?.username}
          </h1>
          <p className="text-dark-muted mt-1">Here's what's happening with your coding engine.</p>
        </div>
        <Link to="/tasks/new" className="btn-primary">
          + New Task
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-dark-muted text-sm">Total Tasks</p>
          <p className="text-3xl font-bold text-white mt-1">{stats?.total || 0}</p>
        </div>
        <div className="card">
          <p className="text-dark-muted text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{stats?.completed || 0}</p>
        </div>
        <div className="card">
          <p className="text-dark-muted text-sm">Active</p>
          <p className="text-3xl font-bold text-forge-400 mt-1">{stats?.active || 0}</p>
        </div>
        <div className="card">
          <p className="text-dark-muted text-sm">Success Rate</p>
          <p className="text-3xl font-bold text-white mt-1">{stats?.successRate || '0'}%</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Engine Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Engine Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Status</span>
              <span className={`badge ${engine?.isRunning ? 'badge-success' : 'badge-danger'}`}>
                {engine?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Active Tasks</span>
              <span className="text-white font-mono">{engine?.activeTasks || 0} / {engine?.maxConcurrent || 3}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Queued</span>
              <span className="text-white font-mono">{stats?.queued || 0}</span>
            </div>
          </div>
        </div>

        {/* File Guard */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">File Guard</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Compliance</span>
              <span className="text-green-400 font-bold">{guardStats?.complianceRate || '100'}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Total Writes</span>
              <span className="text-white font-mono">{guardStats?.totalWrites || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-muted text-sm">Violations</span>
              <span className={`font-mono ${(guardStats?.violations || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {guardStats?.violations || 0}
              </span>
            </div>
          </div>
          <Link to="/file-guard" className="block text-center text-sm text-forge-400 hover:text-forge-300 mt-4">
            View Audit Log →
          </Link>
        </div>

        {/* GitHub */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">GitHub</h2>
          {user?.githubAccount ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={user.githubAccount.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full" />
                <div>
                  <p className="text-white text-sm font-medium">{user.githubAccount.githubUsername}</p>
                  <p className="text-dark-muted text-xs">Connected</p>
                </div>
                <span className="badge-success ml-auto">Active</span>
              </div>
              <Link to="/github" className="block text-center text-sm text-forge-400 hover:text-forge-300 mt-2">
                Manage Repos →
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-dark-muted text-sm mb-3">Connect your GitHub account to start coding</p>
              <a href="/api/auth/github" className="btn-secondary text-sm">
                Connect GitHub
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Tasks</h2>
          <Link to="/tasks" className="text-sm text-forge-400 hover:text-forge-300">View all →</Link>
        </div>
        <div className="card p-0">
          {recentTasks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-dark-muted">No tasks yet. Create your first task to get started.</p>
              <Link to="/tasks/new" className="btn-primary mt-4 inline-block">Create Task</Link>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {recentTasks.map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-4 p-4 hover:bg-dark-bg/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{task.title}</p>
                    <p className="text-dark-muted text-xs mt-0.5">
                      {task.taskType} · {task.repository?.fullName || 'No repo'} · {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={statusColor(task.status)}>{task.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Projects</h2>
          <Link to="/projects" className="text-sm text-forge-400 hover:text-forge-300">View all →</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {projectList.map((project) => (
            <div key={project.id} className="card hover:border-forge-600/30 transition-colors cursor-pointer">
              <h3 className="font-semibold text-white">{project.name}</h3>
              <p className="text-dark-muted text-sm mt-1 line-clamp-2">{project.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-dark-muted">
                {project.language && <span className="badge-info">{project.language}</span>}
                <span>{project._count?.tasks || 0} tasks</span>
                <span>{project._count?.repositories || 0} repos</span>
              </div>
            </div>
          ))}
          {projectList.length === 0 && (
            <div className="card col-span-3 text-center py-8">
              <p className="text-dark-muted">No projects yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
