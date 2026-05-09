import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProfile() {
  const userId = '66f3c068-0a49-4353-b67b-13d708f7a6e7';
  const profile = await prisma.personalityProfile.findUnique({
    where: { userId }
  });
  console.log('--- PERSONALITY PROFILE DATA ---');
  console.log(JSON.stringify(profile, null, 2));
  process.exit(0);
}

checkProfile();
