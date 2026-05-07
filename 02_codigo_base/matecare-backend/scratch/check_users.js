const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Users in Database ---');
  const users = await prisma.user.findMany({
    include: {
      partnerProfile: true,
      personalityProfile: true,
      missions: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach(user => {
      console.log(`\nUser ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Points: ${user.points}`);
      console.log(`Has Partner Profile: ${!!user.partnerProfile}`);
      console.log(`Has Personality: ${!!user.personalityProfile}`);
      console.log(`Recent Missions: ${user.missions.length}`);
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
