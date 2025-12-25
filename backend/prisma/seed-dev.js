const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const defaultPassword = 'password123'; // Default password for all test users

async function main() {
  console.log('🌱 Seeding DEVELOPMENT database with test users...\n');

  const users = [
    {
      email: 'admin@defusionflame.com',
      phone: '0551796725',
      password: defaultPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
    {
      email: 'cashier@defusionflame.com',
      phone: '0551796726',
      password: defaultPassword,
      firstName: 'Cashier',
      lastName: 'User',
      role: 'CASHIER',
    },
    {
      email: 'receptionist@defusionflame.com',
      phone: '0551796727',
      password: defaultPassword,
      firstName: 'Receptionist',
      lastName: 'User',
      role: 'RECEPTIONIST',
    },
    {
      email: 'kitchen@defusionflame.com',
      phone: '0551796728',
      password: defaultPassword,
      firstName: 'Kitchen',
      lastName: 'Staff',
      role: 'KITCHEN_STAFF',
    },
    {
      email: 'customer@defusionflame.com',
      phone: '0551796729',
      password: defaultPassword,
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
    },
  ];

  console.log('📝 Creating test users...\n');

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { phone: userData.phone },
          ],
        },
      });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists. Skipping.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await prisma.user.create({
        data: {
          email: userData.email,
          phone: userData.phone,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
        },
      });

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Test User Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Password for all users: ${defaultPassword}\n`);
  
  users.forEach(user => {
    console.log(`${user.role.padEnd(15)} - Email: ${user.email.padEnd(30)} Phone: ${user.phone}`);
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 Application Access:');
  console.log('   Admin App:       Use ADMIN user');
  console.log('   POS App:         Use RECEPTIONIST, CASHIER, or ADMIN');
  console.log('   KDS App:         Use KITCHEN_STAFF or ADMIN');
  console.log('   Customer App:    Use CUSTOMER (or register new)');
  console.log('\n🚨 SECURITY WARNING:');
  console.log('   - These are TEST credentials');
  console.log('   - Change passwords in production!');
  console.log('   - Do NOT use in production environments');
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

