// ========================================================================
// MASTER REGULATORY REFERENCE DICTIONARY (GROUND TRUTH)
// ========================================================================
export const COMPLIANCE_DICTIONARY = {
  hsCodes: {
    "9503.00.30": {
      description: "Radio Controlled Hobbies / Model Toys Assembly",
      riskLevel: "LOW",
      requiresPermit: false
    },
    "8525.89.00": {
      description: "Commercial Autonomous Transmission Drones / Quadcopters",
      riskLevel: "HIGH",
      requiresPermit: true
    },
    "8541.41.00": {
      description: "Solid State Diode Lasers / Optoelectronics",
      riskLevel: "LOW",
      requiresPermit: false
    },
    "8543.70.90": {
      description: "Optical Amplifier Modules / Signal Processors",
      riskLevel: "LOW",
      requiresPermit: false
    },
    "9306.90.00": {
      description: "Military Logistics Components / Ammunition & Munitions",
      riskLevel: "HIGH",
      requiresPermit: true
    }
  },
  portNodes: {
    // --- East & Southeast Asia ---
    "CNTXG": { city: "Tianjin Port Container Terminal", country: "China" },
    "CNSHA": { city: "Port of Shanghai Hub Node", country: "China" },
    "CNSZX": { city: "Shenzhen Port Logistics Terminal", country: "China" },
    "HKHKG": { city: "Port of Hong Kong Kwai Tsing Node", country: "Hong Kong" },
    "SGSIN": { city: "Port of Singapore Pasir Panjang Terminal", country: "Singapore" },
    "TWKEL": { city: "Keelung Port Terminal Node", country: "Taiwan" },
    "TWKHH": { city: "Kaohsiung Marine Terminal Node", country: "Taiwan" },
    "KRINC": { city: "Incheon Sea Port Node", country: "South Korea" },
    "KRPUS": { city: "Busan Port Hub Terminal", country: "South Korea" },
    "JPTYO": { city: "Port of Tokyo Oi Container Terminal", country: "Japan" },

    // --- South Asia ---
    "INPRP": { city: "Paradip Sea Port Node", country: "India" },
    "INBOM": { city: "Nhava Sheva / Jawaharlal Nehru Port (Mumbai)", country: "India" },
    "INMAA": { city: "Port of Chennai Terminal Node", country: "India" },
    "LMCMB": { city: "Port of Colombo Jaya Terminal", country: "Sri Lanka" },

    // --- Europe & UK ---
    "DEHAM": { city: "Port of Hamburg Burchardkai", country: "Germany" },
    "NLRTM": { city: "Port of Rotterdam Maasvlakte Hub", country: "Netherlands" },
    "BEANT": { city: "Port of Antwerp-Bruges Gateway", country: "Belgium" },
    "GBFXT": { city: "Port of Felixstowe Marine Terminal", country: "United Kingdom" },

    // --- Middle East ---
    "AEJEA": { city: "Jebel Ali Port Terminal (Dubai)", country: "United Arab Emirates" },
    "SajED": { city: "Jeddah Islamic Port Node", country: "Saudi Arabia" },

    // --- North America & Americas ---
    "USLAX": { city: "Port of Los Angeles Pier 400", country: "United States" },
    "USLGB": { city: "Port of Long Beach Terminal", country: "United States" },
    "USNYC": { city: "Port of New York & New Jersey Terminal", country: "United States" },
    "CAVAN": { city: "Port of Vancouver Centerm Terminal", country: "Canada" },
    "MXZLO": { city: "Port of Manzanillo Colima Terminal", country: "Mexico" }
  }
} as const;

// Helper type utilities to guard lookup actions
export type KnownHsCode = keyof typeof COMPLIANCE_DICTIONARY.hsCodes;
export type KnownPortNode = keyof typeof COMPLIANCE_DICTIONARY.portNodes;

/**
 * Validates an extracted HS Code against the ground-truth dictionary
 */
export function getDictionaryHsCode(code: string | null | undefined) {
  if (!code) return null;
  const cleanCode = code.trim();

  // Type guard adjustment using a standard index lookup check
  if (cleanCode in COMPLIANCE_DICTIONARY.hsCodes) {
    return COMPLIANCE_DICTIONARY.hsCodes[cleanCode as KnownHsCode];
  }
  return null;
}

/**
 * Validates an extracted port node code against the ground-truth dictionary
 */
export function getDictionaryPortNode(node: string | null | undefined) {
  if (!node) return null;
  const cleanNode = node.trim().toUpperCase();

  // Type guard adjustment using a standard index lookup check
  if (cleanNode in COMPLIANCE_DICTIONARY.portNodes) {
    return COMPLIANCE_DICTIONARY.portNodes[cleanNode as KnownPortNode];
  }
  return null;
}


// ========================================================================
// LOGISTICS STANDARDIZATION & METRIC CONVERSION UTILITIES
// ========================================================================

/**
 * Supported International Weight Units for Metric Convergence
 */
export const WEIGHT_CONVERSION_FACTORS: Record<string, number> = {
  "KG": 1.0,
  "KGS": 1.0,
  "KILOGRAM": 1.0,
  "KILOGRAMS": 1.0,
  "MT": 1000.0, // Metric Tons
  "TON": 1000.0,
  "TONS": 1000.0,
  "LB": 0.45359237, // Pounds to KG
  "LBS": 0.45359237
};

/**
 * Standardizes messy weight strings into a uniform Kilogram float value
 * @example normalizeToKilograms("4.85 MT") -> 4850
 * @example normalizeToKilograms(4850.0) -> 4850
 */
export function normalizeToKilograms(rawWeight: string | number | null | undefined): number {
  if (rawWeight === null || rawWeight === undefined) return 0;

  if (typeof rawWeight === "number") return rawWeight;

  // Clean the string: extract numeric portions and unit text separately
  const cleanStr = rawWeight.trim().toUpperCase();
  const numericValue = parseFloat(cleanStr.replace(/[^0-9.]/g, ""));

  if (isNaN(numericValue)) return 0;

  // Find out if a specific unit was stated in the text string
  const matchedUnit = Object.keys(WEIGHT_CONVERSION_FACTORS).find(unit =>
    new RegExp(`\\b${unit}\\b`, "i").test(cleanStr)
  );

  if (matchedUnit) {
    return numericValue * WEIGHT_CONVERSION_FACTORS[matchedUnit];
  }

  // Default fallback if no unit was specified is assumed to be KG
  return numericValue;
}

/**
 * Standardizes currency representations into standard 3-letter ISO symbols
 * @example normalizeCurrency("€") -> "EUR"
 * @example normalizeCurrency("usd") -> "USD"
 */
export function normalizeCurrency(rawCurrency: string | null | undefined): string {
  if (!rawCurrency) return "USD"; // Global baseline fallback

  const cleanCurrency = rawCurrency.trim().toUpperCase();

  const currencyMap: Record<string, string> = {
    "$": "USD",
    "US": "USD",
    "USD": "USD",
    "€": "EUR",
    "EUR": "EUR",
    "EURO": "EUR",
    "₹": "INR",
    "INR": "INR",
    "RUPEE": "INR",
    "£": "GBP",
    "GBP": "GBP",
    "¥": "CNY",
    "CNY": "CNY",
    "RMB": "CNY"
  };

  return currencyMap[cleanCurrency] || cleanCurrency;
}