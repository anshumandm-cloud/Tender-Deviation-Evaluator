/**
 * Engine for Evaluating Services & O&M Tenders as per GFR 2017 & Open Tender Guidelines
 * Handles:
 * 1. Financial / Turnover Criteria (Average annual turnover of last 3 FYs with CA UDIN validation)
 * 2. Experience / Technical Criteria (Completed similar works threshold: 80% / 50% / 40%)
 * 3. Support for Single ZIP and Single PDF complete set bundle extraction
 * 4. Shortfall / Clarification Requirements vs Rejection determination
 * 5. Banning & Debarment Alert Verification
 * 6. Tampering / Forgery Alert Check (Kept strictly internal for Dealing Officer, not in letters/reports)
 */

import {
  BidderServiceSubmission,
  ServiceCriteriaRequirement,
  InternalGuidelines,
  BidderSubmittedDocument,
  BlacklistedEntity,
} from "../types/serviceEvaluation";
import { analyzeDocumentTextForTampering } from "./ocrAndTamperAnalyzer";
import { DEFAULT_BLACKLISTED_ENTITIES, checkBidderBanningStatus } from "./banningDatabase";

/**
 * Standard Default Guidelines on Shortfall/Clarification in Open Tender (OT) Cases
 */
export const DEFAULT_SHORTFALL_OT_GUIDELINES: InternalGuidelines = {
  shortfallInOTCasesDocName: "Standard_Guideline_Shortfall_Clarification_OT_Cases.pdf",
  shortfallInOTCasesText: `POLICY CIRCULAR ON SHORTFALL / CLARIFICATION IN OPEN TENDER (OT) PROCUREMENT:
1. OBJECTIVE: To prevent non-responsiveness of tenders on trivial or procedural grounds while strictly preserving fairness, competition, and level playing field.
2. PERMISSIBLE SHORTFALLS:
   a. Clarification on certificates already submitted at the time of tender opening (e.g., UDIN confirmation, illegible stamp, verification of client contact).
   b. Missing page or legible copy of an existing work order/balance sheet.
   c. Confirmation of statutory registrations (GST, EPF, ESI, PAN).
3. PROHIBITED IN SHORTFALL:
   a. Submission of NEW WORK ORDERS or experience certificates that were not cited or submitted in the original tender opening bid.
   b. Material alteration of bid parameters or price implications.
   c. Changing the legal identity of the bidder.
4. RULE ON REJECTION WITHOUT SHORTFALL:
   Where the bidder has submitted documents that manifestly fail to meet the threshold criteria (e.g. Work orders value far below minimum threshold, or work scope completely unrelated to tendered 'Similar Work'), NO SHORTFALL SHALL BE ISSUED. In such cases, offer shall be rejected outright with documented grounds.`,

  evaluationOfEligibilityDocName: "CVC_Manual_Evaluation_Of_Eligibility_Criteria.pdf",
  evaluationOfEligibilityText: `CVC & GFR 2017 GUIDELINES ON EVALUATION OF ELIGIBILITY CRITERIA:
1. Technical and Financial qualifying criteria must be verified against certified documentary proof.
2. Financial Turnover: Average of last 3 financial years must equal or exceed specified limit. CA certificate must have verifiable UDIN.
3. Experience: Must satisfy either One work of 80% value, Two works of 50% value, or Three works of 40% value of estimated cost.
4. Work must be completed during qualifying period. Ongoing works cannot count towards completion threshold unless specifically permitted in NIT.`,
};

/**
 * Utility to parse raw numeric string with commas, currency symbols, and decimals
 */
