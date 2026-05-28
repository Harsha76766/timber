import { SupabaseClient } from '@supabase/supabase-js';
import { quoteSchema } from '../validators/timber';
import crypto from 'crypto';
import { InventoryService } from './inventoryService';
import { CalculationService } from './calculationService';

export class QuoteService {
  /**
   * Validates and saves or updates a quote. 
   * If an ID is provided, it updates the existing quote and its items.
   */
  static async saveQuote(supabase: any, userId: string, data: any) {
    const parsed = quoteSchema.parse(data);

    // 1. Fetch products to calculate prices
    const productIds = parsed.items.map(i => i.productId).filter(Boolean) as string[];
    const { data: products, error: prodError } = await supabase
      .from('Product')
      .select('*')
      .in('id', productIds);

    if (prodError) throw new Error(`Failed to fetch products: ${prodError.message}`);

    let grandTotalPaise = 0;
    let totalTaxAmountPaise = 0;
    
    const validatedItemsWithoutQuoteId = parsed.items.map(item => {
      const calc = CalculationService.calculateCFT(item);
      const prod = products?.find((p: any) => p.id === item.productId);
      
      const pricePerCftPaise = item.pricePerCftPaise ?? (prod ? prod.pricePerCft : 0);
      const itemTotalPaise = CalculationService.calculateTotalPaise(calc.totalVolume, pricePerCftPaise);
      
      const gstPercent = item.gstPercentage ?? 18;
      const taxForThisItem = Math.round(itemTotalPaise * (gstPercent / 100));
      
      grandTotalPaise += itemTotalPaise;
      totalTaxAmountPaise += taxForThisItem;

      return {
        id: crypto.randomUUID(),
        productId: item.productId,
        woodType: item.woodType,
        length: item.length,
        width: item.width,
        thickness: item.thickness,
        quantity: item.quantity,
        volume: calc.totalVolume.toNumber(),
        price: itemTotalPaise,
        // Store metadata in a way we can recover later if needed
      };
    });

    // 1.5. Onboard Customer (Find or Create) — Phone is primary CRM key
    let customerId = parsed.customerId;
    const phoneForCRM = parsed.customerPhone?.trim();
    
    // ALWAYS re-resolve by phone if phone is provided (phone is the CRM primary key)
    if (phoneForCRM && parsed.customerName) {
      const { data: existingCust } = await supabase
        .from('Customer')
        .select('id, name')
        .eq('userId', userId)
        .eq('phone', phoneForCRM)
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
        // Update name if it changed (e.g. Walk-In → real name)
        if (existingCust.name !== parsed.customerName) {
          await supabase.from('Customer').update({ name: parsed.customerName }).eq('id', existingCust.id);
        }
      } else {
        // Create new customer
        const { data: newUser } = await supabase.from('User').select('orgId').eq('id', userId).single();
        const { data: newCust, error: custError } = await supabase
          .from('Customer')
          .insert({
            id: crypto.randomUUID(),
            userId,
            orgId: newUser?.orgId,
            name: parsed.customerName,
            phone: phoneForCRM,
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!custError && newCust) {
          customerId = newCust.id;
        }
      }
    } else if (!customerId && parsed.customerName) {
      // Fallback: no phone, search by name
      const { data: existingCust } = await supabase
        .from('Customer')
        .select('id')
        .eq('userId', userId)
        .ilike('name', parsed.customerName)
        .limit(1)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newUser } = await supabase.from('User').select('orgId').eq('id', userId).single();
        const { data: newCust, error: custError } = await supabase
          .from('Customer')
          .insert({
            id: crypto.randomUUID(),
            userId,
            orgId: newUser?.orgId,
            name: parsed.customerName,
            phone: '',
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!custError && newCust) {
          customerId = newCust.id;
        }
      }
    }

    const quoteStatus = parsed.status || 'draft';
    const totalPrice = parsed.negotiatedPricePaise ?? (grandTotalPaise + totalTaxAmountPaise);
    
