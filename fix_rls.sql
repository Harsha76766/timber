DROP POLICY IF EXISTS "Product Select Policy" ON "Product";
DROP POLICY IF EXISTS "Product Select All" ON "Product";
CREATE POLICY "Product Select All" ON "Product" FOR SELECT USING (true);
