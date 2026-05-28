import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export type TransactionType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN';

export class InventoryService {
  /**
   * Records a stock movement in the ledger and updates the item's current stock.
   */
  static async recordMovement(
    supabase: SupabaseClient,
    params: {
      orgId: string;
      productId: string;
      type: TransactionType;
      quantity: number; // positive for gain, negative for loss
      userId: string;
      referenceId?: string;
      notes?: string;
    }
  ) {
    // 1. Get current product info and lock for update (ideally in a transaction)
    const { data: product, error: fetchError } = await supabase
      .from('Product')
      .select('stock')
      .eq('id', params.productId)
      .single();

    if (fetchError) throw new Error(`Failed to fetch product: ${fetchError.message}`);

    const newBalance = (product.stock || 0) + params.quantity;

    // 2. Create Ledger Entry
    const { error: ledgerError } = await supabase
      .from('StockLedger')
      .insert({
        orgId: params.orgId,
        productId: params.productId,
        transactionType: params.type,
        referenceId: params.referenceId,
        quantity: params.quantity,
        balanceAfter: newBalance,
        notes: params.notes,
        createdBy: params.userId
      });

    if (ledgerError) throw new Error(`Failed to create ledger entry: ${ledgerError.message}`);

    // 3. Update Product Stock
    const { error: updateError } = await supabase
      .from('Product')
      .update({ stock: newBalance })
      .eq('id', params.productId);

    if (updateError) throw new Error(`Failed to update product stock: ${updateError.message}`);

    return { newBalance };
  }

  /**
   * Gets the movement history for a specific product.
   */
  static async getHistory(supabase: SupabaseClient, productId: string) {
    const { data, error } = await supabase
      .from('StockLedger')
      .select(`
        *,
        createdBy:User(name)
      `)
      .eq('productId', productId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data;
  }
}
