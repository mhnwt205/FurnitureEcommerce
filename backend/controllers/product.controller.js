import prisma from '../prismaClient.js';
import { z } from 'zod';
import cloudinary from '../config/cloudinary.js';

const optionalTrimmedString = (maxLength) => z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  },
  z.string().max(maxLength).nullable().optional()
);

const optionalNonNegativeNumber = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) return value === undefined ? undefined : null;
    if (typeof value === 'string') return Number(value);
    return value;
  },
  z.number().min(0).nullable().optional()
);
const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().int().positive("Category ID is required"),
  price: z.number().min(0, "Price must be >= 0"),
  stock: z.number().int().min(0, "Stock must be >= 0").default(0),
  color: optionalTrimmedString(100),
  material: optionalTrimmedString(255),
  widthCm: optionalNonNegativeNumber,
  heightCm: optionalNonNegativeNumber,
  depthCm: optionalNonNegativeNumber,
  dimensions: optionalTrimmedString(255),
  roomType: optionalTrimmedString(100),
  style: optionalTrimmedString(100),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).optional(),
  primaryImageUrl: z.string().optional()
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  color: optionalTrimmedString(100),
  material: optionalTrimmedString(255),
  widthCm: optionalNonNegativeNumber,
  heightCm: optionalNonNegativeNumber,
  depthCm: optionalNonNegativeNumber,
  dimensions: optionalTrimmedString(255),
  roomType: optionalTrimmedString(100),
  style: optionalTrimmedString(100),
  slug: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  primaryImageUrl: z.string().optional(),
  imagesToDelete: z.array(z.number()).optional()
});

const generateSlug = (name) => {
  return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();
};


const attachReviewSummaries = async (products) => {
  const productList = Array.isArray(products) ? products : [products];
  const ids = productList.map(product => product.id).filter(Boolean);
  if (ids.length === 0) return products;

  const summaries = await prisma.review.groupBy({
    by: ['productId'],
    where: {
      productId: { in: ids },
      isApproved: true
    },
    _avg: { rating: true },
    _count: { id: true }
  });

  const summaryMap = new Map(summaries.map(item => [item.productId, {
    averageRating: Number((item._avg.rating || 0).toFixed(1)),
    reviewCount: item._count.id
  }]));

  const withSummaries = productList.map(product => ({
    ...product,
    averageRating: summaryMap.get(product.id)?.averageRating || 0,
    reviewCount: summaryMap.get(product.id)?.reviewCount || 0
  }));

  return Array.isArray(products) ? withSummaries : withSummaries[0];
};
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  const afterUpload = parts[1];
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  return withoutVersion.split('.').slice(0, -1).join('.');
};

