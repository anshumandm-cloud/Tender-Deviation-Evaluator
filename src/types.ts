/**
 * Types for Tender Deviation Evaluation System
 * Standard Bidding Document (SBD) & NIT/ITB for Turnkey / EPC & Works Packages
 */

export type TenderProcurementType =
  | "EPC_TURNKEY"
  | "SERVICES_O_AND_M";

export interface TenderMetadata {
  packageTitle: string;
  tenderRefNo: string;
  organization: string; // e.g. Public Sector Organization / Project Contracts Cell
  estimateValueCr: string;
  completionPeriodMonths: string;
  tenderType?: TenderProcurementType;
}

export interface SupplementaryReferenceDocument {
  id: string;
  name: string;
  fileType: string;
  charCount: number;
  uploadedAt: string;
  category: "Corrigendum" | "Pre-Bid Minutes" | "Technical Scope" | "Special Conditions" | "General Reference";
  extractedText?: string;
}

export interface TenderDocuments {
  sbdName: string;
  sbdText: string;
  sbdCharCount: number;
  sbdSource: "pc" | "drive" | "sample" | "manual";
  nitName: string;
  nitText: string;
  nitCharCount: number;
  nitSource: "pc" | "drive" | "sample" | "manual";
  supplementaryDocs?: SupplementaryReferenceDocument[];
}

export interface BidderInput {
  id: string;
  name: string;
  deviationFileName?: string;
  deviationFileText: string;
  deviationFileFormat?: "docx" | "pdf" | "xlsx" | "txt";
  uploadDate?: string;
}

export interface DeviationItem {
  slNo: number;
  clauseNo: string;
  tenderClauseTitle: string;
  originalTenderProvision: string;
  bidderQuotedDeviation: string;
  deviationCategory: "Commercial" | "Technical" | "Legal" | "Financial";
  impactOnBuyerInterest: string;
  psuDealingOfficerComments: string;
  recommendedAction:
    | "Unconditional Withdrawal Required"
    | "Acceptable with Conditions"
    | "Requires CA & Finance Concurrence"
    | "Acceptable / Clarification Only";
  suggestedCounterProposalOrConditions: string;
  riskScore: "Critical" | "Major" | "Minor";
}

export interface SingleBidderEvaluation {
  bidderId: string;
  bidderName: string;
  packageTitle: string;
  evaluationDate: string;
  executiveSummary: string;
  riskRating: "High" | "Medium" | "Low";
  totalDeviationsCount: number;
  summaryCounts: {
    unconditionalWithdrawal: number;
    conditionalAcceptance: number;
    caApprovalRequired: number;
    acceptable: number;
  };
  deviations: DeviationItem[];
  meetingAgendaPoints: string[];
  officerSignOffNote: string;
}

export interface ComparativeMatrixRow {
  clauseOrTheme: string;
  tenderSBDProvision: string;
  bidderStances: {
    bidderName: string;
    quotedDeviation: string;
    impact: string;
    action: string;
  }[];
  officerComparativeAnalysis: string;
  recommendedHarmonizedStrategy: string;
}

export interface ComparativeEvaluation {
  packageTitle: string;
  evaluationDate: string;
  totalBiddersEvaluated: number;
  comparativeExecutiveSummary: string;
  biddersSummary: {
    bidderName: string;
    deviationCount: number;
    criticalDeviations: number;
    generalPosture: "Rigid" | "Moderate" | "Cooperative";
    overallRecommendation: string;
  }[];
  comparativeMatrix: ComparativeMatrixRow[];
  commonDeadlockAreas: {
    topic: string;
    reasons: string;
    recommendedWayForward: string;
  }[];
  tenderCommitteeRecommendations: string;
}

export interface ReviewedClause {
  clauseNumber: string;
  clauseTitle: string;
  originalClauseText: string;
  biddersContentionSummary: string;
  proposedReviewedClauseText: string;
  protectiveSafeguardsRetained: string;
  concessionGranted: string;
  approvalPrerequisite: string;
  auditDefenseRationale: string;
  riskScore?: "Critical" | "Major" | "Minor";
}

export interface ReviewedClausesData {
  packageTitle: string;
  harmonizationOverview: string;
  reviewedClauses: ReviewedClause[];
  draftAddendumPreamble: string;
  appliedFormatTitle?: string;
  appliedDirectivesCount?: number;
}

export interface OfficerDirective {
  id: string;
  title: string;
  instruction: string;
  source: "chatbot" | "manual" | "format_template";
  targetArea: "Harmonized Clauses" | "Comparative Matrix" | "Single Bidder" | "All";
  targetClause?: string;
  timestamp: string;
  active: boolean;
  proposedChanges?: {
    clauseNumber?: string;
    clauseTitle?: string;
    proposedReviewedClauseText?: string;
    protectiveSafeguardsRetained?: string;
    concessionGranted?: string;
    auditDefenseRationale?: string;
  };
}

export interface UploadedFormatTemplate {
  id: string;
  name: string;
  fileType: string;
  charCount: number;
  uploadedAt: string;
  templateText: string;
  parsedSections: string[];
  isPreset?: boolean;
  isActive: boolean;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedDirective?: OfficerDirective;
  isDirectiveApplied?: boolean;
}

export type AuditCategory =
  | "Metadata"
  | "Tender Documents"
  | "Bidders & Deviations"
  | "Evaluation"
  | "Harmonization"
  | "Officer Note"
  | "System & Files"
  | "Advisory & Directive"
  | "Template & Format";

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  formattedTime: string; // e.g. "22 Sep 2026, 14:45:12"
  officer: string; // Name & designation of the dealing officer e.g. "Dealing Officer, Contracts & Procurement"
  category: AuditCategory;
  action: string; // e.g. "Updated Estimated Value", "Uploaded SBD", "Added Bidder"
  summary: string; // Clear summary of the modification
  details?: string; // Detailed before/after diff or specific note
  entityAffected?: string; // e.g. "Tender Metadata", "SBD File", "Bidder: Bidder 1"
  complianceTag?: string; // e.g. "GFR Rule 173", "CVC Audit Trail", "Manual Sign-off"
}

