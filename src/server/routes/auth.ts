import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { AuthError, ValidationError, AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Registration
// ============================================

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
    password: z.string().min(8).max(100),
    displayName: z.string().min(1).max(100).optional(),
  }),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password, displayName } = req.body;

    // Check existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new ValidationError(
        existing.email === email ? 'Email already registered' : 'Username already taken',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: displayName || username,
      },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(`New user registered: ${username} (${email})`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Login
// ============================================

const loginSchema = z.object({
  body: z.object({
    login: z.string().min(1), // email or username
    password: z.string().min(1),
  }),
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { login, password } = req.body;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { username: login }],
      },
    });

    if (!user || !user.passwordHash) {
      throw new AuthError('Invalid credentials');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new AuthError('Account is deactivated');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info(`User logged in: ${user.username}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GitHub OAuth
// ============================================

router.get('/github', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'user:email repo read:org',
    state: Math.random().toString(36).substring(7),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get('/github/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Missing authorization code');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; scope?: string; error?: string };
    if (!tokenData.access_token) {
      throw new AppError('Failed to obtain GitHub access token', 400);
    }

    // Get GitHub user profile
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json() as {
      id: number;
      login: string;
      avatar_url: string;
      html_url: string;
      email: string;
      name: string;
    };

    // Get email if not public
    let email = profile.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email || `${profile.login}@github.com`;
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { githubAccount: { githubId: String(profile.id) } },
        ],
      },
      include: { githubAccount: true },
    });

    if (!user) {
      // Create new user from GitHub
      user = await prisma.user.create({
        data: {
          email,
          username: profile.login,
          displayName: profile.name || profile.login,
          avatarUrl: profile.avatar_url,
          githubAccount: {
            create: {
              githubId: String(profile.id),
              githubUsername: profile.login,
              accessToken: tokenData.access_token,
              scope: tokenData.scope,
              avatarUrl: profile.avatar_url,
              profileUrl: profile.html_url,
            },
          },
        },
        include: { githubAccount: true },
      });
      logger.info(`New user created via GitHub: ${profile.login}`);
    } else {
      // Update or create GitHub account link
      await prisma.gitHubAccount.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          githubId: String(profile.id),
          githubUsername: profile.login,
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          avatarUrl: profile.avatar_url,
          profileUrl: profile.html_url,
        },
        update: {
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          avatarUrl: profile.avatar_url,
          githubUsername: profile.login,
        },
      });

      // Update user avatar
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: profile.avatar_url, lastLoginAt: new Date() },
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect to client
    res.redirect(`${env.CLIENT_URL}/dashboard?auth=success`);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Current User
// ============================================

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        plan: true,
        createdAt: true,
        githubAccount: {
          select: {
            githubUsername: true,
            avatarUrl: true,
            profileUrl: true,
          },
        },
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Logout
// ============================================

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

export default router;
