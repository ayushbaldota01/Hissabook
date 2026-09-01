-- HisaabBook - Supabase Schema
-- Run this in Supabase SQL Editor to create the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Party table
CREATE TABLE IF NOT EXISTS "Party" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "type" VARCHAR(20) NOT NULL DEFAULT 'Other',
  "phone" VARCHAR(20),
  "notes" TEXT,
  "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Transaction table
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "partyId" TEXT NOT NULL REFERENCES "Party"("id") ON DELETE CASCADE,
  "type" VARCHAR(10) NOT NULL CHECK ("type" IN ('GIVEN', 'RECEIVED')),
  "amount" DECIMAL(12,2) NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" VARCHAR(255),
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "Transaction_partyId_idx" ON "Transaction"("partyId");
CREATE INDEX IF NOT EXISTS "Transaction_transactionDate_idx" ON "Transaction"("transactionDate");
CREATE INDEX IF NOT EXISTS "Transaction_isDeleted_idx" ON "Transaction"("isDeleted");
CREATE INDEX IF NOT EXISTS "Party_isArchived_idx" ON "Party"("isArchived");

-- UpdatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Transaction_updatedAt" ON "Transaction";
CREATE TRIGGER "Transaction_updatedAt"
  BEFORE UPDATE ON "Transaction"
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- Allow anon key (Supabase client) to access data
ALTER TABLE "Party" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon" ON "Party" FOR ALL TO anon USING (true) WITH CHECK (true);
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon" ON "Transaction" FOR ALL TO anon USING (true) WITH CHECK (true);
