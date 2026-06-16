import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách permissions:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy permissions.' });
  }
};
