import { z } from 'zod';

export const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  yearEstablished: z.number().max(9999).optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  stateCode: z.string().min(1, 'State code is required'),
  pinCode: z.string().length(6, 'PIN code must be exactly 6 digits'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  email: z.string().email('Invalid email address'),
});

export type BusinessData = z.infer<typeof businessSchema>;

export const gstSchema = z.object({
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, 'Invalid GSTIN format'),
  pan: z.string().length(10, 'PAN must be exactly 10 characters'),
  invoicePrefix: z.string().min(1, 'Prefix is required').max(5, 'Prefix max 5 chars').regex(/^[A-Za-z]+$/, 'Letters only'),
  invoiceDueDays: z.number().min(0, 'Must be positive'),
  financialYearStart: z.enum(['April', 'January']),
  upiId: z.string().optional(),
});

export type GstData = z.infer<typeof gstSchema>;

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Species name is required'),
  grade: z.string().min(1),
  unit: z.string().min(1),
  hsnCode: z.string().regex(/^[0-9]{4}([0-9]{4})?$/, 'HSN must be 4 or 8 digits'),
  gstRate: z.number().min(0).max(28),
  costPrice: z.number().int().min(0),
  sellingPrice: z.number().int().min(1, 'Selling price must be > 0'),
  currentStock: z.number().min(0).default(0),
  minStockLevel: z.number().min(0).default(0),
  sortOrder: z.number().int().default(0),
});

export type InventoryItemData = z.infer<typeof inventoryItemSchema>;

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  openingBalance: z.number().min(0),
  balanceType: z.enum(['Dr', 'Cr', 'None']),
  creditLimit: z.number().optional(),
});

export type CustomerData = z.infer<typeof customerSchema>;

export const teamMemberSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone required'),
  role: z.string().min(1),
});

export type TeamMemberData = z.infer<typeof teamMemberSchema>;