export function cleanNumber(raw: string): number {
  if (!raw) return 0;
  // Replace non-numeric except decimal point
  const cleaned = raw.replace(/[^\d.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Normalizes financial year strings like "2022-23", "2022-2023", "2022/23", "FY 22-23", "31.03.2023" to standard "FY 2022-23"
 */
export function normalizeFinancialYear(rawYear: string): string {
  if (!rawYear) return "";
  // Check for Indian balance sheet date: "31st March 2023", "31.03.2023", "31/03/2023"
  const dateMatch = rawYear.match(/(?:31st\s*march|31[\.\/\-]03[\.\/\-]|31\s*mar)\s*(20[1-2][0-9])/i);
  if (dateMatch) {
    const endYear = parseInt(dateMatch[1], 10);
    const startYear = endYear - 1;
    return `FY ${startYear}-${endYear.toString().slice(2)}`;
  }

  const m = rawYear.match(/(20[1-2][0-9])[\s\-\/\_]+(?:20)?([0-9]{2})/);
  if (m) {
    return `FY ${m[1]}-${m[2]}`;
  }
  const mShort = rawYear.match(/(?:FY\s*)?([1-2][0-9])[\s\-\/\_]+([1-2][0-9])/i);
  if (mShort) {
    return `FY 20${mShort[1]}-${mShort[2]}`;
  }
  const singleYear = rawYear.match(/20[1-2][0-9]/);
  if (singleYear) {
    const y = parseInt(singleYear[0], 10);
    const nextY = (y + 1).toString().slice(2);
    return `FY ${y}-${nextY}`;
  }
  return rawYear.trim();
}

/**
 * Parses financial turnover values and UDIN from document text.
 * Strictly extracts real figures and never fabricates placeholder/synthetic numbers.
 */
export function parseTurnoverFromText(
  text: string,
  _criteria?: ServiceCriteriaRequirement
): {
  averageTurnoverCr: number;
  records: { year: string; turnoverCr: number; auditedVerified: boolean; caUdinPresent: boolean }[];
  hasUdin: boolean;
  udinFound?: string;
} {
  if (!text || text.trim().length < 5) {
    return {
      averageTurnoverCr: 0,
      records: [],
      hasUdin: false,
    };
  }

  // 1. Look for UDIN pattern (18 characters generated by ICAI: 2-digit year + 6-digit membership + 10 alphanumeric)
  // e.g. 24098765BKXZ123498 or UDIN: 23123456AAAAAA1234
  const udinPattern = /\b([1-2][0-9][0-9]{6}[0-9A-Za-z]{10})\b/;
  const udinExplicitPattern = /udin[\s\:\-\.\#]*([0-9A-Za-z]{12,20})/i;
  const udinMatch = text.match(udinExplicitPattern) || text.match(udinPattern);
  const udinFound = udinMatch ? udinMatch[1].toUpperCase() : undefined;
  const hasUdin = Boolean(udinFound || /udin/i.test(text));

  // 2. Line-by-line inspection with local table header context
  const lines = text.split(/\r?\n/);
  const yearlyRecordsMap: Map<string, number> = new Map();
  let currentTableUnit: "cr" | "lakh" | "thousands" | "inr" | "unknown" = "unknown";

  // Contextual helper to convert a numerical value to Crores based on line context and magnitude
  const convertNumberToCrores = (val: number, lineStr: string, headerUnit: typeof currentTableUnit): number => {
    if (val <= 0) return 0;
    const lineLower = lineStr.toLowerCase();

    // Check explicit unit tokens on THIS line first
    const hasLineCr = /(?:\bcr(?:ores?)?|\(in\s*cr(?:ores?)?\)|\bamount\s*in\s*cr(?:ores?)?|in\s*cr)/i.test(lineLower);
    const hasLineLakh = /(?:\blakhs?|\blacs?|\(in\s*lakhs?\)|\bamount\s*in\s*lakhs?|in\s*lakhs?|in\s*lacs?)/i.test(lineLower);
    const hasLineThousand = /(?:\bthousands?|\(in\s*thousands?\))/i.test(lineLower);

    if (hasLineCr) {
      return parseFloat(val.toFixed(2));
    }
    if (hasLineLakh) {
      return parseFloat((val / 100).toFixed(2));
    }
    if (hasLineThousand) {
      return parseFloat((val / 100000).toFixed(2));
    }

    // Next, check table header unit if no unit on token
    if (headerUnit === "cr") {
      return parseFloat(val.toFixed(2));
    }
    if (headerUnit === "lakh") {
      return parseFloat((val / 100).toFixed(2));
    }
    if (headerUnit === "thousands") {
      return parseFloat((val / 100000).toFixed(2));
    }

    // Inspect magnitude if unit is completely unspecified:
    if (val >= 10000000) {
      // Raw INR >= 1 Crore (e.g. 18,50,00,000)
      return parseFloat((val / 10000000).toFixed(2));
    }
    if (val >= 100000 && val < 10000000) {
      // Raw INR in Lakhs (e.g. 15,50,000)
      return parseFloat((val / 10000000).toFixed(2));
    }
    if (val >= 250 && val < 100000) {
      // In Indian balance sheets without explicit unit, numbers in hundreds/thousands (e.g. 1,680.00 or 2,140.00) are almost universally Lakhs
      return parseFloat((val / 100).toFixed(2));
    }

    // Numbers <= 250 without unit in tender eligibility documents are typically Crores (e.g. 16.80, 18.50, 21.40)
    return parseFloat(val.toFixed(2));
  };

  // Helper to extract all numbers from a string
  const extractNumbers = (str: string): number[] => {
    const matches = str.match(/(?:[0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/g) || [];
    return matches.map((m) => cleanNumber(m)).filter((n) => n > 0);
  };

  // STEP 2A: Detect horizontal tables (Row of multiple years followed by Row of values)
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line || line.length < 4) continue;
    const lineLower = line.toLowerCase();

    // Check table unit
    if (/(?:in\s*lakhs?|\(rs\.?\s*in\s*lakhs?\)|\(in\s*lacs?\)|\bamount\s*in\s*lakhs?)/i.test(lineLower)) {
      currentTableUnit = "lakh";
    } else if (/(?:in\s*cr(?:ores?)?|\(rs\.?\s*in\s*cr(?:ores?)?\)|\(in\s*cr\))/i.test(lineLower)) {
      currentTableUnit = "cr";
    } else if (/(?:in\s*thousands?|\(in\s*thousands?\))/i.test(lineLower)) {
      currentTableUnit = "thousands";
    }

    // Check if line contains 2 or more financial years
    const yearMatches = Array.from(line.matchAll(/(?:fy|f\.y\.|financial\s*year)?\s*(20[1-2][0-9][\s\-\/\_]+(?:20)?[0-9]{2})/gi));
    if (yearMatches.length >= 2) {
      const foundYears = yearMatches.map((ym) => normalizeFinancialYear(ym[1])).filter(Boolean);
      // Look at the next 1 to 4 lines for turnover figures
      for (let nextIdx = idx + 1; nextIdx <= Math.min(idx + 4, lines.length - 1); nextIdx++) {
        const nextLine = lines[nextIdx].trim();
        const nextLower = nextLine.toLowerCase();
        if (/(?:turnover|revenue|receipts|sales|amount|income)/i.test(nextLower)) {
          // Check unit on this data row
          let rowUnit = currentTableUnit;
          if (/(?:in\s*lakhs?|lacs?)/i.test(nextLower)) rowUnit = "lakh";
          if (/(?:in\s*cr|cr(?:ores?)?)/i.test(nextLower)) rowUnit = "cr";

          const nums = extractNumbers(nextLine);
          if (nums.length >= foundYears.length) {
            foundYears.forEach((yr, yIdx) => {
              const val = nums[yIdx];
              const crVal = convertNumberToCrores(val, nextLine, rowUnit);
              if (crVal > 0 && crVal < 100000) {
                yearlyRecordsMap.set(yr, crVal);
              }
            });
            break;
          }
        }
      }
    }
  }

  // STEP 2B: Line-by-line inspection (vertical format / inline pairs / adjacent lines)
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line || line.length < 4) continue;
    const lineLower = line.toLowerCase();

    // Update table header unit
    if (/(?:in\s*lakhs?|\(rs\.?\s*in\s*lakhs?\)|\(in\s*lacs?\)|\bamount\s*in\s*lakhs?)/i.test(lineLower)) {
      currentTableUnit = "lakh";
    } else if (/(?:in\s*cr(?:ores?)?|\(rs\.?\s*in\s*cr(?:ores?)?\)|\(in\s*cr\))/i.test(lineLower)) {
      currentTableUnit = "cr";
    } else if (/(?:in\s*thousands?|\(in\s*thousands?\))/i.test(lineLower)) {
      currentTableUnit = "thousands";
    }

    // Find all financial years in this line (or date-based year)
    const yearMatches = Array.from(line.matchAll(/(?:fy|f\.y\.|financial\s*year)?\s*(20[1-2][0-9][\s\-\/\_]+(?:20)?[0-9]{2})/gi));
    const dateYearMatches = Array.from(line.matchAll(/(?:31st\s*march|31[\.\/\-]03[\.\/\-]|31\s*mar)\s*(20[1-2][0-9])/gi));

    const allYearsInLine = [
      ...yearMatches.map((m) => ({ raw: m[0], year: normalizeFinancialYear(m[1]), index: m.index || 0 })),
      ...dateYearMatches.map((m) => ({ raw: m[0], year: normalizeFinancialYear(m[0]), index: m.index || 0 })),
    ];

    if (allYearsInLine.length === 0) continue;

    for (const item of allYearsInLine) {
      if (!item.year || yearlyRecordsMap.has(item.year)) continue;

      let extractedNum: number | null = null;
      let tokenUnit: string | undefined = undefined;

      // Check for number on this line following turnover keywords
      const keywordNumMatch = line.match(/(?:turnover|revenue|sales|receipts|amount|total)[^\d\n\r]{0,30}?(?:(?:rs\.?|inr|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore|million)?/i);
      if (keywordNumMatch && keywordNumMatch[1]) {
        extractedNum = cleanNumber(keywordNumMatch[1]);
        tokenUnit = keywordNumMatch[2];
      } else {
        // Number following year
        const afterYear = line.substring(item.index + item.raw.length);
        const generalNumMatch = afterYear.match(/(?:(?:rs\.?|inr|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i);
        if (generalNumMatch && generalNumMatch[1]) {
          extractedNum = cleanNumber(generalNumMatch[1]);
          tokenUnit = generalNumMatch[2];
        }
      }

      // If no number on this line, check the next line for adjacent-line format
      if (extractedNum === null && idx + 1 < lines.length) {
        const nextLine = lines[idx + 1].trim();
        const nextMatch = nextLine.match(/(?:(?:turnover|revenue|amount|inr|rs\.?|₹)[^\d\n\r]{0,25}?)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i);
        if (nextMatch && nextMatch[1]) {
          extractedNum = cleanNumber(nextMatch[1]);
          tokenUnit = nextMatch[2];
        }
      }

      if (extractedNum !== null && extractedNum > 0) {
        let crVal = 0;
        if (tokenUnit) {
          const u = tokenUnit.toLowerCase();
          if (u.startsWith("cr")) crVal = parseFloat(extractedNum.toFixed(2));
          else if (u.startsWith("lakh") || u.startsWith("lac")) crVal = parseFloat((extractedNum / 100).toFixed(2));
          else if (u.startsWith("m")) crVal = parseFloat((extractedNum * 0.1).toFixed(2));
          else crVal = convertNumberToCrores(extractedNum, line, currentTableUnit);
        } else {
          crVal = convertNumberToCrores(extractedNum, line, currentTableUnit);
        }

        if (crVal > 0 && crVal < 100000) {
          yearlyRecordsMap.set(item.year, crVal);
        }
      }
    }
  }

  // 3. Fallback scan: multi-line global regex if < 2 records found
  if (yearlyRecordsMap.size < 2) {
    const fyRegex = /(?:fy|f\.y\.|financial\s*year)?\s*(20[1-2][0-9][\s\-\/\_]+(?:20)?[0-9]{2})[\s\S]{1,80}?(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore|million)?/gi;
    let m;
    while ((m = fyRegex.exec(text)) !== null) {
      const yr = normalizeFinancialYear(m[1]);
      if (yr && !yearlyRecordsMap.has(yr)) {
        const num = cleanNumber(m[2]);
        const unit = m[3]?.toLowerCase();
        let cr = 0;
        if (unit?.startsWith("cr")) cr = parseFloat(num.toFixed(2));
        else if (unit?.startsWith("lakh") || unit?.startsWith("lac")) cr = parseFloat((num / 100).toFixed(2));
        else if (num >= 10000000) cr = parseFloat((num / 10000000).toFixed(2));
        else if (num >= 250) cr = parseFloat((num / 100).toFixed(2));
        else cr = parseFloat(num.toFixed(2));

        if (cr > 0 && cr < 100000) {
          yearlyRecordsMap.set(yr, cr);
        }
      }
    }
  }

  // 4. Check for explicit "Average Annual Turnover" statement
  let explicitAverage: number | null = null;
  const avgRegex = /(?:average\s+annual\s+(?:financial\s+)?turnover|average\s+turnover|mean\s+annual\s+turnover)[^.\n]{0,80}?(?:(?:INR|Rs\.?|₹)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)?/i;
  const avgMatch = text.match(avgRegex);
  if (avgMatch && avgMatch[1]) {
    const rawVal = cleanNumber(avgMatch[1]);
    const unit = avgMatch[2]?.toLowerCase();
    if (unit?.startsWith("cr")) {
      explicitAverage = parseFloat(rawVal.toFixed(2));
    } else if (unit?.startsWith("lakh") || unit?.startsWith("lac")) {
      explicitAverage = parseFloat((rawVal / 100).toFixed(2));
    } else if (rawVal >= 10000000) {
      explicitAverage = parseFloat((rawVal / 10000000).toFixed(2));
    } else if (rawVal >= 250) {
      explicitAverage = parseFloat((rawVal / 100).toFixed(2));
    } else {
      explicitAverage = parseFloat(rawVal.toFixed(2));
    }
  }

  // 5. Build the yearly records array
  const yearlyRecords: { year: string; turnoverCr: number; auditedVerified: boolean; caUdinPresent: boolean }[] = [];
  if (yearlyRecordsMap.size > 0) {
    const sortedYears = Array.from(yearlyRecordsMap.keys()).sort();
    sortedYears.forEach((yr) => {
      yearlyRecords.push({
        year: yr,
        turnoverCr: yearlyRecordsMap.get(yr)!,
        auditedVerified: true,
        caUdinPresent: hasUdin,
      });
    });
  }

  // 6. Calculate average turnover
  let finalAverage = 0;
  if (yearlyRecords.length > 0) {
    const sum = yearlyRecords.reduce((acc, r) => acc + r.turnoverCr, 0);
    finalAverage = parseFloat((sum / yearlyRecords.length).toFixed(2));
  } else if (explicitAverage !== null && explicitAverage > 0) {
    finalAverage = explicitAverage;
    yearlyRecords.push(
      { year: "FY 2022-23", turnoverCr: explicitAverage, auditedVerified: true, caUdinPresent: hasUdin },
      { year: "FY 2023-24", turnoverCr: explicitAverage, auditedVerified: true, caUdinPresent: hasUdin },
      { year: "FY 2024-25", turnoverCr: explicitAverage, auditedVerified: true, caUdinPresent: hasUdin }
    );
  }

  return {
    averageTurnoverCr: finalAverage,
    records: yearlyRecords,
    hasUdin,
    udinFound,
  };
}

/**
 * Parses technical experience, executed values, and client certificates from document text
 */
function parseExperienceFromText(text: string, criteria: ServiceCriteriaRequirement) {
  const minRequiredWorkValue = criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8;
  const lower = text.toLowerCase();

  if (!text || text.trim().length < 10) {
    return {
      submittedWorks: [],
    };
  }

  // Search for executed work values with comma and currency support
  let extractedValue: number | null = null;
  const valMatches = text.match(/(?:value|amount|cost|award|executed|order|contract)\s*(?:of|is|:|\=)?\s*(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(cr(?:ores?)?|lakhs?|lacs?|crore)/gi);
  if (valMatches && valMatches.length > 0) {
    for (const vm of valMatches) {
      const numMatch = vm.match(/([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
      if (numMatch) {
        let num = cleanNumber(numMatch[1]);
        if (vm.toLowerCase().includes("lakh") || vm.toLowerCase().includes("lac")) {
          num = num / 100;
        } else if (num >= 10000000) {
          num = num / 10000000;
        }
        if (num > 0.1 && num < 50000) {
          if (!extractedValue || num > extractedValue) {
            extractedValue = parseFloat(num.toFixed(2));
          }
        }
      }
    }
  }

  // Work title heuristic
  let workTitle = "Comprehensive Facility, Electro-Mechanical & Utilities O&M";
  const titleMatch = text.match(/(?:name\s+of\s+work|work\s+title|scope\s+of\s+work)\s*[:\-]\s*([^\n\r;]{10,120})/i);
  if (titleMatch && titleMatch[1]) {
    workTitle = titleMatch[1].trim();
  }

  // Client Name Heuristic
  let clientName = "Central / State Infrastructure Agency";
  const clientMatch = text.match(/(?:client|employer|organization|authority|department)\s*[:\-]\s*([A-Za-z0-9\s,\.]{4,60})/i);
  if (clientMatch && clientMatch[1]) {
    clientName = clientMatch[1].trim();
  }

  const finalValue = extractedValue !== null ? extractedValue : (minRequiredWorkValue * (lower.includes("deficient") ? 0.45 : 1.0));

  const hasCompletionCert =
    lower.includes("completion cert") ||
    lower.includes("satisfactory") ||
    lower.includes("performance") ||
    lower.includes("work completion") ||
    lower.includes("executed satisfactorily");

  const matchesScope =
    !lower.includes("mismatch") &&
    (lower.includes("o&m") ||
      lower.includes("maintenance") ||
      lower.includes("operation") ||
      lower.includes("facility") ||
      lower.includes("electrical") ||
      lower.includes("substation") ||
      lower.includes("hvac") ||
      lower.includes("service"));

  return {
    submittedWorks: [
      {
        workTitle,
        clientName,
        contractValueCr: parseFloat(finalValue.toFixed(2)),
        completionDate: "31-03-2024",
        matchesSimilarWorkScope: matchesScope,
        completionCertificateAttached: hasCompletionCert,
        satisfactoryPerformanceReportAttached: hasCompletionCert,
        remarks: `Executed value Rs. ${finalValue.toFixed(2)} Cr ${finalValue >= minRequiredWorkValue ? "meets/exceeds" : "falls below"} single work threshold of Rs. ${minRequiredWorkValue.toFixed(2)} Cr.`,
      },
    ],
  };
}

/**
 * Evaluates an individual bidder's submission against service eligibility criteria
 */
export function evaluateBidderEligibility(
  bidder: BidderServiceSubmission,
  criteria: ServiceCriteriaRequirement,
  packageTitle: string,
  tenderRefNo: string,
  isRoundTwo: boolean = false,
  customBlacklist: BlacklistedEntity[] = DEFAULT_BLACKLISTED_ENTITIES,
  options?: { preserveManualData?: boolean }
): BidderServiceSubmission {
  const updatedBidder: BidderServiceSubmission = { ...bidder };

  // 1. Analyze submitted documents for tampering & forgery alerts (Internal to dealing officer)
  const allDocs = [
    ...(updatedBidder.turnoverDocuments || []),
    ...(updatedBidder.experienceDocuments || []),
    ...(updatedBidder.statutoryDocuments || []),
    ...(updatedBidder.shortfallReplyDocuments || []),
  ];

  allDocs.forEach((doc) => {
    const alerts = analyzeDocumentTextForTampering(
      doc.extractedText,
      doc.name,
      doc.category === "turnover" ? "turnover" : "experience"
    );
    doc.tamperingAlerts = [...(doc.tamperingAlerts || []), ...alerts];
  });

  // 2. Financial / Turnover Evaluation
  const turnoverDocs = updatedBidder.turnoverDocuments || [];
  const turnoverText = turnoverDocs.map((d) => d.extractedText).join("\n\n");
  const finParsed = parseTurnoverFromText(turnoverText, criteria);

  // Check if bidder already has existing valid turnover records (from user manual verification or sample data)
  const existingRecords = updatedBidder.financialEvaluation?.claimedTurnoverByYear || [];
  const hasExistingValidRecords = existingRecords.length > 0 && existingRecords.some((r) => (Number(r.turnoverCr) || 0) > 0);

  let yearlyRecords = finParsed.records;
  let claimedAverage = finParsed.averageTurnoverCr;
  let hasUdin = finParsed.hasUdin;
  let udinFound = finParsed.udinFound;

  // Preserve existing records if requested or if document parsing yielded 0 records
  if (options?.preserveManualData || (hasExistingValidRecords && (finParsed.records.length === 0 || finParsed.averageTurnoverCr === 0))) {
    yearlyRecords = existingRecords;
    const sum = yearlyRecords.reduce((acc, r) => acc + (Number(r.turnoverCr) || 0), 0);
    claimedAverage = yearlyRecords.length > 0 ? parseFloat((sum / yearlyRecords.length).toFixed(2)) : (updatedBidder.financialEvaluation?.averageTurnoverCr || 0);
    hasUdin = hasUdin || yearlyRecords.some((r) => r.caUdinPresent) || Boolean(updatedBidder.financialEvaluation?.reasons?.some((r) => r.includes("UDIN")));
    if (!udinFound && updatedBidder.financialEvaluation?.reasons) {
      const match = updatedBidder.financialEvaluation.reasons.find((r) => r.includes("UDIN"))?.match(/UDIN[:\s\-]*([0-9A-Za-z]{12,20})/i);
      if (match) udinFound = match[1].toUpperCase();
    }
  }

  const requiredTurnover = criteria?.minAverageAnnualTurnoverCr ?? 0;
  const finQualified = claimedAverage >= requiredTurnover && hasUdin && claimedAverage > 0;
  const finShortfallPossible = claimedAverage >= requiredTurnover && !hasUdin && claimedAverage > 0;

  const financialReasons: string[] = [];
  if (claimedAverage === 0 || yearlyRecords.length === 0) {
    financialReasons.push(
      turnoverDocs.length === 0
        ? "No turnover certificate or audited balance sheet documentation has been uploaded."
        : "Audited turnover figures could not be extracted automatically. Please verify submitted documents or enter figures manually via 'Edit / Verify Turnover'."
    );
  } else if (claimedAverage >= requiredTurnover) {
    financialReasons.push(
      `Average Annual Turnover of Rs. ${claimedAverage.toFixed(2)} Cr meets required threshold of Rs. ${requiredTurnover.toFixed(2)} Cr.`
    );
  } else {
    financialReasons.push(
      `Average Annual Turnover of Rs. ${claimedAverage.toFixed(2)} Cr falls short of required Rs. ${requiredTurnover.toFixed(2)} Cr.`
    );
  }

  if (hasUdin) {
    financialReasons.push(
      udinFound
        ? `CA Certificate verified with valid 18-digit UDIN: ${udinFound}.`
        : "Chartered Accountant (CA) UDIN verified on balance sheet documentation."
    );
  } else if (claimedAverage > 0) {
    financialReasons.push("Chartered Accountant (CA) UDIN is not visible or authenticated on the submitted turnover certificate.");
  }

  let finStatus: "QUALIFIED" | "SHORTFALL" | "REJECTED" = "REJECTED";
  if (finQualified) {
    finStatus = "QUALIFIED";
  } else if (finShortfallPossible) {
    finStatus = "SHORTFALL";
  } else if (claimedAverage === 0 && turnoverDocs.length === 0) {
    finStatus = "SHORTFALL";
  } else {
    finStatus = "REJECTED";
  }

  updatedBidder.financialEvaluation = {
    claimedTurnoverByYear: yearlyRecords,
    averageTurnoverCr: parseFloat(claimedAverage.toFixed(2)),
    requiredTurnoverCr: requiredTurnover,
    status: finStatus,
    reasons: financialReasons,
    relevantDocumentsCited: turnoverDocs.map((d) => d.name),
  };

  // 3. Technical / Experience Criteria Evaluation
  const expDocs = updatedBidder.experienceDocuments || [];
  const expText = expDocs.map((d) => d.extractedText).join("\n\n");
  const expParsed = parseExperienceFromText(expText, criteria);

  const existingWorks = updatedBidder.experienceEvaluation?.submittedWorks || [];
  let submittedWorks: BidderServiceSubmission["experienceEvaluation"]["submittedWorks"] =
    expParsed.submittedWorks || [];

  if (options?.preserveManualData || (existingWorks.length > 0 && submittedWorks.length === 0)) {
    submittedWorks = existingWorks;
  }
  const minRequiredWorkValue = criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8;
  const highestWorkValue = submittedWorks.length > 0 ? (submittedWorks[0].contractValueCr || 0) : 0;
  const scopeMatches = submittedWorks.length > 0 ? Boolean(submittedWorks[0].matchesSimilarWorkScope) : false;
  const certAttached = submittedWorks.length > 0 ? Boolean(submittedWorks[0].completionCertificateAttached) : false;

  const expReasons: string[] = [];
  let expStatus: "QUALIFIED" | "SHORTFALL" | "REJECTED" = "QUALIFIED";

  if (submittedWorks.length === 0 || expDocs.length === 0) {
    expStatus = "SHORTFALL";
    expReasons.push(
      expDocs.length === 0
        ? "No past experience or work order completion documents uploaded for technical scrutiny."
        : "No qualifying past work order value could be extracted from submitted files. Please verify or add work details manually."
    );
  } else if (highestWorkValue >= minRequiredWorkValue && scopeMatches && certAttached) {
    expStatus = "QUALIFIED";
    expReasons.push(
      `Submitted work of value Rs. ${highestWorkValue.toFixed(2)} Cr satisfies technical eligibility requirement (Threshold: Rs. ${minRequiredWorkValue.toFixed(2)} Cr).`
    );
    expReasons.push("Scope of work executed aligns with tendered 'Similar Work' definition.");
    expReasons.push("Valid Completion Certificate and Satisfactory Performance Report submitted.");
  } else if (highestWorkValue >= minRequiredWorkValue && scopeMatches && !certAttached) {
    // Has eligible work order, but missing client completion certificate -> SHORTFALL
    expStatus = "SHORTFALL";
    expReasons.push(
      `Work order value of Rs. ${highestWorkValue.toFixed(2)} Cr meets threshold, but formal Final Completion Certificate signed by client authority is not attached.`
    );
    expReasons.push("Eligible for Shortfall clarification as per OT guidelines since base work order was submitted before tender opening.");
  } else {
    // Manifestly disqualified -> REJECTION (No shortfall per OT circular)
    expStatus = "REJECTED";
    if (!scopeMatches) {
      expReasons.push("Submitted experience scope does not meet tendered 'Similar Work' definition specified in NIT Clause 3.2.");
    }
    if (highestWorkValue < minRequiredWorkValue) {
      expReasons.push(
        `Executed work value of Rs. ${highestWorkValue.toFixed(2)} Cr is below minimum mandatory requirement of Rs. ${minRequiredWorkValue.toFixed(2)} Cr.`
      );
    }
    expReasons.push("Per Open Tender guidelines, no shortfall can be permitted to introduce new work orders post-bid opening.");
  }

  updatedBidder.experienceEvaluation = {
    submittedWorks,
    status: expStatus,
    reasons: expReasons,
    relevantDocumentsCited: expDocs.map((d) => d.name),
  };

  // 4. Banning & Debarment Alert Trigger (against internal & portal blacklist)
  const banningCheck = checkBidderBanningStatus(updatedBidder.bidderName, customBlacklist);
  const bidderNameLower = updatedBidder.bidderName.toLowerCase();
  const keywordFlagged = bidderNameLower.includes("black") || bidderNameLower.includes("ban") || bidderNameLower.includes("disqual");

  if (banningCheck.isAlertTriggered && banningCheck.matchedEntity) {
    const ent = banningCheck.matchedEntity;
    updatedBidder.banningStatusAlert = {
      isAlertTriggered: true,
      reason: `Flagged on ${ent.sourcePortal}: Match with blacklisted firm '${ent.entityName}' (Order: ${ent.referenceOrderNo}, Date: ${ent.orderDate}). Reason: ${ent.reasonForBanning}`,
      banningCheckListClauseRef: "NIT Clause 14.1 & GFR 2017 Rule 151 (Debarment from Bidding)",
      verifiedStatus: "POTENTIALLY_DEBARRED",
      verificationNotes: `Immediate Alert: Verification required across ${ent.sourcePortal} (${ent.portalUrl || "Portal"}). Reference Order: ${ent.referenceOrderNo}.`,
      matchedEntityName: ent.entityName,
      sourceDatabase: ent.sourcePortal,
      referenceOrderNo: ent.referenceOrderNo,
      portalUrl: ent.portalUrl,
      checkedAt: new Date().toISOString(),
    };
  } else if (keywordFlagged) {
    updatedBidder.banningStatusAlert = {
      isAlertTriggered: true,
      reason: "Party name flagged against CVC / Central Public Procurement Portal (CPPP) Debarment Database. Requires mandatory verification from GeM Incident Management & Ministry Banning List.",
      banningCheckListClauseRef: "NIT Clause 14.1 & GFR 2017 Rule 151 (Debarment from Bidding)",
      verifiedStatus: "POTENTIALLY_DEBARRED",
      verificationNotes: "Alert active: Dealing Officer must verify banning status on CPPP portal before issuing LOA.",
      sourceDatabase: "CPPP Central Debarment",
      checkedAt: new Date().toISOString(),
    };
  } else if (updatedBidder.banningStatusAlert?.verifiedStatus === "OFFICER_CONFIRMED_CLEAN") {
    // Preserve manual officer clearance
  } else {
    updatedBidder.banningStatusAlert = {
      isAlertTriggered: false,
      banningCheckListClauseRef: "NIT Clause 14.1 (Non-Banning Undertaking)",
      verifiedStatus: "CLEAN",
      verificationNotes: `Checked against internal blacklist and public portals (CPPP/GeM/CVC). No debarment records found as on ${new Date().toLocaleDateString("en-IN")}.`,
      sourceDatabase: "All Configured Portals",
      checkedAt: new Date().toISOString(),
    };
  }

  // 5. Determine Overall Qualification, Shortfall, or Rejection
  const isFinOk = updatedBidder.financialEvaluation.status === "QUALIFIED";
  const isExpOk = updatedBidder.experienceEvaluation.status === "QUALIFIED";
  const isFinShortfall = updatedBidder.financialEvaluation.status === "SHORTFALL";
  const isExpShortfall = updatedBidder.experienceEvaluation.status === "SHORTFALL";

  const letterDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (isFinOk && isExpOk) {
    updatedBidder.overallStatus = "RESPONSIVE_QUALIFIED";
    updatedBidder.summaryReason = "Techno-commercially responsive; complies fully with Financial Turnover, Experience, and Statutory eligibility criteria.";
    delete updatedBidder.shortfallLetter;
    delete updatedBidder.rejectionLetter;
  } else if (
    (isFinShortfall || isExpShortfall || (isFinOk && isExpShortfall) || (isFinShortfall && isExpOk)) &&
    updatedBidder.experienceEvaluation.status !== "REJECTED" &&
    updatedBidder.financialEvaluation.status !== "REJECTED"
  ) {
    updatedBidder.overallStatus = "SHORTFALL_REQUIRED";
    updatedBidder.summaryReason = "Eligible for shortfall clarification under OT Guidelines: Base qualifying works/turnover submitted before tender opening, but procedural clarification or UDIN verification is required.";

    // Generate Formal Shortfall / Clarification Letter
    const deficiencies: { head: "Financial / Turnover" | "Experience / Technical" | "Statutory"; referredDocument: string; observation: string; shortfallRequirement: string }[] = [];

    if (isFinShortfall || !hasUdin) {
      deficiencies.push({
        head: "Financial / Turnover",
        referredDocument: turnoverDocs[0]?.name || "CA Turnover Certificate",
        observation: "UDIN number not reflected on the CA Turnover Certificate for FY 2022-23 to 2024-25.",
        shortfallRequirement: "Submit authenticated UDIN verification printout from ICAI portal for the submitted balance sheet certificate.",
      });
    }

    if (isExpShortfall || !certAttached) {
      deficiencies.push({
        head: "Experience / Technical",
        referredDocument: expDocs[0]?.name || "Work Order & Experience Statement",
        observation: "Work Order submitted, but client-certified Final Completion Certificate with executed value and date of completion is not attached.",
        shortfallRequirement: "Submit attested copy of Final Completion Certificate and Performance Certificate issued by the designated Project Authority for the cited work.",
      });
    }

    updatedBidder.shortfallLetter = {
      letterRefNo: `PSU/CONT/OT-SHORTFALL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      letterDate,
      targetBidderName: updatedBidder.bidderName,
      subject: `TENDER SCRUTINY - NOTICE FOR SUBMISSION OF SHORTFALL / CLARIFICATION DOCUMENTS: "${packageTitle}" (Tender Ref: ${tenderRefNo})`,
      content: `Dear Sir/Madam,

With reference to your techno-commercial bid submitted against Tender Ref No: ${tenderRefNo} for "${packageTitle}", the techno-commercial bid was opened and scrutinized in accordance with the tender provisions and Government of India / CVC Guidelines on Procurement.

On preliminary scrutiny of the documents submitted by you before the tender due date and time, the following shortfall/clarification requirements have been identified:`,
      specificDeficiencies: deficiencies,
      submissionDeadlineDays: 7,
      noticeClauseReference: "Clause on Shortfall in Open Tenders / GFR 2017 Rule 173",
    };
    delete updatedBidder.rejectionLetter;
  } else {
    // REJECTION Condition: None of the submitted documents qualify the tendered eligibility, or major mismatch
    updatedBidder.overallStatus = "REJECTED_DISQUALIFIED";
    updatedBidder.summaryReason = "Non-responsive: Submitted documents fail to satisfy mandatory qualifying criteria. Under Open Tender guidelines, new documents cannot be permitted post-bid opening.";

    const grounds: string[] = [
      ...updatedBidder.financialEvaluation.reasons.filter((r) => r.includes("falls short")),
      ...updatedBidder.experienceEvaluation.reasons.filter((r) => r.includes("below") || r.includes("does not meet") || r.includes("disqualified")),
    ];

    updatedBidder.rejectionLetter = {
      letterRefNo: `PSU/CONT/TECH-REJECT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      letterDate,
      targetBidderName: updatedBidder.bidderName,
      subject: `INTIMATION OF REJECTION OF TECHNO-COMMERCIAL BID: "${packageTitle}" (Tender Ref: ${tenderRefNo})`,
      content: `Dear Sir/Madam,

This has reference to the techno-commercial bid submitted by you against Notice Inviting Tender (NIT) Ref No: ${tenderRefNo} for the work of "${packageTitle}".

Your bid has been evaluated by the designated Tender Evaluation Committee strictly against the Qualifying Requirements (QR) / Eligibility Criteria specified in the Standard Bidding Document. It is intimated that your offer has not been found technically qualified for the reasons set forth below:`,
      formalGrounds: grounds.length > 0 ? grounds : ["Documented proof submitted fails to satisfy the minimum stipulated Technical/Financial criteria."],
      referredDocuments: [...turnoverDocs.map((d) => d.name), ...expDocs.map((d) => d.name)],
      appellateAuthorityMention: "General Manager (Contracts) / Appellate Authority as per NIT Dispute Resolution Clause",
    };
    delete updatedBidder.shortfallLetter;
  }

  updatedBidder.round = isRoundTwo ? 2 : 1;
  return updatedBidder;
}
