import { prisma } from '../src/lib/prisma';
async function list() {
  const users = await prisma.user.findMany({ take: 1 });
  console.log(users[0]?.id);
}
list();
