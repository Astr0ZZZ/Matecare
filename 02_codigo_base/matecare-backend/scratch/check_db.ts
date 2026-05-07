import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProfiles() {
  const users = await prisma.user.findMany({
    include: { partnerProfile: true }
  });
  console.log('--- Database Audit ---');
  users.forEach(u => {
    console.log(`User: ${u.email} (ID: ${u.id})`);
    console.log(`  Profile: ${u.partnerProfile ? 'EXISTS' : 'MISSING'}`);
  });
}

checkProfiles();
