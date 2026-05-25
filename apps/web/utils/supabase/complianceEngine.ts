import { ManifestDocExtraction } from '@/components/SupplyChainDashboard';

/* ========================================================================
   1. REGULATORY REFERENCE LEDGER (GROUND TRUTH)
   ======================================================================== */
export const COMPLIANCE_DICTIONARY = {
  hsCodes: {
    "9503.00.30": { 
      description: "Radio Controlled Hobbies / Model Toys Assembly (Helicopters, Cars)", 
      riskLevel: "LOW",
      requiresPermit: false 
    },
    "8525.89.00": { 
      description: "Commercial Transmission Drones / Autonomous Quadcopters", 
      riskLevel: "HIGH",
      requiresPermit: true 
    }
  },
  portNodes: {
    "TWKEL": { city: "Keelung Port Terminal Node", country: "Taiwan" },
    "INPRP": { city: "Paradip Sea Port Node", country: "India" }
  }
};

/* ========================================================================
   2. AUTOMATED COMPLIANCE VERIFIER (STEP 2 OF THE PIPELINE)
   ======================================================================== */
export function runComplianceAnalysis(normalizedDocs: ManifestDocExtraction[]): string[] {
  const analysisErrors: string[] = [];

  const invoice = normalizedDocs.find(d => 
    d.documentType.includes('invoice') || d.fileName.toLowerCase().includes('invoice')
  );
  
  const entryBill = normalizedDocs.find(d => 
    d.documentType.includes('entry') || d.fileName.toLowerCase().includes('entry')
  );

  // Cross-verify structural parameters against our ground-truth dictionary
  normalizedDocs.forEach(doc => {
    const code = doc.extractedData?.hsCode;
    const node = doc.extractedData?.routingPoint;

    if (code) {
      const match = COMPLIANCE_DICTIONARY.hsCodes[code as keyof typeof COMPLIANCE_DICTIONARY.hsCodes];
      if (!match) {
        analysisErrors.push(`Tariff Mismatch: Extracted HS Code [${code}] found in ${doc.fileName} is missing from the master regulatory dictionary.`);
      } else if (match.riskLevel === "HIGH") {
        analysisErrors.push(`Security Flag: High-risk cargo code detected [${code}] (${match.description}). Verification of special customs authorization is required.`);
      }
    }

    if (node) {
      const validNode = COMPLIANCE_DICTIONARY.portNodes[node as keyof typeof COMPLIANCE_DICTIONARY.portNodes];
      if (!validNode) {
        analysisErrors.push(`Routing Alert: Unregistered or rogue port node identifier [${node}] extracted from asset paperwork.`);
      }
    }
  });

  // Execute cross-document consensus metrics
  if (invoice && entryBill) {
    const importWeight = entryBill.extractedData?.grossWeight ?? 0;
    const exportWeight = invoice.extractedData?.grossWeight ?? 0;
    
    if (Math.abs(importWeight - exportWeight) > 1) {
      analysisErrors.push(`Telemetry Conflict: Weight mismatch variance detected. Dispatch Output (${exportWeight} KG) vs Inbound Target Scala (${importWeight} KG).`);
    }
  }

  return analysisErrors;
}