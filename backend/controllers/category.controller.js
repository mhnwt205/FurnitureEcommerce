import prisma from '../prismaClient.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateSlug = (name) => {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let { slug } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Tên danh mục là bắt buộc' });
    }

    if (!slug) {
      slug = generateSlug(name);
    }

    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({ message: 'Slug đã tồn tại' });
    }

    const newCategory = await prisma.category.create({
      data: { name, slug, description }
    });

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description } = req.body;

    if (name !== undefined && name.trim() === '') {
      return res.status(400).json({ message: 'Tên danh mục không được để trống' });
    }

    if (slug) {
      const existingCategory = await prisma.category.findFirst({
        where: { slug, id: { not: parseInt(id, 10) } }
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug đã tồn tại ở danh mục khác' });
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
      }
    });

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const categoryWithProducts = await prisma.category.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!categoryWithProducts) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    if (categoryWithProducts._count.products > 0) {
      return res.status(400).json({ message: 'Danh mục đang có sản phẩm, không thể xóa' });
    }

    await prisma.category.delete({
      where: { id: parseInt(id, 10) }
    });

    res.status(200).json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