    const quoteData = {
      userId,
      customerId, // Linked customer!
      customerName: parsed.customerName,
      totalPrice,
      status: quoteStatus,
      notes: JSON.stringify({ 
        customerPhone: parsed.customerPhone,
        negotiatedPricePaise: parsed.negotiatedPricePaise,
        calculatedPricePaise: grandTotalPaise + totalTaxAmountPaise,
        taxAmountPaise: totalTaxAmountPaise,
        baseTotalPaise: grandTotalPaise,
        taxBreakdown: { 
          totalTax: totalTaxAmountPaise, 
          baseTotal: grandTotalPaise,
          appliedGst: parsed.items[0]?.gstPercentage ?? 18 
        } 
      }),
      updatedAt: new Date().toISOString()
    };

    let quote;
    
    if (parsed.id) {
      // 2a. Update existing Quote
      const { data: updatedQuote, error: updateError } = await supabase
        .from('Quote')
        .update(quoteData)
        .eq('id', parsed.id)
        .eq('userId', userId)
        .select()
        .single();

      if (updateError) throw new Error(`Failed to update quote: ${updateError.message}`);
      
      // Delete old items
      const { error: delError } = await supabase
        .from('QuoteItem')
        .delete()
        .eq('quoteId', parsed.id);
        
      if (delError) throw new Error(`Failed to clear old items: ${delError.message}`);
      
      quote = updatedQuote;
    } else {
      // 2b. Create new Quote
      const { data: newQuote, error: insertError } = await supabase
        .from('Quote')
        .insert({ id: crypto.randomUUID(), ...quoteData, createdAt: new Date().toISOString() })
        .select()
        .single();

      if (insertError) throw new Error(`Failed to create quote: ${insertError.message}`);
      quote = newQuote;
    }

    // 3. Insert QuoteItems
    const itemsToInsert = validatedItemsWithoutQuoteId.map(item => ({
      ...item,
      quoteId: quote.id
    }));

    const { error: itemsError } = await supabase
      .from('QuoteItem')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(`Failed to save items: ${itemsError.message}`);

    // 4. Handle conversion to Invoice, Inventory Deduction, and Ledger if status is purchased
    if (quoteStatus === 'purchased') {
      try {
        const notes = JSON.parse(quote.notes || '{}');
        if (!notes.inventoryDeducted) {
          // Fetch user's orgId
          const { data: userData, error: userError } = await supabase
            .from('User')
            .select('orgId')
            .eq('id', userId)
            .single();

          if (userError || !userData?.orgId) {
            console.error("Cannot deduct inventory: User has no orgId", userError);
          } else {
            // Deduct for each item
            for (const item of validatedItemsWithoutQuoteId) {
              if (item.productId) {
                await InventoryService.recordMovement(supabase, {
                  orgId: userData.orgId,
                  productId: item.productId,
                  type: 'SALE',
                  quantity: -item.volume, // Negative for sale
                  userId,
                  referenceId: quote.id,
                  notes: `Sale for Quote #${quote.id.substring(0,8)}`
                });
              }
            }

            // Update Customer Financials
            if (quote.customerId) {
              const finalPrice = parsed.negotiatedPricePaise ?? (grandTotalPaise + totalTaxAmountPaise);
              const advance = typeof notes.advanceRupees === 'number' ? notes.advanceRupees * 100 : 0;
              
              const { data: cust } = await supabase.from('Customer').select('lifetimeValue, outstandingBalance').eq('id', quote.customerId).single();
              if (cust) {
                 await supabase.from('Customer').update({
                     lifetimeValue: (cust.lifetimeValue || 0) + finalPrice,
                     outstandingBalance: (cust.outstandingBalance || 0) + (finalPrice - advance)
                 }).eq('id', quote.customerId);
                 
                 if (advance > 0 && userData.orgId) {
                     await supabase.from('Payment').insert({
                         orgId: userData.orgId,
                         customerId: quote.customerId,
                         amount: advance,
                         paymentMethod: 'CASH',
                         notes: `Advance for Purchase ${quote.id.substring(0,8)}`,
                         createdBy: userId
                     });
                 }
              }
            }

            // Mark as deducted in notes
            const updatedNotes = { ...notes, inventoryDeducted: true };
            await supabase
              .from('Quote')
              .update({ notes: JSON.stringify(updatedNotes) })
              .eq('id', quote.id);
            
            console.log("Inventory & Ledger updated for quote", quote.id);
          }
        }
      } catch (err) {
        console.error("Failed to process inventory deduction:", err);
      }
    }

