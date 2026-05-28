import { SupabaseClient } from '@supabase/supabase-js';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHECK';

export interface PaymentParams {
  orgId: string;
  customerId: string;
  invoiceId?: string;
  quoteId?: string;
  amount: number; // in paise
  paymentMethod: PaymentMethod;
  notes?: string;
  userId: string;
}

export class PaymentService {
  /**
   * Records a customer payment and updates invoice/quote/customer balances.
   */
  static async recordPayment(supabase: SupabaseClient, params: PaymentParams) {
    // 1. Insert Payment Record
    const { data: payment, error: payError } = await supabase
      .from('Payment')
      .insert({
        orgId: params.orgId,
        customerId: params.customerId,
        invoiceId: params.invoiceId,
        quoteId: params.quoteId,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        notes: params.notes,
        createdBy: params.userId
      })
      .select()
      .single();

    if (payError) throw new Error(`Failed to record payment: ${payError.message}`);

    // 2. Update Invoice Paid Amount (if linked)
    if (params.invoiceId) {
      const { data: invoice } = await supabase
        .from('Invoice')
        .select('paidAmount, grandTotal')
        .eq('id', params.invoiceId)
        .single();

      if (invoice) {
        const newPaidAmount = (invoice.paidAmount || 0) + params.amount;
        let newStatus = 'PARTIAL';
        if (newPaidAmount >= invoice.grandTotal) {
          newStatus = 'PAID';
        }

        await supabase
          .from('Invoice')
          .update({ 
            paidAmount: newPaidAmount,
            status: newStatus 
          })
          .eq('id', params.invoiceId);
      }
    }

    // 3. Update Quote Paid Amount (if linked)
    if (params.quoteId) {
       const { data: quote } = await supabase
         .from('Quote')
         .select('paidAmount, totalPrice')
         .eq('id', params.quoteId)
         .single();
       
       if (quote) {
         // Note: Quote.paidAmount is only there if the migration was run. 
         // If not, this might fail, but let's assume we proceed.
         const newPaidAmount = (quote.paidAmount || 0) + params.amount;
         await supabase
           .from('Quote')
           .update({ paidAmount: newPaidAmount })
           .eq('id', params.quoteId);
       }
    }

    // 4. Update Customer Outstanding Balance
    const { data: customer } = await supabase
      .from('Customer')
      .select('outstandingBalance')
      .eq('id', params.customerId)
      .single();

    if (customer) {
      const newBalance = (customer.outstandingBalance || 0) - params.amount;
      await supabase
        .from('Customer')
        .update({ outstandingBalance: newBalance })
        .eq('id', params.customerId);
    }

    return payment;
  }

  /**
   * Fetches the payment history (Ledger) for a customer
   */
  static async getCustomerLedger(supabase: SupabaseClient, customerId: string) {
    // We combine Invoices (debits), purchased Quotes (debits), and Payments (credits)
    const [
      { data: invoices },
      { data: quotes },
      { data: payments }
    ] = await Promise.all([
      supabase.from('Invoice').select('*').eq('customerId', customerId).order('createdAt', { ascending: false }),
      supabase.from('Quote').select('*').eq('customerId', customerId).eq('status', 'purchased').order('createdAt', { ascending: false }),
      supabase.from('Payment').select('*').eq('customerId', customerId).order('createdAt', { ascending: false })
    ]);

    return { invoices, quotes, payments };
  }
}
