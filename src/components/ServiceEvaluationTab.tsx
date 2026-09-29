import React, { useState } from "react";
import {
  FileText,
  Upload,
  Layers,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  FileCheck2,
  Download,
  AlertOctagon,
  HelpCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  ShieldCheck,
  FolderArchive,
  FileSpreadsheet,
  Copy,
  Check,
  FileCode,
} from "lucide-react";
import {
  ServiceCriteriaRequirement,
  BidderServiceSubmission,
  InternalGuidelines,
  BidderSubmittedDocument,
  DocumentTamperingAlert,
  BlacklistedEntity,
} from "../types/serviceEvaluation";
import { TenderMetadata, UploadedFormatTemplate } from "../types";
import { parseUploadedFile } from "../utils/fileParser";
import { evaluateBidderEligibility } from "../utils/serviceEvaluationEngine";
import {
  triggerFileDownload,
  exportServiceEvaluationToExcel,
  exportServiceEvaluationToDocx,
  generateServiceEvaluationCustomText,
} from "../utils/exportUtils";
import { DEFAULT_BLACKLISTED_ENTITIES, checkBidderBanningStatus } from "../utils/banningDatabase";
import { PRESET_FORMAT_TEMPLATES } from "../utils/formatTemplates";

interface ServiceEvaluationTabProps {
  metadata: TenderMetadata;
  criteria: ServiceCriteriaRequirement;
  setCriteria: React.Dispatch<React.SetStateAction<ServiceCriteriaRequirement>>;
  guidelines: InternalGuidelines;
  setGuidelines: React.Dispatch<React.SetStateAction<InternalGuidelines>>;
  bidders: BidderServiceSubmission[];
  setBidders: React.Dispatch<React.SetStateAction<BidderServiceSubmission[]>>;
  evaluationStage: "ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED";
  setEvaluationStage: React.Dispatch<React.SetStateAction<"ROUND_1_INITIAL" | "SHORTFALL_ISSUED" | "ROUND_2_SHORTFALL_EVAL" | "FINAL_ACCEPTED">>;
  viewMode?: "consolidated" | "individual" | "letters" | "tampering" | "banning";
  setViewMode?: (mode: "consolidated" | "individual" | "letters" | "tampering" | "banning") => void;
  onLogAudit?: (
    action: string,
    category: any,
    summary: string,
    details?: string,
    entityAffected?: string,
    complianceTag?: string
  ) => void;
}

