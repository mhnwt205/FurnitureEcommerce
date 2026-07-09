import prisma from '../prismaClient.js';

export const getMyProfile = async (req, res) => {
  try {
    const customer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });
    if (!customer) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(customer);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const updatedCustomer = await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName, phone },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      }
    });
    res.status(200).json({ message: 'Profile updated', customer: updatedCustomer });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { page, limit, search, loginType, isEmailVerified, isActive } = req.query;

    const whereClause = { role: 'customer' };

    if (search) {
      whereClause.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (loginType && loginType !== 'all') {
      whereClause.provider = loginType;
    }

    if (isEmailVerified !== undefined && isEmailVerified !== 'all' && isEmailVerified !== '') {
      whereClause.emailVerified = isEmailVerified === 'true';
    }

    if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
      whereClause.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [total, customers] = await prisma.$transaction([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          address: true,
          provider: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              paymentStatus: true
            }
          },
          _count: {
            select: { wishlists: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limitNum
      })
    ]);

    const formattedCustomers = customers.map(c => {
      const orderCount = c.orders.length;
      const totalSpend = c.orders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);
      
      const { orders, _count, ...customerData } = c;
      return {
        ...customerData,
        orderCount,
        totalSpend,
        wishlistCount: _count?.wishlists || 0
      };
    });

    res.status(200).json({
      data: formattedCustomers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'customer'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        provider: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { wishlists: true }
        },
        wishlists: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                imageUrl: true,
                images: {
                  select: { imageUrl: true, isPrimary: true, sortOrder: true, id: true },
                  orderBy: [
                    { isPrimary: 'desc' },
                    { sortOrder: 'asc' },
                    { id: 'asc' }
                  ]
                }
              }
            }
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const totalOrders = customer.orders.length;
    const paidOrders = customer.orders.filter(o => o.paymentStatus === 'paid');
    const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const averageOrderValue = paidOrders.length > 0 ? totalSpent / paidOrders.length : 0;
    const latestOrderDate = customer.orders.length > 0 ? customer.orders[0].createdAt : null;
    const wishlistCount = customer._count?.wishlists || 0;
    
    const recentOrders = customer.orders.slice(0, 5);
    const recentWishlistProducts = (customer.wishlists || []).map(w => {
      const p = w.product;
      const imageUrl = p.images && p.images.length > 0 ? p.images[0].imageUrl : p.imageUrl;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        imageUrl,
        createdAt: w.createdAt
      };
    });

    const { orders, _count, wishlists, ...customerInfo } = customer;

    res.status(200).json({
      ...customerInfo,
      totalOrders,
      totalSpent,
      averageOrderValue,
      latestOrderDate,
      wishlistCount,
      recentOrders,
      recentWishlistProducts
    });
  } catch (error) {
    console.error('Get customer by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const customer = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: 'customer'
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const updatedCustomer = await prisma.user.update({
      where: { id: customer.id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true
      }
    });

    res.status(200).json({
      message: `Customer account ${isActive ? 'unlocked' : 'locked'} successfully`,
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
