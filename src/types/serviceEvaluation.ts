/**
 * Service & O&M Contract Evaluation Types
 * Supporting Eligibility Criteria (Financial Turnover & Experience/Technical),
 * Shortfall/Clarification generation, Banning status alerts,
 * OCR Extraction, and Document Tampering/Forgery detection.
 */

export interface ServiceCriteriaRequirement {
  // Financial / Turnover Criteria
  minAverageAnnualTurnoverCr: number; // e.g. 15.5 Cr
  turnoverYearsCount: number; // e.g. 3 years (e.g. FY 2022-23, 2023-24, 2024-25)
  turnoverNotes: string; // e.g. "Audited Balance Sheets & CA Certificate with UDIN"
  netWorthRequirement?: string; // e.g. "Positive Net Worth as on last audited FY"
  workingCapitalRequirement?: string; // e.g. "Fund-based credit limit of minimum 2 Cr"

  // Experience / Technical Criteria
  similarWorkDefinition: string; // e.g. "Comprehensive facility maintenance, MEP, HVAC or electrical O&M in central/state govt or PSU"
  singleWorkOrderValueCr?: number; // e.g. 1 work order of 80% (12.4 Cr)
  twoWorkOrdersValueCr?: number; // e.g. 2 work orders of 50% (7.75 Cr each)
  threeWorkOrdersValueCr?: number; // e.g. 3 work orders of 40% (6.2 Cr each)
  priorExperienceYears: number; // e.g. last 7 years ending last day of month previous to bid opening
  mandatoryCertifications?: string[]; // e.g. ["ISO 9001:2015", "Electrical Contractor Class-A License", "EPF & ESI Registration"]
}

export interface BidderSubmittedDocument {
  id: string;
  name: string;
  category: "turnover" | "experience" | "statutory" | "shortfall_reply";
  fileType: string;
  extractedText: string;
  charCount: number;
  uploadedAt: string;
  isOcrScanned?: boolean;
  ocrConfidence?: number; // 0 - 100%
  // Integrity / Tampering Flags (For Dealing Officer's attention only)
  tamperingAlerts?: DocumentTamperingAlert[];
}

export interface DocumentTamperingAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "font_mismatch" | "resolution_artifact" | "metadata_anomaly" | "overwriting" | "date_conflict" | "udin_missing" | "seal_overlay";
  description: string;
  affectedSnippet?: string;
  officerDecision?: "ignored_clean" | "suspicion_noted" | "forwarded_for_vigilance_check";
  officerDecisionNotes?: string;
}

export interface BidderServiceSubmission {
  bidderId: string;
  bidderName: string;
  banningStatusAlert: {
    isAlertTriggered: boolean;
    reason?: string;
    banningCheckListClauseRef: string; // e.g. "NIT Clause 14 & CVC Debarment Register"
    verifiedStatus: "CLEAN" | "UNDER_SCRUTINY" | "POTENTIALLY_DEBARRED" | "OFFICER_CONFIRMED_CLEAN";
    verificationNotes?: string;
  };
  
  // Documents
  turnoverDocuments: BidderSubmittedDocument[];
  experienceDocuments: BidderSubmittedDocument[];
  shortfallReplyDocuments?: BidderSubmittedDocument[]; // For Round 2 / Shortfall evaluation

  // Financial Criteria Evaluation Result
  financialEvaluation: {
    claimedTurnoverByYear: { year: string; turnoverCr: number; auditedVerified: boolean; caUdinPresent: boolean }[];
    averageTurnoverCr: number;
    requiredTurnoverCr: number;
    status: "QUALIFIED" | "SHORTFALL" | "REJECTED";
    reasons: string[];
    relevantDocumentsCited: string[];
  };

  // Experience Criteria Evaluation Result
  experienceEvaluation: {
    submittedWorks: {
      workTitle: string;
      clientName: string;
      contractValueCr: number;
      completionDate: string;
      matchesSimilarWorkScope: boolean;
      completionCertificateAttached: boolean;
      satisfactoryPerformanceReportAttached: boolean;
      remarks: string;
    }[];
    status: "QUALIFIED" | "SHORTFALL" | "REJECTED";
    reasons: string[];
    relevantDocumentsCited: string[];
  };

  // Overall Evaluation in Round 1 & Round 2
  round: 1 | 2; // 1 = Initial, 2 = After Shortfall/Clarification
  overallStatus: "RESPONSIVE_QUALIFIED" | "SHORTFALL_REQUIRED" | "REJECTED_DISQUALIFIED";
  summaryReason: string;

  // Generated Letters (GFR / Open Tender Guideline Compliant)
  shortfallLetter?: {
    letterRefNo: string;
    letterDate: string;
    targetBidderName: string;
    subject: string;
    content: string;
    specificDeficiencies: {
      head: "Financial / Turnover" | "Experience / Technical" | "Statutory";
      referredDocument: string;
      observation: string;
      shortfallRequirement: string;
    }[];
    submissionDeadlineDays: number;
    noticeClauseReference: string;
  };

  rejectionLetter?: {
    letterRefNo: string;
    letterDate: string;
    targetBidderName: string;
    subject: string;
    content: string;
    formalGrounds: string[];
    referredDocuments: string[];
    appellateAuthorityMention: string;
  };
}

export interface InternalGuidelines {
  evaluationOfEligibilityDocName?: string;
  evaluationOfEligibilityText?: string;
  shortfallInOTCasesDocName?: string; // Guideline on Shortfall/Clarification in Open Tender cases
  shortfallInOTCasesText?: string;
  otherRelevantCircularDocName?: string;
  otherRelevantCircularText?: string;
}

export interface ServiceEvaluationState {
  evaluationStage: "ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED";
  criteria: ServiceCriteriaRequirement;
  guidelines: InternalGuidelines;
  bidders: BidderServiceSubmission[];
  interimReportGenerated: boolean;
  finalReportGenerated: boolean;
  selectedBidderId?: string;
  activeFormat?: "individual" | "consolidated";
}
