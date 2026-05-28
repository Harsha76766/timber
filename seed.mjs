import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({ data: { name: 'Demo Seller', email: 'seller@example.com' } });
  
  // prices in paise (₹2500 -> 250000)
  await prisma.product.create({ data: { userId: user.id, name: 'Premium Teak Wood', woodType: 'Teak', pricePerCft: 250000 } });
  await prisma.product.create({ data: { userId: user.id, name: 'Standard Sal Wood', woodType: 'Sal', pricePerCft: 180000 } });
  await prisma.product.create({ data: { userId: user.id, name: 'Pine Wood', woodType: 'Pine', pricePerCft: 80000 } });
  
  console.log('Seeded successfully!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
