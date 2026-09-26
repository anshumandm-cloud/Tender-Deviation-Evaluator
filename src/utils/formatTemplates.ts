import {
  ReviewedClausesData,
  ReviewedClause,
  OfficerDirective,
  UploadedFormatTemplate,
  TenderMetadata,
} from "../types";

/**
 * Standard Presets for Dealing Officer Output Formats
 * Used across Central PSUs, Defense Procurements, Power, and Infrastructure EPC Packages
 */
export const PRESET_FORMAT_TEMPLATES: UploadedFormatTemplate[] = [
  {
    id: "preset-cvc-gfr173",
    name: "Central PSU Turnkey Addendum Format (CVC / GFR 173 Standard)",
    fileType: "preset",
    charCount: 2840,
    uploadedAt: "System Built-in",
    isPreset: true,
    isActive: true,
    description:
      "Statutory 4-column corrigendum format with GFR 173(xiv) preamble, CVC safe harbor justifications, and multi-tier authority sign-off.",
    parsedSections: [
      "1. Directorate / Project Contracts Preamble",
      "2. GFR 173(xiv) Regulatory Compliance Citation",
      "3. 4-Column Clause Amendment Schedule (Clause No., Original Provision, Amended Provision, CVC Audit Safeguard)",
      "4. Mandatory Competent Authority Sign-off Matrix",
    ],
    templateText: `[CENTRAL PUBLIC SECTOR UNDERTAKING - PROJECT CONTRACTS CELL]
CONTRACT AMENDMENT / CORRIGENDUM NO. [CORR-NO]
PACKAGE: [PACKAGE_TITLE] | TENDER REF: [REF_NO]

PREAMBLE & REGULATORY AUTHORITY:
In accordance with Rule 173(xiv) of General Financial Rules (GFR) 2017 and Central Vigilance Commission (CVC) Office Order No. 005/CRD/12 on post-tender clarifications and equal opportunity, the following harmonized amendments to the Standard Bidding Document (GCC / SCC) are hereby issued with the concurrence of Finance and approval of the Competent Authority. All amendments stipulated herein apply equally across all participating bidders to preserve a level playing field.

AMENDMENT SCHEDULE:
Column 1: Clause Reference No. & Heading
Column 2: Existing Tender Provision (SBD)
Column 3: Amended / Harmonized Contract Stipulation
Column 4: Protective Safeguards Retained & CVC Audit Justification

COMMITTEE SIGN-OFF BLOCK:
1. Dealing Officer (Manager - Contracts)
2. Finance Concurrence (DGM - Finance)
3. Competent Authority (Director - Projects / Executive Director)`,
  },
  {
    id: "preset-prebid-minutes",
    name: "Turnkey EPC Pre-Bid Clarifications & Agreed Minutes Matrix",
    fileType: "preset",
    charCount: 2450,
    uploadedAt: "System Built-in",
    isPreset: true,
    isActive: false,
    description:
      "Formal pre-bid meeting minutes format recording contractor representations, technical-commercial dispositions, and binding employer decisions.",
    parsedSections: [
      "1. Pre-Bid Conference Attendance & Record of Proceedings",
      "2. Bidder Representation vs Employer's Clarification Table",
      "3. Financial Safeguard Protocols (Milestones, LC Terms, Advances)",
      "4. Agreed Minutes of Meeting (MoM) Signature Block",
    ],
    templateText: `[PROJECT CONTRACTS & COMMERCIAL CELL - PRE-BID PROCEEDINGS]
RECORD OF TECHNICAL-COMMERCIAL DISCUSSIONS AND AGREED MINUTES
PACKAGE: [PACKAGE_TITLE]

1. RECORD OF PROCEEDINGS:
Technical and commercial representations received from participating bidders were deliberated by the Tender Scrutiny Committee. The Employer's agreed positions and binding clarifications are tabulated below.

2. CLARIFICATION & HARMONIZATION SCHEDULE:
- Serial No.
- SBD Clause Reference
- Bidder's Query / Requested Deviation
- Employer's Formal Clarification & Binding Stipulation
- Concessions Permitted with Mandatory Prerequisite Documentation

3. LEVEL PLAYING FIELD DIRECTIVE:
These clarifications supersede earlier tender provisions to the extent specified herein. No individual commercial concessions outside this published matrix shall be entertained during evaluation.`,
  },
  {
    id: "preset-board-scrutiny",
    name: "Tender Committee Commercial Scrutiny & Board Note Rubric",
    fileType: "preset",
    charCount: 3100,
    uploadedAt: "System Built-in",
    isPreset: true,
    isActive: false,
    description:
      "Rigorous decision-making rubric designed for Tender Committee appraisal, risk quantification, and Board-level approvals.",
    parsedSections: [
      "1. Executive Summary & Package Risk Profile",
      "2. Commercial Deviation Mitigation Rubric (LD, PBG, Liability)",
      "3. Value-at-Risk (VaR) Analysis & Financial Concurrence",
      "4. Recommended Action Matrix for Tender Committee",
    ],
    templateText: `[CONFIDENTIAL - FOR TENDER COMMITTEE & BOARD SCRUTINY]
TENDER SCRUTINY NOTE: EVALUATION OF COMMERCIAL DEVIATIONS & HARMONIZATION
PACKAGE: [PACKAGE_TITLE] | ESTIMATED VALUE: [ESTIMATED_VALUE]

1. PURPOSE OF NOTE:
To apprise the Tender Committee of technical and commercial deviations submitted by bidders and seek approval for the proposed harmonized stipulations.

2. RISK & MITIGATION MATRIX:
- Contract Parameter (Liquidated Damages, PBG, Advance Payment, Limitation of Liability)
- SBD Baseline Requirement
- Bidder Posture & Market Deadlock Analysis
- Proposed Harmonized Compromise
- Residual Risk Rating & Legal Safeguards
- Financial Impact Assessment

3. RECOMMENDATIONS FOR APPROVAL:
The Tender Committee is invited to approve the revised clauses and authorize the issuance of Corrigendum No. 1.`,
  },
];

