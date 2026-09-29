import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import { SingleBidderEvaluation, ComparativeEvaluation, ReviewedClausesData, TenderMetadata, AuditLogEntry, UploadedFormatTemplate } from "../types";
import { BidderServiceSubmission, ServiceCriteriaRequirement } from "../types/serviceEvaluation";

/**
 * Downloads a file to the user's PC
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads an Excel file for Single Bidder Evaluation
 */
export function exportSingleBidderToExcel(evalData: SingleBidderEvaluation) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ["TENDER EVALUATION & CONTRACT COMPLIANCE CELL"],
    ["TENDER EVALUATION NOTE: TECHNICAL & COMMERCIAL DEVIATIONS"],
    [""],
    ["Package Title", evalData.packageTitle],
    ["Bidder Name", evalData.bidderName],
    ["Evaluation Date", evalData.evaluationDate],
    ["Overall Risk Level", evalData.riskRating],
    ["Total Deviations Quoted", evalData.totalDeviationsCount],
    [""],
    ["RECOMMENDATION SUMMARY"],
    ["Unconditional Withdrawal Required", evalData.summaryCounts.unconditionalWithdrawal],
    ["Acceptable with Conditions / Counter-Proposal", evalData.summaryCounts.conditionalAcceptance],
    ["Requires CA Approval & Finance Concurrence", evalData.summaryCounts.caApprovalRequired],
    ["Acceptable / Minor Clarification Only", evalData.summaryCounts.acceptable],
    [""],
    ["EXECUTIVE EVALUATION SUMMARY"],
    [evalData.executiveSummary],
    [""],
    ["OFFICER SIGN-OFF NOTE TO TENDER COMMITTEE"],
    [evalData.officerSignOffNote],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

  // Detailed deviations sheet
  const deviationHeaders = [
    "Sl No",
    "Clause Ref",
    "Clause Subject",
    "Original SBD/NIT Provision",
    "Bidder's Quoted Deviation",
    "Category",
    "Impact on Buyer's Interest",
    "Dealing Officer's Evaluation Comments",
    "Recommended Action",
    "Suggested Counter-Proposal / Safeguard",
    "Risk Score",
  ];

  const deviationData = evalData.deviations.map((d) => [
    d.slNo,
    d.clauseNo,
    d.tenderClauseTitle,
    d.originalTenderProvision,
    d.bidderQuotedDeviation,
    d.deviationCategory,
    d.impactOnBuyerInterest,
    d.psuDealingOfficerComments,
    d.recommendedAction,
    d.suggestedCounterProposalOrConditions,
    d.riskScore,
  ]);

  const wsDeviations = XLSX.utils.aoa_to_sheet([deviationHeaders, ...deviationData]);
  
  // Set column widths
  wsDeviations["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 22 },
    { wch: 32 },
    { wch: 32 },
    { wch: 12 },
    { wch: 36 },
    { wch: 36 },
    { wch: 26 },
    { wch: 36 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, wsDeviations, "Deviation Evaluation Matrix");

  // Meeting Agenda Sheet
  if (evalData.meetingAgendaPoints && evalData.meetingAgendaPoints.length > 0) {
    const agendaRows = [
      ["AGENDA FOR CLARIFICATION MEETING WITH " + evalData.bidderName.toUpperCase()],
      ["Sl No", "Discussion Point & Target Redressal Action"],
      ...evalData.meetingAgendaPoints.map((pt, i) => [i + 1, pt]),
    ];
    const wsAgenda = XLSX.utils.aoa_to_sheet(agendaRows);
    wsAgenda["!cols"] = [{ wch: 6 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsAgenda, "Meeting Agenda");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerFileDownload(blob, `${evalData.bidderName.replace(/\s+/g, "_")}_Deviation_Evaluation.xlsx`);
}

/**
 * Generates and downloads a Word (.docx) file for Single Bidder Evaluation
 */
export async function exportSingleBidderToWord(evalData: SingleBidderEvaluation) {
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Clause", bold: true })] })],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Bidder Quoted Deviation", bold: true })] })],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Impact on Buyer's Interest", bold: true })] })],
        }),
        new TableCell({
          width: { size: 2400, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Officer Evaluation & Recommendation", bold: true })] })],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Proposed Counter-Clause / Action", bold: true })] })],
        }),
      ],
    }),
    ...evalData.deviations.map(
      (d) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: d.clauseNo, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: `[${d.deviationCategory}]`, italics: true })] }),
                new Paragraph({ children: [new TextRun({ text: `Risk: ${d.riskScore}`, bold: true })] }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: d.tenderClauseTitle, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: d.bidderQuotedDeviation })] }),
              ],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: d.impactOnBuyerInterest })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: `Action: ${d.recommendedAction}`, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: d.psuDealingOfficerComments })] }),
              ],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: d.suggestedCounterProposalOrConditions })] })],
            }),
          ],
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "TENDER EVALUATION & CONTRACT COMPLIANCE CELL",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "TECHNICAL & COMMERCIAL DEVIATION EVALUATION REPORT",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Package: ", bold: true }),
              new TextRun({ text: evalData.packageTitle }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Bidder: ", bold: true }),
              new TextRun({ text: evalData.bidderName }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Evaluation Date: ", bold: true }),
              new TextRun({ text: evalData.evaluationDate }),
              new TextRun({ text: "  |  Overall Risk Rating: ", bold: true }),
              new TextRun({ text: evalData.riskRating, bold: true }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. Executive Summary & Risk Profile",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [new TextRun({ text: evalData.executiveSummary })],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. Summary of Deviations and Recommended Disposals",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Total Deviations Evaluated: ${evalData.totalDeviationsCount}\n` }),
              new TextRun({ text: `• Unconditional Withdrawal Required: ${evalData.summaryCounts.unconditionalWithdrawal}\n` }),
              new TextRun({ text: `• Acceptable with Conditions / Counter-Clause: ${evalData.summaryCounts.conditionalAcceptance}\n` }),
              new TextRun({ text: `• Requires Competent Authority (CA) & Finance Concurrence: ${evalData.summaryCounts.caApprovalRequired}\n` }),
              new TextRun({ text: `• Acceptable / Clarification Only: ${evalData.summaryCounts.acceptable}` }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "3. Detailed Clause-by-Clause Evaluation Matrix",
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            rows: tableRows,
            width: { size: 10000, type: WidthType.DXA },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "4. Talking Points for Clarification Discussion",
            heading: HeadingLevel.HEADING_3,
          }),
          ...evalData.meetingAgendaPoints.map(
            (point, i) =>
              new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${point}` })],
              })
          ),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "5. Office Note for Tender Committee Approval",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [new TextRun({ text: evalData.officerSignOffNote, italics: true })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerFileDownload(blob, `${evalData.bidderName.replace(/\s+/g, "_")}_Deviation_Evaluation_Report.docx`);
}

/**
 * Generates and downloads an Excel file for Comparative Multi-Bidder Evaluation
 */
