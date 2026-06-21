CREATE TABLE IF NOT EXISTS public.shipment_batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pending'::text,
    confidence_score NUMERIC(3,2) DEFAULT 0.00,
    manifest_id TEXT,
    audit_logs JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    document_type TEXT,
    manifest_id TEXT,
    status TEXT DEFAULT 'pending'::text,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.verification_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    document_id TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    confidence_score NUMERIC(3,2) DEFAULT 0.00,
    compliance_passed BOOLEAN DEFAULT false,
    ai_analysis_summary TEXT
);

ALTER TABLE public.shipment_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_results DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';