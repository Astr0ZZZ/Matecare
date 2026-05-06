import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function confirmUser() {
  try {
    // Usamos SQL puro para saltar la seguridad de Supabase y confirmar el email directamente
    await prisma.$executeRawUnsafe(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW(), 
          last_sign_in_at = NOW()
      WHERE email = 'guerrero@matecare.com'
    `);
    
    console.log('¡Usuario confirmado con éxito en la base de datos!');
    console.log('Ya puedes intentar el login de nuevo.');
  } catch (error) {
    console.error('Error confirmando usuario:', error);
  } finally {
    await prisma.$disconnect()
  }
}

confirmUser()
