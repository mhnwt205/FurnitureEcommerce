import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role === 'customer' && !user.isActive) {
      return res.status(403).json({ message: 'Account is locked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
