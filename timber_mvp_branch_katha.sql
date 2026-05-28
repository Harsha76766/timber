-- TimberFlow MVP: Branch and Katha Ledger Schema Upgrades

-- 1. Create Branch Table
CREATE TABLE IF NOT EXISTS "Branch" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orgId" UUID REFERENCES "Organisation"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "location" TEXT,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create BranchStock Table (Multi-Warehouse Inventory)
CREATE TABLE IF NOT EXISTS "BranchStock" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "branchId" UUID REFERENCES "Branch"("id") ON DELETE CASCADE,
  "itemId" UUID REFERENCES "Item"("id") ON DELETE CASCADE,
  "currentStock" NUMERIC DEFAULT 0,
  "minStockLevel" NUMERIC DEFAULT 0,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE("branchId", "itemId")
);

-- 3. Add branchId to existing tables
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" UUID REFERENCES "Branch"("id") ON DELETE SET NULL;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "branchId" UUID REFERENCES "Branch"("id") ON DELETE SET NULL;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "branchId" UUID REFERENCES "Branch"("id") ON DELETE SET NULL;
ALTER TABLE "KathaEntry" ADD COLUMN IF NOT EXISTS "branchId" UUID REFERENCES "Branch"("id") ON DELETE SET NULL;

-- 4. Customer Balance Fields
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "currentBalance" INTEGER DEFAULT 0;

-- 5. Create Trigger to Auto-Update Customer Balance based on KathaEntry
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's an INSERT
  IF (TG_OP = 'INSERT') THEN
    IF (NEW."balanceType" = 'Dr') THEN
      -- Debit increases balance (Customer owes us)
      UPDATE "Customer" SET "currentBalance" = "currentBalance" + NEW."amount" WHERE "id"::TEXT = NEW."customerId";
    ELSIF (NEW."balanceType" = 'Cr') THEN
      -- Credit decreases balance (Customer paid us)
      UPDATE "Customer" SET "currentBalance" = "currentBalance" - NEW."amount" WHERE "id"::TEXT = NEW."customerId";
    END IF;
    RETURN NEW;
  END IF;
  
  -- If it's a DELETE
  IF (TG_OP = 'DELETE') THEN
    IF (OLD."balanceType" = 'Dr') THEN
      UPDATE "Customer" SET "currentBalance" = "currentBalance" - OLD."amount" WHERE "id"::TEXT = OLD."customerId";
    ELSIF (OLD."balanceType" = 'Cr') THEN
      UPDATE "Customer" SET "currentBalance" = "currentBalance" + OLD."amount" WHERE "id"::TEXT = OLD."customerId";
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists so we can recreate it cleanly
DROP TRIGGER IF EXISTS trigger_update_customer_balance ON "KathaEntry";

CREATE TRIGGER trigger_update_customer_balance
AFTER INSERT OR DELETE ON "KathaEntry"
FOR EACH ROW
EXECUTE FUNCTION update_customer_balance();
