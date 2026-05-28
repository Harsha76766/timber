import { z } from 'zod';

export const timberInputSchema = z.object({
  woodType: z.string().min(1, 'Wood type is required'),
  productId: z.string().uuid('Invalid Wood Product').optional().nullable(),
  length: z.number().positive('Length must be positive'),
  width: z.number().positive('Width must be positive'),
  thickness: z.number().positive('Thickness must be positive'),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
  unitL: z.enum(['ft', 'in', 'mm']).default('ft'),
  unitW: z.enum(['ft', 'in', 'mm']).default('in'),
  unitT: z.enum(['ft', 'in', 'mm']).default('in'),
  pricePerCftPaise: z.number().int().nonnegative().optional(),
  gstPercentage: z.number().nonnegative().default(0),
});

export const quoteSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().default(''),
  customerPhone: z.string().optional().nullable(),
  negotiatedPricePaise: z.number().int().nonnegative().optional().nullable(),
  taxAmountPaise: z.number().int().nonnegative().optional().nullable(),
  status: z.string().optional().nullable(),
  items: z.array(timberInputSchema).min(1, 'At least one item is required'),
});
