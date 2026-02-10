import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { githubService } from '../services/githubService.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// GitHub Profile
// ============================================

router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await githubService.getProfile(req.user!.id);
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Repositories
// ============================================

router.get('/repos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, per_page, sort } = req.query;
    const repos = await githubService.listRepositories(req.user!.id, {
      page: page ? Number(page) : undefined,
      perPage: per_page ? Number(per_page) : undefined,
      sort: sort as string,
    });
    res.json({ success: true, data: { repositories: repos } });
  } catch (error) {
    next(error);
  }
});

router.post('/repos/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await githubService.syncRepositories(req.user!.id);
    res.json({ success: true, data: { synced: count } });
  } catch (error) {
    next(error);
  }
});

router.get('/repos/:owner/:repo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubService.getRepository(req.user!.id, owner, repo);
    res.json({ success: true, data: { repository: data } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Branches
// ============================================

router.get('/repos/:owner/:repo/branches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubService.listBranches(req.user!.id, owner, repo);
    res.json({ success: true, data: { branches } });
  } catch (error) {
    next(error);
  }
});

router.post('/repos/:owner/:repo/branches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const { name, from } = req.body;
    const branch = await githubService.createBranch(req.user!.id, owner, repo, name, from);
    res.json({ success: true, data: { branch } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Files
// ============================================

router.get('/repos/:owner/:repo/contents/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const path = req.params[0] || '';
    const ref = req.query.ref as string | undefined;
    const content = await githubService.getFileContent(req.user!.id, owner, repo, path, ref);
    res.json({ success: true, data: content });
  } catch (error) {
    next(error);
  }
});

router.get('/repos/:owner/:repo/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch as string | undefined;
    const tree = await githubService.getTree(req.user!.id, owner, repo, branch);
    res.json({ success: true, data: { tree } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Commits
// ============================================

router.get('/repos/:owner/:repo/commits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch as string | undefined;
    const commits = await githubService.listCommits(req.user!.id, owner, repo, branch);
    res.json({ success: true, data: { commits } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Pull Requests
// ============================================

router.get('/repos/:owner/:repo/pulls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const pulls = await githubService.listPullRequests(req.user!.id, owner, repo);
    res.json({ success: true, data: { pullRequests: pulls } });
  } catch (error) {
    next(error);
  }
});

router.post('/repos/:owner/:repo/pulls', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, repo } = req.params;
    const { title, body, head, base } = req.body;
    const pr = await githubService.createPullRequest(req.user!.id, owner, repo, {
      title,
      body,
      head,
      base,
    });
    res.json({ success: true, data: { pullRequest: pr } });
  } catch (error) {
    next(error);
  }
});

export default router;
