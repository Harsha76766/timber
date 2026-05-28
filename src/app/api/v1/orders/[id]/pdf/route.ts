import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CalculationService } from '@/lib/services/calculationService';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const tokenUid = searchParams.get('uid');
    
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();
    
    if (!user && tokenUid) {
      const { data: userData } = await supabase.from('User').select('*').eq('id', tokenUid).single();
      user = userData as any;
    }

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch Quote with Items and join Customer/User/Organisation
    const { data: quote, error: quoteError } = await supabase
      .from('Quote')
      .select(`
        *,
        items:QuoteItem(*),
        Customer(*),
        User(*, Organisation(*))
      `)
      .eq('id', id)
      .single();

    if (quoteError || !quote || quote.userId !== user.id) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const org = (quote.User as any)?.Organisation;
    const customer = quote.Customer;
    
    let notesData: any = {};
    try {
      if (quote.notes) notesData = JSON.parse(quote.notes);
    } catch (e) {}

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
        const doc = new PDFDocument({ 
          margin: 50, 
          size: 'A4',
          font: fs.existsSync(fontPath) ? fontPath : undefined 
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        const isPurchased = quote.status === 'purchased' || quote.status === 'converted';
        
        // --- 1. Branding & Header ---
        doc.fontSize(20).fillColor('#10b981').text(
          isPurchased ? 'TAX INVOICE' : 'ESTIMATE / QUOTATION', 
          { align: 'right' }
        );
        doc.fontSize(10).fillColor('#9ca3af').text(
          `Ref: ${quote.id.split('-')[0].toUpperCase()}`, 
          { align: 'right' }
        );
        doc.moveDown(1.5);

        // --- 2. Supplier (Organisation) Details ---
        const midPoint = 280;
        const topY = doc.y;

        doc.fontSize(10).fillColor('#4b5563').text('FROM:', 50, topY);
        doc.fontSize(12).fillColor('#111827').text(org?.name || quote.User?.businessName || 'TimberFlow Store', 50, doc.y + 2);
        doc.fontSize(9).fillColor('#6b7280').text(org?.address || 'Timber Market, Yard 2');
        if (org?.gstin) doc.text(`GSTIN: ${org.gstin}`);
        doc.text(`Contact: ${quote.User?.phone || quote.User?.email}`);

        // --- 3. Customer (Bill To) Details ---
        doc.fontSize(10).fillColor('#4b5563').text('BILL TO:', midPoint + 20, topY);
        doc.fontSize(12).fillColor('#111827').text(quote.customerName || 'Walk-in Customer', midPoint + 20, doc.y + 2);
        if (customer?.company) doc.fontSize(9).fillColor('#6b7280').text(customer.company);
        if (customer?.gstin) doc.fontSize(9).fillColor('#6b7280').text(`GSTIN: ${customer.gstin}`);
        doc.fontSize(9).fillColor('#6b7280').text(`Phone: ${notesData.customerPhone || customer?.phone || 'N/A'}`);
        doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString('en-IN')}`);

        doc.moveDown(3);

        // --- 4. Table Headers ---
        const tableY = doc.y;
        doc.rect(50, tableY, 500, 20).fill('#f9fafb');
        doc.fillColor('#374151').fontSize(9);
        
        doc.text('ITEM / WOOD TYPE', 60, tableY + 6);
        doc.text('HSN', 200, tableY + 6);
        doc.text('QTY', 240, tableY + 6);
        doc.text('VOLUME', 290, tableY + 6, { width: 60, align: 'right' });
        doc.text('RATE/CFT', 370, tableY + 6, { width: 80, align: 'right' });
        doc.text('AMOUNT', 470, tableY + 6, { width: 70, align: 'right' });

        doc.moveTo(50, tableY + 20).lineTo(550, tableY + 20).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        
        doc.y = tableY + 28;
        let totalVolume = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;
        let baseSubtotal = 0;

        const appliedGstRate = notesData.taxBreakdown?.appliedGst ?? 18;

        // Grouping items by Wood Type
        const items = quote.items || [];
        items.forEach((item: any) => {
          if (doc.y > 700) doc.addPage();
          
          const currY = doc.y;
          doc.fillColor('#111827').fontSize(9);
          doc.text(item.woodType || 'Timber', 60, currY);
          doc.text(`${item.width}\"x${item.thickness}\"x${item.length}'`, 60, currY + 12);
          
          doc.text('4407', 200, currY); // Default Timber HSN
          doc.text(String(item.quantity), 240, currY);
          
          const vol = Number(item.volume || 0);
          doc.text(vol.toFixed(3), 290, currY, { width: 60, align: 'right' });
          
          const itemTotal = Number(item.price || 0) / 100;
          const rate = vol > 0 ? itemTotal / vol : 0;
          doc.text(`Rs ${Math.round(rate)}`, 370, currY, { width: 80, align: 'right' });
          doc.text(`Rs ${Math.round(itemTotal).toLocaleString('en-IN')}`, 470, currY, { width: 70, align: 'right' });
          
          // Calculate GST Split for this item
          const gst = CalculationService.calculateGST(
            item.price, // in paise
            customer?.state || 'KA',
            org?.state || 'KA',
            appliedGstRate
          );
          
          totalCgst += gst.cgst / 100;
          totalSgst += gst.sgst / 100;
          totalIgst += gst.igst / 100;
          baseSubtotal += itemTotal;
          totalVolume += vol;

          doc.y = currY + 30;
        });

        // --- 5. Summary Section ---
        if (doc.y > 600) doc.addPage();
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.moveDown(1);

        const summaryLabelX = 350;
        const summaryValX = 470;

        doc.fontSize(10).fillColor('#6b7280').text('TOTAL VOLUME:', 50, doc.y);
        doc.fillColor('#111827').text(`${totalVolume.toFixed(2)} CFT`, 150, doc.y - 12);
        
        doc.fillColor('#374151').text('TAXABLE VALUE:', summaryLabelX, doc.y);
        doc.text(`Rs ${Math.floor(baseSubtotal).toLocaleString('en-IN')}`, summaryValX, doc.y - 12, { width: 70, align: 'right' });
        
        doc.moveDown(0.8);
        if (totalIgst > 0) {
          doc.text(`IGST (${appliedGstRate}%):`, summaryLabelX, doc.y);
          doc.text(`Rs ${Math.round(totalIgst).toLocaleString('en-IN')}`, summaryValX, doc.y - 12, { width: 70, align: 'right' });
        } else {
          doc.text(`CGST (${appliedGstRate/2}%):`, summaryLabelX, doc.y);
          doc.text(`Rs ${Math.round(totalCgst).toLocaleString('en-IN')}`, summaryValX, doc.y - 12, { width: 70, align: 'right' });
          doc.moveDown(0.8);
          doc.text(`SGST (${appliedGstRate/2}%):`, summaryLabelX, doc.y);
          doc.text(`Rs ${Math.round(totalSgst).toLocaleString('en-IN')}`, summaryValX, doc.y - 12, { width: 70, align: 'right' });
        }

        const calculatedTotalPaise = notesData.calculatedPricePaise || ((baseSubtotal + totalCgst + totalSgst + totalIgst) * 100);
        const finalNegotiatedPaise = quote.totalPrice;
        const discountPaise = calculatedTotalPaise - finalNegotiatedPaise;

        if (discountPaise > 0) {
          doc.moveDown(0.8);
          doc.fillColor('#10b981').text('DISCOUNT (SAVED):', summaryLabelX, doc.y);
          doc.text(`-Rs ${Math.round(discountPaise/100).toLocaleString('en-IN')}`, summaryValX, doc.y - 12, { width: 70, align: 'right' });
        }

        doc.moveDown(1.5);
        doc.rect(summaryLabelX - 10, doc.y - 5, 200, 30).fill('#10b981');
        doc.fontSize(12).fillColor('#ffffff').text('GRAND TOTAL:', summaryLabelX, doc.y + 5);
        const totalPrice = quote.totalPrice;
        doc.text(`Rs ${Math.round(totalPrice / 100).toLocaleString('en-IN')}`, summaryValX, doc.y - 16, { width: 70, align: 'right' });

        // --- 6. Footer & Signatures ---
        const footerY = 740;
        doc.fontSize(8).fillColor('#9ca3af').text(
          '1. Goods once sold will not be taken back.\n2. We are not responsible for any damage during transit.\n3. Subject to jurisdiction of Bangalore court.',
          50, footerY, { width: 250 }
        );

        doc.fontSize(10).fillColor('#374151').text('For ' + (org?.name || 'TimberFlow'), 400, footerY);
        doc.moveDown(3);
        doc.text('Authorised Signatory', 400, doc.y, { width: 100, align: 'center' });

        doc.end();
      } catch (innerErr) {
        reject(innerErr);
      }
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="TimberFlow-${quote.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
