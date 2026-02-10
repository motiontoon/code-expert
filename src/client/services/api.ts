const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Request failed: ${res.status}`);
  }

  return json.data as T;
}

// ============================================
// Auth
// ============================================

export const auth = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { login: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<{ user: User }>('/auth/me'),

  logout: () => request('/auth/logout', { method: 'POST' }),

  githubUrl: () => `${API_BASE}/auth/github`,
};

// ============================================
// Projects
// ============================================

export const projects = {
  list: () => request<{ projects: Project[] }>('/projects'),

  get: (id: string) => request<{ project: Project }>(`/projects/${id}`),

  create: (data: { name: string; description?: string; language?: string; framework?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Project>) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),

  linkRepo: (projectId: string, repositoryId: string) =>
    request(`/projects/${projectId}/repositories`, { method: 'POST', body: JSON.stringify({ repositoryId }) }),
};

// ============================================
// Tasks
// ============================================

export const tasks = {
  list: (params?: { status?: string; taskType?: string; projectId?: string; page?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ tasks: CodingTask[]; pagination: Pagination }>(`/tasks?${query}`);
  },

  get: (id: string) => request<{ task: CodingTask }>(`/tasks/${id}`),

  create: (data: {
    title: string;
    description: string;
    taskType: string;
    priority?: string;
    projectId?: string;
    repositoryId?: string;
    branch?: string;
  }) => request<{ task: CodingTask }>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

  cancel: (id: string) => request<{ task: CodingTask }>(`/tasks/${id}/cancel`, { method: 'POST' }),

  retry: (id: string) => request<{ task: CodingTask }>(`/tasks/${id}/retry`, { method: 'POST' }),

  stats: () => request<{ stats: TaskStats }>('/tasks/stats/overview'),

  engineStatus: () => request<{ engine: EngineStatus }>('/tasks/engine/status'),
};

// ============================================
// GitHub
// ============================================

export const github = {
  profile: () => request<{ profile: GitHubProfile }>('/github/profile'),

  repos: (params?: { page?: number; sort?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ repositories: GitHubRepo[] }>(`/github/repos?${query}`);
  },

  syncRepos: () => request<{ synced: number }>('/github/repos/sync', { method: 'POST' }),

  branches: (owner: string, repo: string) =>
    request<{ branches: GitHubBranch[] }>(`/github/repos/${owner}/${repo}/branches`),

  tree: (owner: string, repo: string, branch?: string) =>
    request<{ tree: GitHubTree }>(`/github/repos/${owner}/${repo}/tree${branch ? `?branch=${branch}` : ''}`),

  fileContent: (owner: string, repo: string, path: string, ref?: string) =>
    request<{ type: string; content: string; sha: string }>(`/github/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`),

  commits: (owner: string, repo: string, branch?: string) =>
    request<{ commits: GitHubCommit[] }>(`/github/repos/${owner}/${repo}/commits${branch ? `?branch=${branch}` : ''}`),

  pullRequests: (owner: string, repo: string) =>
    request<{ pullRequests: GitHubPR[] }>(`/github/repos/${owner}/${repo}/pulls`),

  createPR: (owner: string, repo: string, data: { title: string; body: string; head: string; base: string }) =>
    request<{ pullRequest: GitHubPR }>(`/github/repos/${owner}/${repo}/pulls`, { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// File Guard
// ============================================

export const fileGuardApi = {
  audit: (params?: { taskId?: string; filePath?: string; limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ logs: FileAuditEntry[] }>(`/file-guard/audit?${query}`);
  },

  stats: () => request<{ stats: FileGuardStats }>('/file-guard/stats'),

  checkWrite: (filePath: string, taskId?: string) =>
    request<{ allowed: boolean }>('/file-guard/check-write', { method: 'POST', body: JSON.stringify({ filePath, taskId }) }),
};

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  plan: string;
  createdAt?: string;
  githubAccount?: { githubUsername: string; avatarUrl?: string; profileUrl?: string };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  language?: string;
  framework?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number; repositories: number; fileAudits?: number };
  repositories?: Array<{ id: string; fullName: string; language?: string }>;
  tasks?: CodingTask[];
}

export interface CodingTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  branch?: string;
  targetBranch?: string;
  filesCreated: number;
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
  commitSha?: string;
  pullRequestUrl?: string;
  errorMessage?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  repository?: { fullName: string; name: string };
  project?: { name: string };
  steps?: TaskStep[];
  _count?: { steps: number };
}

export interface TaskStep {
  id: string;
  stepNumber: number;
  action: string;
  description: string;
  status: string;
  duration?: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  active: number;
  queued: number;
  successRate: string;
}

export interface EngineStatus {
  isRunning: boolean;
  activeTasks: number;
  maxConcurrent: number;
}

export interface GitHubProfile {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  language: string;
  default_branch: string;
  updated_at: string;
  stargazers_count: number;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
}

export interface GitHubTree {
  sha: string;
  tree: Array<{ path: string; type: string; size?: number }>;
}

export interface GitHubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  user: { login: string; avatar_url: string };
}

export interface FileAuditEntry {
  id: string;
  filePath: string;
  action: string;
  wasReadFirst: boolean;
  guardPassed: boolean;
  guardMessage?: string;
  createdAt: string;
}

export interface FileGuardStats {
  totalWrites: number;
  passed: number;
  violations: number;
  complianceRate: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