/**
 * Extracts sections / headings from uploaded document text
 */
export function detectFormatSections(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return ["1. General Document Format", "2. Amendment Table", "3. Authority Signatures"];
  }

  const lines = text.split("\n");
  const detected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match common heading patterns like "1.", "Section", "SCHEDULE", "PREAMBLE", "COLUMN", "TABLE"
    if (
      trimmed.length > 3 &&
      trimmed.length < 80 &&
      (/^(section|part|schedule|table|column|chapter|[0-9]+[\.\)])/i.test(trimmed) ||
        /^[A-Z0-9\s\-_:]{4,}$/.test(trimmed) ||
        trimmed.includes("PREAMBLE") ||
        trimmed.includes("AMENDMENT") ||
        trimmed.includes("SAFEGUARD") ||
        trimmed.includes("SIGN-OFF") ||
        trimmed.includes("SIGNATURE") ||
        trimmed.includes("MATRIX"))
    ) {
      if (!detected.includes(trimmed)) {
        detected.push(trimmed);
        if (detected.length >= 6) break;
      }
    }
  }

  if (detected.length === 0) {
    return [
      "1. Document Header & Ref Details",
      "2. Preamble & Regulatory Justification",
      "3. Tabular Clause Amendment Schedule",
      "4. Committee Signatures & Concurrence",
    ];
  }

  return detected;
}

/**
 * Directly applies an Officer Directive to the Harmonized Clauses data structure
 */
export function applyDirectiveToReviewedClauses(
  data: ReviewedClausesData,
  directive: OfficerDirective,
  metadata?: TenderMetadata
): ReviewedClausesData {
  const currentClauses = [...data.reviewedClauses];
  const targetClauseQuery = (directive.targetClause || directive.title || "").toLowerCase();

  // Find if matching clause exists
  const existingIdx = currentClauses.findIndex(
    (c) =>
      c.clauseNumber.toLowerCase().includes(targetClauseQuery) ||
      c.clauseTitle.toLowerCase().includes(targetClauseQuery) ||
      targetClauseQuery.includes(c.clauseNumber.toLowerCase().replace("gcc", "").replace("clause", "").trim())
  );

  const updatedDirectiveChanges = directive.proposedChanges || {};

  if (existingIdx >= 0) {
    const orig = currentClauses[existingIdx];
    currentClauses[existingIdx] = {
      ...orig,
      proposedReviewedClauseText:
        updatedDirectiveChanges.proposedReviewedClauseText ||
        `${orig.proposedReviewedClauseText} [Amended per Officer Directive: "${directive.title}"]`,
      protectiveSafeguardsRetained:
        updatedDirectiveChanges.protectiveSafeguardsRetained ||
        `${orig.protectiveSafeguardsRetained}; Retained strictly as directed by Dealing Officer.`,
      concessionGranted:
        updatedDirectiveChanges.concessionGranted ||
        `Revised as per Dealing Officer directive: ${directive.instruction}`,
      auditDefenseRationale:
        updatedDirectiveChanges.auditDefenseRationale ||
        `${orig.auditDefenseRationale} (Aligned with Dealing Officer direction and CVC procurement compliance).`,
    };
  } else {
    // Add a new harmonized clause based on the directive
    const newClause: ReviewedClause = {
      clauseNumber: updatedDirectiveChanges.clauseNumber || directive.targetClause || "GCC / SCC Clause (Amended)",
      clauseTitle: updatedDirectiveChanges.clauseTitle || directive.title || "Dealing Officer Stipulation",
      originalClauseText: "Standard SBD Clause provision as per original tender document.",
      biddersContentionSummary: `Deviations submitted by bidders regarding ${directive.title}.`,
      proposedReviewedClauseText:
        updatedDirectiveChanges.proposedReviewedClauseText ||
        `The stipulation is harmonized as follows: ${directive.instruction}. All contractors shall adhere to this revised condition.`,
      protectiveSafeguardsRetained:
        updatedDirectiveChanges.protectiveSafeguardsRetained ||
        "Buyer retains full contractual oversight, audit defense, and right of performance enforcement.",
      concessionGranted:
        updatedDirectiveChanges.concessionGranted || directive.instruction,
      approvalPrerequisite: "Tender Scrutiny Committee & Competent Authority Approval.",
      auditDefenseRationale:
        updatedDirectiveChanges.auditDefenseRationale ||
        "GFR Rule 173 compliant harmonization to resolve market impasse without sacrificing organizational interests.",
    };
    currentClauses.push(newClause);
  }

  // Enhance the Preamble with Dealing Officer directive acknowledgement
  const updatedPreamble = `${data.draftAddendumPreamble}\n\n[OFFICER DIRECTIVE INCORPORATED: "${directive.title}" - Stipulation: ${directive.instruction}]`;

  return {
    ...data,
    reviewedClauses: currentClauses,
    draftAddendumPreamble: updatedPreamble,
    appliedDirectivesCount: (data.appliedDirectivesCount || 0) + 1,
  };
}

