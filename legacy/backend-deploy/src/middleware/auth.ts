import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { createError } from './errorHandler.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        sub: string;
        role: 'user' | 'admin' | 'moderator';
        permissions?: string[];
      };
    }
  }
}

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 30000,
});

const getKey = promisify(client.getSigningKey.bind(client));

// Verify JWT token
const verifyToken = async (token: string): Promise<any> => {
  try {
    // Decode token to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token structure');
    }

    // Get signing key
    const key = await getKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    // Verify token
    const payload = jwt.verify(token, signingKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    });

    return payload;
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw error;
  }
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401, 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    // Extract user information from token
    req.user = {
      id: payload.sub,
      email: payload.email,
      sub: payload.sub,
      role: payload['https://aivideostudio.com/role'] || 'user',
      permissions: payload['https://aivideostudio.com/permissions'] || [],
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      sub: payload.sub,
      role: payload['https://aivideostudio.com/role'] || 'user',
      permissions: payload['https://aivideostudio.com/permissions'] || [],
    };

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.warn('Optional authentication failed:', error);
    next();
  }
};

// Role-based authorization middleware
export const authorize = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'));
    }

    if (!req.user.permissions?.includes(permission)) {
      return next(createError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    next();
  };
};

// Alias for authenticate (for consistency with existing code)
export const authenticateToken = authenticate;

// Alias for authorize (for consistency with moderation routes)
export const requireRole = (roles: string[]) => authorize(roles);