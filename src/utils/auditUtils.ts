import { AuditLogEntry, AuditCategory, TenderMetadata, BidderInput } from "../types";

export const DEFAULT_DEALING_OFFICER = "Anshuman DM, Manager (Contracts & Procurement)";

export function formatAuditDateTime(date: Date): string {
  const d = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const t = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${d}, ${t}`;
}

export function createAuditEntry(
  officer: string,
  category: AuditCategory,
  action: string,
  summary: string,
  details?: string,
  entityAffected?: string,
  complianceTag?: string
): AuditLogEntry {
  const now = new Date();
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    formattedTime: formatAuditDateTime(now),
    officer: officer || DEFAULT_DEALING_OFFICER,
    category,
    action,
    summary,
    details,
    entityAffected,
    complianceTag: complianceTag || "GFR 173 / CVC Scrutiny Ready",
  };
}

/**
 * Generates realistic statutory initial audit log entries representing the loaded case
 */
export function generateInitialAuditLogs(
  metadata: TenderMetadata,
  bidders: BidderInput[],
  officer: string = DEFAULT_DEALING_OFFICER
): AuditLogEntry[] {
  const baseTime = Date.now();
  const formatOffset = (minsAgo: number) => {
    const d = new Date(baseTime - minsAgo * 60 * 1000);
    return {
      iso: d.toISOString(),
      formatted: formatAuditDateTime(d),
    };
  };

  return [
    {
      id: "audit_init_7",
      timestamp: formatOffset(10).iso,
      formattedTime: formatOffset(10).formatted,
      officer,
      category: "Harmonization",
      action: "Formulated Harmonized Clauses",
      summary: "Synthesized 4 deadlock resolution clauses and draft Addendum Preamble with protective safeguards",
      details: "Formulated revised provisions for Price Variation Formula (PVC), Defect Liability Period (DLP), Advance Payment terms, and Liquidated Damages (LD) cap with CVC audit justification.",
      entityAffected: "Harmonized Addendum Clauses",
      complianceTag: "GFR 2017 Rule 173(xiv)",
    },
    {
      id: "audit_init_6",
      timestamp: formatOffset(25).iso,
      formattedTime: formatOffset(25).formatted,
      officer,
      category: "Evaluation",
      action: "Consolidated Comparative Matrix Generated",
      summary: "Compiled multi-bidder comparative evaluation across all 3 participating bidders",
      details: "Identified high-impact deadlock areas across BHEL, Larsen & Toubro, and Siemens Energy. Categorized deviations into Commercial, Legal, and Financial classes.",
      entityAffected: "Tender Committee Matrix",
      complianceTag: "CVC Vigilance Scrutiny",
    },
    {
      id: "audit_init_5",
      timestamp: formatOffset(40).iso,
      formattedTime: formatOffset(40).formatted,
      officer,
      category: "Bidders & Deviations",
      action: "Deviations Extracted & Registered",
      summary: `Uploaded and parsed pre-bid deviation schedules for ${bidders.length} participating bidders`,
      details: bidders.map((b) => `${b.name} (${b.deviationFileText.length.toLocaleString()} characters)`).join(" | "),
      entityAffected: "Bidders Deviation Register",
      complianceTag: "Transparency Mandate",
    },
    {
      id: "audit_init_4",
      timestamp: formatOffset(55).iso,
      formattedTime: formatOffset(55).formatted,
      officer,
      category: "Bidders & Deviations",
      action: "Registered Participating Bidders",
      summary: `Recorded ${bidders.length} pre-qualified EPC bidders in tender database`,
      details: bidders.map((b, i) => `${i + 1}. ${b.name}`).join(", "),
      entityAffected: "Bidder Registration List",
      complianceTag: "Public Procurement Integrity",
    },
    {
      id: "audit_init_3",
      timestamp: formatOffset(75).iso,
      formattedTime: formatOffset(75).formatted,
      officer,
      category: "Tender Documents",
      action: "NIT / ITB Specifications Loaded",
      summary: "Notice Inviting Tender (NIT) and Instructions to Bidders loaded into system repository",
      details: "Turnkey EPC Works Notice Inviting Tender with pre-qualification thresholds, earnest money deposit, and qualification criteria.",
      entityAffected: "NIT Document",
      complianceTag: "Procurement Notice Audit",
    },
    {
      id: "audit_init_2",
      timestamp: formatOffset(90).iso,
      formattedTime: formatOffset(90).formatted,
      officer,
      category: "Tender Documents",
      action: "Standard Bidding Document (SBD) Uploaded",
      summary: "Standard Bidding Document for Turnkey / EPC Works loaded as baseline contractual reference",
      details: "Contains General Conditions of Contract (GCC), Special Conditions (SCC), and Technical Requirements.",
      entityAffected: "SBD Base Contract",
      complianceTag: "Contract Baseline Reference",
    },
    {
      id: "audit_init_1",
      timestamp: formatOffset(120).iso,
      formattedTime: formatOffset(120).formatted,
      officer,
      category: "Metadata",
      action: "Initialized Tender Case",
      summary: `Created tender case: "${metadata.packageTitle}" [Ref: ${metadata.tenderRefNo}]`,
      details: `Organization: ${metadata.organization} | Estimated Value: Rs. ${metadata.estimateValueCr} Cr | Completion Period: ${metadata.completionPeriodMonths} Months`,
      entityAffected: "Tender Metadata",
      complianceTag: "Statutory Tender Opening Log",
    },
  ];
}
