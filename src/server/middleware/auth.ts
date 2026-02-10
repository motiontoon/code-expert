import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AuthError, ForbiddenError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role, plan: user.plan },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRATION } as jwt.SignOptions,
  );
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      throw new AuthError('No authentication token provided');
    }

    const decoded = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, role: true, plan: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AuthError('User not found or deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      plan: user.plan,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else {
      next(new AuthError('Invalid or expired token'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

export function requirePlan(...plans: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError());
    }
    if (!plans.includes(req.user.plan)) {
      return next(new ForbiddenError('This feature requires a higher plan'));
    }
    next();
  };
}
