import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REVENUE_STATUS_KEYS = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];
const MAX_REVENUE_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const roundMoney = (value) => Number(Number(value ?? 0).toFixed(2));

const getUtcDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const getUtcDayStart = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const getRevenueRange = (query) => {
  const { from, to } = query;

  if (!from) {
    return { error: 'Thiếu tham số from.' };
  }

  if (!to) {
    return { error: 'Thiếu tham số to.' };
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime())) {
    return { error: 'Tham số from không phải DateTime hợp lệ.' };
  }

  if (Number.isNaN(toDate.getTime())) {
    return { error: 'Tham số to không phải DateTime hợp lệ.' };
  }

  if (fromDate > toDate) {
    return { error: 'Tham số from không được lớn hơn to.' };
  }

  const fromDayStart = getUtcDayStart(fromDate);
  const toDayStart = getUtcDayStart(toDate);
  const dayCount = Math.floor((toDayStart.getTime() - fromDayStart.getTime()) / MS_PER_DAY) + 1;

  if (dayCount > MAX_REVENUE_RANGE_DAYS) {
    return { error: 'Khoảng thời gian thống kê tối đa là 366 ngày.' };
  }

  return { fromDate, toDate, fromDayStart, dayCount };
};

const createEmptyStatusCounts = () => REVENUE_STATUS_KEYS.reduce((counts, status) => {
  counts[status] = 0;
  return counts;
}, {});

const createEmptyChartData = (fromDayStart, dayCount) => {
  const chartByDate = new Map();

  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(fromDayStart);
    date.setUTCDate(date.getUTCDate() + index);
    chartByDate.set(getUtcDateKey(date), { date: getUtcDateKey(date), revenue: 0, orders: 0 });
  }

  return chartByDate;
};

const getProductImageUrl = (product) => {
  if (!product) {
    return null;
  }

  if (product.imageUrl) {
    return product.imageUrl;
  }

  const primaryImage = product.images.find((image) => image.isPrimary);
  if (primaryImage) {
    return primaryImage.imageUrl;
  }

  const firstImage = product.images[0];
  if (firstImage) {
    return firstImage.imageUrl;
  }

  return null;
};

export const getDashboardRevenue = async (req, res) => {
  try {
    const range = getRevenueRange(req.query);

    if (range.error) {
      return res.status(400).json({ message: range.error });
    }

    const { fromDate, toDate, fromDayStart, dayCount } = range;
    const revenueWhere = {
      paymentStatus: 'paid',
      paidAt: {
        gte: fromDate,
        lte: toDate
      }
    };

    const [paidOrders, successfulOrders, cancelledOrders, statusGroups, topProductGroups] = await Promise.all([
      prisma.order.findMany({
        where: revenueWhere,
        select: {
          id: true,
          totalAmount: true,
          paidAt: true
        }
      }),
      prisma.order.count({
        where: {
          status: { in: ['delivered', 'completed'] },
          paidAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.order.count({
        where: {
          status: 'cancelled',
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: fromDate,
            lte: toDate
          }
        },
        _count: true
      }),
      prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: revenueWhere
        },
        _sum: {
          quantity: true,
          subtotal: true
        }
      })
    ]);

    const totalRevenue = roundMoney(paidOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0));
    const paidOrdersCount = paidOrders.length;
    const averageOrderValue = paidOrdersCount > 0 ? roundMoney(totalRevenue / paidOrdersCount) : 0;

    const chartByDate = createEmptyChartData(fromDayStart, dayCount);
    paidOrders.forEach((order) => {
      if (!order.paidAt) {
        return;
      }

      const dateKey = getUtcDateKey(order.paidAt);
      const entry = chartByDate.get(dateKey);

      if (!entry) {
        return;
      }

      entry.revenue = roundMoney(entry.revenue + Number(order.totalAmount ?? 0));
      entry.orders += 1;
    });

    const statusCounts = createEmptyStatusCounts();
    statusGroups.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(statusCounts, item.status)) {
        statusCounts[item.status] = item._count;
      }
    });

    const sortedTopProductGroups = topProductGroups
      .map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item._sum.quantity ?? 0,
        revenue: roundMoney(item._sum.subtotal ?? 0)
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }

        return b.quantity - a.quantity;
      })
      .slice(0, 5);

    const productIds = sortedTopProductGroups.map((item) => item.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            imageUrl: true,
            images: {
              select: {
                imageUrl: true,
                isPrimary: true,
                sortOrder: true
              },
              orderBy: { sortOrder: 'asc' }
            }
          }
        })
      : [];

    const productMap = new Map(products.map((product) => [product.id, product]));
    const topProducts = sortedTopProductGroups.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      revenue: item.revenue,
      imageUrl: getProductImageUrl(productMap.get(item.productId))
    }));

    res.json({
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      },
      summary: {
        totalRevenue,
        paidOrders: paidOrdersCount,
        successfulOrders,
        cancelledOrders,
        averageOrderValue
      },
      chartData: Array.from(chartByDate.values()),
      topProducts,
      statusCounts
    });
  } catch (error) {
    console.error('getDashboardRevenue error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayRevenueAggregate, monthRevenueAggregate, totalOrders, totalCustomers] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paymentStatus: 'paid',
          paidAt: { gte: today }
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: 'paid',
          paidAt: { gte: startOfMonth }
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'customer' } })
    ]);

    const todayRevenue = roundMoney(todayRevenueAggregate._sum.totalAmount || 0);
    const monthRevenue = roundMoney(monthRevenueAggregate._sum.totalAmount || 0);

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
        paymentStatus: 'paid',
        paidAt: { gte: thirtyDaysAgo }
      },
      select: {
        paidAt: true,
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
      if (!order.paidAt) {
        return;
      }

      const dateStr = new Date(order.paidAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] = roundMoney(revenueByDate[dateStr] + Number(order.totalAmount || 0));
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
        where: {
          order: {
            paymentStatus: 'paid',
            paidAt: { not: null }
          }
        },
        _sum: {
          quantity: true,
          subtotal: true
        }
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

    const sortedTopProducts = topProducts
      .map(item => ({
        id: item.productId,
        name: item.productName,
        sold: item._sum.quantity || 0,
        revenue: roundMoney(item._sum.subtotal || 0)
      }))
      .sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }

        return b.sold - a.sold;
      })
      .slice(0, 5);

    const formattedTopProducts = await Promise.all(sortedTopProducts.map(async item => {
      const p = await prisma.product.findUnique({ where: { id: item.id } });
      return {
        id: item.id,
        name: item.name,
        sold: item.sold,
        imageUrl: p ? p.imageUrl : null
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
