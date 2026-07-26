import sharedPrisma from '../prismaClient.js';
import { getRequestId } from './requestContext.middleware.js';

let prisma = sharedPrisma;

const permissionErrorCode = (status) => {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  return 'INTERNAL_SERVER_ERROR';
};

const sendPermissionError = (req, res, status, message) => {
  if (!req.supportConversationErrorEnvelope) {
    return res.status(status).json({ message, ...(req.requestId ? { requestId: req.requestId } : {}) });
  }

  return res.status(status).json({
    error: {
      code: permissionErrorCode(status),
      message
    },
    requestId: getRequestId(req)
  });
};

// Test-only seam for exercising the real permission middleware's database
// failure path without changing authorization behavior in application code.
export const setPermissionPrismaClientForTests = (client) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Permission Prisma test override is only available when NODE_ENV=test');
  }
  if (!client?.userPermission?.findFirst) {
    throw new Error('Permission Prisma test override requires userPermission.findFirst');
  }
  const previousClient = prisma;
  prisma = client;
  return () => {
    prisma = previousClient;
  };
};

export const userHasPermission = async (user, permissionKey) => {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'staff') return false;
  return Boolean(await prisma.userPermission.findFirst({
    where: {
      userId: user.id,
      permission: { key: permissionKey }
    }
  }));
};

export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return sendPermissionError(req, res, 401, 'Unauthorized');
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Customers don't have access to admin actions
      if (user.role === 'customer') {
        return sendPermissionError(req, res, 403, 'Forbidden');
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
          return sendPermissionError(req, res, 403, `Forbidden: Requires permission '${permissionKey}'`);
        }
      }

      return sendPermissionError(req, res, 403, 'Forbidden');

    } catch (error) {
      console.error('Error in permission middleware:', error);
      return sendPermissionError(req, res, 500, 'Internal server error checking permissions');
    }
  };
};

export const requireAnyPermission = (permissionKeys) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return sendPermissionError(req, res, 401, 'Unauthorized');
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Customers don't have access to admin actions
      if (user.role === 'customer') {
        return sendPermissionError(req, res, 403, 'Forbidden');
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
          return sendPermissionError(req, res, 403, `Forbidden: Requires one of permissions: ${permissionKeys.join(', ')}`);
        }
      }

      return sendPermissionError(req, res, 403, 'Forbidden');

    } catch (error) {
      console.error('Error in permission middleware:', error);
      return sendPermissionError(req, res, 500, 'Internal server error checking permissions');
    }
  };
};
