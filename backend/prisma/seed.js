import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { name: 'Admin', email: 'admin@helpdesk.local', role: 'ADMIN' },
  { name: 'Técnico Uno', email: 'tech1@helpdesk.local', role: 'TECH' },
  { name: 'Técnico Dos', email: 'tech2@helpdesk.local', role: 'TECH' },
  { name: 'Cliente Uno', email: 'client1@helpdesk.local', role: 'CLIENT' },
  { name: 'Cliente Dos', email: 'client2@helpdesk.local', role: 'CLIENT' },
];

const passwordHash = await bcrypt.hash('Password123!', 10);

for (const u of users) {
  await prisma.user.upsert({
    where: { email: u.email },
    update: {},
    create: { ...u, passwordHash },
  });
}

console.log(`Seed listo: ${users.length} usuarios (contraseña: Password123!)`);
await prisma.$disconnect();
