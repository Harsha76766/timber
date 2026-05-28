import { prisma } from './src/lib/prisma.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';

async function test() {
  const id = '20e3a77e-04ea-4894-9ce9-acaa019ce57a';
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!quote) {
    console.log('Quote not found');
    return;
  }

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream('test.pdf');
  doc.pipe(stream);
  doc.text('Test PDF');
  doc.end();
  
  console.log('PDF generated to test.pdf');
}

test().catch(console.error);