export const getProducts = async (req, res) => {
  try {
    const { includeInactive, page, limit, category, search, minPrice, maxPrice, sort, color, material, roomType, style } = req.query;
    const whereClause = includeInactive === 'true' ? {} : { isActive: true };

    if (category && category !== 'ALL') {
      whereClause.category = { 
        OR: [
          { slug: category },
          { name: { contains: category } }
        ]
      };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { name: { contains: search } } }
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined && minPrice !== '') whereClause.price.gte = parseFloat(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') whereClause.price.lte = parseFloat(maxPrice);
    }

    if (color && color.trim() !== '') {
      whereClause.color = { contains: color.trim() };
    }

    if (material && material.trim() !== '') {
      whereClause.material = { contains: material.trim() };
    }

    if (roomType && roomType.trim() !== '') {
      whereClause.roomType = { contains: roomType.trim() };
    }

    if (style && style.trim() !== '') {
      whereClause.style = { contains: style.trim() };
    }

    let orderBy = { id: 'desc' }; // default newest
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'name_asc') orderBy = { name: 'asc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (sort === 'popular') orderBy = { stock: 'desc' }; // fallback since we don't have views/sales tracking yet

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let products;

    if (limitNum > 0) {
      const total = await prisma.product.count({ where: whereClause });
      const skip = (pageNum - 1) * limitNum;
      
      products = await prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          images: {
            orderBy: [
              { isPrimary: 'desc' },
              { sortOrder: 'asc' },
              { id: 'asc' }
            ]
          },
          _count: {
            select: { wishlists: true }
          }
        },
        skip,
        take: limitNum,
        orderBy
      });

      return res.status(200).json({
        data: await attachReviewSummaries(products),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ]
        },
        _count: {
          select: { wishlists: true }
        }
      },
      orderBy
    });
    
    // Always return { data, pagination } for consistency, if no limit just assume page 1 and total=length
    res.status(200).json({
      data: products,
      pagination: {
        page: 1,
        limit: products.length || 10, // arbitrary if 0
        total: products.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { includeInactive } = req.query;
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const whereClause = { id };
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const product = await prisma.product.findFirst({
      where: whereClause,
      include: {
        category: true,
        images: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' },
            { id: 'asc' }
          ]
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(await attachReviewSummaries(product));
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    
    let slug = validatedData.slug;
    if (!slug) {
      slug = generateSlug(validatedData.name);
    }

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      return res.status(400).json({ message: 'Product slug already exists' });
    }

    const { images, primaryImageUrl, ...productData } = validatedData;
    
    const newProduct = await prisma.product.create({
      data: {
        ...productData,
        slug
      }
    });

    if (images && images.length > 0) {
      const imageRecords = images.map((url, index) => ({
        productId: newProduct.id,
        imageUrl: url,
        sortOrder: index,
        isPrimary: url === primaryImageUrl || (!primaryImageUrl && index === 0)
      }));
      await prisma.productImage.createMany({
        data: imageRecords
      });
      // Set the imageUrl of the product as the primary image to ensure fallback compatibility
      const primaryImage = imageRecords.find(img => img.isPrimary);
      if (primaryImage) {
        await prisma.product.update({
          where: { id: newProduct.id },
          data: { imageUrl: primaryImage.imageUrl }
        });
      }
    }

    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const validatedData = updateProductSchema.parse(req.body);

    if (validatedData.slug) {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          slug: validatedData.slug,
          id: { not: id }
        }
      });
      if (existingProduct) {
        return res.status(400).json({ message: 'Product slug already exists' });
      }
    }

    const { images, primaryImageUrl, imagesToDelete, ...productData } = validatedData;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: productData
    });

    if (imagesToDelete && imagesToDelete.length > 0) {
      const imagesToRemove = await prisma.productImage.findMany({
        where: {
          id: { in: imagesToDelete },
          productId: id
        }
      });

      for (const img of imagesToRemove) {
        const publicId = extractPublicId(img.imageUrl);
        if (publicId && publicId.startsWith('FurnitureEcommerce/products')) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error(`Failed to delete cloudinary image: ${publicId}`, err);
          }
        }
      }

      await prisma.productImage.deleteMany({
        where: {
          id: { in: imagesToDelete },
          productId: id
        }
      });
    }

    if (images && images.length > 0) {
      const maxSortOrder = await prisma.productImage.aggregate({
        where: { productId: id },
        _max: { sortOrder: true }
      });
      let currentSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

      const imageRecords = images.map((url) => ({
        productId: id,
        imageUrl: url,
        sortOrder: currentSortOrder++,
        isPrimary: false
      }));
      await prisma.productImage.createMany({
        data: imageRecords
      });
    }

    if (primaryImageUrl) {
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false }
      });
      await prisma.productImage.updateMany({
        where: { productId: id, imageUrl: primaryImageUrl },
        data: { isPrimary: true }
      });
      await prisma.product.update({
        where: { id },
        data: { imageUrl: primaryImageUrl }
      });
    } else {
      // Ensure there is at least one primary image if we deleted the primary
      const primaryCount = await prisma.productImage.count({
          where: { productId: id, isPrimary: true }
      });
      if (primaryCount === 0) {
          const firstImage = await prisma.productImage.findFirst({
              where: { productId: id },
              orderBy: { sortOrder: 'asc' }
          });
          if (firstImage) {
               await prisma.productImage.update({
                  where: { id: firstImage.id },
                  data: { isPrimary: true }
               });
               await prisma.product.update({
                  where: { id },
                  data: { imageUrl: firstImage.imageUrl }
               });
          } else {
               await prisma.product.update({
                  where: { id },
                  data: { imageUrl: null }
               });
          }
      }
    }

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Check if product exists in OrderItem
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id }
    });

    if (orderItemsCount > 0) {
      // Soft delete
      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      return res.status(200).json({ message: 'Product has order items, soft deleted (set isActive = false)' });
    }

    // Fetch all images for this product before deleting
    const images = await prisma.productImage.findMany({ where: { productId: id } });

    for (const img of images) {
      const publicId = extractPublicId(img.imageUrl);
      if (publicId && publicId.startsWith('FurnitureEcommerce/products')) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error(`Failed to delete cloudinary image: ${publicId}`, err);
        }
      }
    }

    // Hard delete
    await prisma.product.delete({
      where: { id }
    });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
