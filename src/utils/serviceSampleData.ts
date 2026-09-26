/**
 * Sample Data for Services & O&M Eligibility Evaluation
 * Includes 3 realistic bidding cases:
 * - Bidder 1: Fully Qualified (Financial turnover + technical experience meet thresholds)
 * - Bidder 2: Shortfall / Clarification Required (Has qualifying work, but missing client completion cert & CA UDIN)
 * - Bidder 3: Disqualified / Rejection (Turnover below threshold & work order unrelated to tendered similar work)
 */

import {
  ServiceCriteriaRequirement,
  BidderServiceSubmission,
  InternalGuidelines,
} from "../types/serviceEvaluation";
import { DEFAULT_SHORTFALL_OT_GUIDELINES } from "./serviceEvaluationEngine";

export const SAMPLE_SERVICES_CRITERIA: ServiceCriteriaRequirement = {
  minAverageAnnualTurnoverCr: 12.0, // Rs. 12 Crore average over last 3 FYs
  turnoverYearsCount: 3,
  turnoverNotes: "Audited Balance Sheets and CA Turnover Certificate with mandatory 18-digit UDIN for FY 2022-23, 2023-24, and 2024-25.",
  netWorthRequirement: "Positive Net Worth as on 31st March of latest audited financial year.",
  similarWorkDefinition: "Comprehensive facility management, electro-mechanical, HVAC, substation or auxiliary utilities operations & maintenance in Central/State Government, CPSE, or autonomous statutory body.",
  singleWorkOrderValueCr: 9.6, // 80% of Rs. 12 Cr = 9.6 Cr
  twoWorkOrdersValueCr: 6.0,   // 50% = 6.0 Cr each
  threeWorkOrdersValueCr: 4.8, // 40% = 4.8 Cr each
  priorExperienceYears: 7,
  mandatoryCertifications: [
    "EPF & ESI Registration Certificates",
    "Valid Electrical Contractor Class-A License",
    "GSTIN Registration Certificate",
  ],
};

