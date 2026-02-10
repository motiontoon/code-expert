import { Octokit } from '@octokit/rest';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, AppError } from '../utils/errors.js';

export class GitHubService {
  private getOctokit(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
  }

  private async getToken(userId: string): Promise<string> {
    const account = await prisma.gitHubAccount.findUnique({
      where: { userId },
    });
    if (!account) {
      throw new NotFoundError('GitHub account not connected');
    }
    return account.accessToken;
  }

  /**
   * Get authenticated user's GitHub profile
   */
  async getProfile(userId: string) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);
    const { data } = await octokit.users.getAuthenticated();
    return data;
  }

  /**
   * List all repositories accessible to the user
   */
  async listRepositories(userId: string, params?: { page?: number; perPage?: number; sort?: string }) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: params?.perPage || 30,
      page: params?.page || 1,
      sort: (params?.sort as 'updated' | 'created' | 'pushed' | 'full_name') || 'updated',
      affiliation: 'owner,collaborator,organization_member',
    });

    return data;
  }

  /**
   * Get a specific repository
   */
  async getRepository(userId: string, owner: string, repo: string) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);
    const { data } = await octokit.repos.get({ owner, repo });
    return data;
  }

  /**
   * Sync repositories from GitHub to local database
   */
  async syncRepositories(userId: string): Promise<number> {
    const account = await prisma.gitHubAccount.findUnique({
      where: { userId },
    });
    if (!account) throw new NotFoundError('GitHub account not connected');

    const repos = await this.listRepositories(userId, { perPage: 100 });
    let synced = 0;

    for (const repo of repos) {
      await prisma.repository.upsert({
        where: {
          id: `${account.id}-${repo.id}`,
        },
        create: {
          id: `${account.id}-${repo.id}`,
          githubAccountId: account.id,
          githubRepoId: String(repo.id),
          fullName: repo.full_name,
          name: repo.name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch || 'main',
          isPrivate: repo.private,
          cloneUrl: repo.clone_url || '',
          description: repo.description,
          language: repo.language,
          lastSyncedAt: new Date(),
        },
        update: {
          fullName: repo.full_name,
          name: repo.name,
          defaultBranch: repo.default_branch || 'main',
          isPrivate: repo.private,
          cloneUrl: repo.clone_url || '',
          description: repo.description,
          language: repo.language,
          lastSyncedAt: new Date(),
        },
      });
      synced++;
    }

    logger.info(`Synced ${synced} repositories for user ${userId}`);
    return synced;
  }

  /**
   * List branches for a repository
   */
  async listBranches(userId: string, owner: string, repo: string) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);
    const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 100 });
    return data;
  }

  /**
   * Create a new branch
   */
  async createBranch(userId: string, owner: string, repo: string, branchName: string, fromBranch: string = 'main') {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    // Get the SHA of the source branch
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${fromBranch}` });

    // Create the new branch
    const { data } = await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });

    logger.info(`Created branch "${branchName}" from "${fromBranch}" in ${owner}/${repo}`);
    return data;
  }

  /**
   * Get file content from a repository
   */
  async getFileContent(userId: string, owner: string, repo: string, path: string, ref?: string) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data)) {
      return { type: 'directory' as const, entries: data };
    }

    if (data.type !== 'file' || !('content' in data)) {
      throw new AppError('Not a file', 400);
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return {
      type: 'file' as const,
      content,
      sha: data.sha,
      path: data.path,
      size: data.size,
    };
  }

  /**
   * Create or update a file in a repository
   */
  async writeFile(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string,
  ) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    // If no sha provided, try to get the current file's sha
    let fileSha = sha;
    if (!fileSha) {
      try {
        const existing = await this.getFileContent(userId, owner, repo, path, branch);
        if (existing.type === 'file') {
          fileSha = existing.sha;
        }
      } catch {
        // File doesn't exist yet, that's fine
      }
    }

    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha: fileSha,
    });

    return data;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    userId: string,
    owner: string,
    repo: string,
    params: {
      title: string;
      body: string;
      head: string;
      base: string;
    },
  ) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    });

    logger.info(`Created PR #${data.number} in ${owner}/${repo}: ${params.title}`);
    return data;
  }

  /**
   * List commits on a branch
   */
  async listCommits(userId: string, owner: string, repo: string, branch?: string, perPage: number = 20) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: perPage,
    });

    return data;
  }

  /**
   * Get repository tree (file listing)
   */
  async getTree(userId: string, owner: string, repo: string, branch: string = 'main') {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref.object.sha,
      recursive: 'true',
    });

    return tree;
  }

  /**
   * List open pull requests
   */
  async listPullRequests(userId: string, owner: string, repo: string) {
    const token = await this.getToken(userId);
    const octokit = this.getOctokit(token);

    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      per_page: 30,
    });

    return data;
  }
}

export const githubService = new GitHubService();
