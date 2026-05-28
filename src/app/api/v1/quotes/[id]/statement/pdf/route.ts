import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { numberToWords } from '@/lib/utils/numberToWords';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: inputId } = await params;
    
    // 1. Verify User Session first (Security check)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    // 2. Initialize Admin client for reliable fetching (Bypass RLS for PDF generation)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    let finalQuoteId: string | null = null;
    let quoteData: any = null;
    let invoiceData: any = null;

    // 3. Fetch Data as Admin
    // Try fetching as Quote first
    const { data: quote } = await admin
      .from('Quote')
      .select('*, QuoteItem(*), Customer(*)')
      .eq('id', inputId)
      .maybeSingle();

    if (quote) {
      finalQuoteId = quote.id;
      quoteData = quote;
    } else {
      // Try fetching as Invoice
      const { data: invoice } = await admin
        .from('Invoice')
        .select('*, Quote(*, QuoteItem(*)), Customer(*)')
        .eq('id', inputId)
        .maybeSingle();
      
      if (invoice) {
        invoiceData = invoice;
        quoteData = invoice.Quote;
        finalQuoteId = invoice.quotationId;
      }
    }

    if (!quoteData) return new NextResponse('Deal/Invoice Not Found (Admin Verification Failed)', { status: 404 });

    // 4. Fetch all payments linked to this Deal
    const { data: payments } = await admin
      .from('Payment')
      .select('*')
      .or(`quoteId.eq.${finalQuoteId},invoiceId.eq.${inputId}`)
      .order('createdAt', { ascending: true });

    // 5. Fetch Org details
    const { data: userData } = await admin.from('User').select('orgId').eq('id', user.id).single();
    const { data: org } = await admin.from('Organisation').select('*').eq('id', userData?.orgId).single();

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const primaryFontPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf');
        let activeFont: string | undefined = undefined;
        if (fs.existsSync(primaryFontPath) && fs.statSync(primaryFontPath).size > 1000) {
          activeFont = primaryFontPath;
        }

        const doc = new PDFDocument({ margin: 40, size: 'A4', font: activeFont });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // --- Header ---
        doc.rect(0, 0, 612.28, 70).fill('#141417');
        doc.fillColor('#ffffff').fontSize(22).text(invoiceData ? 'INVOICE STATEMENT' : 'DEAL STATEMENT', 40, 25);
        
        doc.y = 100;
        const topY = doc.y;

        // --- Customer & Deal Meta ---
        const customer = quoteData.Customer || invoiceData?.Customer;
        doc.fillColor('#4b5563').fontSize(9).text('CUSTOMER DETAILS:', 40, topY);
        doc.fillColor('#111827').fontSize(14).text(customer?.name || 'Retail Customer', 40, doc.y + 2);
        doc.fillColor('#6b7280').fontSize(10).text(customer?.phone || '');
        
        doc.fillColor('#4b5563').fontSize(9).text(invoiceData ? 'INVOICE INFO:' : 'DEAL INFO:', 400, topY);
        doc.fillColor('#111827').fontSize(11).text(`Date: ${new Date(invoiceData?.createdAt || quoteData.createdAt).toLocaleDateString('en-IN')}`, 400, doc.y + 2);
        doc.text(`ID: #${(invoiceData?.invoiceNumber || quoteData.id.substring(0, 8)).toUpperCase()}`);
        doc.fillColor('#1e40af').text(`Status: ${(invoiceData?.status || quoteData.status).toUpperCase()}`);

        doc.moveDown(2);
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1.5);

        // --- Section: Item Details ---
        doc.fillColor('#111827').fontSize(12).text('PURCHASE BREAKDOWN', 40);
        doc.moveDown(0.5);
        
        // Table Header
        const tableY = doc.y;
        doc.rect(40, tableY, 530, 20).fill('#f9fafb');
        doc.fillColor('#4b5563').fontSize(9);
        doc.text('ITEM / WOOD TYPE', 50, tableY + 6);
        doc.text('DIMENSIONS (L x W x T)', 160, tableY + 6);
        doc.text('QTY', 310, tableY + 6);
        doc.text('VOLUME', 360, tableY + 6);
        doc.text('TAXABLE', 430, tableY + 6, { align: 'right', width: 60 });
        doc.text('TOTAL', 505, tableY + 6, { align: 'right', width: 60 });
        
        doc.y = tableY + 25;
        const items = quoteData.QuoteItem || [];
        items.forEach((item: any) => {
          const itemY = doc.y;
          doc.fillColor('#111827').fontSize(9);
          doc.text(item.woodType || 'Generic Wood', 50, itemY);
          doc.text(`${item.width}" x ${item.thickness}" x ${item.length}'`, 160, itemY);
          doc.text(item.quantity.toString(), 310, itemY);
          doc.text(Number(item.volume).toFixed(2), 360, itemY);
          
          const itemBase = Math.round(item.price/100);
          const meta = item.notes ? JSON.parse(item.notes) : {};
          const gstRate = meta.gstPercentage ?? 18;
          const tax = Math.round(itemBase * (gstRate / 100));
          
          doc.text(`₹${itemBase.toLocaleString('en-IN')}`, 430, itemY, { align: 'right', width: 60 });
          doc.text(`₹${(itemBase + tax).toLocaleString('en-IN')}`, 505, itemY, { align: 'right', width: 60 });
          doc.moveDown(0.8);
          if (doc.y > 700) doc.addPage();
        });

        doc.moveDown(1);
        const summY = doc.y;
        
        let notes: any = {};
        try { notes = JSON.parse(quoteData.notes || '{}'); } catch {}
        
        const baseTotalPaise = notes.baseTotalPaise || (quoteData.totalPrice - (notes.taxAmountPaise || 0));
        const taxTotalPaise = notes.taxAmountPaise || 0;
        const calculatedTotalPaise = notes.calculatedPricePaise || (baseTotalPaise + taxTotalPaise);
        const finalNegotiatedPaise = quoteData.totalPrice;
        const discountPaise = calculatedTotalPaise - finalNegotiatedPaise;

        const labelX = 380;
        const valueX = 505;

        doc.fontSize(9).fillColor('#6b7280');
        doc.text('SUBTOTAL (TAXABLE):', labelX, summY);
        doc.fillColor('#111827').text(`₹${Math.round(baseTotalPaise/100).toLocaleString('en-IN')}`, valueX, summY, { align: 'right', width: 60 });
        
        doc.y = summY + 15;
        doc.fillColor('#6b7280').text(`GST (${notes.taxBreakdown?.appliedGst || 18}%):`, labelX, doc.y);
        doc.fillColor('#111827').text(`₹${Math.round(taxTotalPaise/100).toLocaleString('en-IN')}`, valueX, doc.y - 11, { align: 'right', width: 60 });
        
        if (discountPaise > 0) {
          doc.y = doc.y + 15;
          doc.fillColor('#10b981').text('DISCOUNT (SAVED):', labelX, doc.y);
          doc.text(`-₹${Math.round(discountPaise/100).toLocaleString('en-IN')}`, valueX, doc.y - 11, { align: 'right', width: 60 });
        }

        doc.y = doc.y + 20;
        doc.rect(labelX - 10, doc.y - 5, 195, 25).fill('#eff6ff');
        doc.fillColor('#1e40af').fontSize(11).text('FINAL PAYABLE:', labelX, doc.y + 7);
        doc.text(`₹${Math.round(finalNegotiatedPaise/100).toLocaleString('en-IN')}`, valueX, doc.y - 11, { align: 'right', width: 60 });
        
        doc.moveDown(3);
        doc.strokeColor('#e5e7eb').moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1.5);

        // --- Section: Payment History ---
        doc.fillColor('#10b981').fontSize(12).text('PAYMENT HISTORY & LEDGER', 40);
        doc.moveDown(0.5);

        if (payments && payments.length > 0) {
          const payY = doc.y;
          doc.rect(40, payY, 530, 20).fill('#f0fdf4');
          doc.fillColor('#065f46').fontSize(9);
          doc.text('DATE', 50, payY + 6);
          doc.text('PAYMENT METHOD', 180, payY + 6);
          doc.text('REFERENCE', 350, payY + 6);
          doc.text('AMOUNT PAID', 500, payY + 6, { align: 'right', width: 60 });

          doc.y = payY + 25;
          let totalPaidSum = 0;
          payments.forEach((p: any) => {
            const rowY = doc.y;
            totalPaidSum += p.amount;
            doc.fillColor('#111827').fontSize(9);
            doc.text(new Date(p.transactionDate || p.createdAt).toLocaleDateString('en-IN'), 50, rowY);
            doc.text(p.paymentMethod, 180, rowY);
            doc.text(p.id.substring(0, 12).toUpperCase(), 350, rowY);
            doc.fillColor('#10b981').text(`₹${Math.round(p.amount/100).toLocaleString('en-IN')}`, 500, rowY, { align: 'right', width: 60 });
            doc.moveDown(0.8);
          });

          doc.moveDown(2);
          const summaryY = doc.y;
          const balance = finalNegotiatedPaise - totalPaidSum;
          doc.rect(350, summaryY, 220, 100).fill('#f9fafb');
          doc.rect(350, summaryY, 5, 100).fill(balance <= 0 ? '#10b981' : '#f43f5e');
          doc.fillColor('#4b5563').fontSize(10).text('TOTAL PAID:', 370, summaryY + 15);
          doc.fillColor('#111827').fontSize(14).text(`₹${Math.round(totalPaidSum/100).toLocaleString('en-IN')}`, 370, doc.y + 2);
          doc.fillColor('#4b5563').fontSize(10).text('OUTSTANDING BALANCE:', 370, doc.y + 15);
          doc.fillColor(balance <= 0 ? '#10b981' : '#f43f5e').fontSize(18).text(`₹${Math.max(0, Math.round(balance/100)).toLocaleString('en-IN')}`, 370, doc.y + 2);
          if (balance <= 0) doc.fillColor('#10b981').fontSize(10).text('ACCOUNT RECONCILED', 370, doc.y + 5, { characterSpacing: 1 });
        } else {
          doc.fillColor('#6b7280').text('No payments recorded for this deal yet.', 40);
        }

        const footerY = 750;
        doc.fillColor('#9ca3af').fontSize(8).text('This is an official deal statement generated by TimberFlow CRM.', 40, footerY);
        doc.fillColor('#111827').fontSize(12).text(org?.name || 'TimberFlow Store', 350, footerY - 5, { align: 'right', width: 220 });

        doc.end();
      } catch (e) { reject(e); }
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Statement-${inputId.substring(0,8)}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('STATEMENT PDF ERROR:', error);
    return new NextResponse('Internal Error: ' + error.message, { status: 500 });
  }
}