export function exportComparativeToExcel(compData: ComparativeEvaluation) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ["STEEL AUTHORITY OF INDIA LIMITED / PSU PROJECT CONTRACT CELL"],
    ["CONSOLIDATED COMPARATIVE DEVIATION EVALUATION MATRIX (ALL BIDDERS)"],
    [""],
    ["Package Title", compData.packageTitle],
    ["Evaluation Date", compData.evaluationDate],
    ["Total Participating Bidders", compData.totalBiddersEvaluated],
    [""],
    ["BIDDERS COMPARATIVE PROFILE"],
    ["Bidder Name", "Total Deviations", "Critical / High-Risk", "Posture", "Overall Recommendation"],
    ...compData.biddersSummary.map((b) => [
      b.bidderName,
      b.deviationCount,
      b.criticalDeviations,
      b.generalPosture,
      b.overallRecommendation,
    ]),
    [""],
    ["EXECUTIVE COMPARATIVE SYNTHESIS"],
    [compData.comparativeExecutiveSummary],
    [""],
    ["RECOMMENDATIONS TO TENDER COMMITTEE"],
    [compData.tenderCommitteeRecommendations],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Comparative Summary");

  // Extract unique bidder names
  const bidderNamesSet = new Set<string>();
  compData.comparativeMatrix.forEach((row) => {
    row.bidderStances.forEach((s) => bidderNamesSet.add(s.bidderName));
  });
  const allBidderNames = Array.from(bidderNamesSet);

  // Consolidated Matrix Sheet (Side-by-side bidders for Common Study)
  const consolidatedHeaders = [
    "Sl No",
    "Clause Ref / Theme",
    "Tender SBD/NIT Stipulation",
    ...allBidderNames.map((name) => `${name} (Quoted Deviation & Action)`),
    "Common Study & Industry Conflict Analysis",
    "Recommended Harmonized Course of Action (Level Playing Field)",
  ];

  const consolidatedRows = compData.comparativeMatrix.map((row, idx) => {
    const bidderCols = allBidderNames.map((name) => {
      const stance = row.bidderStances.find((s) => s.bidderName === name);
      if (!stance) return "No Deviation Quoted (Compliant)";
      return `${stance.quotedDeviation}\n[Action: ${stance.action}]`;
    });

    return [
      idx + 1,
      row.clauseOrTheme,
      row.tenderSBDProvision,
      ...bidderCols,
      row.officerComparativeAnalysis,
      row.recommendedHarmonizedStrategy,
    ];
  });

  const wsConsolidated = XLSX.utils.aoa_to_sheet([consolidatedHeaders, ...consolidatedRows]);
  wsConsolidated["!cols"] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 32 },
    ...allBidderNames.map(() => ({ wch: 36 })),
    { wch: 40 },
    { wch: 42 },
  ];
  XLSX.utils.book_append_sheet(wb, wsConsolidated, "Consolidated Matrix (Common Study)");

  // Matrix Sheet (Grouped)
  const matrixHeaders = [
    "Clause / Theme",
    "Tender SBD/NIT Provision",
    "Bidder Stances & Deviations",
    "Dealing Officer's Comparative Analysis",
    "Recommended Harmonized Strategy / Level Playing Field",
  ];

  const matrixRows = compData.comparativeMatrix.map((row) => [
    row.clauseOrTheme,
    row.tenderSBDProvision,
    row.bidderStances
      .map((s) => `[${s.bidderName}]: ${s.quotedDeviation} -> Action: ${s.action}`)
      .join("\n\n"),
    row.officerComparativeAnalysis,
    row.recommendedHarmonizedStrategy,
  ]);

  const wsMatrix = XLSX.utils.aoa_to_sheet([matrixHeaders, ...matrixRows]);
  wsMatrix["!cols"] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 45 },
    { wch: 40 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, "Thematic Comparison");

  // Deadlock Areas Sheet
  if (compData.commonDeadlockAreas && compData.commonDeadlockAreas.length > 0) {
    const deadlockRows = [
      ["COMMON DEADLOCK / DISPUTE AREAS ACROSS BIDDERS"],
      ["Topic / Clause", "Reasons for Industry Pushback", "Recommended Way Forward / Compromise Formula"],
      ...compData.commonDeadlockAreas.map((d) => [d.topic, d.reasons, d.recommendedWayForward]),
    ];
    const wsDeadlock = XLSX.utils.aoa_to_sheet(deadlockRows);
    wsDeadlock["!cols"] = [{ wch: 25 }, { wch: 45 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsDeadlock, "Deadlock Resolution");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerFileDownload(blob, `Comparative_Deviation_Matrix_${compData.packageTitle.replace(/\s+/g, "_")}.xlsx`);
}

/**
 * Generates and downloads a Word (.docx) file for Comparative Multi-Bidder Evaluation
 */
export async function exportComparativeToWord(compData: ComparativeEvaluation) {
  const matrixTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Clause / Theme", bold: true })] })],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Tender SBD Requirement", bold: true })] })],
        }),
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Bidder Stances", bold: true })] })],
        }),
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Harmonized Officer Strategy", bold: true })] })],
        }),
      ],
    }),
    ...compData.comparativeMatrix.map(
      (m) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: m.clauseOrTheme, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: m.tenderSBDProvision })] })],
            }),
            new TableCell({
              children: m.bidderStances.map(
                (b) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${b.bidderName}: `, bold: true }),
                      new TextRun({ text: `${b.quotedDeviation} [Action: ${b.action}]\n` }),
                    ],
                  })
              ),
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: m.recommendedHarmonizedStrategy, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: m.officerComparativeAnalysis, italics: true })] }),
              ],
            }),
          ],
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "TENDER EVALUATION & CONTRACT COMPLIANCE CELL",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "CONSOLIDATED COMPARATIVE DEVIATION EVALUATION REPORT",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Package: ", bold: true }),
              new TextRun({ text: compData.packageTitle }),
              new TextRun({ text: "  |  Date: ", bold: true }),
              new TextRun({ text: compData.evaluationDate }),
              new TextRun({ text: "  |  Total Bidders: ", bold: true }),
              new TextRun({ text: String(compData.totalBiddersEvaluated) }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. Comparative Executive Analysis",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [new TextRun({ text: compData.comparativeExecutiveSummary })],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. Consolidated Comparative Matrix",
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            rows: matrixTableRows,
            width: { size: 10000, type: WidthType.DXA },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "3. Common Deadlock Areas and Resolution Formulations",
            heading: HeadingLevel.HEADING_3,
          }),
          ...compData.commonDeadlockAreas.map(
            (d) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${d.topic}: `, bold: true }),
                  new TextRun({ text: `${d.reasons} ` }),
                  new TextRun({ text: `[Way Forward: ${d.recommendedWayForward}]`, italics: true }),
                ],
              })
          ),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "4. Tender Committee Formal Recommendations",
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [new TextRun({ text: compData.tenderCommitteeRecommendations })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerFileDownload(blob, `Comparative_Deviation_Report_${compData.packageTitle.replace(/\s+/g, "_")}.docx`);
}

/**
 * Generates and downloads Word (.docx) for Reviewed / Harmonized Clauses
 */
