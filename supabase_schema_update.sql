ALTER TABLE "Organisation" 
ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false;

ALTER TABLE "Organisation"
ADD COLUMN IF NOT EXISTS "businessType" TEXT,
ADD COLUMN IF NOT EXISTS "yearEstablished" INTEGER,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "stateCode" TEXT,
ADD COLUMN IF NOT EXISTS "pinCode" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "Organisation"
ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT DEFAULT 'INV',
ADD COLUMN IF NOT EXISTS "invoiceDueDays" INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS "financialYearStart" TEXT DEFAULT 'April',
ADD COLUMN IF NOT EXISTS "upiId" TEXT;

CREATE TABLE IF NOT EXISTS "Item" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES "Organisation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "grade" TEXT,
  "unit" TEXT NOT NULL,
  "hsnCode" TEXT,
  "gstRate" NUMERIC NOT NULL,
  "costPrice" INTEGER NOT NULL,
  "sellingPrice" INTEGER NOT NULL,
  "currentStock" NUMERIC DEFAULT 0,
  "minStockLevel" NUMERIC DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceId" UUID REFERENCES "Invoice"("id") ON DELETE CASCADE,
  "itemId" UUID REFERENCES "Item"("id") ON DELETE RESTRICT,
  "description" TEXT,
  "quantity" NUMERIC NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "costPrice" INTEGER NOT NULL,
  "gstRate" NUMERIC NOT NULL,
  "gstAmount" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  "sortOrder" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "KathaEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES "Organisation"("id") ON DELETE CASCADE,
  "customerId" TEXT REFERENCES "Customer"("id") ON DELETE CASCADE,
  "entryType" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceType" TEXT,
  "date" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
