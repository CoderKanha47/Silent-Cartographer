import { createClient } from '@supabase/supabase-js';

const target = process.env.NEXT_PUBLIC_DATA_TARGET || 'local';

const localUrl = 'http://127.0.0.1:54321';
const localKey = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY || '';

const cloudUrl = process.env.NEXT_PUBLIC_SUPABASE_CLOUD_URL || '';
const cloudKey = process.env.NEXT_PUBLIC_SUPABASE_CLOUD_ANON_KEY || '';

// Instantiate dedicated single-purpose database clients
export const localClient = createClient(localUrl, localKey);
export const cloudClient = createClient(cloudUrl, cloudKey);

// The Reader Port adapts instantly based on your .env toggle
export const supabaseReader = target === 'cloud' ? cloudClient : localClient;

export const supabaseWriteDual = {
  /**
   * TRUE MUX PIPELINE: Attempts to commit to the selected target database engine.
   * If the target engine is unavailable or broken, it returns false instead of crashing,
   * triggering an immediate fallback routing operation.
   */
  insertBatchPipeline: async (batchPayload: any, documentsPayload: any[], logPayload: any): Promise<boolean> => {
    const activeClient = target === 'cloud' ? cloudClient : localClient;

    try {
      // 1. Target the Master Shipment Batch Row
      const { error: batchErr } = await activeClient
        .from('shipment_batches')
        .insert([batchPayload]);
      if (batchErr) throw batchErr;

      // 2. Target the Extracted Associated Documents Manifest
      if (documentsPayload.length > 0) {
        // Map foreign key constraint references to match database schema layouts
        const mappedDocs = documentsPayload.map(doc => ({
          batch_id: batchPayload.id,
          file_name: doc.file_name,
          document_type: doc.document_type,
          hs_code: doc.hs_code,
          routing_point: doc.routing_point,
          gross_weight: doc.gross_weight
        }));

        const { error: docsErr } = await activeClient
          .from('batch_documents')
          .insert(mappedDocs);
        if (docsErr) throw docsErr;
      }

      // 3. Target the Logging Ledger Log Entry Timeline
      const mappedLog = {
        batch_id: batchPayload.id,
        status: logPayload.status,
        label: logPayload.label,
        description: logPayload.description
      };

      const { error: logErr } = await activeClient
        .from('ledger_logs')
        .insert([mappedLog]);
      if (logErr) throw logErr;

      return true; // Primary write pipeline completed cleanly!
    } catch (networkError) {
      console.warn(`🚨 MUX Router intercepted failure on target [${target.toUpperCase()}]:`, networkError);
      return false; // Returns false to flip the switch to Local Storage mode
    }
  }
};