/**
 * Utilities for formatting and parsing Indian currency amounts in Crores, Lakhs, Thousands, and INR.
 * Handles micro and small tender thresholds (e.g. Rs. 30,000 / 0.30 Lakhs = 0.003 Cr) without rounding errors.
 */

export function formatIndianCurrencyCr(
  crVal: number | undefined | null,
  options?: { compact?: boolean; includeInr?: boolean }
): string {
  const val = Number(crVal) || 0;
  if (val <= 0) return "Rs. 0.00 Cr";

  // Large values: >= 1.0 Crore
  if (val >= 1.0) {
    if (options?.compact) {
      return `₹ ${val.toFixed(2)} Cr`;
    }
    return `Rs. ${val.toFixed(2)} Cr`;
  }

  // Medium values: >= 0.01 Cr (i.e. >= 1.0 Lakh)
  if (val >= 0.01) {
    const lakhs = val * 100;
    if (options?.compact) {
      return `₹ ${lakhs.toFixed(2)} Lakhs`;
    }
    return `Rs. ${lakhs.toFixed(2)} Lakhs (Rs. ${val.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")} Cr)`;
  }

  // Small & Micro values: < 0.01 Cr (e.g. Rs. 30,000 = 0.30 Lakhs = 0.003 Cr)
  const lakhs = val * 100;
  const inr = Math.round(val * 10000000);
  const formattedInr = inr.toLocaleString("en-IN");

  if (options?.compact) {
    return `₹ ${formattedInr} (${lakhs.toFixed(2)} L)`;
  }

  return `Rs. ${lakhs.toFixed(2)} Lakhs / ₹ ${formattedInr} (${val.toFixed(4)} Cr)`;
}

/**
 * Parses any currency string or number expression into Crores without precision loss.
 * Supports:
 * - "Rs. 30,000" / "30000" / "30,000/-" -> 0.003 Cr
 * - "Rs. 0.30 Lakhs" / "0.30 lacs" -> 0.003 Cr
 * - "Rs. 30 Thousand" / "30k" -> 0.003 Cr
 * - "Rs. 3 Crore" / "3 Cr" -> 3.0 Cr
 * - "30% of Rs. 10 Lakhs" -> 0.03 Cr
 */
export function parseCurrencyAmountToCrores(rawStr: string): number | null {
  if (!rawStr || typeof rawStr !== "string") return null;
  const clean = rawStr.trim();

  // 1. Check for percentage of an estimated value: e.g. "30% of Rs. 10,00,000" or "30% of 10 Lakhs"
  const percentMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:of)?\s*(?:(?:estimated\s+cost|tender\s+value|value|estimate|cost)\s*(?:of)?\s*)?(?:(?:rs\.?|inr|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|thousands?|k)?/i);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    const baseVal = parseFloat(percentMatch[2].replace(/,/g, ""));
    const baseUnit = (percentMatch[3] || "").toLowerCase();
    let baseInCr = baseVal;
    if (baseUnit.startsWith("cr")) {
      baseInCr = baseVal;
    } else if (baseUnit.startsWith("lakh") || baseUnit.startsWith("lac")) {
      baseInCr = baseVal / 100;
    } else if (baseUnit.startsWith("thousand") || baseUnit === "k") {
      baseInCr = (baseVal * 1000) / 10000000;
    } else if (baseVal >= 10000000) {
      baseInCr = baseVal / 10000000;
    } else if (baseVal >= 100000) {
      baseInCr = baseVal / 10000000;
    } else if (baseVal >= 1000) {
      baseInCr = baseVal / 10000000;
    }
    const resultCr = (pct / 100) * baseInCr;
    return parseFloat(resultCr.toFixed(6));
  }

  // 2. Direct monetary expression with unit
  const match = clean.match(/(?:(?:rs\.?|inr|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|thousands?|k|\/\-)?/i);
  if (!match || !match[1]) return null;

  const rawNum = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(rawNum) || rawNum <= 0) return null;

  const unit = (match[2] || "").toLowerCase();

  if (unit.startsWith("cr")) {
    return parseFloat(rawNum.toFixed(6));
  }
  if (unit.startsWith("lakh") || unit.startsWith("lac")) {
    return parseFloat((rawNum / 100).toFixed(6));
  }
  if (unit.startsWith("thousand") || unit === "k") {
    // 30 thousand = 30 * 1,000 = 30,000 INR = 0.003 Cr
    return parseFloat(((rawNum * 1000) / 10000000).toFixed(6));
  }

  // Plain numbers without explicit unit:
  if (unit === "/-" || /(?:rs\.?|inr|₹)/i.test(clean)) {
    if (rawNum >= 10000000) {
      // 1 Cr or more in INR
      return parseFloat((rawNum / 10000000).toFixed(6));
    }
    if (rawNum >= 100000) {
      // Lakhs in INR (e.g. 15,00,000 = 0.15 Cr)
      return parseFloat((rawNum / 10000000).toFixed(6));
    }
    if (rawNum >= 1000) {
      // Thousands in INR (e.g. 30,000 = 0.003 Cr)
      return parseFloat((rawNum / 10000000).toFixed(6));
    }
  }

  // If magnitude is standard:
  if (rawNum >= 10000000) return parseFloat((rawNum / 10000000).toFixed(6));
  if (rawNum >= 100000) return parseFloat((rawNum / 10000000).toFixed(6));
  if (rawNum >= 1000) return parseFloat((rawNum / 10000000).toFixed(6));
  if (rawNum >= 250) return parseFloat((rawNum / 100).toFixed(6));

  return parseFloat(rawNum.toFixed(6));
}
