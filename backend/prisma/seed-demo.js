const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DEMO database with comprehensive sample data...');
  console.log('⚠️  This will populate the database with demo data for testing purposes.\n');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Clearing existing data...');
  try {
    await prisma.orderItemAddon.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.addon.deleteMany();
    await prisma.priceVariant.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared');
  } catch (error) {
    console.log('⚠️  Could not clear existing data (may not exist yet)');
  }

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

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@defusionflame.com' },
    update: {},
    create: {
      email: 'cashier@defusionflame.com',
      phone: '0545010104',
      password: hashedPassword,
      firstName: 'Cashier',
      lastName: 'Staff',
      role: 'CASHIER',
    },
  });
  console.log('✅ Cashier user created');

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

  // Create multiple sample customers
  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `customer${i}@defusionflame.com` },
      update: {},
      create: {
        email: `customer${i}@defusionflame.com`,
        phone: `05517967${20 + i}`,
        password: hashedPassword,
        firstName: `Customer${i}`,
        lastName: 'Demo',
        role: 'CUSTOMER',
      },
    });
    customers.push(customer);
  }
  console.log(`✅ ${customers.length} customer users created`);

  // Create comprehensive categories
  const categories = [
    { id: 'starters', name: 'Starters', description: 'Appetizers and starters', order: 1 },
    { id: 'mains', name: 'Main Courses', description: 'Main dishes', order: 2 },
    { id: 'drinks', name: 'Drinks', description: 'Beverages', order: 3 },
    { id: 'desserts', name: 'Desserts', description: 'Sweet treats', order: 4 },
    { id: 'sides', name: 'Sides', description: 'Side dishes', order: 5 },
    { id: 'specials', name: 'Specials', description: 'Chef specials', order: 6 },
  ];

  const createdCategories = {};
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        displayOrder: cat.order,
      },
    });
    createdCategories[cat.id] = category;
  }
  console.log(`✅ ${categories.length} categories created`);

  // Create comprehensive menu items
  const menuItems = [
    // Starters
    {
      name: 'Spicy Chicken Wings',
      description: 'Crispy chicken wings with spicy sauce',
      category: 'starters',
      price: 18.00,
      order: 1,
      variants: [
        { name: '6 Pieces', price: 18.00 },
        { name: '12 Pieces', price: 32.00 },
      ],
    },
    {
      name: 'Spring Rolls',
      description: 'Crispy vegetable spring rolls with sweet chili sauce',
      category: 'starters',
      price: 12.00,
      order: 2,
    },
    {
      name: 'Chicken Samosa',
      description: 'Spiced chicken filled samosas',
      category: 'starters',
      price: 8.00,
      order: 3,
      variants: [
        { name: '3 Pieces', price: 8.00 },
        { name: '6 Pieces', price: 15.00 },
      ],
    },
    // Main Courses
    {
      name: 'Jollof Rice',
      description: 'Delicious Ghanaian jollof rice with chicken',
      category: 'mains',
      price: 25.00,
      order: 1,
      variants: [
        { name: 'Small', price: 20.00 },
        { name: 'Medium', price: 25.00 },
        { name: 'Large', price: 30.00 },
      ],
      addons: [
        { name: 'Extra Chicken', price: 8.00 },
        { name: 'Extra Sauce', price: 2.00 },
      ],
    },
    {
      name: 'Banku with Tilapia',
      description: 'Traditional banku served with grilled tilapia',
      category: 'mains',
      price: 35.00,
      order: 2,
      addons: [
        { name: 'Extra Fish', price: 12.00 },
        { name: 'Shito', price: 3.00 },
      ],
    },
    {
      name: 'Fried Rice with Chicken',
      description: 'Flavorful fried rice with grilled chicken',
      category: 'mains',
      price: 28.00,
      order: 3,
      variants: [
        { name: 'Small', price: 23.00 },
        { name: 'Medium', price: 28.00 },
        { name: 'Large', price: 33.00 },
      ],
    },
    {
      name: 'Grilled Chicken',
      description: 'Tender grilled chicken with spices',
      category: 'mains',
      price: 30.00,
      order: 4,
      variants: [
        { name: 'Quarter', price: 20.00 },
        { name: 'Half', price: 30.00 },
        { name: 'Full', price: 55.00 },
      ],
    },
    {
      name: 'Red Red',
      description: 'Black-eyed peas stew with fried plantain',
      category: 'mains',
      price: 22.00,
      order: 5,
    },
    // Drinks
    {
      name: 'Coca Cola',
      description: 'Chilled Coca Cola',
      category: 'drinks',
      price: 5.00,
      order: 1,
      variants: [
        { name: 'Small (330ml)', price: 3.00 },
        { name: 'Medium (500ml)', price: 5.00 },
        { name: 'Large (1.5L)', price: 7.00 },
      ],
    },
    {
      name: 'Fanta',
      description: 'Chilled Fanta',
      category: 'drinks',
      price: 5.00,
      order: 2,
      variants: [
        { name: 'Small (330ml)', price: 3.00 },
        { name: 'Medium (500ml)', price: 5.00 },
        { name: 'Large (1.5L)', price: 7.00 },
      ],
    },
    {
      name: 'Fresh Orange Juice',
      description: 'Freshly squeezed orange juice',
      category: 'drinks',
      price: 8.00,
      order: 3,
      variants: [
        { name: 'Small', price: 6.00 },
        { name: 'Medium', price: 8.00 },
        { name: 'Large', price: 12.00 },
      ],
    },
    {
      name: 'Water',
      description: 'Bottled water',
      category: 'drinks',
      price: 2.00,
      order: 4,
    },
    // Desserts
    {
      name: 'Vanilla Ice Cream',
      description: 'Creamy vanilla ice cream',
      category: 'desserts',
      price: 12.00,
      order: 1,
      variants: [
        { name: 'Single Scoop', price: 8.00 },
        { name: 'Double Scoop', price: 12.00 },
        { name: 'Triple Scoop', price: 16.00 },
      ],
    },
    {
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake slice',
      category: 'desserts',
      price: 15.00,
      order: 2,
    },
    {
      name: 'Fruit Salad',
      description: 'Fresh mixed fruit salad',
      category: 'desserts',
      price: 10.00,
      order: 3,
    },
    // Sides
    {
      name: 'Plantain',
      description: 'Fried ripe plantain',
      category: 'sides',
      price: 5.00,
      order: 1,
    },
    {
      name: 'Salad',
      description: 'Fresh garden salad',
      category: 'sides',
      price: 8.00,
      order: 2,
    },
    // Specials
    {
      name: 'Chef Special Combo',
      description: 'Jollof rice, grilled chicken, plantain, and drink',
      category: 'specials',
      price: 45.00,
      order: 1,
    },
  ];

  for (const item of menuItems) {
    const menuItemData = {
      name: item.name,
      description: item.description,
      categoryId: createdCategories[item.category].id,
      basePrice: item.price,
      isAvailable: true,
      displayOrder: item.order,
    };

    if (item.variants) {
      menuItemData.variants = {
        create: item.variants.map(v => ({ name: v.name, price: v.price })),
      };
    }

    if (item.addons) {
      menuItemData.addons = {
        create: item.addons.map(a => ({ name: a.name, price: a.price })),
      };
    }

    await prisma.menuItem.create({ data: menuItemData });
  }
  console.log(`✅ ${menuItems.length} menu items created`);

  // Create sample orders for demo
  const sampleOrders = [];
  const orderStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
  const orderTypes = ['DINE_IN', 'TAKEAWAY', 'ONLINE'];
  const paymentMethods = ['CASH', 'CARD', 'MOMO', 'PAYSTACK'];
  const paymentStatuses = ['PENDING', 'PAID'];

  // Get some menu items for orders
  const allMenuItems = await prisma.menuItem.findMany({
    include: { variants: true, addons: true },
  });

  for (let i = 0; i < 10; i++) {
    const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];

    // Select random menu items
    const selectedItems = [];
    const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
    for (let j = 0; j < itemCount; j++) {
      const menuItem = allMenuItems[Math.floor(Math.random() * allMenuItems.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const variant = menuItem.variants.length > 0 
        ? menuItem.variants[Math.floor(Math.random() * menuItem.variants.length)]
        : null;
      
      const unitPrice = variant ? variant.price : menuItem.basePrice;
      const totalPrice = unitPrice * quantity;

      selectedItems.push({
        menuItemId: menuItem.id,
        variantId: variant ? variant.id : null,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    const subtotal = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    const orderData = {
      orderNumber: `ORD${String(i + 1).padStart(4, '0')}`,
      customerId: customer.id,
      orderType,
      status,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus,
      deliveryAddress: orderType === 'ONLINE' ? `Demo Address ${i + 1}, Accra` : null,
      contactPhone: orderType === 'ONLINE' ? customer.phone : null,
      tableNumber: orderType === 'DINE_IN' ? `T${Math.floor(Math.random() * 20) + 1}` : null,
      items: {
        create: selectedItems,
      },
    };

    const order = await prisma.order.create({ data: orderData });
    sampleOrders.push(order);
  }
  console.log(`✅ ${sampleOrders.length} sample orders created`);

  console.log('\n🎉 DEMO Seeding completed!');
  console.log('\n📝 Default Demo Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:        admin@defusionflame.com / admin123');
  console.log('Receptionist: receptionist@defusionflame.com / admin123');
  console.log('Cashier:      cashier@defusionflame.com / admin123');
  console.log('Kitchen:      kitchen@defusionflame.com / admin123');
  console.log('Customers:    customer1@defusionflame.com / admin123');
  console.log('              customer2@defusionflame.com / admin123');
  console.log('              customer3@defusionflame.com / admin123');
  console.log('              customer4@defusionflame.com / admin123');
  console.log('              customer5@defusionflame.com / admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Demo Mode Features:');
  console.log('   - Sample orders with various statuses');
  console.log('   - Comprehensive menu with variants and addons');
  console.log('   - Multiple test users for different roles');
  console.log('   - Test payment mode enabled');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

