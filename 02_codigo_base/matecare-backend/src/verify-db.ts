import { prisma } from './lib/prisma';

async function verify() {
  console.log('--- Database Verification ---');
  try {
    const userCount = await prisma.user.count();
    console.log(`Users in DB: ${userCount}`);
    
    const profileCount = await prisma.partnerProfile.count();
    console.log(`PartnerProfiles in DB: ${profileCount}`);
    
    const personalityCount = await prisma.personalityProfile.count();
    console.log(`PersonalityProfiles in DB: ${personalityCount}`);
    
    console.log('✅ Database schema and connection are OK.');
  } catch (err) {
    console.error('❌ Database error:', err);
  }
}

verify();
