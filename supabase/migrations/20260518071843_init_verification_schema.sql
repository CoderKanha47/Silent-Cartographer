-- Create custom enum types for statuses and severities
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'verified', 'flagged', 'failed');
CREATE TYPE flag_severity AS ENUM ('low', 'medium', 'high');

-- 1. Create the documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    document_type TEXT,
    status document_status DEFAULT 'pending' NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create the verification_results table
CREATE TABLE IF NOT EXISTS public.verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    extracted_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    confidence_score NUMERIC(4, 2), -- e.g., 0.95
    compliance_passed BOOLEAN DEFAULT TRUE NOT NULL,
    ai_analysis_summary TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create the verification_flags table
CREATE TABLE IF NOT EXISTS public.verification_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity flag_severity DEFAULT 'medium' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS) for absolute safety
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_flags ENABLE ROW LEVEL SECURITY;

-- Create basic wide-open policies for local dev tracking (we can tighten these later)
CREATE POLICY "Allow anonymous read access" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read access" ON public.verification_results FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access" ON public.verification_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access" ON public.verification_flags FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access" ON public.verification_flags FOR INSERT WITH CHECK (true);