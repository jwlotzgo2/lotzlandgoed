import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '0000000000' },
    update: {},
    create: {
      phone: '0000000000',
      name: 'Administrator',
      password: adminPassword,
      role: Role.ADMIN,
      mustChangePassword: true,
      isActive: true,
    },
  });
  console.log(`✅ Admin user created: ${admin.phone}`);

  // Create a test user
  const testPassword = await bcrypt.hash('test1234', 10);
  const testUser = await prisma.user.upsert({
    where: { phone: '0712345678' },
    update: {},
    create: {
      phone: '0712345678',
      name: 'Test User',
      password: testPassword,
      role: Role.USER,
      mustChangePassword: true,
      isActive: true,
    },
  });
  console.log(`✅ Test user created: ${testUser.phone}`);

  // Create a test meter linked to the test user
  const meter = await prisma.meter.upsert({
    where: { meterNumber: 'TEST-METER-001' },
    update: {},
    create: {
      meterNumber: 'TEST-METER-001',
      address: '1 Test Street, Lotz Landgoed',
      userId: testUser.id,
    },
  });
  console.log(`✅ Test meter created: ${meter.meterNumber}`);

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Admin login:     phone: 0000000000  |  password: admin123');
  console.log('Test user login: phone: 0712345678  |  password: test1234');
  console.log('⚠️  Change these passwords immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
