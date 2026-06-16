import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayOrders, monthOrders, totalOrders, totalCustomers] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: today },
          status: { notIn: ['cancelled', 'pending', 'confirmed', 'preparing', 'shipping'] } // Actually, revenue usually means completed, let's just sum completed ones, or all not cancelled if business wants. Let's assume 'completed'.
        }
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'completed'
        }
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'customer' } })
    ]);

    const todayOrdersAllStatus = await prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'cancelled' }
      }
    });

    const monthOrdersAllStatus = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'cancelled' }
      }
    });

    const todayRevenue = todayOrdersAllStatus.reduce((sum, order) => sum + order.totalAmount, 0);
    const monthRevenue = monthOrdersAllStatus.reduce((sum, order) => sum + order.totalAmount, 0);

    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    });

    const formattedCounts = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipping: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };

    statusCounts.forEach(item => {
      formattedCounts[item.status] = item._count;
    });

    res.json({
      todayRevenue,
      monthRevenue,
      totalOrders,
      totalCustomers,
      statusCounts: formattedCounts
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDashboardCharts = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'cancelled' }
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    const revenueByDate = {};
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      revenueByDate[dateStr] = 0;
    }

    orders.forEach(order => {
      const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += order.totalAmount;
      }
    });

    const chartData = Object.keys(revenueByDate).map(date => ({
      date,
      revenue: revenueByDate[date]
    }));

    res.json({ chartData });
  } catch (error) {
    console.error('getDashboardCharts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getDashboardWidgets = async (req, res) => {
  try {
    const [recentOrders, topProducts, newCustomers] = await Promise.all([
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderCode: true,
          fullName: true,
          totalAmount: true,
          status: true,
          createdAt: true
        }
      }),
      
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      }),
      
      prisma.user.findMany({
        where: { role: 'customer' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true
        }
      })
    ]);

    const formattedTopProducts = await Promise.all(topProducts.map(async item => {
      const p = await prisma.product.findUnique({ where: { id: item.productId } });
      return {
        id: item.productId,
        name: item.productName,
        sold: item._sum.quantity,
        imageUrl: p ? p.imageUrl : 'https://placehold.co/100x100?text=SP'
      };
    }));

    res.json({
      recentOrders,
      topProducts: formattedTopProducts,
      newCustomers
    });
  } catch (error) {
    console.error('getDashboardWidgets error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
