import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Customers don't have access to admin actions
      if (user.role === 'customer') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // If user is staff, check specific permission
      if (user.role === 'staff') {
        // Query user's permissions
        const hasPerm = await prisma.userPermission.findFirst({
          where: {
            userId: user.id,
            permission: {
              key: permissionKey
            }
          }
        });

        if (hasPerm) {
          return next();
        } else {
          return res.status(403).json({ message: `Forbidden: Requires permission '${permissionKey}'` });
        }
      }

      return res.status(403).json({ message: 'Forbidden' });

    } catch (error) {
      console.error('Error in permission middleware:', error);
      res.status(500).json({ message: 'Internal server error checking permissions' });
    }
  };
};

export const requireAnyPermission = (permissionKeys) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Customers don't have access to admin actions
      if (user.role === 'customer') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // If user is staff, check specific permission
      if (user.role === 'staff') {
        // Query user's permissions
        const hasPerm = await prisma.userPermission.findFirst({
          where: {
            userId: user.id,
            permission: {
              key: { in: permissionKeys }
            }
          }
        });

        if (hasPerm) {
          return next();
        } else {
          return res.status(403).json({ message: `Forbidden: Requires one of permissions: ${permissionKeys.join(', ')}` });
        }
      }

      return res.status(403).json({ message: 'Forbidden' });

    } catch (error) {
      console.error('Error in permission middleware:', error);
      res.status(500).json({ message: 'Internal server error checking permissions' });
    }
  };
};