export const SAMPLE_SERVICE_BIDDERS: BidderServiceSubmission[] = [
  {
    bidderId: "srv-bidder-1",
    bidderName: "Bidder 1",
    banningStatusAlert: {
      isAlertTriggered: false,
      banningCheckListClauseRef: "NIT Clause 14.1 (Non-Banning Undertaking)",
      verifiedStatus: "CLEAN",
      verificationNotes: "Verified clean against CPPP and GeM Debarment register.",
    },
    turnoverDocuments: [
      {
        id: "doc-t1-1",
        name: "CA_Turnover_Certificate_Audited_FY22-25.pdf",
        category: "turnover",
        fileType: "pdf",
        extractedText: `CHARTERED ACCOUNTANTS CERTIFICATE
TO WHOMSOEVER IT MAY CONCERN
This is to certify that we have audited the books of accounts of the bidder.
Annual Financial Turnover:
FY 2022-23: Rs. 16.80 Crore
FY 2023-24: Rs. 18.50 Crore
FY 2024-25: Rs. 21.40 Crore
Average Annual Financial Turnover of last three years: Rs. 18.90 Crore.
The Net Worth of the agency as on 31.03.2025 is positive at Rs. 9.40 Crore.
UDIN: 24098765BKXZ123498
Partner, Chartered Accountants (Firm Reg: 012345N)`,
        charCount: 450,
        uploadedAt: "2026-09-24",
      },
    ],
    experienceDocuments: [
      {
        id: "doc-e1-1",
        name: "Work_Order_and_Completion_Cert_StatePSU.pdf",
        category: "experience",
        fileType: "pdf",
        extractedText: `OFFICE OF THE SUPERINTENDING ENGINEER, STATE POWER CORP
WORK COMPLETION & PERFORMANCE CERTIFICATE
Ref No: SE/O&M/COMP/2024/491, Dated: 12-04-2024
Name of Work: Comprehensive Operations & Maintenance of 220kV Substation, HVAC, and Electromechanical Utilities
Work Order No: SE/O&M/WO/2021/88, Dated: 01-04-2021
Award Value: Rs. 11.20 Crore | Final Executed Value: Rs. 11.45 Crore
Date of Start: 01-04-2021 | Actual Date of Completion: 31-03-2024 (36 Months)
Contractual and Actual Work Scope: Met in full.
The contractor executed the work satisfactorily without any dispute, penalty, or default.
Signed: Superintending Engineer (E&M)`,
        charCount: 620,
        uploadedAt: "2026-09-24",
      },
    ],
    financialEvaluation: {
      claimedTurnoverByYear: [
        { year: "FY 2022-23", turnoverCr: 16.80, auditedVerified: true, caUdinPresent: true },
        { year: "FY 2023-24", turnoverCr: 18.50, auditedVerified: true, caUdinPresent: true },
        { year: "FY 2024-25", turnoverCr: 21.40, auditedVerified: true, caUdinPresent: true },
      ],
      averageTurnoverCr: 18.90,
      requiredTurnoverCr: 12.0,
      status: "QUALIFIED",
      reasons: [
        "Average Annual Turnover of Rs. 18.90 Cr exceeds required criteria of Rs. 12.0 Cr.",
        "Audited balance sheets with verifiable 18-digit UDIN submitted.",
      ],
      relevantDocumentsCited: ["CA_Turnover_Certificate_Audited_FY22-25.pdf"],
    },
    experienceEvaluation: {
      submittedWorks: [
        {
          workTitle: "Comprehensive Operations & Maintenance of 220kV Substation & Utilities",
          clientName: "State Power Corp",
          contractValueCr: 11.45,
          completionDate: "31-03-2024",
          matchesSimilarWorkScope: true,
          completionCertificateAttached: true,
          satisfactoryPerformanceReportAttached: true,
          remarks: "Executed value Rs. 11.45 Cr exceeds single work threshold of Rs. 9.60 Cr. Satisfactory report submitted.",
        },
      ],
      status: "QUALIFIED",
      reasons: [
        "Completed single similar work order of value Rs. 11.45 Cr (Criteria: 80% = Rs. 9.60 Cr).",
        "Completed during the last 7 financial years.",
        "Client completion and satisfactory performance certificate attached.",
      ],
      relevantDocumentsCited: ["Work_Order_and_Completion_Cert_StatePSU.pdf"],
    },
    round: 1,
    overallStatus: "RESPONSIVE_QUALIFIED",
    summaryReason: "Techno-commercially qualified; complies with financial turnover, technical experience, and statutory criteria.",
  },
  {
    bidderId: "srv-bidder-2",
    bidderName: "Bidder 2",
    banningStatusAlert: {
      isAlertTriggered: false,
      banningCheckListClauseRef: "NIT Clause 14.1 (Non-Banning Undertaking)",
      verifiedStatus: "CLEAN",
      verificationNotes: "Verified clean against CPPP debarment database.",
    },
    turnoverDocuments: [
      {
        id: "doc-t2-1",
        name: "Provisional_Turnover_Statement_CA.docx",
        category: "turnover",
        fileType: "docx",
        extractedText: `STATEMENT OF TURNOVER
Turnover FY 2022-23: Rs. 14.10 Cr
Turnover FY 2023-24: Rs. 15.60 Cr
Turnover FY 2024-25: Rs. 17.20 Cr
Average Turnover: Rs. 15.63 Cr
Signed: Chartered Accountant (Note: UDIN generation in progress)`,
        charCount: 220,
        uploadedAt: "2026-09-24",
      },
    ],
    experienceDocuments: [
      {
        id: "doc-e2-1",
        name: "Award_Letter_Central_Hospital_Facility_OM.pdf",
        category: "experience",
        fileType: "pdf",
        extractedText: `OFFICE OF EXECUTIVE ENGINEER, CENTRAL GOVT HEALTHCARE COMPLEX
LETTER OF ACCEPTANCE / WORK ORDER
Ref: EE/E&M/WO/2021/309, Dated: 10-06-2021
To the Contractor: Comprehensive Facility O&M and Electro-Mechanical Support
Contract Value: Rs. 10.40 Crore
Period: 36 Months. Work completed in June 2024.
(Note: Formal completion certificate awaited from executive division)`,
        charCount: 380,
        uploadedAt: "2026-09-24",
      },
    ],
    financialEvaluation: {
      claimedTurnoverByYear: [
        { year: "FY 2022-23", turnoverCr: 14.10, auditedVerified: true, caUdinPresent: false },
        { year: "FY 2023-24", turnoverCr: 15.60, auditedVerified: true, caUdinPresent: false },
        { year: "FY 2024-25", turnoverCr: 17.20, auditedVerified: true, caUdinPresent: false },
      ],
      averageTurnoverCr: 15.63,
      requiredTurnoverCr: 12.0,
      status: "SHORTFALL",
      reasons: [
        "Average Turnover of Rs. 15.63 Cr meets the threshold, but UDIN is missing on the CA certificate.",
        "Per Open Tender guidelines, UDIN authentication for already submitted figures may be sought as shortfall.",
      ],
      relevantDocumentsCited: ["Provisional_Turnover_Statement_CA.docx"],
    },
    experienceEvaluation: {
      submittedWorks: [
        {
          workTitle: "Comprehensive Facility O&M and Electro-Mechanical Support",
          clientName: "Central Govt Healthcare Complex",
          contractValueCr: 10.40,
          completionDate: "10-06-2024",
          matchesSimilarWorkScope: true,
          completionCertificateAttached: false,
          satisfactoryPerformanceReportAttached: false,
          remarks: "Award letter of Rs. 10.40 Cr submitted before bid opening, but client completion certificate is missing.",
        },
      ],
      status: "SHORTFALL",
      reasons: [
        "Work order value Rs. 10.40 Cr meets technical threshold (80% = Rs. 9.60 Cr) and scope matches.",
        "Formal client-certified Final Completion Certificate is missing from the bid documents.",
        "Eligible for Shortfall clarification under Open Tender Guidelines since base work was submitted prior to bid opening.",
      ],
      relevantDocumentsCited: ["Award_Letter_Central_Hospital_Facility_OM.pdf"],
    },
    round: 1,
    overallStatus: "SHORTFALL_REQUIRED",
    summaryReason: "Shortfall clarification required: Base qualifying works & turnover were submitted, but CA UDIN and formal client Completion Certificate must be furnished as per OT Guidelines.",
    shortfallLetter: {
      letterRefNo: "PSU/CONT/OT-SHORTFALL/2026/1084",
      letterDate: "26 Sep 2026",
      targetBidderName: "Bidder 2",
      subject: "TENDER SCRUTINY - NOTICE FOR SUBMISSION OF SHORTFALL / CLARIFICATION: O&M Services Tender",
      content: `Dear Sir/Madam,

With reference to your techno-commercial bid opened against the subject tender, preliminary scrutiny has revealed that while the base experience and turnover figures submitted meet the qualifying benchmarks, the following shortfall/clarification documents are required in accordance with the Open Tender Procurement Guidelines:`,
      specificDeficiencies: [
        {
          head: "Financial / Turnover",
          referredDocument: "Provisional_Turnover_Statement_CA.docx",
          observation: "UDIN number is missing on the Chartered Accountant Turnover Certificate.",
          shortfallRequirement: "Submit authenticated UDIN verification report from ICAI portal for the submitted financial statement.",
        },
        {
          head: "Experience / Technical",
          referredDocument: "Award_Letter_Central_Hospital_Facility_OM.pdf",
          observation: "Work Order Ref EE/E&M/WO/2021/309 submitted, but client-certified Final Completion Certificate showing executed amount and completion date is not enclosed.",
          shortfallRequirement: "Submit attested copy of Final Completion Certificate and Performance Certificate issued by the designated client Executive Engineer.",
        },
      ],
      submissionDeadlineDays: 7,
      noticeClauseReference: "Clause on Shortfall in Open Tenders / GFR 2017 Rule 173",
    },
  },
  {
    bidderId: "srv-bidder-3",
    bidderName: "Bidder 3",
    banningStatusAlert: {
      isAlertTriggered: true,
      reason: "Flagged on GeM Incident Management: Match with blacklisted firm 'Bidder 3' (Order: GeM/INC/2025/DEBAR-4819, Date: 14-08-2025). Reason: Unilateral abandonment of HVAC & electromechanical facility maintenance contract post-award without statutory intimation.",
      banningCheckListClauseRef: "NIT Clause 14.1 & GFR 2017 Rule 151 (Debarment from Bidding)",
      verifiedStatus: "POTENTIALLY_DEBARRED",
      verificationNotes: "Alert for Dealing Officer: Mandatory verification on GeM Incident Management Portal and CPPP Central Debarment Portal required before any commercial consideration.",
      matchedEntityName: "Bidder 3",
      sourceDatabase: "GeM Incident Management",
      referenceOrderNo: "GeM/INC/2025/DEBAR-4819",
      portalUrl: "https://gem.gov.in/incident-management",
      checkedAt: "2026-09-26T10:00:00Z",
    },
    turnoverDocuments: [
      {
        id: "doc-t3-1",
        name: "Financial_Report_Extract_FY22-25.pdf",
        category: "turnover",
        fileType: "pdf",
        extractedText: `FINANCIAL HIGHLIGHTS
FY 2022-23: Rs. 6.20 Cr
FY 2023-24: Rs. 7.10 Cr
FY 2024-25: Rs. 7.80 Cr
Average Turnover: Rs. 7.03 Crore.`,
        charCount: 150,
        uploadedAt: "2026-09-24",
      },
    ],
    experienceDocuments: [
      {
        id: "doc-e3-1",
        name: "Supply_of_Cleaning_Consumables_Invoice.pdf",
        category: "experience",
        fileType: "pdf",
        extractedText: `INVOICE & PURCHASE ORDER
Description: Supply of housekeeping cleaning chemicals and paper consumables
Total Value: Rs. 2.40 Crore
Period: FY 2023-24`,
        charCount: 180,
        uploadedAt: "2026-09-24",
      },
    ],
    financialEvaluation: {
      claimedTurnoverByYear: [
        { year: "FY 2022-23", turnoverCr: 6.20, auditedVerified: true, caUdinPresent: false },
        { year: "FY 2023-24", turnoverCr: 7.10, auditedVerified: true, caUdinPresent: false },
        { year: "FY 2024-25", turnoverCr: 7.80, auditedVerified: true, caUdinPresent: false },
      ],
      averageTurnoverCr: 7.03,
      requiredTurnoverCr: 12.0,
      status: "REJECTED",
      reasons: [
        "Average Annual Turnover of Rs. 7.03 Cr falls significantly short of minimum required Rs. 12.0 Cr.",
      ],
      relevantDocumentsCited: ["Financial_Report_Extract_FY22-25.pdf"],
    },
    experienceEvaluation: {
      submittedWorks: [
        {
          workTitle: "Supply of housekeeping cleaning chemicals and paper consumables",
          clientName: "Private Commercial Complex",
          contractValueCr: 2.40,
          completionDate: "31-03-2024",
          matchesSimilarWorkScope: false,
          completionCertificateAttached: false,
          satisfactoryPerformanceReportAttached: false,
          remarks: "Supply of consumables does not meet 'Comprehensive Facility/Electro-Mechanical O&M' scope definition. Value Rs. 2.40 Cr far below Rs. 9.60 Cr threshold.",
        },
      ],
      status: "REJECTED",
      reasons: [
        "Submitted experience scope (consumables supply) does not meet tendered 'Similar Work' definition.",
        "Executed value of Rs. 2.40 Cr is far below mandatory single work criteria of Rs. 9.60 Cr.",
        "Per Open Tender Guidelines, no shortfall can be permitted to introduce new experience documents post-bid opening.",
      ],
      relevantDocumentsCited: ["Supply_of_Cleaning_Consumables_Invoice.pdf"],
    },
    round: 1,
    overallStatus: "REJECTED_DISQUALIFIED",
    summaryReason: "Non-responsive & Disqualified: Submitted documents fail to qualify both Financial Turnover and Technical Experience criteria. In accordance with Open Tender guidelines, no shortfall is permissible.",
    rejectionLetter: {
      letterRefNo: "PSU/CONT/TECH-REJECT/2026/8941",
      letterDate: "26 Sep 2026",
      targetBidderName: "Bidder 3",
      subject: "INTIMATION OF REJECTION OF TECHNO-COMMERCIAL BID: O&M Services Tender",
      content: `Dear Sir/Madam,

This has reference to the techno-commercial bid submitted by you against Notice Inviting Tender (NIT) for Comprehensive O&M Services.

Your bid has been evaluated by the designated Tender Evaluation Committee strictly against the Qualifying Requirements (QR) specified in the Standard Bidding Document. It is intimated that your offer has not been found technically qualified for the reasons set forth below:`,
      formalGrounds: [
        "Average Annual Financial Turnover of Rs. 7.03 Cr falls short of the mandatory qualifying requirement of Rs. 12.0 Cr (NIT Clause 3.1).",
        "Submitted experience (Supply of consumables of value Rs. 2.40 Cr) fails to satisfy the technical criteria for 'Comprehensive Electromechanical & Facility O&M' and does not meet the minimum value threshold of Rs. 9.60 Cr (NIT Clause 3.2).",
        "Under Open Tender Guidelines and GFR 2017 Rule 173, submission of fresh qualifying work orders after tender opening is impermissible.",
      ],
      referredDocuments: [
        "Financial_Report_Extract_FY22-25.pdf",
        "Supply_of_Cleaning_Consumables_Invoice.pdf",
      ],
      appellateAuthorityMention: "General Manager (Contracts) / Appellate Authority as per NIT Dispute Resolution Clause",
    },
  },
];