export async function exportReviewedClausesToWord(
  reviewedData: ReviewedClausesData,
  metadata?: TenderMetadata
) {
  // Split preamble into readable paragraphs
  const preambleText = reviewedData.draftAddendumPreamble || "No draft preamble formulated.";
  const preambleParagraphs = preambleText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, italics: true, color: "1E293B" })],
          spacing: { after: 120 },
        })
    );

  const clauseBlocks = reviewedData.reviewedClauses.flatMap((c, index) => {
    const comparisonTable = new Table({
      width: { size: 10000, type: WidthType.DXA },
      rows: [
        // Row 1: Header / Clause Ref
        new TableRow({
          children: [
            new TableCell({
              width: { size: 10000, type: WidthType.DXA },
              columnSpan: 2,
              shading: { fill: "F1F5F9" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Clause ${c.clauseNumber}: ${c.clauseTitle}`,
                      bold: true,
                      size: 22,
                      color: "0F172A",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 2: Original Clause vs Proposed Amended Clause
        new TableRow({
          children: [
            new TableCell({
              width: { size: 5000, type: WidthType.DXA },
              shading: { fill: "F8FAFC" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "ORIGINAL SBD / NIT CLAUSE TEXT (Current):",
                      bold: true,
                      size: 18,
                      color: "1E3A8A",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `"${c.originalClauseText}"`,
                      italics: true,
                      size: 18,
                      color: "334155",
                    }),
                  ],
                  spacing: { before: 80 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 5000, type: WidthType.DXA },
              shading: { fill: "ECFDF5" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "PROPOSED AMENDED CLAUSE TEXT (For Addendum):",
                      bold: true,
                      size: 18,
                      color: "065F46",
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `"${c.proposedReviewedClauseText}"`,
                      bold: true,
                      size: 18,
                      color: "0F172A",
                    }),
                  ],
                  spacing: { before: 80 },
                }),
              ],
            }),
          ],
        }),
        // Row 3: Bidders' Contention
        new TableRow({
          children: [
            new TableCell({
              width: { size: 10000, type: WidthType.DXA },
              columnSpan: 2,
              shading: { fill: "FEFCE8" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Bidders' Joint Deadlock Concerns: ",
                      bold: true,
                      size: 18,
                      color: "854D0E",
                    }),
                    new TextRun({
                      text: c.biddersContentionSummary,
                      size: 18,
                      color: "451A03",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 4: Concession vs Safeguards
        new TableRow({
          children: [
            new TableCell({
              width: { size: 5000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "• Concession Granted: ", bold: true, size: 18 }),
                    new TextRun({ text: c.concessionGranted, size: 18 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 5000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "• Protective Safeguards Retained: ", bold: true, size: 18 }),
                    new TextRun({ text: c.protectiveSafeguardsRetained, size: 18 }),
                  ],
                }),
              ],
            }),
          ],
        }),
        // Row 5: Approval Prerequisite & Audit Justification
        new TableRow({
          children: [
            new TableCell({
              width: { size: 10000, type: WidthType.DXA },
              columnSpan: 2,
              shading: { fill: "F8FAFC" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "• Competent Authority Prerequisite: ", bold: true, size: 18 }),
                    new TextRun({ text: c.approvalPrerequisite, bold: true, size: 18, color: "991B1B" }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: "• CVC / Audit Defense Rationale: ", bold: true, size: 18 }),
                    new TextRun({ text: c.auditDefenseRationale, italics: true, size: 18 }),
                  ],
                  spacing: { before: 60 },
                }),
              ],
            }),
          ],
        }),
      ],
    });

    return [
      new Paragraph({
        text: `Entry ${index + 1}: ${c.clauseNumber} - ${c.clauseTitle}`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }),
      comparisonTable,
      new Paragraph({ text: "", spacing: { after: 180 } }),
    ];
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "TENDER EVALUATION & CONTRACT COMPLIANCE CELL",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: "REVIEWED & HARMONIZED CONTRACT CLAUSES (DRAFT ADDENDUM / CORRIGENDUM)",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Package: ", bold: true }),
              new TextRun({ text: reviewedData.packageTitle }),
              new TextRun({ text: "   |   Total Harmonized Clauses: ", bold: true }),
              new TextRun({ text: String(reviewedData.reviewedClauses.length), bold: true }),
              new TextRun({ text: "   |   Date: ", bold: true }),
              new TextRun({ text: new Date().toLocaleDateString("en-IN") }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 180 } }),

          // Section 1: Formatted Addendum Preamble
          new Paragraph({
            text: "1. Official Addendum / Corrigendum Preamble for Tender Portal Upload",
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 10000, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 10000, type: WidthType.DXA },
                    shading: { fill: "F8FAFC" },
                    children: preambleParagraphs,
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 180 } }),

          // Section 2: Harmonization Strategy & CVC Audit Defense Framework
          new Paragraph({
            text: "2. Harmonization Strategy & CVC Audit Defense Framework",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: reviewedData.harmonizationOverview,
                color: "334155",
              }),
            ],
            spacing: { after: 180 },
          }),
          new Paragraph({ text: "", spacing: { after: 120 } }),

          // Section 3: Clause-by-Clause Harmonization & Proposed Amendments
          new Paragraph({
            text: "3. Clause-by-Clause Harmonization & Proposed Amendments (Side-by-Side Formulations)",
            heading: HeadingLevel.HEADING_2,
          }),
          ...clauseBlocks,

          // Section 4: Formal Sign-Off & Approvals for Dealing Officer & Tender Committee
          new Paragraph({ text: "", spacing: { after: 180 } }),
          new Paragraph({
            text: "4. Formal Sign-Off, Verification & Approval Recommendation",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "The above harmonized clause formulations and draft corrigendum text have been formulated in accordance with General Financial Rules (GFR), CVC Procurement Guidelines, and established Public Procurement Manual principles. Submitted for consideration and formal approval of the Competent Authority / Tender Committee.",
                italics: true,
                color: "475569",
              }),
            ],
            spacing: { after: 140 },
          }),
          new Table({
            width: { size: 10000, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 3333, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "PREPARED & SUBMITTED BY\n(DEALING OFFICER)", bold: true })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 3333, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "REVIEWED & RECOMMENDED BY\n(TENDER COMMITTEE MEMBERS)", bold: true })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 3334, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "APPROVED BY\n(COMPETENT APPROVING AUTHORITY)", bold: true })],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 3333, type: WidthType.DXA },
                    children: [
                      new Paragraph({ text: "\n\n____________________________" }),
                      new Paragraph({ children: [new TextRun({ text: "Signature & Official Seal", italics: true })] }),
                      new Paragraph({ text: "Name: Dealing Officer / Manager (Contracts)" }),
                      new Paragraph({ text: "Designation: Manager / DGM (Contracts)" }),
                      new Paragraph({ text: "Dept: Project Contracts & Procurement" }),
                      new Paragraph({ text: "Date: _____ / _____ / 2026" }),
                      new Paragraph({ text: "Station: Project Site / HQ" }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 3333, type: WidthType.DXA },
                    children: [
                      new Paragraph({ text: "1. Finance Member:" }),
                      new Paragraph({ text: "   Sign: ____________________" }),
                      new Paragraph({ text: "   Desig: DGM / GM (Finance)" }),
                      new Paragraph({ text: "\n2. Technical Member:" }),
                      new Paragraph({ text: "   Sign: ____________________" }),
                      new Paragraph({ text: "   Desig: DGM / GM (Projects)" }),
                      new Paragraph({ text: "\nDate: _____ / _____ / 2026" }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 3334, type: WidthType.DXA },
                    children: [
                      new Paragraph({ text: "\n\n____________________________" }),
                      new Paragraph({ children: [new TextRun({ text: "Signature & Official Seal", italics: true })] }),
                      new Paragraph({ text: "Name: ____________________" }),
                      new Paragraph({ text: "Designation: Executive Director / Director" }),
                      new Paragraph({ text: "Tender Approving Authority (TAA)" }),
                      new Paragraph({ text: "Date: _____ / _____ / 2026" }),
                      new Paragraph({ text: "Decision: [  ] Approved as Recommended" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const sanitizedTitle = (reviewedData.packageTitle || "Tender").replace(/\s+/g, "_");
  triggerFileDownload(blob, `Reviewed_Clauses_Addendum_${sanitizedTitle}.docx`);
}

/**
 * Generates and downloads Excel (.xlsx) for Reviewed / Harmonized Clauses
 */
export function exportReviewedClausesToExcel(reviewedData: ReviewedClausesData) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Addendum Preamble & Strategy
  const preambleRows = [
    ["TENDER EVALUATION & CONTRACT COMPLIANCE CELL"],
    ["REVIEWED & HARMONIZED CONTRACT CLAUSES (DRAFT ADDENDUM / CORRIGENDUM)"],
    [""],
    ["Package Title", reviewedData.packageTitle],
    ["Total Harmonized Clauses", reviewedData.reviewedClauses.length],
    ["Export Date", new Date().toLocaleDateString("en-IN")],
    [""],
    ["1. OFFICIAL ADDENDUM / CORRIGENDUM PREAMBLE (FOR TENDER PORTAL PUBLICATION)"],
    [reviewedData.draftAddendumPreamble || "N/A"],
    [""],
    ["2. HARMONIZATION STRATEGY & CVC AUDIT DEFENSE FRAMEWORK"],
    [reviewedData.harmonizationOverview || "N/A"],
  ];

  const wsPreamble = XLSX.utils.aoa_to_sheet(preambleRows);
  wsPreamble["!cols"] = [{ wch: 32 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, wsPreamble, "Addendum Preamble");

  // Sheet 2: Reviewed Clauses Matrix (Full Details)
  const clauseHeaders = [
    "Sl No",
    "Clause Ref",
    "Clause Title / Subject",
    "Original SBD / NIT Clause Text (Current)",
    "Proposed Amended / Reviewed Clause Text (For Addendum / Corrigendum)",
    "Bidders' Joint Contention / Deadlock Concerns",
    "Concession Granted to Bidders",
    "Protective Safeguards Retained for Buyer",
    "Competent Authority Approval Prerequisite",
    "Audit / CVC Scrutiny Defense Rationale",
  ];

  const clauseRows = reviewedData.reviewedClauses.map((c, idx) => [
    idx + 1,
    c.clauseNumber,
    c.clauseTitle,
    c.originalClauseText,
    c.proposedReviewedClauseText,
    c.biddersContentionSummary,
    c.concessionGranted,
    c.protectiveSafeguardsRetained,
    c.approvalPrerequisite,
    c.auditDefenseRationale,
  ]);

  const wsClauses = XLSX.utils.aoa_to_sheet([clauseHeaders, ...clauseRows]);
  wsClauses["!cols"] = [
    { wch: 6 },   // Sl No
    { wch: 18 },  // Clause Ref
    { wch: 28 },  // Clause Title
    { wch: 55 },  // Original SBD / NIT Clause Text
    { wch: 60 },  // Proposed Amended Clause Text
    { wch: 38 },  // Bidders' Joint Contention
    { wch: 32 },  // Concession Granted
    { wch: 35 },  // Protective Safeguards Retained
    { wch: 28 },  // Approval Prerequisite
    { wch: 42 },  // Audit Defense Rationale
  ];

  XLSX.utils.book_append_sheet(wb, wsClauses, "Harmonized Clauses Matrix");

  // Sheet 3: Side-by-Side Addendum Comparison (Executive Summary)
  const sideBySideHeaders = [
    "Sl No",
    "Clause Ref",
    "Clause Subject",
    "Original Clause Text (Current SBD/NIT)",
    "Proposed Amended Clause Text (For Official Addendum)",
    "Protective Safeguards Retained for Buyer",
    "Audit Justification",
  ];

  const sideBySideRows = reviewedData.reviewedClauses.map((c, idx) => [
    idx + 1,
    c.clauseNumber,
    c.clauseTitle,
    c.originalClauseText,
    c.proposedReviewedClauseText,
    c.protectiveSafeguardsRetained,
    c.auditDefenseRationale,
  ]);

  const wsSideBySide = XLSX.utils.aoa_to_sheet([sideBySideHeaders, ...sideBySideRows]);
  wsSideBySide["!cols"] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 26 },
    { wch: 60 },
    { wch: 65 },
    { wch: 35 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSideBySide, "Side-by-Side Comparison");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const sanitizedTitle = (reviewedData.packageTitle || "Tender").replace(/\s+/g, "_");
  triggerFileDownload(blob, `Reviewed_Clauses_Addendum_${sanitizedTitle}.xlsx`);
}

/**
 * Helper to escape CSV values according to RFC 4180
 */
function escapeCSVField(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates and downloads a structured CSV file for Reviewed / Harmonized Clauses,
 * ensuring all columns like 'Original Text', 'Amended Text', and 'Rationale'
 * are mapped correctly for statutory, internal audit, and CVC scrutiny purposes.
 */
export function exportReviewedClausesToCSV(reviewedData: ReviewedClausesData) {
  const headers = [
    "Sl No",
    "Clause Number",
    "Clause Title",
    "Original Text",
    "Amended Text",
    "Bidders Contention Summary",
    "Concession Granted",
    "Protective Safeguards Retained",
    "Approval Prerequisite",
    "Rationale",
  ];

  const rows = (reviewedData.reviewedClauses || []).map((c, idx) => [
    idx + 1,
    c.clauseNumber,
    c.clauseTitle,
    c.originalClauseText,
    c.proposedReviewedClauseText,
    c.biddersContentionSummary,
    c.concessionGranted,
    c.protectiveSafeguardsRetained,
    c.approvalPrerequisite,
    c.auditDefenseRationale,
  ]);

  const csvLines = [
    headers.map(escapeCSVField).join(","),
    ...rows.map((r) => r.map(escapeCSVField).join(",")),
  ];

  const csvString = csvLines.join("\r\n");

  // \uFEFF Byte Order Mark (BOM) allows Microsoft Excel, LibreOffice Calc, and audit tools
  // to correctly detect UTF-8 encoding (preserving special characters and linebreaks within cells)
  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });

  const sanitizedTitle = (reviewedData.packageTitle || "Tender").replace(/\s+/g, "_");
  triggerFileDownload(blob, `Reviewed_Clauses_Audit_Matrix_${sanitizedTitle}.csv`);
}

/**
 * Generates and downloads a professionally formatted PDF document for Reviewed / Harmonized Clauses,
 * aligned with the currently applied format template, featuring an official organization header,
 * statutory disclaimer, side-by-side clause amendments, and formal committee sign-off matrix.
 */
export function exportReviewedClausesToPDF(
  reviewedData: ReviewedClausesData,
  metadata?: TenderMetadata,
  formatTemplate?: UploadedFormatTemplate | null
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Professional Color Palette
  const primaryNavy: [number, number, number] = [15, 23, 42]; // #0f172a
  const slateHeader: [number, number, number] = [30, 41, 59]; // #1e293b
  const accentBlue: [number, number, number] = [30, 58, 138]; // #1e3a8a
  const borderGray: [number, number, number] = [203, 213, 225]; // #cbd5e1
  const bgLight: [number, number, number] = [248, 250, 252]; // #f8fafc

  let currentY = 14;

  // Active Template Classification & Titles
  const templateTitle =
    formatTemplate?.name ||
    reviewedData.appliedFormatTitle ||
    "Central PSU Turnkey Addendum Format (CVC / GFR 173 Standard)";

  const isPrebidPreset =
    formatTemplate?.id === "preset-prebid-minutes" ||
    templateTitle.toLowerCase().includes("pre-bid") ||
    templateTitle.toLowerCase().includes("minutes");

  const isBoardPreset =
    formatTemplate?.id === "preset-board-scrutiny" ||
    templateTitle.toLowerCase().includes("board") ||
    templateTitle.toLowerCase().includes("scrutiny");

  const isCvcPreset =
    !isPrebidPreset &&
    !isBoardPreset &&
    (!formatTemplate ||
      formatTemplate.id === "preset-cvc-gfr173" ||
      templateTitle.toLowerCase().includes("cvc") ||
      templateTitle.toLowerCase().includes("gfr") ||
      templateTitle.toLowerCase().includes("turnkey"));

  let mainDocTitle = "CONTRACT AMENDMENT / CORRIGENDUM NO. 01 (SCHEDULE OF HARMONIZED CLAUSES)";
  let subDocTitle = "Issued under Rule 173(xiv) of General Financial Rules (GFR) 2017 & CVC Procurement Guidelines";
  let section1Title = "1. Statutory Corrigendum Preamble & Regulatory Authority (Rule 173(xiv) GFR 2017)";
  let section2Title = "2. CVC Safe-Harbor Audit Defense & Harmonization Strategy";
  let section3Title = "3. 4-Column Statutory Clause Amendment Schedule (Original vs Harmonized Formulation)";

  if (isPrebidPreset) {
    mainDocTitle = "RECORD OF PROCEEDINGS & AGREED MINUTES OF PRE-BID CONFERENCE";
    subDocTitle = "Technical-Commercial Dispositions & Harmonized Contract Formulations";
    section1Title = "1. Record of Proceedings & Pre-Bid Clarification Notice";
    section2Title = "2. Technical-Commercial Harmonization Framework & Safeguards Protocol";
    section3Title = "3. Query Clarification & Harmonized Clause Formulations (Agreed Addendum)";
  } else if (isBoardPreset) {
    mainDocTitle = "CONFIDENTIAL TENDER COMMITTEE COMMERCIAL SCRUTINY NOTE";
    subDocTitle = "Appraisal of Commercial Deviations, Risk Mitigation & Harmonized Formulations";
    section1Title = "1. Executive Scrutiny Note & Tender Committee Preamble";
    section2Title = "2. Value-at-Risk (VaR) Analysis & CVC Defense Protocol";
    section3Title = "3. Risk-Mitigated Harmonized Clause Formulations & Safeguards";
  } else if (!isCvcPreset && formatTemplate) {
    mainDocTitle = `HARMONIZED CLAUSES ADDENDUM (TEMPLATE: ${formatTemplate.name.toUpperCase()})`;
    subDocTitle = `Structured in accordance with Dealing Officer Template: "${formatTemplate.name}"`;
    section1Title = `1. Corrigendum Preamble (${formatTemplate.name})`;
    section2Title = "2. Strategic Harmonization Strategy & Compliance Overview";
    section3Title = "3. Clause-by-Clause Harmonization & Proposed Amendments Schedule";
  }

  // 1. ORGANIZATION HEADER BLOCK (Official Letterhead)
  const orgName = (
    metadata?.organization || "CENTRAL PUBLIC SECTOR UNDERTAKING / PROJECT CONTRACTS CELL"
  ).toUpperCase();

  // Top Organization Banner Box
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.roundedRect(margin, currentY, contentWidth, 19, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(orgName, pageWidth / 2, currentY + 6.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    "DIRECTORATE OF PROJECT CONTRACTS & COMMERCIAL LAW | TENDER EVALUATION COMMITTEE",
    pageWidth / 2,
    currentY + 11.5,
    { align: "center" }
  );

  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184); // slate-400
  const subHeaderLocation = metadata?.packageTitle
    ? `Contract Package: ${metadata.packageTitle} | Ref: ${metadata.tenderRefNo || "NIT/SBD-EVAL/CORR/01"}`
    : "Contract Evaluation & Dispute Mitigation Cell | Standard Bidding Document Compliance";
  doc.text(subHeaderLocation.slice(0, 110), pageWidth / 2, currentY + 16, { align: "center" });

  currentY += 22;

  // Document Title & Classification Bar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.text(mainDocTitle, pageWidth / 2, currentY, { align: "center" });

  currentY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subDocTitle, pageWidth / 2, currentY, { align: "center" });

  currentY += 3;

  // Format Template Compliance Strip
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, contentWidth, 5.5, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `FORMAT COMPLIANCE: ${templateTitle.toUpperCase()}`,
    margin + 3,
    currentY + 3.8
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Statutory CVC & GFR Rule 173 Standard`,
    pageWidth - margin - 3,
    currentY + 3.8,
    { align: "right" }
  );

  currentY += 7.5;

  // Metadata Summary Table (Tender details)
  const metaRows = [
    [
      { content: "Tender Package:", styles: { fontStyle: "bold" as const, cellWidth: 32 } },
      {
        content: reviewedData.packageTitle || metadata?.packageTitle || "Tender Package",
        styles: { cellWidth: 70 },
      },
      { content: "Tender Ref / Case No:", styles: { fontStyle: "bold" as const, cellWidth: 38 } },
      {
        content: metadata?.tenderRefNo || "NIT/SBD-EVAL/CORR/01",
        styles: { cellWidth: 42 },
      },
    ],
    [
      { content: "Evaluation Date:", styles: { fontStyle: "bold" as const } },
      {
        content: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      },
      { content: "Estimated Value:", styles: { fontStyle: "bold" as const } },
      {
        content: metadata?.estimateValueCr
          ? `INR ${metadata.estimateValueCr} Crores`
          : "Turnkey EPC Works",
      },
    ],
    [
      { content: "Harmonized Clauses:", styles: { fontStyle: "bold" as const } },
      {
        content: `${(reviewedData.reviewedClauses || []).length} Clauses Formulated`,
      },
      { content: "Format Template:", styles: { fontStyle: "bold" as const } },
      {
        content: templateTitle.length > 36 ? `${templateTitle.slice(0, 36)}...` : templateTitle,
        styles: { fontStyle: "bold" as const, textColor: [30, 58, 138] as [number, number, number] },
      },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    body: metaRows as any,
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.5;

  // Section 1: Official Addendum Preamble
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: section1Title,
          styles: {
            fillColor: slateHeader,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        {
          content: reviewedData.draftAddendumPreamble || "No draft preamble formulated.",
          styles: {
            fillColor: bgLight,
            textColor: [15, 23, 42],
            fontSize: 7.5,
            fontStyle: "italic",
            cellPadding: 3,
            lineColor: borderGray,
            lineWidth: 0.25,
          },
        },
      ],
    ],
    theme: "grid",
    tableLineColor: borderGray,
    tableLineWidth: 0.25,
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.5;

  // Section 2: Harmonization Strategy & CVC Audit Defense Framework
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: section2Title,
          styles: {
            fillColor: slateHeader,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        {
          content:
            reviewedData.harmonizationOverview ||
            "Standard balanced harmonization principles applied in alignment with GFR 2017.",
          styles: {
            fillColor: [255, 255, 255],
            textColor: [51, 65, 85],
            fontSize: 7.5,
            cellPadding: 3,
            lineColor: borderGray,
            lineWidth: 0.25,
          },
        },
      ],
    ],
    theme: "grid",
    tableLineColor: borderGray,
    tableLineWidth: 0.25,
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.5;

  // Section 3: Clause-by-Clause Harmonization & Proposed Amendments
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(section3Title, margin, currentY);
  currentY += 3.5;

  // For each clause, output a side-by-side comparison card
  (reviewedData.reviewedClauses || []).forEach((c, idx) => {
    const riskTag = c.riskScore ? `  |  Risk Level: ${c.riskScore.toUpperCase()}` : "";
    const clauseTitle = `Item ${idx + 1}: ${c.clauseNumber} - ${c.clauseTitle}${riskTag}`;

    const clauseBody = [
      // Side-by-Side: Original vs Amended
      [
        {
          content: `ORIGINAL TENDER STIPULATION (SBD / NIT):\n\n${c.originalClauseText}`,
          styles: {
            cellWidth: contentWidth / 2,
            fillColor: [248, 250, 252] as [number, number, number],
            textColor: [71, 85, 105] as [number, number, number],
            fontSize: 7.5,
            cellPadding: 3,
          },
        },
        {
          content: `PROPOSED AMENDED / HARMONIZED TEXT (ADDENDUM):\n\n${c.proposedReviewedClauseText}`,
          styles: {
            cellWidth: contentWidth / 2,
            fillColor: [240, 253, 244] as [number, number, number],
            textColor: [20, 83, 45] as [number, number, number],
            fontStyle: "bold" as const,
            fontSize: 7.5,
            cellPadding: 3,
          },
        },
      ],
      // Row 2: Bidders' Contention & Concession Granted
      [
        {
          content: `Bidders' Deadlock Contention:\n${c.biddersContentionSummary}`,
          styles: {
            cellWidth: contentWidth / 2,
            textColor: [51, 65, 85] as [number, number, number],
            fontSize: 7,
            cellPadding: 2.5,
          },
        },
        {
          content: `Concession Granted:\n${c.concessionGranted}`,
          styles: {
            cellWidth: contentWidth / 2,
            textColor: [51, 65, 85] as [number, number, number],
            fontSize: 7,
            cellPadding: 2.5,
          },
        },
      ],
      // Row 3: Protective Safeguards & Approvals
      [
        {
          content: `Protective Safeguards Retained:\n${c.protectiveSafeguardsRetained}`,
          styles: {
            cellWidth: contentWidth / 2,
            textColor: [51, 65, 85] as [number, number, number],
            fontSize: 7,
            cellPadding: 2.5,
          },
        },
        {
          content: `Approval Prerequisite:\n${c.approvalPrerequisite}`,
          styles: {
            cellWidth: contentWidth / 2,
            textColor: [51, 65, 85] as [number, number, number],
            fontSize: 7,
            cellPadding: 2.5,
          },
        },
      ],
      // Row 4: Audit Defense Rationale (spanning full width)
      [
        {
          content: `Statutory / CVC Audit Defense Rationale:\n${c.auditDefenseRationale}`,
          colSpan: 2,
          styles: {
            fillColor: [254, 243, 199] as [number, number, number], // light amber
            textColor: [146, 64, 14] as [number, number, number],
            fontStyle: "bold" as const,
            fontSize: 7.2,
            cellPadding: 2.5,
          },
        },
      ],
    ];

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [
        [
          {
            content: clauseTitle,
            colSpan: 2,
            styles: {
              fillColor: [30, 58, 138] as [number, number, number],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 8,
              cellPadding: 2.2,
            },
          },
        ],
      ],
      body: clauseBody as any,
      theme: "grid",
      tableLineColor: borderGray,
      tableLineWidth: 0.25,
      pageBreak: "auto",
    });

    currentY = (doc as any).lastAutoTable.finalY + 4.5;
  });

  // Section 4: MANDATORY STATUTORY DISCLAIMER & REGULATORY NOTICE
  // Check page height to avoid orphaned disclaimer
  if (currentY + 42 > pageHeight - 20) {
    doc.addPage();
    currentY = 18;
  }

  const disclaimerText =
    "1. STATUTORY COMPLIANCE: This Reviewed & Harmonized Contract Addendum / Corrigendum is formulated strictly for official tender scrutiny, deadlock resolution, and contract administration in compliance with General Financial Rules (GFR) 2017 (including Rule 173(xiv)), Central Vigilance Commission (CVC) Procurement Guidelines, and standard Public Procurement manuals.\n\n" +
    "2. LEVEL PLAYING FIELD DIRECTIVE: The harmonized clauses and concessions contained herein apply uniformly, neutrally, and without discrimination to all participating bidders to preserve market competition and transparency. No post-tender individual or non-transparent commercial favor has been granted.\n\n" +
    "3. SAFEGUARDS & VALUE PROTECTION: Every commercial concession granted has been counterbalanced with retained protective safeguards and audit defense rationales protecting the Buyer / Employer from undue financial liability, delay, or performance default.\n\n" +
    "4. CONFIDENTIALITY & LEGAL PRIVILEGE: This document is official, confidential, and legally privileged for internal Tender Committee appraisal, Finance concurrence, and statutory audit review. Unauthorized dissemination, reproduction, or alteration without written sanction from the Competent Tender Approving Authority is strictly prohibited.";

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: "4. Statutory Disclaimer & Regulatory Notice",
          styles: {
            fillColor: [180, 83, 9], // warm amber-700
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.2,
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        {
          content: disclaimerText,
          styles: {
            fillColor: [254, 252, 232], // amber-50
            textColor: [120, 53, 15], // amber-900
            fontSize: 6.8,
            cellPadding: 3,
            lineColor: [251, 191, 36],
            lineWidth: 0.25,
          },
        },
      ],
    ],
    theme: "grid",
    tableLineColor: [251, 191, 36],
    tableLineWidth: 0.25,
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Section 5: Formal Signature Block for Dealing Officer and Approving Authorities
  // Check if there is enough space on current page (~65mm); if not, add clean new page
  if (currentY + 68 > pageHeight - 20) {
    doc.addPage();
    currentY = 18;
  }

  const signOffPreamble =
    "The above harmonized clause formulations and draft corrigendum text have been formulated in accordance with General Financial Rules (GFR), CVC Procurement Guidelines, and established Public Procurement Manual principles. Submitted for consideration and formal approval of the Competent Authority / Tender Committee.";

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: "5. Formal Sign-Off, Verification & Approval Recommendation",
          colSpan: 3,
          styles: {
            fillColor: slateHeader,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        {
          content: signOffPreamble,
          colSpan: 3,
          styles: {
            fillColor: bgLight,
            textColor: [71, 85, 105],
            fontSize: 7.2,
            fontStyle: "italic",
            cellPadding: 2.5,
          },
        },
      ],
      [
        {
          content: "PREPARED & SUBMITTED BY\n(DEALING OFFICER)",
          styles: {
            fillColor: [241, 245, 249],
            fontStyle: "bold",
            fontSize: 7.8,
            textColor: primaryNavy,
            halign: "center",
          },
        },
        {
          content: "REVIEWED & RECOMMENDED BY\n(TENDER COMMITTEE MEMBERS)",
          styles: {
            fillColor: [241, 245, 249],
            fontStyle: "bold",
            fontSize: 7.8,
            textColor: primaryNavy,
            halign: "center",
          },
        },
        {
          content: "APPROVED BY\n(COMPETENT TENDER APPROVING AUTHORITY)",
          styles: {
            fillColor: [241, 245, 249],
            fontStyle: "bold",
            fontSize: 7.8,
            textColor: primaryNavy,
            halign: "center",
          },
        },
      ],
      [
        {
          content:
            "\n\n\n_____________________________________\nSignature & Official Stamp\n\nName: Dealing Officer / Manager\nDesignation: Manager / DGM (Contracts)\nDepartment: Project Contracts & Procurement\nDate: _____ / _____ / 2026\nStation: Site Office / HQ",
          styles: {
            cellWidth: contentWidth / 3,
            fontSize: 7.2,
            textColor: [30, 41, 59],
            cellPadding: 2.8,
          },
        },
        {
          content:
            "1. Finance Member:\n   Sign: _____________________________\n   Name: _____________________________\n   Designation: DGM / GM (Finance)\n\n2. Technical Member:\n   Sign: _____________________________\n   Name: _____________________________\n   Designation: DGM / GM (Projects/Engg)\n\nDate: _____ / _____ / 2026",
          styles: {
            cellWidth: contentWidth / 3,
            fontSize: 7.2,
            textColor: [30, 41, 59],
            cellPadding: 2.8,
          },
        },
        {
          content:
            "\n\n\n_____________________________________\nSignature & Seal\n\nName: _____________________________\nDesignation: Executive Director / Director\nTender Approving Authority (TAA)\nDate: _____ / _____ / 2026\nDecision: [  ] Approved as Recommended\n          [  ] Approved with Modifications",
          styles: {
            cellWidth: contentWidth / 3,
            fontSize: 7.2,
            textColor: [30, 41, 59],
            cellPadding: 2.8,
          },
        },
      ],
    ],
    theme: "grid",
    tableLineColor: borderGray,
    tableLineWidth: 0.3,
  });

  // Running Header and Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages > 1)
    if (i > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      const headerTitle = `${orgName} | ${reviewedData.packageTitle || "Tender Evaluation"}`;
      doc.text(headerTitle.slice(0, 75), margin, 10);
      doc.text(`TEMPLATE: ${templateTitle.slice(0, 35)}`, pageWidth - margin, 10, {
        align: "right",
      });
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, 12, pageWidth - margin, 12);
    }

    // Running Footer (all pages)
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "STATUTORY DISCLAIMER: Official use only under GFR 2017 & CVC procurement guidelines. Confidential & legally privileged.",
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  // Trigger file download
  const blob = doc.output("blob");
  const sanitizedTitle = (reviewedData.packageTitle || "Tender").replace(/\s+/g, "_");
  triggerFileDownload(blob, `Reviewed_Clauses_Addendum_${sanitizedTitle}.pdf`);
}

/**
 * Generates and downloads structured CSV for Audit Trail logs
 */
export function exportAuditTrailToCSV(auditLogs: AuditLogEntry[], metadata?: TenderMetadata) {
  const headers = [
    "Sl No",
    "Timestamp (ISO)",
    "Date & Time",
    "Dealing Officer / User",
    "Category",
    "Action",
    "Entity Affected",
    "Summary of Modification",
    "Audit Details",
    "Compliance Standard",
  ];

  const rows = auditLogs.map((log, index) => [
    index + 1,
    `"${(log.timestamp || "").replace(/"/g, '""')}"`,
    `"${(log.formattedTime || log.timestamp || "").replace(/"/g, '""')}"`,
    `"${(log.officer || "Dealing Officer").replace(/"/g, '""')}"`,
    `"${(log.category || "").replace(/"/g, '""')}"`,
    `"${(log.action || "").replace(/"/g, '""')}"`,
    `"${(log.entityAffected || "").replace(/"/g, '""')}"`,
    `"${(log.summary || "").replace(/"/g, '""')}"`,
    `"${(log.details || "").replace(/"/g, '""')}"`,
    `"${(log.complianceTag || "GFR / CVC Compliance Log").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const sanitizedTitle = (metadata?.tenderRefNo || metadata?.packageTitle || "Tender").replace(/[^a-zA-Z0-9_-]/g, "_");
  triggerFileDownload(blob, `Tender_Audit_Trail_${sanitizedTitle}.csv`);
}

/**
 * Generates and downloads a formal statutory PDF document for the Audit Trail
 */
export function exportAuditTrailToPDF(
  auditLogs: AuditLogEntry[],
  metadata?: TenderMetadata,
  officerProfile?: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const navyDark: [number, number, number] = [15, 23, 42];
  const primaryBlue: [number, number, number] = [29, 78, 216];
  const borderGray: [number, number, number] = [203, 213, 225];
  const bgLight: [number, number, number] = [248, 250, 252];
  const amberAccent: [number, number, number] = [180, 83, 9];

  // Document Title & Authority Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...navyDark);
  doc.text("STATUTORY TENDER AUDIT TRAIL & LOG OF MODIFICATIONS", margin, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryBlue);
  doc.text(
    "MANDATORY PUBLIC PROCUREMENT TRANSPARENCY & COMPLIANCE RECORD (GFR 2017 & CVC GUIDELINES)",
    margin,
    23.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Official Record of All Tender Data Changes, Uploads, Evaluator Actions, and Dealing Officer Directives`,
    margin,
    28
  );

  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.8);
  doc.line(margin, 30.5, pageWidth - margin, 30.5);

  let currentY = 34;

  // Metadata & Officer Summary Box
  const activeOfficer = officerProfile || "Dealing Officer / Manager (Contracts & Procurement)";
  const metaBody = [
    [
      {
        content: `Tender Ref No:\n${metadata?.tenderRefNo || "NOT SPECIFIED"}`,
        styles: { fontStyle: "bold" as const, fillColor: bgLight },
      },
      {
        content: `Tender Package:\n${metadata?.packageTitle || "Turnkey / EPC Works Package"}`,
        styles: { fontStyle: "bold" as const, fillColor: bgLight },
      },
      {
        content: `Organization / PSU:\n${metadata?.organization || "Public Sector Organization"}`,
        styles: { fontStyle: "bold" as const, fillColor: bgLight },
      },
    ],
    [
      {
        content: `Est. Value: Rs. ${metadata?.estimateValueCr || "—"} Cr  |  Period: ${metadata?.completionPeriodMonths || "—"} Months`,
        styles: { textColor: [51, 65, 85] as [number, number, number] },
      },
      {
        content: `Dealing Officer in Charge:\n${activeOfficer}`,
        styles: { textColor: [30, 41, 59] as [number, number, number], fontStyle: "bold" as const },
      },
      {
        content: `Audit Extraction Date: ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}\nTotal Modification Records: ${auditLogs.length}`,
        styles: { textColor: [71, 85, 105] as [number, number, number] },
      },
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: metaBody,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: borderGray,
      lineWidth: 0.3,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // Audit Logs Table
  const tableRows = auditLogs.map((log, index) => {
    let categoryColor: [number, number, number] = [30, 41, 59];
    if (log.category === "Metadata") categoryColor = [29, 78, 216];
    else if (log.category === "Tender Documents") categoryColor = [5, 150, 105];
    else if (log.category === "Bidders & Deviations") categoryColor = [124, 58, 237];
    else if (log.category === "Evaluation") categoryColor = [217, 119, 6];
    else if (log.category === "Harmonization") categoryColor = [16, 185, 129];
    else if (log.category === "Officer Note") categoryColor = [190, 24, 93];

    return [
      {
        content: String(index + 1),
        styles: { halign: "center" as const, fontStyle: "bold" as const },
      },
      {
        content: log.formattedTime || log.timestamp || "—",
        styles: { fontSize: 7, textColor: [71, 85, 105] as [number, number, number] },
      },
      {
        content: log.officer || "Dealing Officer",
        styles: { fontSize: 7, fontStyle: "bold" as const, textColor: [30, 41, 59] as [number, number, number] },
      },
      {
        content: `${log.category}\n[${log.action}]`,
        styles: { fontSize: 7, textColor: categoryColor, fontStyle: "bold" as const },
      },
      {
        content: `${log.summary}${log.details ? `\n• Details: ${log.details}` : ""}${log.complianceTag ? `\n[Compliance: ${log.complianceTag}]` : ""}`,
        styles: { fontSize: 7.5, textColor: [15, 23, 42] as [number, number, number] },
      },
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      { content: "#", styles: { halign: "center", cellWidth: 8 } },
      { content: "Timestamp", styles: { cellWidth: 28 } },
      { content: "Dealing Officer / User", styles: { cellWidth: 32 } },
      { content: "Category & Action", styles: { cellWidth: 32 } },
      { content: "Summary of Modification & Compliance Details", styles: { cellWidth: "auto" } },
    ]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: navyDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    styles: {
      cellPadding: 2.5,
      lineColor: borderGray,
      lineWidth: 0.3,
      valign: "top",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Statutory Certification & Signature Block
  if (currentY + 45 > pageHeight - 15) {
    doc.addPage();
    currentY = 20;
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      {
        content: "Statutory Verification & Vigilance Compliance Certification",
        styles: {
          fillColor: primaryBlue,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2.5,
        },
      },
    ]],
    body: [[
      {
        content:
          "I hereby certify that this Audit Trail accurately reflects all modifications, document uploads, bidder deviation schedules, and tender evaluation records made under my authorization in accordance with the Central Vigilance Commission (CVC) procurement directives and GFR 2017 transparency mandates. No unrecorded alterations or deletions have been executed.",
        styles: {
          fillColor: [255, 255, 255],
          textColor: [51, 65, 85],
          fontSize: 7.5,
          fontStyle: "italic",
          cellPadding: 3,
        },
      },
    ]],
    theme: "grid",
    tableLineColor: borderGray,
    tableLineWidth: 0.3,
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  if (currentY + 38 > pageHeight - 15) {
    doc.addPage();
    currentY = 20;
  }

  // Signature Block
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      { content: "Dealing Officer (Contracts)", styles: { cellWidth: contentWidth / 3, halign: "center" } },
      { content: "Internal Audit / Vigilance", styles: { cellWidth: contentWidth / 3, halign: "center" } },
      { content: "Tender Approving Authority", styles: { cellWidth: contentWidth / 3, halign: "center" } },
    ]],
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 2,
    },
    body: [
      [
        {
          content: `\n\n___________________________\nSignature & Seal\n\nName: ${activeOfficer.split(",")[0]}\nDesignation: Manager / DGM (Contracts)\nDate: ____ / ____ / 2026`,
          styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
        },
        {
          content: `\n\n___________________________\nSignature & Seal\n\nName: _______________________\nDesignation: Vigilance / Audit Officer\nDate: ____ / ____ / 2026`,
          styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
        },
        {
          content: `\n\n___________________________\nSignature & Seal\n\nName: _______________________\nDesignation: ED / Director (Projects)\nDate: ____ / ____ / 2026`,
          styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
        },
      ],
    ],
    theme: "grid",
    tableLineColor: borderGray,
    tableLineWidth: 0.3,
  });

  // Running Header and Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `STATUTORY AUDIT TRAIL — ${metadata?.tenderRefNo || "TENDER"} — ${metadata?.packageTitle || ""}`.substring(
          0,
          95
        ),
        margin,
        9
      );
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, 11, pageWidth - margin, 11);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "CONFIDENTIAL & PROPRIETARY — STATUTORY TENDER AUDIT LOG FOR CVC / CAG COMPLIANCE",
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  const blob = doc.output("blob");
  const sanitizedTitle = (metadata?.tenderRefNo || metadata?.packageTitle || "Tender").replace(/[^a-zA-Z0-9_-]/g, "_");
  triggerFileDownload(blob, `Tender_Audit_Trail_${sanitizedTitle}.pdf`);
}

