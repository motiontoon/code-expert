import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { github, GitHubRepo, GitHubProfile } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function GitHubPage() {
  const { user, connectGitHub } = useAuth();
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.githubAccount) { setLoading(false); return; }
    Promise.allSettled([
      github.profile().then((d) => setProfile(d.profile)),
      github.repos({ sort: 'updated' }).then((d) => setRepos(d.repositories)),
    ]).finally(() => setLoading(false));
  }, [user]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { synced } = await github.syncRepos();
      toast.success(`Synced ${synced} repositories`);
      const { repositories } = await github.repos({ sort: 'updated' });
      setRepos(repositories);
    } catch {
      toast.error('Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user?.githubAccount) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-dark-muted" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect GitHub</h2>
        <p className="text-dark-muted mb-6 max-w-md mx-auto">
          Connect your GitHub account to access repositories, create branches, commit code, and open pull requests.
        </p>
        <button onClick={connectGitHub} className="btn-primary text-lg px-8 py-3">
          Connect GitHub Account
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-forge-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">GitHub Integration</h1>
          <p className="text-dark-muted mt-1">Manage your connected repositories</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-secondary">
          {syncing ? 'Syncing...' : 'Sync Repos'}
        </button>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="card flex items-center gap-6 mb-6">
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full" />
          <div>
            <h2 className="text-lg font-semibold text-white">{profile.name || profile.login}</h2>
            <p className="text-dark-muted text-sm">{profile.bio || 'No bio'}</p>
            <div className="flex gap-4 mt-2 text-xs text-dark-muted">
              <span>{profile.public_repos} repos</span>
              <span>{profile.followers} followers</span>
            </div>
          </div>
          <span className="badge-success ml-auto">Connected</span>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-6"
        placeholder="Search repositories..."
      />

      {/* Repos */}
      <div className="space-y-2">
        {filteredRepos.map((repo) => (
          <div key={repo.id} className="card flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{repo.full_name}</p>
                {repo.private && <span className="badge-neutral text-[10px]">Private</span>}
              </div>
              <p className="text-dark-muted text-sm mt-0.5 truncate">{repo.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-dark-muted">
              {repo.language && (
                <span className="badge-info">{repo.language}</span>
              )}
              <span>★ {repo.stargazers_count}</span>
            </div>
          </div>
        ))}
        {filteredRepos.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-dark-muted">No repositories found</p>
          </div>
        )}
      </div>
    </div>
  );
}