/**
 * Re-formats Harmonized Clauses data to adhere to the active Uploaded Format Template
 */
export function applyFormatToHarmonizedData(
  data: ReviewedClausesData,
  format: UploadedFormatTemplate,
  metadata?: TenderMetadata
): ReviewedClausesData {
  const pkgTitle = metadata?.packageTitle || data.packageTitle || "Turnkey Contract Package";
  const refNo = metadata?.tenderRefNo || "Tender Ref No.";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let formattedPreamble = "";

  if (format.id === "preset-cvc-gfr173") {
    formattedPreamble = `ADDENDUM / CORRIGENDUM NO. 01\nPACKAGE: ${pkgTitle}\nTENDER REFERENCE NO.: ${refNo} | DATE: ${dateStr}\n\n1. STATUTORY PREAMBLE (RULE 173(XIV) OF GFR 2017 & CVC DIRECTIVES):\nIn reference to the Notice Inviting Tender (NIT) and pre-bid representations received from prospective bidders, the Competent Authority has accorded approval to publish the harmonized amendments to the Standard Bidding Document (SBD GCC/SCC) specified in the Schedule of Amendments below.\n\n2. LEVEL PLAYING FIELD NOTICE:\nThese revised clauses shall be applicable equally to all participating bidders without discrimination. All other conditions of the original Bidding Documents remain unaltered.`;
  } else if (format.id === "preset-prebid-minutes") {
    formattedPreamble = `RECORD OF PROCEEDINGS & AGREED MINUTES OF PRE-BID CONFERENCE\nPACKAGE: ${pkgTitle} [REF: ${refNo}]\nCONFERENCE DATE: ${dateStr}\n\n1. RECORD OF PROCEEDINGS:\nThe Tender Scrutiny Committee examined the queries, commercial deviations, and representations submitted by participating bidders. Following technical-commercial deliberations, the Employer's binding dispositions and revised clause formulations are finalized below for formal incorporation into the contract documents.`;
  } else if (format.id === "preset-board-scrutiny") {
    formattedPreamble = `CONFIDENTIAL - TENDER SCRUTINY NOTE FOR COMPETENT AUTHORITY / BOARD\nPACKAGE TITLE: ${pkgTitle}\nESTIMATED CONTRACT VALUE: ${metadata?.estimateValueCr ? `INR ${metadata.estimateValueCr} Crores` : "Public Procurement"}\n\n1. EXECUTIVE SUMMARY & BASIS OF HARMONIZATION:\nThis scrutiny note presents the strategic harmonization of contentious contract provisions to prevent tender failure, promote robust competitive bidding, and protect organizational risk exposure in strict alignment with CVC guidelines.`;
  } else {
    // Custom Uploaded Format
    formattedPreamble = `CORRIGENDUM / AMENDMENT SCHEDULE\nFORMAT COMPLIANCE: ${format.name}\nPACKAGE: ${pkgTitle} [REF: ${refNo}]\nDATE: ${dateStr}\n\nIn accordance with the format and structure prescribed in "${format.name}", the revised contract clauses and statutory justifications are set out hereunder.`;
  }

  return {
    ...data,
    draftAddendumPreamble: formattedPreamble,
    appliedFormatTitle: format.name,
    harmonizationOverview: `${data.harmonizationOverview}\n\n[Structured in accordance with Dealing Officer Template: "${format.name}"].`,
  };
}
