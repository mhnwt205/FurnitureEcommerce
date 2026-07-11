import prisma from '../prismaClient.js';
import { verifyAccessToken } from '../utils/tokenService.js';

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    const userId = Number(decoded.id || decoded.sub);

    if (!userId) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is locked' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: decoded.sessionId || null
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};