export const BLANK_SERVICES_CRITERIA: ServiceCriteriaRequirement = {
  minAverageAnnualTurnoverCr: 0,
  turnoverYearsCount: 3,
  turnoverNotes: "Audited Balance Sheets and CA Turnover Certificate with mandatory 18-digit UDIN.",
  netWorthRequirement: "Positive Net Worth as on last audited financial year.",
  similarWorkDefinition: "",
  singleWorkOrderValueCr: 0,
  twoWorkOrdersValueCr: 0,
  threeWorkOrdersValueCr: 0,
  priorExperienceYears: 7,
  mandatoryCertifications: [
    "EPF & ESI Registration Certificates",
    "Valid Statutory Licenses / Registrations",
    "GSTIN Registration Certificate",
  ],
};

export const BLANK_SERVICE_BIDDERS: BidderServiceSubmission[] = [
  {
    bidderId: "srv-bidder-1",
    bidderName: "Bidder 1",
    banningStatusAlert: {
      isAlertTriggered: false,
      banningCheckListClauseRef: "NIT Clause 14 (Non-Banning Undertaking)",
      verifiedStatus: "CLEAN",
      verificationNotes: "Self-undertaking verified.",
    },
    turnoverDocuments: [],
    experienceDocuments: [],
    financialEvaluation: {
      claimedTurnoverByYear: [],
      averageTurnoverCr: 0,
      requiredTurnoverCr: 0,
      status: "SHORTFALL",
      reasons: ["No turnover documents uploaded."],
      relevantDocumentsCited: [],
    },
    experienceEvaluation: {
      submittedWorks: [],
      status: "SHORTFALL",
      reasons: ["No experience certificates uploaded."],
      relevantDocumentsCited: [],
    },
    round: 1,
    overallStatus: "SHORTFALL_REQUIRED",
    summaryReason: "Awaiting submission of financial and technical eligibility documents.",
  },
];
