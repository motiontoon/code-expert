import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tasks, projects, github, Project, GitHubRepo } from '../services/api';

export default function NewTaskPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    taskType: 'feature',
    priority: 'medium',
    projectId: '',
    repositoryId: '',
    branch: '',
    targetBranch: 'main',
  });

  useEffect(() => {
    projects.list().then((d) => setProjectList(d.projects)).catch(() => {});
    github.repos().then((d) => setRepos(d.repositories)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { task } = await tasks.create({
        ...form,
        projectId: form.projectId || undefined,
        repositoryId: form.repositoryId || undefined,
        branch: form.branch || undefined,
      });
      toast.success('Task created and queued!');
      navigate(`/tasks/${task.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-2">New Coding Task</h1>
      <p className="text-dark-muted mb-8">Describe what you need and the AI engine will handle it.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-dark-muted mb-1.5">Task Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="input"
            placeholder="e.g., Add user authentication with JWT"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-dark-muted mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="input min-h-[200px] resize-y"
            placeholder="Describe the task in detail. The more context you provide, the better the AI can code it.&#10;&#10;For example:&#10;- What files need to be created or modified&#10;- Expected behavior&#10;- Technical requirements&#10;- Edge cases to handle"
            required
          />
        </div>

        {/* Type & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Task Type</label>
            <select value={form.taskType} onChange={(e) => update('taskType', e.target.value)} className="input">
              <option value="feature">New Feature</option>
              <option value="bugfix">Bug Fix</option>
              <option value="refactor">Refactor</option>
              <option value="test">Tests</option>
              <option value="docs">Documentation</option>
              <option value="review">Code Review</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => update('priority', e.target.value)} className="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Project & Repo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Project (optional)</label>
            <select value={form.projectId} onChange={(e) => update('projectId', e.target.value)} className="input">
              <option value="">No project</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Repository (optional)</label>
            <select value={form.repositoryId} onChange={(e) => update('repositoryId', e.target.value)} className="input">
              <option value="">Select repo</option>
              {repos.map((r) => (
                <option key={r.id} value={String(r.id)}>{r.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Branch */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Branch (auto-generated if empty)</label>
            <input
              type="text"
              value={form.branch}
              onChange={(e) => update('branch', e.target.value)}
              className="input"
              placeholder="codex-forge/feature/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-muted mb-1.5">Target Branch</label>
            <input
              type="text"
              value={form.targetBranch}
              onChange={(e) => update('targetBranch', e.target.value)}
              className="input"
              placeholder="main"
            />
          </div>
        </div>

        {/* File Guard Notice */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-1">
            🛡 File Guard Active
          </div>
          <p className="text-dark-muted text-sm">
            The AI engine will read every file before modifying it. All read/write operations are logged
            in the audit trail for complete transparency.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading ? 'Creating...' : 'Create & Queue Task'}
          </button>
          <button type="button" onClick={() => navigate('/tasks')} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