    return quote;
  }

  /**
   * Converts an approved quote into a GST-compliant Invoice (Section 9.3 of PRD)
   */
  static async convertToInvoice(supabase: SupabaseClient, quoteId: string, userId: string) {
    // 1. Fetch Quote, Items, and User/Org Info
    const { data: quote, error: quoteError } = await supabase
      .from('Quote')
      .select(`
        *,
        QuoteItem(*),
        User(orgId, Organisation(*))
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError) throw new Error(`Failed to fetch quote: ${quoteError.message}`);
    if (quote.status === 'converted') throw new Error('Quote already converted to invoice');

    const org = (quote.User as any).Organisation;
    if (!org) throw new Error('User organisation not found. Ensure org setup is complete.');

    // 2. Fetch Customer State for GST logic
    const { data: customer, error: custError } = await supabase
      .from('Customer')
      .select('state, gstin')
      .eq('id', quote.customerId)
      .single();

    if (custError) throw new Error(`Failed to fetch customer: ${custError.message}`);

    // 3. Calculate GST Split per item
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const quoteNotes = JSON.parse(quote.notes || '{}');
    const taxRate = quoteNotes.taxBreakdown?.appliedGst ?? 18;

    quote.QuoteItem.forEach((item: any) => {
      const itemBase = item.price; // Already in paise
      const gst = CalculationService.calculateGST(itemBase, customer.state || 'KA', org.state || 'KA', taxRate); 
      
      subtotal += itemBase;
      totalCgst += gst.cgst;
      totalSgst += gst.sgst;
      totalIgst += gst.igst;
    });

    const grandTotal = subtotal + totalCgst + totalSgst + totalIgst;

    // 4. Create Invoice
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // 5. Deduct Inventory if not already done
    try {
      const notes = JSON.parse(quote.notes || '{}');
      if (!notes.inventoryDeducted) {
        for (const item of quote.QuoteItem) {
          if (item.productId) {
            await InventoryService.recordMovement(supabase, {
              orgId: org.id,
              productId: item.productId,
              type: 'SALE',
              quantity: -item.volume,
              userId,
              referenceId: quote.id,
              notes: `Sale for Quote #${quote.id.substring(0,8)} (Converted to Invoice)`
            });
          }
        }
        // Local update of notes object for the next step
        notes.inventoryDeducted = true;
        quote.notes = JSON.stringify(notes);
      }
    } catch (err) {
      console.error("Failed to process inventory deduction in conversion:", err);
    }

    const { data: invoice, error: invError } = await supabase
      .from('Invoice')
      .insert({
        orgId: org.id,
        invoiceNumber,
        quotationId: quoteId,
        customerId: quote.customerId,
        placeOfSupply: customer.state || 'KA',
        isInterState: (customer.state || 'KA') !== (org.state || 'KA'),
        subtotal,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalGst: totalCgst + totalSgst + totalIgst,
        grandTotal,
        status: 'DRAFT'
      })
      .select()
      .single();

    if (invError) throw new Error(`Failed to create invoice: ${invError.message}`);

    // 5.5. Update Customer Financials
    const { data: currentCust } = await supabase
      .from('Customer')
      .select('lifetimeValue, outstandingBalance')
      .eq('id', quote.customerId)
      .single();

    if (currentCust) {
      await supabase
        .from('Customer')
        .update({
          lifetimeValue: (currentCust.lifetimeValue || 0) + grandTotal,
          outstandingBalance: (currentCust.outstandingBalance || 0) + grandTotal,
          updatedAt: new Date().toISOString()
        })
        .eq('id', quote.customerId);
    }

    // 6. Mark Quote as Converted and update notes (for inventoryDeducted status)
    await supabase
      .from('Quote')
      .update({ 
        status: 'converted', 
        notes: quote.notes,
        updatedAt: new Date().toISOString() 
      })
      .eq('id', quoteId);

    return invoice;
  }
}
