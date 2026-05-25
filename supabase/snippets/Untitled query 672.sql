-- 1. Wipe out any broken historical dependencies cleanly
DROP TABLE IF EXISTS ledger_logs CASCADE;
DROP TABLE IF EXISTS batch_documents CASCADE;
DROP TABLE IF EXISTS shipment_batches CASCADE;

-- 2. Create the master shipment_batches table with explicit type matches
CREATE TABLE shipment_batches (
    id TEXT PRIMARY KEY,
    receiver_name TEXT,
    origin TEXT,
    destination TEXT,
    status TEXT,
    confidence NUMERIC DEFAULT 0.0,
    declared_weight NUMERIC DEFAULT 0,
    expected_weight NUMERIC DEFAULT 0,
    errors TEXT[] DEFAULT '{}'::text[], -- 💡 Crucial: Matches your React workspace string[] array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create the batch_documents structural manifest extraction table
CREATE TABLE batch_documents (
    id BIGSERIAL PRIMARY KEY,
    batch_id TEXT REFERENCES shipment_batches(id) ON DELETE CASCADE,
    file_name TEXT,
    document_type TEXT,
    hs_code TEXT,
    routing_point TEXT,
    gross_weight TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create the operational tracking log timeline tables
CREATE TABLE ledger_logs (
    id BIGSERIAL PRIMARY KEY,
    batch_id TEXT REFERENCES shipment_batches(id) ON DELETE CASCADE,
    status TEXT,
    label TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);