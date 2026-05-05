import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const userId = "00000000-0000-0000-0000-000000000000";
  try {
    console.log('Testing DB connection...');
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'test@matecare.com',
        passwordHash: 'hash'
      }
    });
    console.log('User OK:', user);

    const profile = await prisma.partnerProfile.upsert({
      where: { userId },
      update: {
        cycleLength: 28,
        periodDuration: 5,
        lastPeriodDate: new Date(),
        personalityType: 'INTROVERTED',
        socialLevel: 'MEDIUM',
        privacyLevel: 'MODERATE',
        conflictStyle: 'DIRECT',
        affectionStyle: 'VERBAL'
      },
      create: {
        userId,
        cycleLength: 28,
        periodDuration: 5,
        lastPeriodDate: new Date(),
        personalityType: 'INTROVERTED',
        socialLevel: 'MEDIUM',
        privacyLevel: 'MODERATE',
        conflictStyle: 'DIRECT',
        affectionStyle: 'VERBAL'
      }
    });
    console.log('Profile OK:', profile);
  } catch (e) {
    console.error('DB ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
