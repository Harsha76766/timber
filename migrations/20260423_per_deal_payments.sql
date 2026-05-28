-- Migration: Per-Deal Payment Tracking
-- 1. Add paidAmount to Quote table to track payments per purchase
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER DEFAULT 0;

-- 2. Add quoteId to Payment table to link payments to specific deals
-- User's Quote.id is TEXT, so quoteId must also be TEXT
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "quoteId" TEXT REFERENCES "Quote"("id");

-- 3. Create Index for QuoteId in Payment table
CREATE INDEX IF NOT EXISTS "Payment_quoteId_idx" ON "Payment"("quoteId");

-- 4. Initial Sync: Update Quote.paidAmount based on existing advance payments stored in notes
-- We will do this via a script since we need to parse JSON notes, or we can try a best effort SQL
-- Actually, the notes contain advanceRupees. 

-- 5. Add status to Quote if it doesn't represent settlement well (it already has 'purchased')
-- Maybe we need 'SETTLED' status for fully paid quotes? 
-- Let's stick with 'purchased' for now and just check paidAmount.
