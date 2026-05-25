import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ollamaUrl = 'http://host.docker.internal:11434';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("CRITICAL: Missing core environment initialization tokens.");
      return NextResponse.json({ error: 'Server configuration mismatch error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No shipping paperwork provided.' }, { status: 400 });
    }

    const bucketName = 'supply-chain-docs';
    const extractedBatchData: any[] = [];

    // --- STEP 1: SCAN AND EXTRACT EACH DOCUMENT ---
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const rawTextContent = buffer.toString('utf-8');
      const cleanFileName = `${Date.now()}-${file.name}`;

      // Upload original file to Supabase Storage
      const storageResponse = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${cleanFileName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'x-upsert': 'true'
        },
        body: buffer
      });

      if (!storageResponse.ok) {
        console.error(`Storage Upload Refused for asset: ${file.name}`);
        continue;
      }

      // System Prompt containing strict structural mapping targets
      const extractionPrompt = `
You are a precise supply-chain validation system. You must analyze the provided manifest text and respond EXCLUSIVELY with a valid JSON object.
Do not output any introductory or conversational text. 
Do not output any Chinese characters or non-English variables under any circumstances.

Your JSON response must match this schema structure perfectly:
{
  "document_type": "commercial_invoice" | "entry_bill" | "air_waybill" | "customs_declaration",
  "gross_weight_kg": 0.0,
  "total_value_usd": 0.0,
  "invoice_number": "STRING_ID"
}
`;

      try {
        const aiResponse = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "qwen2.5:3b",
            prompt: `Document Text:\n${rawTextContent}`,
            system: extractionPrompt,
            stream: false,
            options: {
              temperature: 0.0,
              num_ctx: 4096,
            }
          })
        });

        if (aiResponse.ok) {
          const rawJsonData = await aiResponse.json();
          let rawText = rawJsonData.response || "";

          // 🌟 CORE FIX 1: Strip out DeepSeek Reasoning Think Blocks cleanly
          rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

          // Clean markdown wrappers
          const cleanJson = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
          const parsedData = JSON.parse(cleanJson);

          extractedBatchData.push({
            fileName: file.name,
            storagePath: `${bucketName}/${cleanFileName}`,
            parsed: parsedData
          });
        }
      } catch (err) {
        console.error(`Ollama extraction error on ${file.name}:`, err);
      }
    }

    // --- STEP 2: MULTI-DOCUMENT CROSS-EXAMINATION MATRIX ---
    const systemFlags: string[] = [];
    let weightMatch = true;
    let valueMatch = true;
    let identityMatch = true;

    // 🌟 CORE FIX 2: Flexible Lookup matching normalized types (commercial_invoice or entry_bill)
    const docInvoice = extractedBatchData.find(d => d.parsed.document_type === 'commercial_invoice' || d.parsed.document_type === 'invoice')?.parsed;
    const docLogistics = extractedBatchData.find(d => d.parsed.document_type === 'entry_bill' || d.parsed.document_type === 'air_waybill' || d.parsed.document_type === 'customs_declaration')?.parsed;

    // A. Cross-Check Weights using normalized flexible schema names
    const w1 = docInvoice?.gross_weight_kg || docInvoice?.total_weight_kg;
    const w2 = docLogistics?.gross_weight_kg || docLogistics?.total_weight_kg;
    if (w1 !== undefined && w2 !== undefined) {
      if (Math.abs(w1 - w2) > 2.0) { 
        weightMatch = false;
        systemFlags.push(`CRITICAL: Weight Mismatch! Loader specifies ${w1}kg, but Landing scale logs ${w2}kg.`);
      }
    }

    // B. Cross-Check Financial Valuations
    const v1 = docInvoice?.total_value_usd || docInvoice?.fob_value;
    const v2 = docLogistics?.total_value_usd || docLogistics?.fob_value;
    if (v1 !== undefined && v2 !== undefined) {
      if (Math.abs(v1 - v2) > 0.01) { 
        valueMatch = false;
        systemFlags.push(`CRITICAL: Valuation Conflict! Declared invoice values diverge: $${v1} vs $${v2}.`);
      }
    }

    // C. Cross-Check Tracking Reference Numbers
    const id1 = docInvoice?.invoice_number || docInvoice?.manifest_id;
    const id2 = docLogistics?.invoice_number || docLogistics?.manifest_id;
    if (id1 && id2) {
      if (id1 !== id2) {
        identityMatch = false;
        systemFlags.push(`CRITICAL: Tracking Discrepancy! Invoice Reference tracking alignment failure: (${id1}) vs (${id2}).`);
      }
    }

    // --- STEP 3: SCORE & COMMIT VERDICT ---
    const totalChecks = (w1 && w2 ? 1 : 0) + (v1 && v2 ? 1 : 0) + (id1 && id2 ? 1 : 0);
    const passedChecks = (weightMatch && w1 && w2 ? 1 : 0) + (valueMatch && v1 && v2 ? 1 : 0) + (identityMatch && id1 && id2 ? 1 : 0);

    const calculatedConfidence = totalChecks > 0 ? Number((passedChecks / totalChecks).toFixed(2)) : 0.50;
    const ultimateStatus = systemFlags.length === 0 && totalChecks > 0 ? 'verified' : 'flagged';

    const databaseCommits = [];
    for (const item of extractedBatchData) {
      // 🌟 CORE FIX 3: Fallback data population safely mapped if table queries strip selectors
      const fallbackManifestId = item.parsed.invoice_number || item.parsed.manifest_id || id1 || 'UNKNOWN_BATCH';

      const { data: docRow, error: insertError } = await supabaseAdmin
        .from('documents')
        .insert([
          {
            file_name: item.fileName,
            file_path: item.storagePath,
            document_type: item.parsed.document_type,
            manifest_id: fallbackManifestId,
            status: ultimateStatus,
            metadata: {
              extracted_parameters: item.parsed,
              confidence_rating: calculatedConfidence,
              audit_logs: systemFlags
            }
          }
        ]).select().single();

      if (insertError) {
        console.error("Supabase Database Insert Exception captured:", insertError.message);
      }

      // 🌟 CORE FIX 4: Continue processing verification row logging even if single select row return hits limitations
      const finalDocId = docRow?.id || `mismatch-pseudo-${Date.now()}`;

      await supabaseAdmin.from('verification_results').insert([{
        document_id: finalDocId,
        extracted_data: item.parsed,
        confidence_score: calculatedConfidence,
        compliance_passed: ultimateStatus === 'verified',
        ai_analysis_summary: systemFlags.join(' | ') || "All checked paperwork segments are completely identical and in order."
      }]);

      if (docRow) databaseCommits.push(docRow);
    }

    return NextResponse.json({
      success: true,
      status: ultimateStatus,
      confidence: calculatedConfidence,
      errors: systemFlags,
      batch: databaseCommits
    });

  } catch (globalError: any) {
    console.error("Global audit breakdown exception captured:", globalError);
    return NextResponse.json({ error: 'Internal system audit failure.', detail: globalError.message }, { status: 500 });
  }
}