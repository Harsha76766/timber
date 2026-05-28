-- TimberFlow PRD v1.0 Migration
-- Target: Supabase / PostgreSQL

-- 1. Create Organisation Table
CREATE TABLE IF NOT EXISTS "Organisation" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "gstin" VARCHAR(15),
    "pan" VARCHAR(10),
    "address" TEXT,
    "state" VARCHAR(2) DEFAULT 'KA', -- Default State for GST logic
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Update User Table for Multi-tenancy and RBAC
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organisation"("id");
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'OWNER'; -- OWNER, SALES, ACCOUNTS, WAREHOUSE

-- 3. Expand Product (Item) Table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT DEFAULT '4407';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gstRate" DECIMAL DEFAULT 12.0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'CFT'; -- CFT, CBM, NOS, KG
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minStockLevel" DECIMAL DEFAULT 10.0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "costPrice" INTEGER; -- In paise
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellingPrice" INTEGER; -- In paise

-- 4. Create StockLedger Table
CREATE TABLE IF NOT EXISTS "StockLedger" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL REFERENCES "Organisation"("id"),
    "productId" TEXT NOT NULL REFERENCES "Product"("id"),
    "transactionType" TEXT NOT NULL, -- PURCHASE, SALE, ADJUSTMENT, RETURN
    "referenceId" UUID, -- Link to Invoice or Purchase
    "quantity" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Invoice Table (Financial Engine)
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL REFERENCES "Organisation"("id"),
    "invoiceNumber" TEXT UNIQUE NOT NULL,
    "quotationId" TEXT REFERENCES "Quote"("id"),
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "invoiceDate" DATE DEFAULT CURRENT_DATE,
    "dueDate" DATE,
    "placeOfSupply" VARCHAR(2) NOT NULL,
    "isInterState" BOOLEAN NOT NULL,
    "subtotal" INTEGER NOT NULL, -- All monetary in paise
    "cgst" INTEGER DEFAULT 0,
    "sgst" INTEGER DEFAULT 0,
    "igst" INTEGER DEFAULT 0,
    "totalGst" INTEGER DEFAULT 0,
    "grandTotal" INTEGER NOT NULL,
    "paidAmount" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, PARTIAL, PAID, OVERDUE, CANCELLED
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Update Customer Table
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organisation"("id");
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "state" VARCHAR(2) DEFAULT 'KA';
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "creditLimit" INTEGER DEFAULT 10000000; -- Default 1 Lakh in paise
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "outstandingBalance" INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "StockLedger_productId_idx" ON "StockLedger"("productId");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_orgId_idx" ON "Invoice"("orgId");