export const ServiceEvaluationTab: React.FC<ServiceEvaluationTabProps> = ({
  metadata,
  criteria,
  setCriteria,
  guidelines,
  setGuidelines,
  bidders,
  setBidders,
  evaluationStage,
  setEvaluationStage,
  viewMode: propViewMode,
  setViewMode: propSetViewMode,
  onLogAudit,
}) => {
  const [selectedBidderId, setSelectedBidderId] = useState<string>(bidders[0]?.bidderId || "");
  const [internalViewMode, setInternalViewMode] = useState<"consolidated" | "individual" | "letters" | "tampering" | "banning">("consolidated");
  const viewMode = propViewMode !== undefined ? propViewMode : internalViewMode;
  const setViewMode = (mode: "consolidated" | "individual" | "letters" | "tampering" | "banning") => {
    setInternalViewMode(mode);
    propSetViewMode?.(mode);
  };
  const [letterTypeToView, setLetterTypeToView] = useState<"shortfall" | "rejection">("shortfall");
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [guidelinesModalOpen, setGuidelinesModalOpen] = useState<boolean>(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState<boolean>(false);

  // Dossier upload modal state (Single ZIP / Consolidated PDF / Multi-docs)
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);
  const [dossierTargetBidderId, setDossierTargetBidderId] = useState<string>(bidders[0]?.bidderId || "");
  const [isAddingNewBidder, setIsAddingNewBidder] = useState<boolean>(false);
  const [newBidderNameInput, setNewBidderNameInput] = useState<string>("");

  // Output format modal & custom template state
  const [isExportFormatModalOpen, setIsExportFormatModalOpen] = useState<boolean>(false);
  const [selectedFormatTemplateId, setSelectedFormatTemplateId] = useState<string>("standard-excel");
  const [userUploadedTemplate, setUserUploadedTemplate] = useState<UploadedFormatTemplate | null>(null);
  const [customFormatTextPreview, setCustomFormatTextPreview] = useState<string>("");
  const [hasCopiedFormat, setHasCopiedFormat] = useState<boolean>(false);

  // Inspected document preview modal
  const [previewDocModal, setPreviewDocModal] = useState<BidderSubmittedDocument | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Hypothetical internal & external banning database
  const [blacklistDatabase, setBlacklistDatabase] = useState<BlacklistedEntity[]>(DEFAULT_BLACKLISTED_ENTITIES);
  const [isScanningBanning, setIsScanningBanning] = useState<boolean>(false);
  const [lastBanningScanTime, setLastBanningScanTime] = useState<string>("26-Sep-2026 10:00 AM");
  
  // Custom blacklist entry form state
  const [newEntityName, setNewEntityName] = useState<string>("");
  const [newSourcePortal, setNewSourcePortal] = useState<"Internal Blacklist" | "GeM Incident Management" | "CPPP Central Debarment" | "CVC Banned Register" | "Custom URL / Portal">("Internal Blacklist");
  const [newRefOrder, setNewRefOrder] = useState<string>("");
  const [newReason, setNewReason] = useState<string>("");
  const [newPortalUrl, setNewPortalUrl] = useState<string>("https://");

  const activeBidder = bidders.find((b) => b.bidderId === selectedBidderId) || bidders[0];

  // Perform Mock Banning Status Check across internal & custom portals
  const executeBanningCheck = () => {
    setIsScanningBanning(true);
    setTimeout(() => {
      const updated = bidders.map((b) =>
        evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", blacklistDatabase)
      );
      setBidders(updated);
      setIsScanningBanning(false);
      const nowStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      setLastBanningScanTime(nowStr);

      const flaggedCount = updated.filter((b) => b.banningStatusAlert.isAlertTriggered).length;
      onLogAudit?.(
        "Banning & Blacklist Verification Executed",
        "Evaluation",
        `Dealing officer ran mock Banning check across CPPP, GeM Incident Management, CVC, and Internal database. Flagged: ${flaggedCount} bidder(s).`,
        `Checked against ${blacklistDatabase.length} debarred entities and configured portal endpoints.`,
        "All Bidders",
        "GFR 2017 Rule 151"
      );
    }, 400);
  };

  // Add custom entity to blacklist database
  const handleAddBlacklistEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;

    const newEntity: BlacklistedEntity = {
      id: `ban-${Date.now()}`,
      entityName: newEntityName.trim(),
      sourcePortal: newSourcePortal,
      referenceOrderNo: newRefOrder.trim() || `ORDER-${Date.now().toString().slice(-4)}`,
      orderDate: new Date().toLocaleDateString("en-IN"),
      banPeriodYears: 3,
      reasonForBanning: newReason.trim() || "Debarred for non-compliance with tender conditions.",
      portalUrl: newPortalUrl.trim() || "https://gem.gov.in",
    };

    const updatedList = [newEntity, ...blacklistDatabase];
    setBlacklistDatabase(updatedList);
    setNewEntityName("");
    setNewRefOrder("");
    setNewReason("");
    setNewPortalUrl("https://");

    // Automatically re-evaluate bidders against updated database
    const updatedBidders = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", updatedList)
    );
    setBidders(updatedBidders);

    onLogAudit?.(
      "Added Entity to Debarred Database",
      "Evaluation",
      `Dealing officer added '${newEntity.entityName}' (${newEntity.sourcePortal}) to internal debarment blacklist.`,
      `Ref: ${newEntity.referenceOrderNo}, Reason: ${newEntity.reasonForBanning}`,
      newEntity.entityName,
      "Blacklist Management"
    );
  };

  const handleRemoveBlacklistEntity = (id: string, name: string) => {
    const updatedList = blacklistDatabase.filter((e) => e.id !== id);
    setBlacklistDatabase(updatedList);
    const updatedBidders = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, evaluationStage === "ROUND_2_SHORTFALL_EVAL", updatedList)
    );
    setBidders(updatedBidders);
    onLogAudit?.(
      "Removed Entity from Debarred Database",
      "Evaluation",
      `Dealing officer removed '${name}' from debarred screening list.`,
      undefined,
      name,
      "Blacklist Management"
    );
  };

  // Recalculate evaluation for all bidders
  const runReEvaluation = (isRound2: boolean = evaluationStage === "ROUND_2_SHORTFALL_EVAL") => {
    const updated = bidders.map((b) =>
      evaluateBidderEligibility(b, criteria, metadata.packageTitle, metadata.tenderRefNo, isRound2, blacklistDatabase)
    );
    setBidders(updated);
    onLogAudit?.(
      "Re-evaluated Service Bidders",
      "Evaluation",
      `Evaluated ${updated.length} service bidders against criteria (Round: ${isRound2 ? "2 - Shortfall" : "1 - Initial"})`,
      undefined,
      "Service Eligibility Scrutiny",
      "GFR 2017 Rule 173"
    );
  };

  // Upload document or complete dossier (Single ZIP, Single PDF, or multiple files)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    bidderId: string,
    category: "bundle" | "turnover" | "experience" | "statutory" | "shortfall_reply" = "bundle"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingOcr(true);
    let totalFilesExtracted = 0;
    const turnoverToAdd: BidderSubmittedDocument[] = [];
    const experienceToAdd: BidderSubmittedDocument[] = [];
    const statutoryToAdd: BidderSubmittedDocument[] = [];
    const shortfallToAdd: BidderSubmittedDocument[] = [];
    const newBundles: { bundleName: string; fileType: "zip" | "pdf"; totalFilesExtracted: number; uploadedAt: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseUploadedFile(file);

        if (parsed.subDocuments && parsed.subDocuments.length > 0) {
          // A ZIP file or a consolidated multi-document PDF
          newBundles.push({
            bundleName: file.name,
            fileType: (file.name.toLowerCase().endsWith(".zip") ? "zip" : "pdf") as "zip" | "pdf",
            totalFilesExtracted: parsed.subDocuments.length,
            uploadedAt: new Date().toISOString().split("T")[0],
          });

          parsed.subDocuments.forEach((subDoc, sIdx) => {
            totalFilesExtracted++;
            const docObj: BidderSubmittedDocument = {
              id: `doc-${Date.now()}-${i}-${sIdx}`,
              name: subDoc.name,
              category: category === "bundle" ? subDoc.category : (category as any),
              fileType: subDoc.fileType,
              extractedText: subDoc.extractedText,
              charCount: subDoc.charCount,
              uploadedAt: new Date().toISOString().split("T")[0],
              isOcrScanned: subDoc.isOcrScanned,
              ocrConfidence: subDoc.ocrConfidence,
              sourceArchive: file.name,
              pageCount: subDoc.pageCount,
            };

            const effCat = category === "bundle" ? subDoc.category : category;
            if (effCat === "turnover") turnoverToAdd.push(docObj);
            else if (effCat === "experience") experienceToAdd.push(docObj);
            else if (effCat === "statutory") statutoryToAdd.push(docObj);
            else shortfallToAdd.push(docObj);
          });
        } else {
          // Standard single file (PDF, DOCX, XLSX, TXT, image)
          totalFilesExtracted++;
          const effCat = category === "bundle" ? (parsed.isOcrScanned ? "experience" : "turnover") : category;
          const docObj: BidderSubmittedDocument = {
            id: `doc-${Date.now()}-${i}`,
            name: file.name,
            category: effCat as any,
            fileType: parsed.fileType,
            extractedText: parsed.text,
            charCount: parsed.charCount,
            uploadedAt: new Date().toISOString().split("T")[0],
            isOcrScanned: parsed.isOcrScanned,
            ocrConfidence: parsed.isOcrScanned ? 90 : undefined,
          };
          if (effCat === "turnover") turnoverToAdd.push(docObj);
          else if (effCat === "experience") experienceToAdd.push(docObj);
          else if (effCat === "statutory") statutoryToAdd.push(docObj);
          else shortfallToAdd.push(docObj);
        }
      } catch (err) {
        console.error("File upload error:", err);
      }
    }

    setBidders((prev) =>
      prev.map((b) => {
        if (b.bidderId !== bidderId) return b;
        const updated = {
          ...b,
          turnoverDocuments: [...b.turnoverDocuments, ...turnoverToAdd],
          experienceDocuments: [...b.experienceDocuments, ...experienceToAdd],
          statutoryDocuments: [...(b.statutoryDocuments || []), ...statutoryToAdd],
          shortfallReplyDocuments: [...(b.shortfallReplyDocuments || []), ...shortfallToAdd],
          uploadedBundles: [...(b.uploadedBundles || []), ...newBundles],
        };
        return evaluateBidderEligibility(
          updated,
          criteria,
          metadata.packageTitle,
          metadata.tenderRefNo,
          evaluationStage === "ROUND_2_SHORTFALL_EVAL",
          blacklistDatabase
        );
      })
    );

    setIsProcessingOcr(false);
    const targetBidder = bidders.find((b) => b.bidderId === bidderId);
    setUploadFeedback({
      type: "success",
      message: `Extracted ${totalFilesExtracted} document(s) for ${targetBidder?.bidderName || "bidder"}. Eligibility re-calculated automatically.`,
    });
    setTimeout(() => setUploadFeedback(null), 6000);

    onLogAudit?.(
      "Uploaded Eligibility Document Dossier",
      "Bidders & Deviations",
      `Extracted ${totalFilesExtracted} document(s) from upload bundle for bidder: ${targetBidder?.bidderName || bidderId}`,
      undefined,
      `Bidder: ${targetBidder?.bidderName || bidderId}`,
      "Document Scrutiny"
    );
  };

  // Add a new bidder and upload dossier immediately
  const handleAddNewBidderWithDossier = (bidderName: string) => {
    const newId = `bidder-${Date.now()}`;
    const newBidder: BidderServiceSubmission = {
      bidderId: newId,
      bidderName: bidderName.trim() || `New Bidder ${bidders.length + 1}`,
      round: 1,
      overallStatus: "SHORTFALL_REQUIRED",
      summaryReason: "Dossier uploaded; preliminary technical evaluation active.",
      banningStatusAlert: {
        isAlertTriggered: false,
        banningCheckListClauseRef: "NIT Clause 14 & CVC Debarment Register",
        verifiedStatus: "CLEAN",
      },
      turnoverDocuments: [],
      experienceDocuments: [],
      statutoryDocuments: [],
      uploadedBundles: [],
      financialEvaluation: {
        claimedTurnoverByYear: [],
        averageTurnoverCr: 0,
        requiredTurnoverCr: criteria.minAverageAnnualTurnoverCr,
        status: "SHORTFALL",
        reasons: ["No turnover certificate provided"],
        relevantDocumentsCited: [],
      },
      experienceEvaluation: {
        submittedWorks: [],
        status: "SHORTFALL",
        reasons: ["No experience certificate provided"],
        relevantDocumentsCited: [],
      },
    };
    setBidders((prev) => [...prev, newBidder]);
    setSelectedBidderId(newId);
    setDossierTargetBidderId(newId);
    setIsAddingNewBidder(false);
    setNewBidderNameInput("");
    return newId;
  };

  // Upload custom format template
  const handleUploadFormatTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseUploadedFile(file);
      const newTemplate: UploadedFormatTemplate = {
        id: `custom-fmt-${Date.now()}`,
        name: file.name,
        fileType: parsed.fileType,
        charCount: parsed.charCount,
        uploadedAt: new Date().toLocaleDateString("en-IN"),
        isActive: true,
        templateText: parsed.text,
        description: `Custom format template uploaded by Dealing Officer (${parsed.charCount} characters).`,
        parsedSections: [
          "1. Department Header & NIT Reference",
          "2. NIT Eligibility Criteria Thresholds",
          "3. Techno-Commercial Comparative Statement",
          "4. Scrutiny Findings & Committee Sign-off",
        ],
      };
      setUserUploadedTemplate(newTemplate);
      setSelectedFormatTemplateId(newTemplate.id);
      const populated = generateServiceEvaluationCustomText(bidders, criteria, metadata, parsed.text);
      setCustomFormatTextPreview(populated);
      onLogAudit?.(
        "Uploaded Custom Evaluation Format",
        "Evaluation",
        `Dealing officer uploaded custom template: '${file.name}'`,
        undefined,
        "Custom Template",
        "Reporting Format"
      );
    } catch (err) {
      console.error("Format upload error:", err);
    }
  };

  // Export Consolidated Comparative Statement
  const exportConsolidatedReport = () => {
    let reportContent = `CONSOLIDATED INTERIM EVALUATION REPORT - SERVICE & O&M TENDER
Package: ${metadata.packageTitle || "Tender Package"}
Tender Ref No: ${metadata.tenderRefNo || "Ref No"}
Organization: ${metadata.organization || "PSU / Government Dept"}
Evaluation Stage: ${evaluationStage === "ROUND_2_SHORTFALL_EVAL" || evaluationStage === "FINAL_ACCEPTED" ? "Final Technical Evaluation" : "Interim Technical Evaluation (Round 1)"}
Date: ${new Date().toLocaleDateString("en-IN")}
--------------------------------------------------------------------------------

A. QUALIFYING CRITERIA SPECIFIED IN NIT:
1. Financial Turnover: Minimum Average Annual Turnover of Rs. ${criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr in last 3 financial years with valid CA UDIN.
2. Experience Criteria: Completed Similar Work (Threshold: Single work >= Rs. ${(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr).
3. Similar Work Scope: ${criteria.similarWorkDefinition}

B. SUMMARY OF BIDDER SCRUTINY:
`;

    bidders.forEach((b, idx) => {
      reportContent += `
[${idx + 1}] BIDDER: ${b.bidderName}
    • Overall Status: ${b.overallStatus}
    • Banning & Debarment Status: ${b.banningStatusAlert.isAlertTriggered ? `FLAGGED / UNDER SCRUTINY (${b.banningStatusAlert.reason})` : "CLEAN (Verified against CPPP/GeM/CVC/Internal registers)"}
    • Financial Turnover Status: ${b.financialEvaluation.status} (Average: Rs. ${b.financialEvaluation.averageTurnoverCr} Cr)
      - Grounds: ${b.financialEvaluation.reasons.join(" | ")}
    • Experience Criteria Status: ${b.experienceEvaluation.status}
      - Grounds: ${b.experienceEvaluation.reasons.join(" | ")}
    • Recommendation: ${b.summaryReason}
    • Action Taken: ${b.shortfallLetter ? "Shortfall / Clarification Letter Generated" : b.rejectionLetter ? "Rejection Intimation Letter Generated" : "Qualified for Price Bid Opening"}
--------------------------------------------------------------------------------`;
    });

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" });
    triggerFileDownload(blob, `Tender_Service_Evaluation_Report_${Date.now()}.txt`);
  };

  // Check for any tampering across all bidders
  const totalTamperingAlerts = bidders.reduce((acc, b) => {
    const docs = [...b.turnoverDocuments, ...b.experienceDocuments, ...(b.shortfallReplyDocuments || [])];
    return acc + docs.reduce((dAcc, d) => dAcc + (d.tamperingAlerts?.length || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Service Eligibility Evaluation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Service &amp; O&amp;M Eligibility Engine
              </span>
              <span className="text-xs text-slate-400">
                {evaluationStage === "ROUND_2_SHORTFALL_EVAL"
                  ? "Round 2: Shortfall & Clarification Scrutiny"
                  : evaluationStage === "FINAL_ACCEPTED"
                  ? "Final Evaluation Completed (Locked)"
                  : "Round 1: Initial Techno-Commercial Scrutiny"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {metadata.packageTitle || "Service Contract Evaluation"}
            </h1>
            <p className="text-xs text-slate-300 max-w-3xl">
              Automated evaluation of <strong>Financial/Turnover Criteria</strong> and <strong>Experience/Technical Criteria</strong> as per NIT. Generates formal <strong>Shortfall/Clarification Letters</strong> or <strong>Rejection Intimations</strong> under Open Tender (OT) &amp; GFR 2017 guidelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setDossierTargetBidderId(activeBidder?.bidderId || bidders[0]?.bidderId || "");
                setIsAddingNewBidder(false);
                setIsDossierModalOpen(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Upload complete eligibility document package as single ZIP or PDF"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Upload Bidder Dossier (ZIP / PDF)</span>
            </button>

            <button
              onClick={() => {
                const defaultText = generateServiceEvaluationCustomText(
                  bidders,
                  criteria,
                  metadata,
                  userUploadedTemplate?.templateText
                );
                setCustomFormatTextPreview(defaultText);
                setIsExportFormatModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Produce evaluation output as Excel, Word, or as desired per your uploaded format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Output Formats &amp; Desired Templates</span>
            </button>

            <button
              onClick={() => setGuidelinesModalOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-600 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Internal Guidelines</span>
            </button>

            <button
              onClick={exportConsolidatedReport}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {evaluationStage === "FINAL_ACCEPTED" ? "Export Final Report" : "Interim Evaluation Report"}
              </span>
            </button>

            {evaluationStage === "ROUND_1_INITIAL" && (
              <button
                onClick={() => {
                  setEvaluationStage("SHORTFALL_ISSUED");
                  onLogAudit?.(
                    "Advanced Stage to Shortfall Issued",
                    "Evaluation",
                    "Dealing officer issued shortfall/clarification letters to deficient bidders.",
                    undefined,
                    "Tender Stage",
                    "OT Workflow"
                  );
                }}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Mark Shortfall Letters Issued &rarr;
              </button>
            )}

            {evaluationStage === "SHORTFALL_ISSUED" && (
              <button
                onClick={() => {
                  setEvaluationStage("ROUND_2_SHORTFALL_EVAL");
                  runReEvaluation(true);
                }}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Start Round 2 (Shortfall Replies Scrutiny) &rarr;
              </button>
            )}

            {evaluationStage !== "FINAL_ACCEPTED" && (
              <button
                onClick={() => setShowFinalPrompt(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Submit Final Evaluation</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload feedback banner */}
        {uploadFeedback && (
          <div className="mt-4 bg-emerald-950/90 border border-emerald-500 text-emerald-100 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{uploadFeedback.message}</span>
            </div>
            <button
              onClick={() => setUploadFeedback(null)}
              className="text-emerald-300 hover:text-white font-bold ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Alerts: Banning & Tampering summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "banning" ? "consolidated" : "banning")}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
              viewMode === "banning"
                ? "bg-amber-950/80 border-amber-500"
                : "bg-slate-950/60 hover:bg-slate-900/90 border-slate-800"
            }`}
            title="Click to open Banning & Debarment Verification Console"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Banning Status Checks (Click to inspect)</span>
              <span className="font-semibold text-amber-300">
                {bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length > 0
                  ? `${bidders.filter((b) => b.banningStatusAlert.isAlertTriggered).length} Bidder(s) Under Scrutiny`
                  : "All Bidders Verified Clean"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === "tampering" ? "consolidated" : "tampering")}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
              viewMode === "tampering"
                ? "bg-cyan-950/80 border-cyan-500"
                : "bg-slate-950/60 hover:bg-slate-900/90 border-slate-800"
            }`}
            title="Click to inspect Document Authenticity & Forgery Alerts"
          >
            <Search className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Document Authenticity Check (Click to inspect)</span>
              <span className="font-semibold text-cyan-300">
                {totalTamperingAlerts > 0 ? `${totalTamperingAlerts} Internal Alert(s) Noted` : "No Font/Artifact Anomalies"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("letters")}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
              viewMode === "letters"
                ? "bg-purple-950/80 border-purple-500"
                : "bg-slate-950/60 hover:bg-slate-900/90 border-slate-800"
            }`}
            title="Click to view formal Shortfall and Rejection Notices"
          >
            <Clock className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px]">Shortfall / Rejection Notices</span>
              <span className="font-semibold text-purple-300">
                {bidders.filter((b) => b.overallStatus === "SHORTFALL_REQUIRED").length} Shortfall |{" "}
                {bidders.filter((b) => b.overallStatus === "REJECTED_DISQUALIFIED").length} Rejected
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Subview return indicator if inspecting Banning or Tampering */}
      {(viewMode === "banning" || viewMode === "tampering") && (
        <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            {viewMode === "banning" ? (
              <>
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Special Verification: Debarment &amp; Banning Register Screening</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-4 h-4 text-cyan-600" />
                <span>Special Verification: Document Authenticity &amp; Integrity Analysis</span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => setViewMode("consolidated")}
            className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-semibold cursor-pointer shadow-2xs"
          >
            &larr; Return to Comparative Statement
          </button>
        </div>
      )}

      {/* VIEW 1: CONSOLIDATED COMPARATIVE STATEMENT */}
      {viewMode === "consolidated" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Comparative Statement of Eligibility Criteria</span>
                <span className="text-xs font-normal text-slate-500">
                  (Financial Turnover &amp; Technical Experience)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation conducted as per Qualifying Requirements in NIT and Open Tender Shortfall Circulars.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700">
                Total Bidders: {bidders.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDossierTargetBidderId(bidders[0]?.bidderId || "");
                  setIsAddingNewBidder(false);
                  setIsDossierModalOpen(true);
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Upload complete eligibility document package as single ZIP or PDF"
              >
                <FolderArchive className="w-3.5 h-3.5 text-amber-600" />
                <span>Upload Dossier (ZIP / Single PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewBidder(true);
                  setIsDossierModalOpen(true);
                }}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Bidder</span>
              </button>
            </div>
          </div>

          {/* Comparative Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="p-3 border-b border-slate-200">Sl</th>
                  <th className="p-3 border-b border-slate-200">Bidder Name</th>
                  <th className="p-3 border-b border-slate-200">Financial Turnover (Min Rs. {criteria.minAverageAnnualTurnoverCr} Cr)</th>
                  <th className="p-3 border-b border-slate-200">Experience Criteria (Min Rs. {(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr)</th>
                  <th className="p-3 border-b border-slate-200">Banning Status</th>
                  <th className="p-3 border-b border-slate-200">Overall Recommendation</th>
                  <th className="p-3 border-b border-slate-200">Action Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bidders.map((b, idx) => (
                  <tr key={b.bidderId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{b.bidderName}</div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-normal text-slate-500">
                          {b.turnoverDocuments.length} Fin • {b.experienceDocuments.length} Exp
                          {b.statutoryDocuments && b.statutoryDocuments.length > 0 && ` • ${b.statutoryDocuments.length} Stat`}
                        </span>
                        {b.uploadedBundles && b.uploadedBundles.length > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono border border-amber-200 flex items-center gap-0.5"
                            title={`Archive: ${b.uploadedBundles[0].bundleName}`}
                          >
                            <FolderArchive className="w-2.5 h-2.5 text-amber-600" />
                            <span className="truncate max-w-[110px]">{b.uploadedBundles[0].bundleName}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {b.financialEvaluation.status === "QUALIFIED" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            QUALIFIED (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        ) : b.financialEvaluation.status === "SHORTFALL" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                            SHORTFALL (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                            DISQUALIFIED (Rs. {b.financialEvaluation.averageTurnoverCr} Cr)
                          </span>
                        )}
                      </div>
                      <ul className="text-[11px] text-slate-600 list-disc pl-3 space-y-0.5">
                        {b.financialEvaluation.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {b.experienceEvaluation.status === "QUALIFIED" ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            QUALIFIED
                          </span>
                        ) : b.experienceEvaluation.status === "SHORTFALL" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                            SHORTFALL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                            REJECTED
                          </span>
                        )}
                      </div>
                      <ul className="text-[11px] text-slate-600 list-disc pl-3 space-y-0.5">
                        {b.experienceEvaluation.reasons.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </td>

                    <td className="p-3">
                      {b.banningStatusAlert.isAlertTriggered ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("banning");
                          }}
                          className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold flex items-center gap-1 text-[11px] cursor-pointer transition-colors text-left"
                          title="Click to inspect banning match in Debarment Console"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>SCRUTINY REQUIRED &rarr;</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("banning");
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                          title="Click to view database verification details"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>CLEAN</span>
                        </button>
                      )}
                    </td>

                    <td className="p-3">
                      {b.overallStatus === "RESPONSIVE_QUALIFIED" ? (
                        <span className="font-bold text-emerald-700">Responsive / Qualified</span>
                      ) : b.overallStatus === "SHORTFALL_REQUIRED" ? (
                        <span className="font-bold text-amber-700">Issue Shortfall Letter</span>
                      ) : (
                        <span className="font-bold text-rose-700">Reject Offer</span>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">{b.summaryReason}</p>
                    </td>

                    <td className="p-3">
                      {b.shortfallLetter && (
                        <button
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setLetterTypeToView("shortfall");
                            setViewMode("letters");
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-xs font-semibold cursor-pointer block text-center"
                        >
                          View Shortfall Notice &rarr;
                        </button>
                      )}
                      {b.rejectionLetter && (
                        <button
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setLetterTypeToView("rejection");
                            setViewMode("letters");
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded text-xs font-semibold cursor-pointer block text-center"
                        >
                          View Rejection Notice &rarr;
                        </button>
                      )}
                      {b.overallStatus === "RESPONSIVE_QUALIFIED" && (
                        <span className="text-emerald-600 text-xs font-medium block">Ready for Price Bid</span>
                      )}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setDossierTargetBidderId(b.bidderId);
                            setIsAddingNewBidder(false);
                            setIsDossierModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          title="Upload complete ZIP / PDF dossier for this bidder"
                        >
                          <Upload className="w-3 h-3 text-slate-500" />
                          <span>Upload (ZIP/PDF)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("individual");
                          }}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL BIDDER DOSSIER */}
      {viewMode === "individual" && (
        <div className="space-y-4">
          {/* Bidder Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {bidders.map((b) => (
              <button
                key={b.bidderId}
                onClick={() => setSelectedBidderId(b.bidderId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  b.bidderId === selectedBidderId
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{b.bidderName}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.overallStatus === "RESPONSIVE_QUALIFIED"
                      ? "bg-emerald-400"
                      : b.overallStatus === "SHORTFALL_REQUIRED"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Complete Bidder Document Dossier Banner (Single ZIP / Consolidated PDF / Multi-docs) */}
          {(() => {
            const allSubmittedDocs = [
              ...activeBidder.turnoverDocuments,
              ...activeBidder.experienceDocuments,
              ...(activeBidder.statutoryDocuments || []),
              ...(activeBidder.shortfallReplyDocuments || []),
            ];

            return (
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl p-5 border border-blue-600/40 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FolderArchive className="w-5 h-5 text-amber-400" />
                      <h4 className="font-bold text-white text-sm">
                        Complete Bidder Document Dossier (Single ZIP file or Consolidated Multi-page PDF)
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold">
                        Automatic Categorization &amp; Information Extraction
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-3xl">
                      Bidders in Services (O&amp;M) may submit their entire qualification submission as a <strong>single .zip archive</strong> or a <strong>single consolidated .pdf file</strong> (or multiple individual files). The system unpacks all files, automatically identifies Financial Turnover, Technical Experience &amp; Statutory registrations, extracts audited figures and CA UDINs, checks work order thresholds, and updates eligibility live.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <label className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Upload ZIP / Single PDF / Files</span>
                      <input
                        type="file"
                        multiple
                        accept=".zip,.pdf,.docx,.xlsx,.csv,image/*,.txt"
                        onChange={(e) => handleFileUpload(e, activeBidder.bidderId, "bundle")}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const defaultText = generateServiceEvaluationCustomText(
                          [activeBidder],
                          criteria,
                          metadata,
                          userUploadedTemplate?.templateText
                        );
                        setCustomFormatTextPreview(defaultText);
                        setIsExportFormatModalOpen(true);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Export in Custom Format</span>
                    </button>
                  </div>
                </div>

                {/* Uploaded Archive Bundles list */}
                {activeBidder.uploadedBundles && activeBidder.uploadedBundles.length > 0 && (
                  <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Uploaded Archive Package(s):</span>
                    </span>
                    {activeBidder.uploadedBundles.map((bun, bIdx) => (
                      <span
                        key={bIdx}
                        className="px-2.5 py-1 rounded-md bg-blue-950/80 text-blue-200 font-mono text-[11px] flex items-center gap-1.5 border border-blue-800/60"
                      >
                        <span className="font-bold">{bun.bundleName}</span>
                        <span className="text-blue-400">({bun.totalFilesExtracted} documents extracted)</span>
                        <span className="text-[10px] text-slate-400">[{bun.uploadedAt}]</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Extracted Document Badges */}
                {allSubmittedDocs.length > 0 ? (
                  <div className="pt-1">
                    <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        Extracted Documents ({allSubmittedDocs.length} total across Turnover, Experience &amp; Statutory):
                      </span>
                      <span className="text-[10px] text-slate-400">Click any document to inspect extracted content</span>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                      {allSubmittedDocs.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setPreviewDocModal(doc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-[11px] text-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              doc.category === "turnover"
                                ? "bg-blue-400"
                                : doc.category === "experience"
                                ? "bg-emerald-400"
                                : doc.category === "statutory"
                                ? "bg-purple-400"
                                : "bg-amber-400"
                            }`}
                          />
                          <span className="font-medium truncate max-w-[180px]">{doc.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            [{doc.category}]
                          </span>
                          {doc.sourceArchive && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-amber-300 font-mono">
                              from {doc.sourceArchive.length > 15 ? doc.sourceArchive.slice(0, 15) + "…" : doc.sourceArchive}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-lg border border-dashed border-slate-700 text-center text-xs text-slate-400">
                    No documents uploaded yet for this bidder. Upload a single .zip or .pdf file above to extract all eligibility data.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Active Bidder Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Turnover Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>(i) Financial / Turnover Eligibility</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeBidder.financialEvaluation.status === "QUALIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeBidder.financialEvaluation.status === "SHORTFALL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeBidder.financialEvaluation.status}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tendered Required Average Turnover:</span>
                  <span className="font-bold text-slate-800">Rs. {criteria.minAverageAnnualTurnoverCr.toFixed(2)} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bidder Evaluated Average Turnover:</span>
                  <span className="font-bold text-blue-700">Rs. {activeBidder.financialEvaluation.averageTurnoverCr.toFixed(2)} Cr</span>
                </div>
              </div>

              {/* Year-by-year table */}
              <table className="w-full text-xs text-left border border-slate-200 rounded">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Financial Year</th>
                    <th className="p-2 border-b border-slate-200">Turnover (Rs. Cr)</th>
                    <th className="p-2 border-b border-slate-200">CA Audited</th>
                    <th className="p-2 border-b border-slate-200">UDIN Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBidder.financialEvaluation.claimedTurnoverByYear.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-100">
                      <td className="p-2 font-medium">{row.year}</td>
                      <td className="p-2 font-mono font-bold text-slate-800">{row.turnoverCr.toFixed(2)}</td>
                      <td className="p-2 text-emerald-600">Yes (Audited)</td>
                      <td className="p-2">
                        {row.caUdinPresent ? (
                          <span className="text-emerald-700 font-semibold">Valid UDIN</span>
                        ) : (
                          <span className="text-amber-700 font-bold">UDIN Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Upload Turnover Document */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Additional Turnover Doc (PDF / Image OCR / Balance Sheet):
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, activeBidder.bidderId, "turnover")}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Experience Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>(ii) Technical &amp; Experience Eligibility</span>
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    activeBidder.experienceEvaluation.status === "QUALIFIED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeBidder.experienceEvaluation.status === "SHORTFALL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeBidder.experienceEvaluation.status}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Single Work Order Value Threshold (80%):</span>
                  <span className="font-bold text-slate-800">
                    Rs. {(criteria.singleWorkOrderValueCr || criteria.minAverageAnnualTurnoverCr * 0.8).toFixed(2)} Cr
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <strong>Similar Work Definition:</strong> {criteria.similarWorkDefinition}
                </p>
              </div>

              {/* Submitted Works List */}
              <div className="space-y-2">
                {activeBidder.experienceEvaluation.submittedWorks.map((work, wIdx) => (
                  <div key={wIdx} className="p-3 border border-slate-200 rounded-lg text-xs space-y-1 bg-white">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{work.workTitle}</span>
                      <span className="font-mono text-blue-700">Rs. {work.contractValueCr.toFixed(2)} Cr</span>
                    </div>
                    <div className="text-slate-600 flex justify-between text-[11px]">
                      <span>Client: {work.clientName}</span>
                      <span>Completion: {work.completionDate}</span>
                    </div>
                    <div className="flex items-center gap-3 pt-1 text-[11px]">
                      <span className={work.matchesSimilarWorkScope ? "text-emerald-700 font-semibold" : "text-rose-700 font-bold"}>
                        {work.matchesSimilarWorkScope ? "✓ Similar Scope" : "✗ Scope Mismatch"}
                      </span>
                      <span className={work.completionCertificateAttached ? "text-emerald-700 font-semibold" : "text-amber-700 font-bold"}>
                        {work.completionCertificateAttached ? "✓ Client Cert Attached" : "✗ Client Cert Missing"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Experience Document */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Additional Work Order / Completion Cert (PDF / Image OCR):
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e, activeBidder.bidderId, "experience")}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Banning Status Alert Notification for active bidder */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              activeBidder.banningStatusAlert.isAlertTriggered
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${activeBidder.banningStatusAlert.isAlertTriggered ? "text-rose-600" : "text-slate-400"}`} />
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Banning Status Alert Checklist</span>
                <span className="text-[11px] font-mono font-normal">
                  ({activeBidder.banningStatusAlert.banningCheckListClauseRef})
                </span>
              </div>
              <p>
                {activeBidder.banningStatusAlert.isAlertTriggered
                  ? activeBidder.banningStatusAlert.reason
                  : "Bidder entity is verified clean. No active banning, blacklisting, or debarment orders on record across CVC, GeM Incident management, or CPPP Central Debarment registers."}
              </p>
              {activeBidder.banningStatusAlert.sourceDatabase && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                  <span>Source: <strong>{activeBidder.banningStatusAlert.sourceDatabase}</strong></span>
                  {activeBidder.banningStatusAlert.referenceOrderNo && (
                    <span>Ref Order: <strong className="font-mono">{activeBidder.banningStatusAlert.referenceOrderNo}</strong></span>
                  )}
                  {activeBidder.banningStatusAlert.portalUrl && (
                    <a
                      href={activeBidder.banningStatusAlert.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="w-3 h-3" />
                      <span>{activeBidder.banningStatusAlert.portalUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {activeBidder.banningStatusAlert.isAlertTriggered && (
                  <button
                    onClick={() => {
                      setBidders((prev) =>
                        prev.map((b) =>
                          b.bidderId === activeBidder.bidderId
                            ? {
                                ...b,
                                banningStatusAlert: {
                                  ...b.banningStatusAlert,
                                  isAlertTriggered: false,
                                  verifiedStatus: "OFFICER_CONFIRMED_CLEAN",
                                  verificationNotes: "Dealing Officer cross-checked CPPP Central Debarment portal on date; confirmed distinct entity.",
                                },
                              }
                            : b
                        )
                      );
                      onLogAudit?.(
                        "Cleared Banning Alert",
                        "Evaluation",
                        `Dealing officer cross-verified and confirmed clean status for ${activeBidder.bidderName}`,
                        undefined,
                        activeBidder.bidderName,
                        "CVC Non-Banning"
                      );
                    }}
                    className="px-2.5 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-100 cursor-pointer text-[11px]"
                  >
                    Confirm Officer Cross-Verification Clean
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode("banning")}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-800 font-medium text-[11px] cursor-pointer flex items-center gap-1"
                >
                  <Search className="w-3 h-3 text-slate-600" />
                  <span>Open Full Banning Console &rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FORMAL LETTERS (SHORTFALL / REJECTION) */}
      {viewMode === "letters" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Formal Administrative Communication Letters</span>
                <span className="text-xs font-normal text-slate-500">
                  (GFR 2017 &amp; Open Tender Guidelines)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Letters are automatically formulated based on specific document deficiencies. No shortfall is generated if submitted documents fail the threshold completely.
              </p>
            </div>

            {/* Letter Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBidderId}
                onChange={(e) => setSelectedBidderId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
              >
                {bidders.map((b) => (
                  <option key={b.bidderId} value={b.bidderId}>
                    {b.bidderName} ({b.overallStatus})
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const letterContent =
                    activeBidder.shortfallLetter
                      ? `${activeBidder.shortfallLetter.letterRefNo}\nDate: ${activeBidder.shortfallLetter.letterDate}\nTo: ${activeBidder.shortfallLetter.targetBidderName}\n\nSubject: ${activeBidder.shortfallLetter.subject}\n\n${activeBidder.shortfallLetter.content}\n\nDEFICIENCIES:\n${activeBidder.shortfallLetter.specificDeficiencies.map((d, i) => `${i + 1}. [${d.head}] Referred Doc: ${d.referredDocument}\nObservation: ${d.observation}\nRequirement: ${d.shortfallRequirement}\n`).join("\n")}\nSubmission Deadline: ${activeBidder.shortfallLetter.submissionDeadlineDays} days\n\nDesignated Tender Dealing Officer`
                      : activeBidder.rejectionLetter
                      ? `${activeBidder.rejectionLetter.letterRefNo}\nDate: ${activeBidder.rejectionLetter.letterDate}\nTo: ${activeBidder.rejectionLetter.targetBidderName}\n\nSubject: ${activeBidder.rejectionLetter.subject}\n\n${activeBidder.rejectionLetter.content}\n\nGROUNDS FOR REJECTION:\n${activeBidder.rejectionLetter.formalGrounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n\nReferred Documents: ${activeBidder.rejectionLetter.referredDocuments.join(", ")}\nAppellate Authority: ${activeBidder.rejectionLetter.appellateAuthorityMention}\n\nDesignated Tender Dealing Officer`
                      : "Bidder is fully qualified. No formal shortfall or rejection letter required.";

                  const blob = new Blob([letterContent], { type: "text/plain;charset=utf-8" });
                  triggerFileDownload(blob, `Tender_Letter_${activeBidder.bidderName.replace(/\s+/g, "_")}.txt`);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Letter (.txt)</span>
              </button>
            </div>
          </div>

          {/* Letter Preview Display */}
          {activeBidder.shortfallLetter ? (
            <div className="bg-slate-50 border border-amber-200 rounded-xl p-6 font-mono text-xs text-slate-800 space-y-4">
              <div className="border-b border-amber-200 pb-3 flex justify-between text-slate-600 font-sans text-xs">
                <div>
                  <strong>Ref:</strong> {activeBidder.shortfallLetter.letterRefNo}
                </div>
                <div>
                  <strong>Date:</strong> {activeBidder.shortfallLetter.letterDate}
                </div>
              </div>

              <div>
                <strong>TO:</strong>
                <div>M/s {activeBidder.shortfallLetter.targetBidderName}</div>
                <div className="text-slate-500 text-[11px]">(Participating Bidder in Tender: {metadata.tenderRefNo || "Ref No"})</div>
              </div>

              <div className="font-bold text-amber-900 font-sans text-sm">
                SUBJECT: {activeBidder.shortfallLetter.subject}
              </div>

              <p className="whitespace-pre-line leading-relaxed font-sans text-slate-700">
                {activeBidder.shortfallLetter.content}
              </p>

              {/* Deficiencies Table */}
              <div className="border border-amber-300 rounded-lg overflow-hidden font-sans">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-100/70 text-amber-900 font-semibold">
                    <tr>
                      <th className="p-2.5">Sl</th>
                      <th className="p-2.5">Eligibility Head</th>
                      <th className="p-2.5">Referred Document</th>
                      <th className="p-2.5">Observation / Discrepancy</th>
                      <th className="p-2.5">Shortfall Requirement Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200 bg-white">
                    {activeBidder.shortfallLetter.specificDeficiencies.map((d, dIdx) => (
                      <tr key={dIdx}>
                        <td className="p-2.5 font-mono text-slate-500">{dIdx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800">{d.head}</td>
                        <td className="p-2.5 font-mono text-blue-700">{d.referredDocument}</td>
                        <td className="p-2.5 text-slate-700">{d.observation}</td>
                        <td className="p-2.5 font-medium text-amber-900">{d.shortfallRequirement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="font-sans text-xs text-slate-600">
                You are requested to submit the above specific shortfall/clarification documents within{" "}
                <strong>{activeBidder.shortfallLetter.submissionDeadlineDays} days</strong> of receipt of this notice.
                Please note that in terms of Open Tender guidelines, no new work order or replacement document shall be entertained.
              </p>

              <div className="pt-4 border-t border-amber-200 flex justify-between items-end font-sans">
                <div className="text-[11px] text-slate-500">
                  Compliance Tag: {activeBidder.shortfallLetter.noticeClauseReference}
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">Dealing Officer / Contract Cell</div>
                  <div className="text-xs text-slate-500">{metadata.organization || "Public Sector Undertaking"}</div>
                </div>
              </div>
            </div>
          ) : activeBidder.rejectionLetter ? (
            <div className="bg-slate-50 border border-rose-200 rounded-xl p-6 font-mono text-xs text-slate-800 space-y-4">
              <div className="border-b border-rose-200 pb-3 flex justify-between text-slate-600 font-sans text-xs">
                <div>
                  <strong>Ref:</strong> {activeBidder.rejectionLetter.letterRefNo}
                </div>
                <div>
                  <strong>Date:</strong> {activeBidder.rejectionLetter.letterDate}
                </div>
              </div>

              <div>
                <strong>TO:</strong>
                <div>M/s {activeBidder.rejectionLetter.targetBidderName}</div>
                <div className="text-slate-500 text-[11px]">(Participating Bidder in Tender: {metadata.tenderRefNo || "Ref No"})</div>
              </div>

              <div className="font-bold text-rose-900 font-sans text-sm">
                SUBJECT: {activeBidder.rejectionLetter.subject}
              </div>

              <p className="whitespace-pre-line leading-relaxed font-sans text-slate-700">
                {activeBidder.rejectionLetter.content}
              </p>

              {/* Formal Grounds for Rejection */}
              <div className="p-3 bg-rose-100/60 border border-rose-300 rounded-lg space-y-2 font-sans">
                <h5 className="font-bold text-rose-900 text-xs">Formal Grounds for Rejection:</h5>
                <ul className="list-disc pl-5 space-y-1 text-xs text-rose-950">
                  {activeBidder.rejectionLetter.formalGrounds.map((g, gIdx) => (
                    <li key={gIdx}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="font-sans text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Documents Examined:</strong> {activeBidder.rejectionLetter.referredDocuments.join(", ")}
                </p>
                <p>
                  <strong>Appellate Remedy:</strong> {activeBidder.rejectionLetter.appellateAuthorityMention}
                </p>
              </div>

              <div className="pt-4 border-t border-rose-200 flex justify-between items-end font-sans">
                <div className="text-[11px] text-slate-500">
                  Statutory Tag: GFR 2017 Rule 173(xvi) Non-Responsive Determination
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">Dealing Officer / Tender Committee</div>
                  <div className="text-xs text-slate-500">{metadata.organization || "Public Sector Undertaking"}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-900 text-sm">Bidder is Techno-Commercially Qualified</h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                M/s {activeBidder.bidderName} satisfies both Financial Turnover and Technical Experience criteria. No shortfall notice or rejection intimation is required.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: TAMPERING & FORGERY ALERTS (Internal to Dealing Officer) */}
      {viewMode === "tampering" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Document Tampering &amp; Forgery Detection Console</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  Strictly Confidential • Dealing Officer Internal Use
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                In-browser pixel &amp; pattern analyzer alerts Dealing Officers to suspicious font discrepancies, resolution compression artifacts, and missing ICAI UDINs.
                <strong> Note:</strong> These alerts do NOT form part of comparative statements, shortfall letters, or rejection intimations. Decision to drop or pursue remains with the user.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {bidders.map((b) => {
              const docs = [...b.turnoverDocuments, ...b.experienceDocuments, ...(b.shortfallReplyDocuments || [])];
              const bAlerts: { docName: string; alert: DocumentTamperingAlert }[] = [];
              docs.forEach((d) => {
                (d.tamperingAlerts || []).forEach((a) => bAlerts.push({ docName: d.name, alert: a }));
              });

              return (
                <div key={b.bidderId} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{b.bidderName}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {bAlerts.length} Document Alert(s)
                    </span>
                  </div>

                  {bAlerts.length === 0 ? (
                    <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>No pixel tampering or metadata anomalies identified in uploaded documents.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bAlerts.map((item, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white p-3 rounded-lg border border-rose-200 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{item.alert.description}</span>
                            </span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                              {item.alert.severity}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px] flex gap-4">
                            <span>Document: <strong>{item.docName}</strong></span>
                            {item.alert.affectedSnippet && (
                              <span>Area: <strong>{item.alert.affectedSnippet}</strong></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: BANNING & DEBARMENT VERIFICATION CONSOLE */}
      {viewMode === "banning" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Header & Scan Execution */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Banning &amp; Debarment Verification Console
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  GFR Rule 151 &amp; CVC Compliance
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Simulated screening engine cross-checks participating bidders against an internal repository of debarred firms, CPPP Central Debarment Portal, GeM Incident Management, and custom blacklisted URLs/registers provided by the user.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Last checked: <strong>{lastBanningScanTime}</strong>
              </span>
              <button
                type="button"
                onClick={executeBanningCheck}
                disabled={isScanningBanning}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningBanning ? "animate-spin" : ""}`} />
                <span>{isScanningBanning ? "Checking Portals..." : "Run Banning Status Check"}</span>
              </button>
            </div>
          </div>

          {/* Bidder Screening Summary Grid */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              Screening Results for Participating Bidders ({bidders.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bidders.map((b) => {
                const isFlagged = b.banningStatusAlert.isAlertTriggered;
                return (
                  <div
                    key={b.bidderId}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isFlagged
                        ? "bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs"
                        : "bg-emerald-50/40 border-emerald-200 text-slate-800"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <span className="font-bold text-sm text-slate-900">{b.bidderName}</span>
                        {isFlagged ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-900 border border-rose-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-700" />
                            <span>DEBARMENT ALERT</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>CLEAN</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="leading-relaxed">
                          {isFlagged
                            ? b.banningStatusAlert.reason
                            : "No adverse debarment, suspension, or blacklisting orders recorded across CPPP, GeM Incident Log, or internal registers."}
                        </p>

                        {b.banningStatusAlert.sourceDatabase && (
                          <div className="pt-1 text-[11px] text-slate-600 space-y-0.5">
                            <div>
                              Database: <strong className="text-slate-800">{b.banningStatusAlert.sourceDatabase}</strong>
                            </div>
                            {b.banningStatusAlert.referenceOrderNo && (
                              <div>
                                Order Ref: <strong className="font-mono text-slate-800">{b.banningStatusAlert.referenceOrderNo}</strong>
                              </div>
                            )}
                            {b.banningStatusAlert.portalUrl && (
                              <div className="truncate">
                                Portal URL:{" "}
                                <a
                                  href={b.banningStatusAlert.portalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{b.banningStatusAlert.portalUrl}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {b.banningStatusAlert.banningCheckListClauseRef}
                      </span>
                      {isFlagged ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBidders((prev) =>
                              prev.map((item) =>
                                item.bidderId === b.bidderId
                                  ? {
                                      ...item,
                                      banningStatusAlert: {
                                        ...item.banningStatusAlert,
                                        isAlertTriggered: false,
                                        verifiedStatus: "OFFICER_CONFIRMED_CLEAN",
                                        verificationNotes: `Dealing officer manually verified with CPPP/GeM on ${new Date().toLocaleDateString("en-IN")}; confirmed distinct non-debarred firm.`,
                                      },
                                    }
                                  : item
                              )
                            );
                            onLogAudit?.(
                              "Officer Cleared Debarment Alert",
                              "Evaluation",
                              `Dealing officer cross-verified and marked '${b.bidderName}' as confirmed clean.`,
                              undefined,
                              b.bidderName,
                              "Vigilance Non-Banning"
                            );
                          }}
                          className="px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded text-rose-800 text-[11px] font-semibold cursor-pointer"
                        >
                          Mark Verified Clean
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBidderId(b.bidderId);
                            setViewMode("individual");
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          View Dossier &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Database of Debarred Entities & Add Custom Portal / URL Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            {/* Left: Table of Blacklisted Database */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hypothetical Blacklist &amp; Debarment Database ({blacklistDatabase.length} records)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Entities monitored across CPPP, GeM Incident Management, CVC, and user-provided websites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBlacklistDatabase(DEFAULT_BLACKLISTED_ENTITIES);
                    executeBanningCheck();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Reset Default List
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-semibold">Debarred Entity</th>
                      <th className="p-2.5 font-semibold">Source Portal / Register</th>
                      <th className="p-2.5 font-semibold">Order Ref &amp; Date</th>
                      <th className="p-2.5 font-semibold">Reason</th>
                      <th className="p-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {blacklistDatabase.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.entityName}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-800">
                            {item.sourcePortal}
                          </span>
                          {item.portalUrl && (
                            <a
                              href={item.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 block mt-0.5 hover:underline truncate max-w-[140px]"
                            >
                              {item.portalUrl}
                            </a>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <div>{item.referenceOrderNo}</div>
                          <div className="text-[10px] text-slate-400">{item.orderDate}</div>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs text-[11px]">
                          {item.reasonForBanning}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveBlacklistEntity(item.id, item.entityName)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Remove from screening list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Add Custom Blacklisted Firm or URL */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Blacklisted Firm or Portal URL</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter an internal blacklisted company name or paste an external URL (GeM/CPP/Ministry website) to flag matching bidders.
                </p>
              </div>

              <form onSubmit={handleAddBlacklistEntity} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company / Firm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    placeholder="e.g. Bidder 3 or M/s Global Corp"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Source Portal / Authority
                  </label>
                  <select
                    value={newSourcePortal}
                    onChange={(e) => setNewSourcePortal(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Internal Blacklist">Internal Blacklist (PSU/Dept)</option>
                    <option value="GeM Incident Management">GeM Incident Management</option>
                    <option value="CPPP Central Debarment">CPPP Central Debarment</option>
                    <option value="CVC Banned Register">CVC Banned Register</option>
                    <option value="Custom URL / Portal">Custom Website / Ministry Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Website / Portal URL (GeM / CPP / Any Other)
                  </label>
                  <input
                    type="url"
                    value={newPortalUrl}
                    onChange={(e) => setNewPortalUrl(e.target.value)}
                    placeholder="https://gem.gov.in/... or https://eprocure.gov.in/..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Banning Order Ref / Case No.
                  </label>
                  <input
                    type="text"
                    value={newRefOrder}
                    onChange={(e) => setNewRefOrder(e.target.value)}
                    placeholder="e.g. VIG/BAN/2026/042"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reason for Banning / Breach
                  </label>
                  <textarea
                    rows={2}
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="e.g. Abandonment of previous service contract, forged certificates, or failure to deploy workforce."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Debarred Database &amp; Re-screen</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Internal Guidelines Modal */}
      {guidelinesModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Internal Guidelines &amp; Circulars Reference</span>
              </h4>
              <button
                onClick={() => setGuidelinesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">
                  1. Policy Circular on Shortfall / Clarification in Open Tender (OT) Cases
                </div>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {guidelines.shortfallInOTCasesText}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="font-bold text-slate-900">
                  2. CVC &amp; GFR 2017 Guidelines on Evaluation of Eligibility Criteria
                </div>
                <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                  {guidelines.evaluationOfEligibilityText}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setGuidelinesModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Evaluation Lock Prompt */}
      {showFinalPrompt && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-900 text-base">Submit Final Evaluation Report?</h4>
              <p className="text-xs text-slate-600">
                On confirmation, the system will record that <strong>no further change or document upload</strong> is permissible in this case. The final evaluation statement will be locked for Tender Committee sign-off.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowFinalPrompt(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEvaluationStage("FINAL_ACCEPTED");
                  setShowFinalPrompt(false);
                  exportConsolidatedReport();
                  onLogAudit?.(
                    "Submitted Final Evaluation",
                    "Evaluation",
                    "Dealing officer submitted final evaluation report. Case locked from further modifications.",
                    undefined,
                    "Final Scrutiny",
                    "Tender Committee Submission"
                  );
                }}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
              >
                Confirm &amp; Lock Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Upload Complete Bidder Dossier (Single ZIP / Consolidated PDF / Multi-docs) */}
      {isDossierModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Upload Complete Bidder Dossier
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Single ZIP file, consolidated PDF, or multiple files submitted by bidder
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDossierModalOpen(false);
                  setIsAddingNewBidder(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Bidder Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Target Bidder:
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isAddingNewBidder}
                    onChange={() => setIsAddingNewBidder(false)}
                    className="accent-blue-600"
                  />
                  <span>Select Existing Bidder</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={isAddingNewBidder}
                    onChange={() => setIsAddingNewBidder(true)}
                    className="accent-blue-600"
                  />
                  <span>Create New Bidder</span>
                </label>
              </div>

              {!isAddingNewBidder ? (
                <select
                  value={dossierTargetBidderId}
                  onChange={(e) => setDossierTargetBidderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-blue-500"
                >
                  {bidders.map((b) => (
                    <option key={b.bidderId} value={b.bidderId}>
                      {b.bidderName} ({b.overallStatus})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter Bidder Legal Entity Name (e.g. M/s Pioneer Electro-Mechanical Services)"
                  value={newBidderNameInput}
                  onChange={(e) => setNewBidderNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-blue-500"
                />
              )}
            </div>

            {/* File Upload Drop Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Select Dossier Package (ZIP / Single Consolidated PDF / Multiple Documents):
              </label>
              <div className="border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-xl p-6 text-center transition-colors">
                <FolderArchive className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  Click or drag files here to upload complete bidder dossier
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Supports <strong>.zip</strong> archive containing multiple files, single multi-page <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.xlsx</strong>, or scanned images.
                </p>
                <input
                  type="file"
                  multiple
                  accept=".zip,.pdf,.docx,.xlsx,.csv,image/*,.txt"
                  id="dossier-modal-file-input"
                  onChange={async (e) => {
                    let targetId = dossierTargetBidderId;
                    if (isAddingNewBidder) {
                      if (!newBidderNameInput.trim()) {
                        alert("Please enter a bidder name first.");
                        return;
                      }
                      targetId = handleAddNewBidderWithDossier(newBidderNameInput);
                    }
                    await handleFileUpload(e, targetId, "bundle");
                    setIsDossierModalOpen(false);
                  }}
                  className="mt-4 block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* System Capabilities Checklist */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
              <div className="font-bold text-slate-800 text-xs">Automated Extraction Capabilities:</div>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Unpacks ZIP archives and parses every embedded PDF, DOCX, XLSX, and image</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Separates multi-page consolidated PDFs into certificate heads &amp; sections</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Extracts 3-year turnover numbers &amp; validates 18-digit CA UDIN presence</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Calculates qualifying Single/Two/Three work orders against NIT criteria</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDossierModalOpen(false);
                  setIsAddingNewBidder(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Output Formats & Custom Template Generator */}
      {isExportFormatModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Evaluation Output &amp; Format Template Generator
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Export in standard formats or produce output as desired per your uploaded format
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportFormatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {/* Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Standard Excel */}
                <div
                  onClick={() => {
                    setSelectedFormatTemplateId("standard-excel");
                    setCustomFormatTextPreview(
                      generateServiceEvaluationCustomText(bidders, criteria, metadata)
                    );
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedFormatTemplateId === "standard-excel"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Standard Excel (.xlsx)</span>
                    </span>
                    {selectedFormatTemplateId === "standard-excel" && (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Full 3-sheet comparative statement, financial turnovers, UDINs, submitted past works, and shortfall schedule.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportServiceEvaluationToExcel(bidders, criteria, metadata);
                    }}
                    className="mt-2.5 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Excel</span>
                  </button>
                </div>

                {/* Standard Word */}
                <div
                  onClick={() => {
                    setSelectedFormatTemplateId("standard-docx");
                    setCustomFormatTextPreview(
                      generateServiceEvaluationCustomText(bidders, criteria, metadata)
                    );
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedFormatTemplateId === "standard-docx"
                      ? "border-blue-500 bg-blue-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Formal Note (Word .docx)</span>
                    </span>
                    {selectedFormatTemplateId === "standard-docx" && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Statutory scrutiny note formatted with GFR 2017 Rule 173 preamble, comparative tables &amp; 3-tier committee sign-offs.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportServiceEvaluationToDocx(bidders, criteria, metadata);
                    }}
                    className="mt-2.5 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Word (.docx)</span>
                  </button>
                </div>

                {/* Uploaded / Custom Format */}
                <div
                  onClick={() => {
                    if (userUploadedTemplate) {
                      setSelectedFormatTemplateId(userUploadedTemplate.id);
                      setCustomFormatTextPreview(
                        generateServiceEvaluationCustomText(
                          bidders,
                          criteria,
                          metadata,
                          userUploadedTemplate.templateText
                        )
                      );
                    }
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedFormatTemplateId === userUploadedTemplate?.id
                      ? "border-purple-500 bg-purple-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-purple-600" />
                      <span>User Uploaded Format</span>
                    </span>
                    {selectedFormatTemplateId === userUploadedTemplate?.id && (
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {userUploadedTemplate
                      ? `Active: ${userUploadedTemplate.name} (${userUploadedTemplate.charCount} chars)`
                      : "Upload your department's specific comparative format template (.xlsx, .docx, .txt)."}
                  </p>
                  <label className="mt-2.5 w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>{userUploadedTemplate ? "Replace Format Template" : "Upload Format Template"}</span>
                    <input
                      type="file"
                      accept=".xlsx,.docx,.txt,.csv"
                      onChange={handleUploadFormatTemplate}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Preset selection dropdown */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>Or Pick Standard Institutional Presets:</span>
                </span>
                <select
                  value={selectedFormatTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedFormatTemplateId(id);
                    const preset = PRESET_FORMAT_TEMPLATES.find((p) => p.id === id);
                    const text = generateServiceEvaluationCustomText(
                      bidders,
                      criteria,
                      metadata,
                      preset?.templateText
                    );
                    setCustomFormatTextPreview(text);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 text-xs focus:outline-blue-500"
                >
                  <option value="standard-excel">Standard GFR 2017 &amp; Open Tender Format</option>
                  <option value="preset-cvc-gfr173">Central PSU Scrutiny Format (CVC / GFR 173 Standard)</option>
                  <option value="preset-prebid-minutes">GeM Technical Scrutiny &amp; Eligibility Matrix</option>
                  <option value="preset-board-scrutiny">Tender Committee Board Note &amp; Scrutiny Rubric</option>
                  {userUploadedTemplate && (
                    <option value={userUploadedTemplate.id}>Custom: {userUploadedTemplate.name}</option>
                  )}
                </select>
              </div>

              {/* Formatted Text Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Preview of Formatted Output (Extracted Information Populated):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(customFormatTextPreview);
                        setHasCopiedFormat(true);
                        setTimeout(() => setHasCopiedFormat(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {hasCopiedFormat ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopiedFormat ? "Copied!" : "Copy Text"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([customFormatTextPreview], { type: "text/plain;charset=utf-8" });
                        triggerFileDownload(blob, `Service_Eligibility_Output_${Date.now()}.txt`);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .txt</span>
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  rows={12}
                  value={customFormatTextPreview}
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                The system populates bidder eligibility values, UDINs, and qualifying verdicts into your chosen format.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportServiceEvaluationToDocx(bidders, criteria, metadata, undefined, userUploadedTemplate?.name)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export as Word Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportServiceEvaluationToExcel(bidders, criteria, metadata, userUploadedTemplate?.name)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export as Excel Spreadsheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Inspect Extracted Document Preview */}
      {previewDocModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">{previewDocModal.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    {previewDocModal.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                  <span>Type: <strong>{previewDocModal.fileType.toUpperCase()}</strong></span>
                  <span>Characters: <strong>{previewDocModal.charCount}</strong></span>
                  {previewDocModal.sourceArchive && (
                    <span>Source Archive: <strong className="text-amber-700">{previewDocModal.sourceArchive}</strong></span>
                  )}
                  {previewDocModal.pageCount && (
                    <span>Pages: <strong>{previewDocModal.pageCount}</strong></span>
                  )}
                  {previewDocModal.isOcrScanned && (
                    <span className="text-purple-700 font-semibold">Processed via Browser Image OCR</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPreviewDocModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Extracted Text Content (Parsed by Engine):
              </label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {previewDocModal.extractedText || "No text extracted."}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewDocModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
