const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '13306b51-7c48-44c8-b88f-f51869a855a2';
  await prisma.partnerProfile.update({
    where: { userId },
    data: { lastAdvice: null, adviceUpdatedAt: null }
  });
  console.log('Caché del Oráculo limpiada con éxito.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
