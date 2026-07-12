import prisma from '../prismaClient.js';
import { verifyAccessToken } from '../utils/tokenService.js';

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { hasAuthHeader: false, token: null };

  const [scheme, token, ...extraParts] = authHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extraParts.length > 0) {
    return { hasAuthHeader: true, token: null, malformed: true };
  }

  return { hasAuthHeader: true, token };
};

const findActiveAuthUser = async (token) => {
  const decoded = verifyAccessToken(token);
  const userId = Number(decoded.id || decoded.sub);

  if (!userId) {
    return { error: { status: 403, message: 'Invalid or expired token' } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true
    }
  });

  if (!user) {
    return { error: { status: 401, message: 'User not found' } };
  }

  if (!user.isActive) {
    return { error: { status: 403, message: 'Account is locked' } };
  }

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      sessionId: decoded.sessionId || null
    }
  };
};

export const verifyToken = async (req, res, next) => {
  const { token } = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const result = await findActiveAuthUser(token);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    req.user = result.user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const { hasAuthHeader, token, malformed } = getBearerToken(req);

  if (!hasAuthHeader) {
    req.user = null;
    return next();
  }

  if (malformed || !token) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  try {
    const result = await findActiveAuthUser(token);
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    req.user = result.user;
    return next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};