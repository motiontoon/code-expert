import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { projects, Project } from '../services/api';

export default function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', language: '', framework: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projects.list().then((d) => setProjectList(d.projects)).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { project } = await projects.create(form);
      setProjectList((prev) => [project, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', language: '', framework: '' });
      toast.success('Project created');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projects.delete(id);
      setProjectList((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-dark-muted mt-1">Organize your repositories and tasks</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4">Create Project</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-muted mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" required />
            </div>
            <div>
              <label className="block text-sm text-dark-muted mb-1">Language</label>
              <input type="text" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="input" placeholder="TypeScript" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-muted mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input resize-y" rows={3} />
            </div>
            <div>
              <label className="block text-sm text-dark-muted mb-1">Framework</label>
              <input type="text" value={form.framework} onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value }))} className="input" placeholder="React, Express, etc." />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-4">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {/* Project Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectList.map((project) => (
          <div key={project.id} className="card hover:border-forge-600/30 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-white">{project.name}</h3>
              <button
                onClick={() => handleDelete(project.id)}
                className="opacity-0 group-hover:opacity-100 text-dark-muted hover:text-red-400 text-xs transition-all"
              >
                Delete
              </button>
            </div>
            <p className="text-dark-muted text-sm line-clamp-2 mb-4">{project.description || 'No description'}</p>
            <div className="flex items-center gap-3 text-xs">
              {project.language && <span className="badge-info">{project.language}</span>}
              {project.framework && <span className="badge-neutral">{project.framework}</span>}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border text-xs text-dark-muted">
              <span>{project._count?.tasks || 0} tasks</span>
              <span>{project._count?.repositories || 0} repos</span>
            </div>
          </div>
        ))}
        {projectList.length === 0 && !showCreate && (
          <div className="col-span-3 card text-center py-12">
            <p className="text-dark-muted text-lg mb-2">No projects yet</p>
            <p className="text-dark-muted text-sm mb-4">Create a project to organize your coding tasks</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Project</button>
          </div>
        )}
      </div>
    </div>
  );
}
