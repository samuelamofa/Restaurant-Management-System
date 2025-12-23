const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PRODUCTION database...');
  console.log('⚠️  This will create an admin user. Make sure to change the default password!\n');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping admin creation.');
    console.log('   If you need to create a new admin, delete the existing one first.');
    return;
  }

  // Get admin credentials from environment or use defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@defusionflame.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminPhone = process.env.ADMIN_PHONE || '0551796725';

  console.log(`📝 Creating admin user: ${adminEmail}`);
  console.log('⚠️  IMPORTANT: Change the default password immediately after first login!\n');

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      phone: adminPhone,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('\n📝 Admin Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚨 SECURITY WARNING:');
  console.log('   - Change the default password immediately!');
  console.log('   - Use a strong, unique password');
  console.log('   - Enable 2FA if available');
  console.log('   - Review security settings');
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

