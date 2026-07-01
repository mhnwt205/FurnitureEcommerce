import prisma from '../prismaClient.js';
import { attachPricingToProducts } from '../services/promotionPricing.service.js';

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlist = await prisma.wishlist.findMany({
      where: { 
        userId,
        product: {
          isActive: true
        }
      },
      include: {
        product: {
          include: {
            category: true,
            images: {
              select: { imageUrl: true, isPrimary: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const pricedProducts = await attachPricingToProducts(wishlist.map(w => w.product));
    const productById = new Map(pricedProducts.map(product => [product.id, product]));

    const formatted = wishlist.map(w => ({
      wishlistId: w.id,
      productId: w.productId,
      createdAt: w.createdAt,
      product: productById.get(w.productId) || w.product
    }));
    
    res.status(200).json(formatted);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWishlistIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true }
    });
    
    res.status(200).json({ ids: wishlist.map(w => w.productId) });
  } catch (error) {
    console.error('Get wishlist ids error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found or inactive' });

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } }
    });

    if (existing) return res.status(200).json({ message: 'Sản phẩm đã có trong yêu thích' });

    await prisma.wishlist.create({
      data: { userId, productId }
    });

    res.status(201).json({ message: 'Đã thêm vào yêu thích' });
  } catch (error) {
    console.error('Add wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID' });

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } }
    });

    if (!existing) return res.status(200).json({ message: 'Sản phẩm không có trong yêu thích' });

    await prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } }
    });

    res.status(200).json({ message: 'Đã xóa khỏi yêu thích' });
  } catch (error) {
    console.error('Remove wishlist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
