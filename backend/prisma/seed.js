import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Permissions
  const defaultPermissions = [
    { key: 'dashboard.view', name: 'Xem Dashboard', group: 'Dashboard', description: 'Cho phép xem thống kê tổng quan' },

    { key: 'order.view', name: 'Xem đơn hàng', group: 'Orders', description: 'Cho phép xem danh sách và chi tiết đơn hàng' },
    { key: 'order.update', name: 'Cập nhật đơn hàng', group: 'Orders', description: 'Cho phép cập nhật trạng thái đơn hàng' },
    
    { key: 'product.view', name: 'Xem sản phẩm', group: 'Products', description: 'Cho phép xem danh sách và chi tiết sản phẩm' },
    { key: 'product.create', name: 'Thêm sản phẩm', group: 'Products', description: 'Cho phép thêm sản phẩm mới' },
    { key: 'product.update', name: 'Sửa sản phẩm', group: 'Products', description: 'Cho phép sửa thông tin sản phẩm' },
    { key: 'product.delete', name: 'Xóa sản phẩm', group: 'Products', description: 'Cho phép xóa sản phẩm' },
    
    { key: 'category.view', name: 'Xem danh mục', group: 'Categories', description: 'Cho phép xem danh mục' },
    { key: 'category.create', name: 'Thêm danh mục', group: 'Categories', description: 'Cho phép thêm danh mục' },
    { key: 'category.update', name: 'Sửa danh mục', group: 'Categories', description: 'Cho phép sửa danh mục' },
    { key: 'category.delete', name: 'Xóa danh mục', group: 'Categories', description: 'Cho phép xóa danh mục' },
    
    { key: 'customer.view', name: 'Xem khách hàng', group: 'Customers', description: 'Cho phép xem danh sách khách hàng' },
    { key: 'customer.update', name: 'Cập nhật khách hàng', group: 'Customers', description: 'Cho phép khóa/mở khóa khách hàng' },

    { key: 'review.view', name: 'Xem đánh giá', group: 'Reviews', description: 'Cho phép xem danh sách đánh giá sản phẩm' },
    { key: 'review.update', name: 'Duyệt đánh giá', group: 'Reviews', description: 'Cho phép ẩn/hiện đánh giá sản phẩm' },
    
    { key: 'consultation.view', name: 'Xem yêu cầu tư vấn', group: 'Consultations', description: 'Cho phép xem danh sách và chi tiết yêu cầu tư vấn' },
    { key: 'consultation.update', name: 'Cập nhật yêu cầu tư vấn', group: 'Consultations', description: 'Cho phép phân công, ghi chú và cập nhật trạng thái yêu cầu tư vấn' },
    { key: 'admin_account.view', name: 'Xem tài khoản quản trị', group: 'Admin Accounts', description: 'Cho phép xem danh sách tài khoản quản trị' },
    { key: 'admin_account.create', name: 'Thêm tài khoản quản trị', group: 'Admin Accounts', description: 'Cho phép tạo mới tài khoản staff/admin' },
    { key: 'admin_account.update', name: 'Sửa tài khoản quản trị', group: 'Admin Accounts', description: 'Cho phép sửa thông tin, đổi role tài khoản quản trị' },
    { key: 'admin_account.delete', name: 'Xóa tài khoản quản trị', group: 'Admin Accounts', description: 'Cho phép xóa tài khoản quản trị' },

    { key: 'promotion.view', name: 'Xem khuyến mãi', group: 'Promotions', description: 'Cho phép xem danh sách và chi tiết khuyến mãi' },
    { key: 'promotion.create', name: 'Thêm khuyến mãi', group: 'Promotions', description: 'Cho phép tạo khuyến mãi mới' },
    { key: 'promotion.update', name: 'Sửa khuyến mãi', group: 'Promotions', description: 'Cho phép cập nhật thông tin khuyến mãi' },
    { key: 'promotion.delete', name: 'Xóa khuyến mãi', group: 'Promotions', description: 'Cho phép xóa hoặc vô hiệu hóa khuyến mãi' },
  ];

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        name: perm.name,
        group: perm.group,
        description: perm.description
      },
      create: perm,
    });
  }
  console.log('Created/Updated permissions');

  // 2. Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@furniture.com' },
    update: {
      passwordHash: adminPassword,
      role: 'admin',
    },
    create: {
      email: 'admin@furniture.com',
      fullName: 'System Admin',
      passwordHash: adminPassword,
      role: 'admin',
    },
  });
  console.log(`Created admin user with id: ${admin.id}`);

  // 2. Create Categories
  const categories = [
    { name: 'Sofa', slug: 'sofa', description: 'Modern and comfortable sofas' },
    { name: 'Bàn', slug: 'ban', description: 'Dining and coffee tables' },
    { name: 'Ghế', slug: 'ghe', description: 'Ergonomic and stylish chairs' },
    { name: 'Giường', slug: 'giuong', description: 'Cozy beds' },
    { name: 'Tủ', slug: 'tu', description: 'Storage cabinets and wardrobes' },
    { name: 'Đèn', slug: 'den', description: 'Lighting solutions' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('Created categories');

  // 3. Create Products
  const sofaCat = await prisma.category.findUnique({ where: { slug: 'sofa' } });
  const bedCat = await prisma.category.findUnique({ where: { slug: 'giuong' } });

  if (sofaCat) {
    await prisma.product.upsert({
      where: { slug: 'sofa-da-cao-cap' },
      update: {},
      create: {
        name: 'Sofa Da Cao Cấp',
        slug: 'sofa-da-cao-cap',
        description: 'Sofa làm từ da thật, mang lại cảm giác sang trọng.',
        price: 15000000,
        stock: 10,
        categoryId: sofaCat.id,
        imageUrl: 'https://via.placeholder.com/400x300?text=Sofa+Da'
      }
    });
  }

  if (bedCat) {
    await prisma.product.upsert({
      where: { slug: 'giuong-ngu-go-soi' },
      update: {},
      create: {
        name: 'Giường Ngủ Gỗ Sồi',
        slug: 'giuong-ngu-go-soi',
        description: 'Giường gỗ sồi tự nhiên, bền đẹp.',
        price: 8500000,
        stock: 5,
        categoryId: bedCat.id,
        imageUrl: 'https://via.placeholder.com/400x300?text=Giuong+Go'
      }
    });
  }
  console.log('Created sample products');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
