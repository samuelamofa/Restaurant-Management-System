const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@defusionflame.com' },
    update: {},
    create: {
      email: 'admin@defusionflame.com',
      phone: '0551796725',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create sample staff
  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@defusionflame.com' },
    update: {},
    create: {
      email: 'receptionist@defusionflame.com',
      phone: '0545010103',
      password: hashedPassword,
      firstName: 'Receptionist',
      lastName: 'Staff',
      role: 'RECEPTIONIST',
    },
  });
  console.log('✅ Receptionist user created');

  const kitchenStaff = await prisma.user.upsert({
    where: { email: 'kitchen@defusionflame.com' },
    update: {},
    create: {
      email: 'kitchen@defusionflame.com',
      phone: '0551796726',
      password: hashedPassword,
      firstName: 'Kitchen',
      lastName: 'Staff',
      role: 'KITCHEN_STAFF',
    },
  });
  console.log('✅ Kitchen staff user created');

  // Create sample customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@defusionflame.com' },
    update: {},
    create: {
      email: 'customer@defusionflame.com',
      phone: '0551796727',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created');

  // Create categories
  const starters = await prisma.category.upsert({
    where: { id: 'starters' },
    update: {},
    create: {
      id: 'starters',
      name: 'Starters',
      description: 'Appetizers and starters',
      displayOrder: 1,
    },
  });

  const mains = await prisma.category.upsert({
    where: { id: 'mains' },
    update: {},
    create: {
      id: 'mains',
      name: 'Main Courses',
      description: 'Main dishes',
      displayOrder: 2,
    },
  });

  const drinks = await prisma.category.upsert({
    where: { id: 'drinks' },
    update: {},
    create: {
      id: 'drinks',
      name: 'Drinks',
      description: 'Beverages',
      displayOrder: 3,
    },
  });

  const desserts = await prisma.category.upsert({
    where: { id: 'desserts' },
    update: {},
    create: {
      id: 'desserts',
      name: 'Desserts',
      description: 'Sweet treats',
      displayOrder: 4,
    },
  });

  console.log('✅ Categories created');

  // Create sample menu items
  const jollofRice = await prisma.menuItem.create({
    data: {
      name: 'Jollof Rice',
      description: 'Delicious Ghanaian jollof rice with chicken',
      categoryId: mains.id,
      basePrice: 25.00,
      isAvailable: true,
      displayOrder: 1,
      variants: {
        create: [
          { name: 'Small', price: 20.00 },
          { name: 'Medium', price: 25.00 },
          { name: 'Large', price: 30.00 },
        ],
      },
    },
  });

  const banku = await prisma.menuItem.create({
    data: {
      name: 'Banku with Tilapia',
      description: 'Traditional banku served with grilled tilapia',
      categoryId: mains.id,
      basePrice: 35.00,
      isAvailable: true,
      displayOrder: 2,
    },
  });

  const chickenWings = await prisma.menuItem.create({
    data: {
      name: 'Spicy Chicken Wings',
      description: 'Crispy chicken wings with spicy sauce',
      categoryId: starters.id,
      basePrice: 18.00,
      isAvailable: true,
      displayOrder: 1,
    },
  });

  const coke = await prisma.menuItem.create({
    data: {
      name: 'Coca Cola',
      description: 'Chilled Coca Cola',
      categoryId: drinks.id,
      basePrice: 5.00,
      isAvailable: true,
      displayOrder: 1,
      variants: {
        create: [
          { name: 'Small', price: 3.00 },
          { name: 'Medium', price: 5.00 },
          { name: 'Large', price: 7.00 },
        ],
      },
    },
  });

  const iceCream = await prisma.menuItem.create({
    data: {
      name: 'Vanilla Ice Cream',
      description: 'Creamy vanilla ice cream',
      categoryId: desserts.id,
      basePrice: 12.00,
      isAvailable: true,
      displayOrder: 1,
    },
  });

  console.log('✅ Sample menu items created');

  console.log('🎉 Seeding completed!');
  console.log('\n📝 Default credentials:');
  console.log('Admin: admin@defusionflame.com / admin123');
  console.log('Receptionist: receptionist@defusionflame.com / admin123');
  console.log('Kitchen: kitchen@defusionflame.com / admin123');
  console.log('Customer: customer@defusionflame.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

