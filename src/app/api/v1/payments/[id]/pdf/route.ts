import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { numberToWords } from '@/lib/utils/numberToWords';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    const { data: payment } = await supabase.from('Payment').select('*').eq('id', id).single();
    if (!payment) return new NextResponse('Payment Not Found', { status: 404 });

    const [
      { data: customer },
      { data: quote },
      { data: org }
    ] = await Promise.all([
      supabase.from('Customer').select('*').eq('id', payment.customerId).single(),
      payment.quoteId ? supabase.from('Quote').select('*').eq('id', payment.quoteId).single() : Promise.resolve({ data: null }),
      supabase.from('Organisation').select('*').eq('id', payment.orgId).single()
    ]);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        // --- DEFENSIVE FONT LOADING ---
        // We use Geist-Regular.ttf since it's confirmed to be a valid 125KB font.
        // Roboto-Regular.ttf was found to be 0KB (corrupted).
        const primaryFontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf');
        const secondaryFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
        
        // Only use font if it exists AND is not empty
        let activeFont: string | undefined = undefined;
        if (fs.existsSync(primaryFontPath) && fs.statSync(primaryFontPath).size > 1000) {
          activeFont = primaryFontPath;
        } else if (fs.existsSync(secondaryFontPath) && fs.statSync(secondaryFontPath).size > 1000) {
          activeFont = secondaryFontPath;
        }

        const doc = new PDFDocument({ 
          margin: 50, 
          size: 'A4',
          font: activeFont
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // --- Header ---
        doc.rect(0, 0, 612.28, 60).fill('#141417');
        doc.fillColor('#ffffff').fontSize(20).text('PAYMENT RECEIPT', 50, 20);
        
        doc.y = 100;
        const topY = doc.y;

        // --- Left: Payer Details ---
        doc.fillColor('#4b5563').fontSize(10).text('RECEIVED FROM:', 50, topY);
        doc.fillColor('#111827').fontSize(14).text(customer?.name || 'Retail Customer', 50, doc.y + 3);
        doc.fillColor('#6b7280').fontSize(10).text(customer?.phone || '');

        // --- Right: Meta Details ---
        doc.fillColor('#4b5563').fontSize(10).text('DETAILS:', 350, topY);
        doc.fillColor('#111827').fontSize(12).text(`Date: ${new Date(payment.transactionDate || payment.createdAt).toLocaleDateString('en-IN')}`, 350, doc.y + 3);
        doc.text(`Method: ${payment.paymentMethod}`);
        if (quote) doc.fillColor('#10b981').text(`Against Deal: ${quote.id.substring(0, 8).toUpperCase()}`);

        doc.moveDown(3);

        // --- Amount Area ---
        doc.rect(50, doc.y, 500, 80).fill('#f9fafb');
        doc.rect(50, doc.y, 5, 80).fill('#10b981');

        doc.fillColor('#4b5563').fontSize(10).text('TOTAL AMOUNT RECEIVED:', 70, doc.y + 20);
        doc.fillColor('#111827').fontSize(28).text(`₹${Math.round(payment.amount / 100).toLocaleString('en-IN')}`, 70, doc.y + 35);
        
        doc.fontSize(10).fillColor('#6b7280').text(
          numberToWords(payment.amount / 100),
          300, doc.y - 30,
          { width: 240, align: 'right' }
        );

        // --- Footer ---
        const footerY = 740;
        doc.fillColor('#9ca3af').fontSize(8).text('This is a computer generated receipt. Valid without signature.', 50, footerY);
        doc.fillColor('#111827').fontSize(14).text(org?.name || 'TimberFlow Store', 350, footerY - 5, { align: 'right', width: 200 });
        doc.fillColor('#6b7280').fontSize(9).text(org?.address || '', 350, doc.y + 3, { align: 'right', width: 200 });

        doc.end();
      } catch (e) { reject(e); }
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Receipt-${id.substring(0,8)}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('PDF ERROR:', error);
    return new NextResponse('Internal Error: ' + error.message, { status: 500 });
  }
}
