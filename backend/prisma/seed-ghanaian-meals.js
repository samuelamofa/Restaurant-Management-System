const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Ghanaian meals...\n');

  // Define categories
  const categories = [
    {
      name: 'Rice Dishes',
      description: 'Traditional Ghanaian rice dishes',
      displayOrder: 1,
    },
    {
      name: 'Soups & Stews',
      description: 'Hearty soups and stews served with staple foods',
      displayOrder: 2,
    },
    {
      name: 'Staple Foods',
      description: 'Traditional Ghanaian staples',
      displayOrder: 3,
    },
    {
      name: 'Street Food',
      description: 'Popular Ghanaian street food',
      displayOrder: 4,
    },
  ];

  console.log('📝 Creating categories...\n');

  const createdCategories = {};

  for (const categoryData of categories) {
    try {
      // Check if category already exists
      const existingCategory = await prisma.category.findFirst({
        where: { name: categoryData.name },
      });

      if (existingCategory) {
        console.log(`⏭️  Category "${categoryData.name}" already exists. Using existing.`);
        createdCategories[categoryData.name] = existingCategory;
        continue;
      }

      const category = await prisma.category.create({
        data: categoryData,
      });

      createdCategories[categoryData.name] = category;
      console.log(`✅ Created category: ${categoryData.name}`);
    } catch (error) {
      console.error(`❌ Error creating category ${categoryData.name}:`, error.message);
    }
  }

  console.log('\n📝 Creating menu items...\n');

  // Define menu items
  const menuItems = [
    {
      name: 'Jollof Rice with Chicken',
      description: 'Aromatic and flavorful one-pot rice dish cooked with tomatoes, onions, and spices. Served with grilled or fried chicken.',
      category: 'Rice Dishes',
      basePrice: 45.00,
      displayOrder: 1,
    },
    {
      name: 'Waakye',
      description: 'Rice and beans cooked together, served with spaghetti, gari, shito (pepper sauce), and your choice of protein.',
      category: 'Rice Dishes',
      basePrice: 40.00,
      displayOrder: 2,
    },
    {
      name: 'Banku with Grilled Tilapia',
      description: 'Fermented corn and cassava dough served with spicy grilled tilapia fish and pepper sauce.',
      category: 'Staple Foods',
      basePrice: 50.00,
      displayOrder: 1,
    },
    {
      name: 'Fufu with Light Soup',
      description: 'Pounded cassava and plantain dough served with light soup (fish or chicken). Traditional Ghanaian favorite.',
      category: 'Soups & Stews',
      basePrice: 42.00,
      displayOrder: 1,
    },
    {
      name: 'Red Red (Beans with Fried Plantain)',
      description: 'Black-eyed peas cooked in palm oil with tomatoes and spices, served with sweet fried plantain.',
      category: 'Street Food',
      basePrice: 35.00,
      displayOrder: 1,
    },
    {
      name: 'Kenkey with Fish and Shito',
      description: 'Fermented corn dough wrapped in banana leaves, served with fried fish and spicy shito sauce.',
      category: 'Staple Foods',
      basePrice: 38.00,
      displayOrder: 2,
    },
    {
      name: 'Kontomire Stew with Boiled Eggs',
      description: 'Cocoyam leaves stew cooked in palm nut soup with eggs, fish, and assorted meat. Served with rice or yam.',
      category: 'Soups & Stews',
      basePrice: 48.00,
      displayOrder: 2,
    },
    {
      name: 'Yam and Kontomire',
      description: 'Boiled yam served with palava sauce (kontomire leaves cooked with palm oil, fish, and spices).',
      category: 'Soups & Stews',
      basePrice: 40.00,
      displayOrder: 3,
    },
  ];

  for (const itemData of menuItems) {
    try {
      const category = createdCategories[itemData.category];
      if (!category) {
        console.error(`❌ Category "${itemData.category}" not found for item "${itemData.name}". Skipping.`);
        continue;
      }

      // Check if item already exists
      const existingItem = await prisma.menuItem.findFirst({
        where: {
          name: itemData.name,
          categoryId: category.id,
        },
      });

      if (existingItem) {
        console.log(`⏭️  Menu item "${itemData.name}" already exists. Skipping.`);
        continue;
      }

      const menuItem = await prisma.menuItem.create({
        data: {
          name: itemData.name,
          description: itemData.description,
          categoryId: category.id,
          basePrice: itemData.basePrice,
          displayOrder: itemData.displayOrder,
          isAvailable: true,
        },
      });

      console.log(`✅ Created menu item: ${itemData.name} (₵${itemData.basePrice.toFixed(2)})`);
    } catch (error) {
      console.error(`❌ Error creating menu item ${itemData.name}:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seeding completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Created ${Object.keys(createdCategories).length} categories`);
  console.log(`🍽️  Created ${menuItems.length} menu items`);
  console.log('\n💡 You can now view the menu in your POS or Customer app!');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

