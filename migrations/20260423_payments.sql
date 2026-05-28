-- Migration: Create Payment Table for Phase 8
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "orgId" UUID REFERENCES "Organisation"("id");

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orgId" UUID NOT NULL REFERENCES "Organisation"("id"),
    "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "invoiceId" UUID REFERENCES "Invoice"("id"), -- Optional: Payment can be against a specific invoice
    "amount" INTEGER NOT NULL, -- in paise
    "paymentMethod" TEXT NOT NULL, -- CASH, UPI, BANK_TRANSFER, CHECK
    "transactionDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Index for performance
CREATE INDEX IF NOT EXISTS "Payment_customerId_idx" ON "Payment"("customerId");
CREATE INDEX IF NOT EXISTS "Payment_orgId_idx" ON "Payment"("orgId");

-- 8. Enable RLS and Security Policies
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Allow the Service Role (Admin/Server-side) to bypass RLS for ledger updates
DROP POLICY IF EXISTS "Admin Full Access" ON "Payment";
CREATE POLICY "Admin Full Access" ON "Payment" 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated owners/staff to see their own organisation's payments
DROP POLICY IF EXISTS "Organisation Policy" ON "Payment";
CREATE POLICY "Organisation Policy" ON "Payment"
FOR ALL TO authenticated
USING ("orgId" IN (
    SELECT "orgId" FROM "User" WHERE id = auth.uid()::text
));

-- 9. Enable RLS and Policies for Customer Table
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Self Policy" ON "User";
CREATE POLICY "User Self Policy" ON "User"
FOR ALL TO authenticated
USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Customer Org Policy" ON "Customer";
CREATE POLICY "Customer Org Policy" ON "Customer"
FOR ALL TO authenticated
USING ("orgId" IN (
    SELECT "orgId" FROM "User" WHERE id = auth.uid()::text
));

DROP POLICY IF EXISTS "Customer Admin Policy" ON "Customer";
CREATE POLICY "Customer Admin Policy" ON "Customer"
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Link Payment to Invoice with a junction table if many-to-many, 
-- but for simplicity, we use invoiceId in Payment.
