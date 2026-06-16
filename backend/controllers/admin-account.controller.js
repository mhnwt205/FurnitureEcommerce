import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

export const getAdminAccounts = async (req, res) => {
  try {
    const accounts = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'staff']
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        position: true,
        isActive: true,
        createdAt: true,
        userPermissions: {
          select: {
            permission: {
              select: {
                key: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(accounts);
  } catch (error) {
    console.error('Get admin accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAdminAccount = async (req, res) => {
  try {
    const { fullName, email, password, phone, role, permissions, position } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'fullName, email, password, and role are required' });
    }

    if (role !== 'admin' && role !== 'staff') {
      return res.status(400).json({ message: 'Role must be either admin or staff' });
    }

    let parsedPosition = null;
    if (position && typeof position === 'string') {
      parsedPosition = position.trim();
      if (parsedPosition.length > 100) {
        return res.status(400).json({ message: 'Position cannot exceed 100 characters' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Resolve permission IDs if permissions array is provided
    let permissionConnects = [];
    if (permissions && Array.isArray(permissions) && role === 'staff') {
      const perms = await prisma.permission.findMany({
        where: { key: { in: permissions } }
      });
      permissionConnects = perms.map(p => ({
        permissionId: p.id
      }));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAccount = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        phone,
        role,
        position: parsedPosition,
        emailVerified: true,
        provider: 'local',
        isActive: true,
        userPermissions: {
          create: permissionConnects
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        position: true,
        isActive: true,
        createdAt: true,
        userPermissions: {
          select: {
            permission: { select: { key: true } }
          }
        }
      }
    });

    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Create admin account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAdminAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role, permissions, position } = req.body;

    const account = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: { in: ['admin', 'staff'] }
      }
    });

    if (!account) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    // If changing role from admin to staff, check if this is the last admin
    if (role && role !== account.role) {
      if (role !== 'admin' && role !== 'staff') {
        return res.status(400).json({ message: 'Role must be either admin or staff' });
      }

      if (account.role === 'admin' && role === 'staff') {
        const adminCount = await prisma.user.count({
          where: { role: 'admin' }
        });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot demote the last administrator in the system' });
        }
      }
    }

    // Check if email already in use by another user
    if (email && email !== account.email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    let parsedPosition = position !== undefined ? position : account.position;
    if (parsedPosition !== null && typeof parsedPosition === 'string') {
      parsedPosition = parsedPosition.trim();
      if (parsedPosition.length > 100) {
        return res.status(400).json({ message: 'Position cannot exceed 100 characters' });
      }
    }

    // Resolve permissions
    let permissionUpdate = undefined;
    if (permissions && Array.isArray(permissions)) {
      const targetRole = role ?? account.role;
      if (targetRole === 'staff') {
        const perms = await prisma.permission.findMany({
          where: { key: { in: permissions } }
        });
        permissionUpdate = {
          deleteMany: {},
          create: perms.map(p => ({ permissionId: p.id }))
        };
      } else {
        // If admin, they shouldn't have specific permissions or we clear them
        permissionUpdate = { deleteMany: {} };
      }
    } else if (role === 'admin' && account.role === 'staff') {
      // Upgraded to admin, clear specific permissions
      permissionUpdate = { deleteMany: {} };
    }

    const updateData = {
      fullName: fullName ?? account.fullName,
      email: email ?? account.email,
      phone: phone ?? account.phone,
      role: role ?? account.role,
      position: parsedPosition
    };

    if (permissionUpdate) {
      updateData.userPermissions = permissionUpdate;
    }

    const updatedAccount = await prisma.user.update({
      where: { id: account.id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        position: true,
        isActive: true,
        userPermissions: {
          select: { permission: { select: { key: true } } }
        }
      }
    });

    res.status(200).json(updatedAccount);
  } catch (error) {
    console.error('Update admin account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAdminAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const account = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: { in: ['admin', 'staff'] }
      }
    });

    if (!account) {
      return res.status(404).json({ message: 'Admin/Staff account not found' });
    }

    // If trying to lock an admin, check if it's the last admin or locking oneself if last admin
    if (!isActive && account.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', isActive: true }
      });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot lock the last active administrator in the system' });
      }
    }

    const updatedAccount = await prisma.user.update({
      where: { id: account.id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    res.status(200).json({
      message: `Account ${isActive ? 'unlocked' : 'locked'} successfully`,
      account: updatedAccount
    });
  } catch (error) {
    console.error('Update admin account status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