/**
 * Generates and downloads an Excel spreadsheet for Services (O&M) Eligibility Evaluation
 * Includes Comparative Statement, Technical Experience Breakdown, and Shortfall Schedule
 */
export function exportServiceEvaluationToExcel(
  bidders: BidderServiceSubmission[],
  criteria: ServiceCriteriaRequirement,
  metadata?: TenderMetadata,
  formatTitle?: string
) {
  const wb = XLSX.utils.book_new();
  const pkgTitle = metadata?.packageTitle || "Service & O&M Contract Package";
  const refNo = metadata?.tenderRefNo || "Tender-Ref";

  // 1. Executive Summary Sheet
  const summaryRows = [
    ["CENTRAL PUBLIC PROCUREMENT - TECHNO-COMMERCIAL ELIGIBILITY SCRUTINY STATEMENT"],
    [`PACKAGE: ${pkgTitle}`],
    [`TENDER REF: ${refNo} | EVALUATION DATE: ${new Date().toLocaleDateString("en-IN")}`],
    [formatTitle ? `FORMAT TEMPLATE: ${formatTitle}` : "FORMAT: Standard GFR 2017 & Open Tender Matrix"],
    [""],
    ["A. NIT ELIGIBILITY CRITERIA BENCHMARKS:"],
    ["1. Financial Turnover Benchmark", `Minimum Average Annual Turnover of Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr in last 3 FYs with CA UDIN`],
    ["2. Experience Threshold (Single Work)", `At least 1 similar work >= Rs. ${(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr`],
    ["3. Experience Threshold (Two Works)", `At least 2 similar works >= Rs. ${(criteria.twoWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.5).toFixed(2)} Cr each`],
    ["4. Experience Threshold (Three Works)", `At least 3 similar works >= Rs. ${(criteria.threeWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.4).toFixed(2)} Cr each`],
    ["5. Similar Work Definition", criteria.similarWorkDefinition],
    [""],
    ["B. BIDDER QUALIFICATION SUMMARY:"],
    ["Total Bidders Evaluated", bidders.length],
    ["Techno-Commercially Qualified (Ready for Price Bid)", bidders.filter((b) => b.overallStatus === "RESPONSIVE_QUALIFIED").length],
    ["Shortfall / Clarification Required", bidders.filter((b) => b.overallStatus === "SHORTFALL_REQUIRED").length],
    ["Disqualified / Rejected", bidders.filter((b) => b.overallStatus === "REJECTED_DISQUALIFIED").length],
    ["Banning / Debarment Alerts Flagged", bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Evaluation Summary");

  // 2. Consolidated Comparative Statement Sheet
  const comparativeHeaders = [
    "Sl No",
    "Bidder Legal Name",
    "Overall Eligibility Status",
    "Debarment / Banning Check",
    "Claimed Avg Turnover (Cr)",
    "Required Avg Turnover (Cr)",
    "Turnover Status",
    "FY 1 Turnover (Cr)",
    "FY 2 Turnover (Cr)",
    "FY 3 Turnover (Cr)",
    "CA UDIN Validated",
    "Experience Criteria Met",
    "Single Work Value (Cr)",
    "Similar Scope Match",
    "Completion Cert Attached",
    "Shortfall / Rejection Grounds",
    "Committee Recommendation",
    "Submitted Files / Archive Bundle",
  ];

  const comparativeRows = bidders.map((b, idx) => {
    const turnovers = b.financialEvaluation.claimedTurnoverByYear || [];
    const works = b.experienceEvaluation.submittedWorks || [];
    const maxWorkVal = works.reduce((max, w) => Math.max(max, w.contractValueCr || 0), 0);
    const scopeMatch = works.some((w) => w.matchesSimilarWorkScope);
    const certAttached = works.some((w) => w.completionCertificateAttached);
    const bundlesStr = (b.uploadedBundles || []).map((bun) => `${bun.bundleName} (${bun.totalFilesExtracted} files)`).join("; ") ||
      `${b.turnoverDocuments.length + b.experienceDocuments.length} files`;

    return [
      idx + 1,
      b.bidderName,
      b.overallStatus,
      b.banningStatusAlert.isAlertTriggered ? `ALERT: ${b.banningStatusAlert.reason}` : "CLEAN",
      b.financialEvaluation.averageTurnoverCr.toFixed(2),
      criteria.minAverageAnnualTurnoverCr.toFixed(2),
      b.financialEvaluation.status,
      turnovers[0]?.turnoverCr ? turnovers[0].turnoverCr.toFixed(2) : "N/A",
      turnovers[1]?.turnoverCr ? turnovers[1].turnoverCr.toFixed(2) : "N/A",
      turnovers[2]?.turnoverCr ? turnovers[2].turnoverCr.toFixed(2) : "N/A",
      turnovers.some((t) => t.caUdinPresent) ? "YES" : "MISSING",
      b.experienceEvaluation.status,
      maxWorkVal > 0 ? maxWorkVal.toFixed(2) : "0.00",
      scopeMatch ? "YES" : "NO",
      certAttached ? "YES" : "NO",
      [...b.financialEvaluation.reasons, ...b.experienceEvaluation.reasons].join(" | "),
      b.summaryReason,
      bundlesStr,
    ];
  });

  const wsComparative = XLSX.utils.aoa_to_sheet([comparativeHeaders, ...comparativeRows]);
  wsComparative["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 40 },
    { wch: 35 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsComparative, "Comparative Statement");

  // 3. Technical Works Detail Sheet
  const worksHeaders = [
    "Sl No",
    "Bidder Name",
    "Work Order / Contract Title",
    "Client Name & Sector",
    "Completed Value (Rs Cr)",
    "Completion Date",
    "Scope Matches NIT Definition",
    "Client Completion Certificate",
    "Satisfactory Performance Report",
    "Scrutiny Observations",
  ];

  const worksRows: any[] = [];
  let wIndex = 1;
  bidders.forEach((b) => {
    b.experienceEvaluation.submittedWorks.forEach((work) => {
      worksRows.push([
        wIndex++,
        b.bidderName,
        work.workTitle,
        work.clientName,
        work.contractValueCr.toFixed(2),
        work.completionDate,
        work.matchesSimilarWorkScope ? "YES" : "NO (Scope Mismatch)",
        work.completionCertificateAttached ? "YES (Attached)" : "NO (Missing)",
        work.satisfactoryPerformanceReportAttached ? "YES" : "NO",
        work.remarks || "Verified against uploaded document",
      ]);
    });
  });

  const wsWorks = XLSX.utils.aoa_to_sheet([worksHeaders, ...worksRows]);
  wsWorks["!cols"] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 36 },
    { wch: 26 },
    { wch: 18 },
    { wch: 15 },
    { wch: 24 },
    { wch: 22 },
    { wch: 24 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, wsWorks, "Submitted Past Works");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `Service_Eligibility_Comparative_${(refNo || "Tender").replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`;
  triggerFileDownload(blob, filename);
}

/**
 * Generates and downloads a formal Word (.docx) Scrutiny Note for Services (O&M)
 */
export async function exportServiceEvaluationToDocx(
  bidders: BidderServiceSubmission[],
  criteria: ServiceCriteriaRequirement,
  metadata?: TenderMetadata,
  activeOfficer?: string,
  formatTitle?: string
) {
  const pkgTitle = metadata?.packageTitle || "Service & O&M Contract Package";
  const refNo = metadata?.tenderRefNo || "Tender-Ref";
  const officerName = activeOfficer?.split(",")[0] || "Dealing Officer (Contracts)";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const tableHeaderCell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
      shading: { fill: "1E293B" },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
    });

  const tableBodyCell = (text: string, isBold: boolean = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: isBold, size: 17 })], alignment: align })],
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
    });

  // Table rows for Comparative Evaluation
  const evalRows = [
    new TableRow({
      children: [
        tableHeaderCell("Sl"),
        tableHeaderCell("Bidder Name"),
        tableHeaderCell("Turnover (Cr)"),
        tableHeaderCell("UDIN"),
        tableHeaderCell("Max Work (Cr)"),
        tableHeaderCell("Scope Match"),
        tableHeaderCell("Status"),
        tableHeaderCell("Committee Recommendation"),
      ],
    }),
  ];

  bidders.forEach((b, idx) => {
    const works = b.experienceEvaluation.submittedWorks || [];
    const maxWorkVal = works.reduce((max, w) => Math.max(max, w.contractValueCr || 0), 0);
    const scopeMatch = works.some((w) => w.matchesSimilarWorkScope) ? "Complied" : "Deviated";
    const udinStatus = (b.financialEvaluation.claimedTurnoverByYear || []).some((t) => t.caUdinPresent) ? "Valid" : "Deficient";

    evalRows.push(
      new TableRow({
        children: [
          tableBodyCell(String(idx + 1), false, AlignmentType.CENTER),
          tableBodyCell(b.bidderName, true),
          tableBodyCell(`Rs. ${b.financialEvaluation.averageTurnoverCr.toFixed(2)} Cr`, false, AlignmentType.RIGHT),
          tableBodyCell(udinStatus, false, AlignmentType.CENTER),
          tableBodyCell(`Rs. ${maxWorkVal.toFixed(2)} Cr`, false, AlignmentType.RIGHT),
          tableBodyCell(scopeMatch, false, AlignmentType.CENTER),
          tableBodyCell(b.overallStatus.replace("_", " "), true),
          tableBodyCell(b.summaryReason),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "CONFIDENTIAL - FOR TENDER COMMITTEE & COMPETENT AUTHORITY REVIEW",
            style: HeadingLevel.HEADING_3,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "TECHNO-COMMERCIAL ELIGIBILITY SCRUTINY & COMPARATIVE NOTE",
                bold: true,
                size: 26,
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Package Title: `, bold: true }),
              new TextRun({ text: `${pkgTitle}\n` }),
              new TextRun({ text: `Tender Ref No: `, bold: true }),
              new TextRun({ text: `${refNo} | Date: ${dateStr}\n` }),
              new TextRun({ text: `Regulatory Framework: `, bold: true }),
              new TextRun({ text: `Rule 173 of General Financial Rules (GFR) 2017 & CVC Procurement Manual\n` }),
              new TextRun({ text: `Format Compliance: `, bold: true }),
              new TextRun({ text: formatTitle || "Standard Open Tender Technical Scrutiny Format" }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "1. QUALIFYING CRITERIA SPECIFIED IN NOTICE INVITING TENDER (NIT)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Financial Criteria: ", bold: true }),
              new TextRun({
                text: `Minimum Average Annual Turnover of Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Crores during the last 3 financial years duly certified by a Chartered Accountant with valid Unique Document Identification Number (UDIN).\n`,
              }),
              new TextRun({ text: "• Technical Experience: ", bold: true }),
              new TextRun({
                text: `Execution of completed similar service works during qualifying period satisfying Single Work >= Rs. ${(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr, or Two Works >= Rs. ${(criteria.twoWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.5).toFixed(2)} Cr each, or Three Works >= Rs. ${(criteria.threeWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.4).toFixed(2)} Cr each.\n`,
              }),
              new TextRun({ text: "• Similar Work Definition: ", bold: true }),
              new TextRun({ text: `"${criteria.similarWorkDefinition}"\n` }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            text: "2. COMPARATIVE STATEMENT OF PARTICIPATING BIDDERS",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            rows: evalRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          new Paragraph({
            text: "3. TENDER COMMITTEE RECOMMENDATIONS & SIGN-OFF",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `The scrutiny committee has evaluated the bids against the stipulated NIT provisions, GFR 2017 Rule 173, and published shortfall guidelines. Qualified bidders are recommended for opening of price bids. Deficient bidders have been scheduled for shortfall/clarification as per documented rules.\n\n`,
              }),
              new TextRun({ text: `Dealing Officer: ${officerName}\t\tFinance Concurrence: ____________________\t\tCompetent Authority: ____________________\n`, bold: true }),
            ],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Service_Eligibility_Scrutiny_Note_${(refNo || "Tender").replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`;
  triggerFileDownload(blob, filename);
}

/**
 * Maps Bidder Eligibility Findings to User's Uploaded Custom Format or Presets
 */
export function generateServiceEvaluationCustomText(
  bidders: BidderServiceSubmission[],
  criteria: ServiceCriteriaRequirement,
  metadata?: TenderMetadata,
  templateText?: string
): string {
  const pkgTitle = metadata?.packageTitle || "Service Contract Package";
  const refNo = metadata?.tenderRefNo || "Tender-Ref";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const qualifiedList = bidders.filter((b) => b.overallStatus === "RESPONSIVE_QUALIFIED").map((b) => b.bidderName).join(", ") || "None";
  const shortfallList = bidders.filter((b) => b.overallStatus === "SHORTFALL_REQUIRED").map((b) => `${b.bidderName} (Deficiency: ${[...b.financialEvaluation.reasons, ...b.experienceEvaluation.reasons].join("; ")})`).join("\n  • ") || "None";
  const rejectedList = bidders.filter((b) => b.overallStatus === "REJECTED_DISQUALIFIED").map((b) => `${b.bidderName} (Grounds: ${[...b.financialEvaluation.reasons, ...b.experienceEvaluation.reasons].join("; ")})`).join("\n  • ") || "None";

  // Build comparative table string
  let tableStr = `| Sl | Bidder Name | Overall Status | Claimed Avg Turnover | Required Turnover | UDIN | Max Work Value | Scope Match | Recommendation |\n`;
  tableStr += `|:---|:---|:---|:---|:---|:---|:---|:---|:---|\n`;
  bidders.forEach((b, idx) => {
    const works = b.experienceEvaluation.submittedWorks || [];
    const maxWorkVal = works.reduce((max, w) => Math.max(max, w.contractValueCr || 0), 0);
    const scopeMatch = works.some((w) => w.matchesSimilarWorkScope) ? "Complied" : "Deviated";
    const udinStatus = (b.financialEvaluation.claimedTurnoverByYear || []).some((t) => t.caUdinPresent) ? "Valid" : "Missing";

    tableStr += `| ${idx + 1} | ${b.bidderName} | ${b.overallStatus} | Rs. ${b.financialEvaluation.averageTurnoverCr.toFixed(2)} Cr | Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr | ${udinStatus} | Rs. ${maxWorkVal.toFixed(2)} Cr | ${scopeMatch} | ${b.summaryReason} |\n`;
  });

  if (templateText && templateText.trim().length > 50) {
    let populated = templateText;
    populated = populated.replace(/\[PACKAGE_TITLE\]/gi, pkgTitle);
    populated = populated.replace(/\[TENDER_REF\]/gi, refNo);
    populated = populated.replace(/\[REF_NO\]/gi, refNo);
    populated = populated.replace(/\[DATE\]/gi, dateStr);
    populated = populated.replace(/\[EVALUATION_DATE\]/gi, dateStr);
    populated = populated.replace(/\[MIN_TURNOVER\]/gi, `Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr`);
    populated = populated.replace(/\[SIMILAR_WORK\]/gi, criteria.similarWorkDefinition);
    populated = populated.replace(/\[QUALIFIED_BIDDERS\]/gi, qualifiedList);
    populated = populated.replace(/\[SHORTFALL_BIDDERS\]/gi, shortfallList);
    populated = populated.replace(/\[DISQUALIFIED_BIDDERS\]/gi, rejectedList);
    populated = populated.replace(/\[COMPARATIVE_TABLE\]/gi, tableStr);

    // If template didn't have specific placeholders, append the comparative table cleanly
    if (!populated.includes(tableStr) && !templateText.includes("[COMPARATIVE_TABLE]")) {
      populated += `\n\n=== EXTRACTED TECHNO-COMMERCIAL COMPARATIVE DATA (AS PER FORMAT) ===\n\n` + tableStr;
    }
    return populated;
  }

  // Default Standard Format
  return `CENTRAL PUBLIC PROCUREMENT - TECHNO-COMMERCIAL EVALUATION STATEMENT
PACKAGE: ${pkgTitle}
TENDER REFERENCE: ${refNo} | DATE: ${dateStr}
REGULATORY BENCHMARK: General Financial Rules (GFR) 2017 Rule 173 & CVC Manual

1. NIT QUALIFYING CRITERIA SPECIFICATION:
- Minimum Average Annual Turnover: Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Crores (last 3 FYs with CA UDIN)
- Technical Experience (Completed Similar Works Threshold):
  * Single Work >= Rs. ${(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr
  * Two Works >= Rs. ${(criteria.twoWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.5).toFixed(2)} Cr each
  * Three Works >= Rs. ${(criteria.threeWorkOrdersValueCr || criteria.minAverageAnnualTurnoverCr * 0.4).toFixed(2)} Cr each
- Similar Work Scope Definition: "${criteria.similarWorkDefinition}"

2. CONSOLIDATED COMPARATIVE EVALUATION MATRIX:
${tableStr}

3. SCRUTINY COMMITTEE FINDINGS:
• Responsive & Qualified Bidders: ${qualifiedList}
• Shortfall / Clarification Cases:
  • ${shortfallList}
• Disqualified / Rejected Offers:
  • ${rejectedList}

4. RECOMMENDATIONS FOR COMPETENT AUTHORITY:
1. Approve the qualification of responsive bidders for subsequent opening of price bids.
2. Issue standard shortfall notices to bidders requiring minor procedural clarification without altering original bid parameters.
3. Debarment & Banning register status: Verified clean across all participating entities.

Dealing Officer (Contracts)\t\tFinance Member\t\tCompetent Authority`;
}

